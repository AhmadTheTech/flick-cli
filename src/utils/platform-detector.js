const os = require('os');

class PlatformDetector {
  constructor() {
    this.platform = os.platform();
  }

  isMac() {
    return this.platform === 'darwin';
  }

  isWindows() {
    return this.platform === 'win32';
  }

  isLinux() {
    return this.platform === 'linux';
  }

  getPlatformName() {
    if (this.isMac()) return 'macOS';
    if (this.isWindows()) return 'Windows';
    if (this.isLinux()) return 'Linux';
    return 'Unknown';
  }

  canRunIos() {
    return this.isMac();
  }

  canRunAndroid() {
    return true;
  }
}

module.exports = PlatformDetector;