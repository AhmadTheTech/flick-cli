// enhanced-http-server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/logger');

class EnhancedHttpServer {
  constructor(options) {
    this.port = options.port;
    this.host = options.host;
    this.projectRoot = options.projectRoot;
    this.projectData = options.projectData;
    this.evalManager = options.evalManager;
    this.app = express();
    this.server = null;
    this.logger = new Logger();
  }

  async start() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '1.0.0',
        timestamp: Date.now(),
        features: {
          dartEval: true,
          hotReload: true,
          compilation: true
        }
      });
    });

    // Project info
    this.app.get('/api/project', (req, res) => {
      res.json(this.projectData);
    });

    // Get compiled bytecode module
    this.app.get('/api/bytecode/:moduleId', (req, res) => {
      const { moduleId } = req.params;
      const module = this.evalManager.getModule(moduleId);

      if (!module) {
        return res.status(404).json({
          error: 'Module not found',
          moduleId
        });
      }

      res.json({
        success: true,
        moduleId,
        moduleName: module.moduleName,
        bytecode: module.bytecode.toString('base64'),
        size: module.size,
        compiledAt: module.compiledAt,
        timestamp: Date.now()
      });
    });

    // Get bytecode as binary
    this.app.get('/api/bytecode/:moduleId/binary', (req, res) => {
      const { moduleId } = req.params;
      const module = this.evalManager.getModule(moduleId);

      if (!module) {
        return res.status(404).json({
          error: 'Module not found',
          moduleId
        });
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${module.moduleName}.dill"`);
      res.send(module.bytecode);
    });

    // List all available modules
    this.app.get('/api/modules', (req, res) => {
      const modules = [];
      this.evalManager.compiledModules.forEach((module, moduleId) => {
        modules.push({
          moduleId,
          moduleName: module.moduleName,
          size: module.size,
          compiledAt: module.compiledAt
        });
      });

      res.json({
        success: true,
        count: modules.length,
        modules,
        timestamp: Date.now()
      });
    });

    // Get file content
    this.app.get('/api/files/*', (req, res) => {
      const filePath = req.params[0];
      const fullPath = path.join(this.projectRoot, filePath);

      if (fs.existsSync(fullPath) && fullPath.startsWith(this.projectRoot)) {
        res.sendFile(fullPath);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    });

    // Serve assets
    this.app.use('/assets', express.static(path.join(this.projectRoot, 'assets')));

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, '0.0.0.0', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });

      this.server.on('error', reject);
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => resolve());
      });
    }
  }

  getServer() {
    return this.server;
  }
}

module.exports = EnhancedHttpServer;
