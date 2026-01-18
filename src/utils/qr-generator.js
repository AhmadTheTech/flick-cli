const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');

class QRGenerator {
  generateTerminal(url) {
    qrcode.generate(url, { small: true });
  }

  async generateImage(url, outputPath) {
    try {
      await QRCode.toFile(outputPath, url, {
        width: 400,
        margin: 2
      });
      return outputPath;
    } catch (error) {
      throw new Error(`Failed to generate QR code image: ${error.message}`);
    }
  }

  async generateDataUrl(url) {
    try {
      return await QRCode.toDataURL(url, {
        width: 400,
        margin: 2
      });
    } catch (error) {
      throw new Error(`Failed to generate QR code data URL: ${error.message}`);
    }
  }
}

module.exports = QRGenerator;