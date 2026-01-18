const chalk = require('chalk');

class Logger {
  info(message) {
    console.log(chalk.blue('[INFO]'), message);
  }

  success(message) {
    console.log(chalk.green('[SUCCESS]'), message);
  }

  warn(message) {
    console.log(chalk.yellow('[WARN]'), message);
  }

  error(message) {
    console.log(chalk.red('[ERROR]'), message);
  }

  hint(message) {
    console.log(chalk.gray('  Hint:'), chalk.gray(message));
  }

  debug(message) {
    if (process.env.DEBUG) {
      console.log(chalk.magenta('[DEBUG]'), message);
    }
  }

  log(message) {
    console.log(message);
  }
}

module.exports = Logger;