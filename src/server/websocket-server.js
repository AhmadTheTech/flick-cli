// enhanced-websocket-server.js
const WebSocket = require('ws');
const EventEmitter = require('events');
const DartEvalManager = require('./dart-eval-manager');
const Logger = require('../utils/logger');

class EnhancedWebSocketServer extends EventEmitter {
  constructor(options) {
    super();
    this.httpServer = options.httpServer;
    this.projectData = options.projectData;
    this.projectRoot = options.projectRoot;
    this.wss = null;
    this.clients = new Map();
    this.evalManager = new DartEvalManager();
    this.compilationQueue = [];
    this.isCompiling = false;
    this.logger = new Logger();
  }

  start() {
    this.wss = new WebSocket.Server({ server: this.httpServer });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      const clientId = this.generateClientId();
      
      ws.clientId = clientId;
      ws.clientIp = clientIp;
      this.clients.set(clientId, ws);

      this.emit('client-connected', { ip: clientIp, clientId });
      this.logger.success(`Device connected: ${clientIp} [${clientId}]`);

      ws.send(JSON.stringify({
        type: 'init',
        data: {
          ...this.projectData,
          features: {
            dartEval: true,
            hotReload: true,
            compilation: true
          },
          clientId,
          timestamp: Date.now()
        }
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          this.logger.error(`Error parsing message: ${error.message}`);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        this.emit('client-disconnected', { ip: clientIp, clientId });
        this.logger.warn(`Device disconnected: ${clientIp} [${clientId}]`);
      });

      ws.on('error', (error) => {
        this.clients.delete(clientId);
        this.logger.error(`WebSocket error: ${error.message}`);
      });
    });
  }

  handleClientMessage(ws, data) {
    this.emit('client-message', data);

    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'ready':
        ws.send(JSON.stringify({ type: 'acknowledged' }));
        break;

      case 'compile-request':
        this.handleCompileRequest(ws, data);
        break;

      case 'get-module':
        this.handleGetModule(ws, data);
        break;

      default:
        this.logger.debug(`Unknown message type: ${data.type}`);
    }
  }

  async handleCompileRequest(ws, data) {
    const { dartCode, moduleName, requestId } = data;

    if (!dartCode || !moduleName) {
      ws.send(JSON.stringify({
        type: 'compilation-error',
        requestId,
        error: 'dartCode and moduleName are required'
      }));
      return;
    }

    this.compilationQueue.push({
      dartCode,
      moduleName,
      ws,
      clientId: ws.clientId,
      requestId,
      timestamp: Date.now()
    });

    if (!this.isCompiling) {
      this.processCompilationQueue();
    }
  }

  async processCompilationQueue() {
    if (this.compilationQueue.length === 0) {
      this.isCompiling = false;
      return;
    }

    this.isCompiling = true;
    const job = this.compilationQueue.shift();

    try {
      this.logger.info(`Compiling module: ${job.moduleName}`);

      const result = await this.evalManager.compile(job.dartCode, job.moduleName);

      // Send success message to requesting client
      if (job.ws.readyState === WebSocket.OPEN) {
        job.ws.send(JSON.stringify({
          type: 'compilation-complete',
          requestId: job.requestId,
          success: true,
          moduleId: result.moduleId,
          moduleName: result.moduleName,
          size: result.size,
          timestamp: result.timestamp
        }));
      }

      this.logger.success(`Module compiled: ${job.moduleName} (${result.size} bytes)`);

      // Broadcast to all clients that a module is available
      this.broadcast({
        type: 'module-compiled',
        moduleId: result.moduleId,
        moduleName: result.moduleName,
        size: result.size,
        clientId: job.clientId,
        timestamp: result.timestamp
      });

    } catch (error) {
      this.logger.error(`Compilation error: ${error.message}`);

      if (job.ws.readyState === WebSocket.OPEN) {
        job.ws.send(JSON.stringify({
          type: 'compilation-error',
          requestId: job.requestId,
          error: error.message,
          moduleName: job.moduleName,
          timestamp: Date.now()
        }));
      }
    }

    setTimeout(() => this.processCompilationQueue(), 100);
  }

  handleGetModule(ws, data) {
    const { moduleId, requestId } = data;
    const module = this.evalManager.getModule(moduleId);

    if (module) {
      ws.send(JSON.stringify({
        type: 'module-data',
        requestId,
        moduleId,
        moduleName: module.moduleName,
        size: module.size,
        compiledAt: module.compiledAt,
        bytecode: module.bytecode.toString('base64')
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'module-not-found',
        requestId,
        moduleId,
        error: 'Module not found in cache'
      }));
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    let sent = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sent++;
      }
    });

    return sent;
  }

  broadcastToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  getClientCount() {
    return this.clients.size;
  }

  getClients() {
    return Array.from(this.clients.entries()).map(([id, ws]) => ({
      clientId: id,
      ip: ws.clientIp
    }));
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  stop() {
    this.evalManager.clearCache();
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
    }
  }
}

module.exports = EnhancedWebSocketServer;
