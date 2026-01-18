const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const ora = require('ora');
const Logger = require('../utils/logger');

module.exports = async function installCommand(options) {
  const logger = new Logger();
  const projectRoot = process.cwd();

  const pubspecPath = path.join(projectRoot, 'pubspec.yaml');
  if (!fs.existsSync(pubspecPath)) {
    logger.error('Not a Flutter project');
    logger.hint('Run this command in a Flutter project directory');
    process.exit(1);
  }

  logger.info('Installing Flick in your Flutter project');

  const flickDir = path.join(projectRoot, '.flick');
  const configPath = path.join(flickDir, 'config.json');

  if (fs.existsSync(configPath) && !options.force) {
    logger.warn('Flick is already installed in this project');
    logger.hint('Use --force to reinstall');
    process.exit(0);
  }

  const spinner = ora('Creating Flick configuration').start();

  if (!fs.existsSync(flickDir)) {
    fs.mkdirSync(flickDir, { recursive: true });
  }

  const config = {
    version: '1.0.0',
    projectId: generateProjectId(),
    createdAt: new Date().toISOString(),
    settings: {
      port: 8765,
      autoReload: true,
      watchIgnore: [
        '*.g.dart',
        '*.freezed.dart',
        'build/',
        '.dart_tool/'
      ]
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignore.includes('.flick/')) {
      fs.appendFileSync(gitignorePath, '\n.flick/\n');
      spinner.text = 'Updated .gitignore';
    }
  }

  spinner.succeed('Flick configuration created');

  console.log();
  logger.success('Flick installed successfully!');
  console.log();
  console.log(chalk.cyan('  Next steps:'));
  console.log(chalk.gray('  1. Run "flick start" to start the development server'));
  console.log(chalk.gray('  2. Scan the QR code with your Flick mobile app'));
  console.log(chalk.gray('  3. Start developing!'));
  console.log();
};

function generateProjectId() {
  return 'flick_' + Math.random().toString(36).substring(2, 15);
}