const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

class FileWatcher {
  constructor(options) {
    this.projectRoot = options.projectRoot;
    this.maxWorkers = options.maxWorkers || 4;
    this.onFileChange = options.onFileChange;
    this.onFileAdd = options.onFileAdd;
    this.onFileDelete = options.onFileDelete;
    this.watcher = null;
  }

  start() {
    const libPath = path.join(this.projectRoot, 'lib');

    this.watcher = chokidar.watch(libPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    this.watcher.on('change', (filePath) => {
      if (filePath.endsWith('.dart')) {
        const relativePath = path.relative(this.projectRoot, filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        if (this.onFileChange) {
          this.onFileChange(relativePath, content);
        }
      }
    });

    this.watcher.on('add', (filePath) => {
      if (filePath.endsWith('.dart')) {
        const relativePath = path.relative(this.projectRoot, filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        if (this.onFileAdd) {
          this.onFileAdd(relativePath, content);
        }
      }
    });

    this.watcher.on('unlink', (filePath) => {
      if (filePath.endsWith('.dart')) {
        const relativePath = path.relative(this.projectRoot, filePath);
        if (this.onFileDelete) {
          this.onFileDelete(relativePath);
        }
      }
    });

    this.watcher.on('error', (error) => {
      console.error('File watcher error:', error);
    });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}

module.exports = FileWatcher;