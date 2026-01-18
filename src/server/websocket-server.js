const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketServer extends EventEmitter {
  constructor(options) {
    super();
    this.httpServer = options.httpServer;
    this.projectData = options.projectData;
    this.wss = null;
    this.clients = new Set();
  }

  start() {
    this.wss = new WebSocket.Server({ server: this.httpServer });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      this.clients.add(ws);

      this.emit('client-connected', { ip: clientIp });

      ws.send(JSON.stringify({
        type: 'init',
        data: this.projectData
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('Error parsing client message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.emit('client-disconnected', { ip: clientIp });
      });

      ws.on('error', (error) => {
        this.clients.delete(ws);
        console.error('WebSocket error:', error);
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
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    let sent = 0;

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sent++;
      }
    });

    return sent;
  }

  getClientCount() {
    return this.clients.size;
  }

  stop() {
    this.clients.forEach(client => client.close());
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
    }
  }
}

module.exports = WebSocketServer;