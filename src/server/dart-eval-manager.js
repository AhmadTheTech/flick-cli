const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Logger = require('../utils/logger');

class DartEvalManager {
  constructor() {
    this.logger = new Logger();
    this.cacheDir = path.join(os.homedir(), '.flick', 'eval_cache');
    this.compiledModules = new Map();
    this.isInstalled = false;
    this.checkInstallation();
  }

  checkInstallation() {
    try {
      execSync('dart pub global list | grep dart_eval', { 
        stdio: 'ignore',
        shell: true 
      });
      this.isInstalled = true;
    } catch (error) {
      this.isInstalled = false;
      this.logger.warn('dart_eval not found, will install when needed');
    }
  }

  async installDartEval() {
    if (this.isInstalled) return;

    this.logger.info('Installing dart_eval...');
    
    return new Promise((resolve, reject) => {
      const process = spawn('dart', ['pub', 'global', 'activate', 'dart_eval'], {
        stdio: 'pipe',
        shell: true
      });

      process.on('close', (code) => {
        if (code === 0) {
          this.isInstalled = true;
          this.logger.success('dart_eval installed successfully');
          resolve();
        } else {
          reject(new Error('Failed to install dart_eval'));
        }
      });

      process.on('error', reject);
    });
  }

  async compile(dartCode, moduleName) {
    if (!this.isInstalled) {
      try {
        await this.installDartEval();
      } catch (error) {
        throw new Error(`Failed to install dart_eval: ${error.message}`);
      }
    }

    const tempDir = path.join(this.cacheDir, `temp_${Date.now()}`);
    const tempFile = path.join(tempDir, `${moduleName}.dart`);
    const outputFile = path.join(tempDir, `${moduleName}.dill`);

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(tempFile, dartCode);

    return new Promise((resolve, reject) => {
      const process = spawn('dart', [
        'eval',
        'compile',
        '-o', outputFile,
        tempFile
      ], {
        stdio: 'pipe',
        cwd: tempDir
      });

      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        setTimeout(() => {
          try {
            if (code === 0 && fs.existsSync(outputFile)) {
              const bytecode = fs.readFileSync(outputFile);
              const moduleId = `${moduleName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

              this.compiledModules.set(moduleId, {
                bytecode,
                moduleName,
                compiledAt: Date.now(),
                size: bytecode.length
              });

              // Cleanup temp directory
              this.cleanupDirectory(tempDir);

              resolve({
                success: true,
                moduleId,
                moduleName,
                size: bytecode.length,
                timestamp: Date.now()
              });
            } else {
              this.cleanupDirectory(tempDir);
              reject(new Error(`Compilation failed: ${stderr || 'Unknown error'}`));
            }
          } catch (error) {
            this.cleanupDirectory(tempDir);
            reject(error);
          }
        }, 100);
      });

      process.on('error', (error) => {
        this.cleanupDirectory(tempDir);
        reject(error);
      });
    });
  }

  getModule(moduleId) {
    return this.compiledModules.get(moduleId);
  }

  cleanupDirectory(dir) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup directory: ${dir}`);
    }
  }

  clearCache() {
    this.compiledModules.clear();
    this.cleanupDirectory(this.cacheDir);
  }
}

module.exports = DartEvalManager;
