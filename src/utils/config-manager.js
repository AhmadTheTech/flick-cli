const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.flick');
    this.configPath = path.join(this.configDir, 'config.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    if (!fs.existsSync(this.configPath)) {
      const defaultConfig = {
        port: 8765,
        autoUpdate: true,
        analytics: false
      };
      fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }

    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    } catch (error) {
      return {};
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }

  saveConfig() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  getCacheDir() {
    const cacheDir = path.join(this.configDir, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
  }

  getLogsDir() {
    const logsDir = path.join(this.configDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    return logsDir;
  }
}

module.exports = new ConfigManager();