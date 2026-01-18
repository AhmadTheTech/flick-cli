const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

class HttpServer {
  constructor(options) {
    this.port = options.port;
    this.host = options.host;
    this.projectRoot = options.projectRoot;
    this.projectData = options.projectData;
    this.app = express();
    this.server = null;
  }

  async start() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));

    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '1.0.0',
        timestamp: Date.now()
      });
    });

    this.app.get('/api/project', (req, res) => {
      res.json(this.projectData);
    });

    this.app.get('/api/files/*', (req, res) => {
      const filePath = req.params[0];
      const fullPath = path.join(this.projectRoot, filePath);

      if (fs.existsSync(fullPath) && fullPath.startsWith(this.projectRoot)) {
        res.sendFile(fullPath);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    });

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

module.exports = HttpServer;