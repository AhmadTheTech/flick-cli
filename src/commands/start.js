// start.js (UPDATED)
const chalk = require('chalk');
const ora = require('ora');
const FlutterValidator = require('../utils/flutter-validator');
const EnhancedHttpServer = require('../server/http-server');
const EnhancedWebSocketServer = require('../server/websocket-server');
const FileWatcher = require('../server/file-watcher');
const DartEvalManager = require('../server/dart-eval-manager');
const QRGenerator = require('../utils/qr-generator');
const Logger = require('../utils/logger');
const ip = require('ip');

module.exports = async function startCommand(options) {
  const logger = new Logger();
  
  if (options.clear) {
    console.clear();
  }

  const validator = new FlutterValidator(process.cwd());
  const spinner = ora('Validating Flutter project').start();
  
  try {
    await validator.validate();
    spinner.succeed('Flutter project validated');
  } catch (error) {
    spinner.fail('Validation failed');
    logger.error(error.message);
    logger.hint('Make sure you are in a Flutter project directory');
    logger.hint('Run "flick doctor" to check your setup');
    process.exit(1);
  }

  spinner.text = 'Loading project files';
  spinner.start();
  
  let projectData;
  try {
    projectData = await validator.getProjectData();
    spinner.succeed(`Loaded ${Object.keys(projectData.files).length} Dart files`);
  } catch (error) {
    spinner.fail('Failed to load project');
    logger.error(error.message);
    process.exit(1);
  }

  const host = options.host || ip.address();
  const port = parseInt(options.port);

  // Initialize dart_eval manager
  const evalManager = new DartEvalManager();
  spinner.text = 'Checking dart_eval installation';
  spinner.start();
  
  try {
    if (!evalManager.isInstalled) {
      spinner.text = 'Installing dart_eval (this may take a moment)';
      await evalManager.installDartEval();
    }
    spinner.succeed('dart_eval ready');
  } catch (error) {
    spinner.warn('dart_eval not available - compilation features disabled');
    logger.hint('Install it manually: dart pub global activate dart_eval');
  }

  spinner.text = 'Starting HTTP server';
  spinner.start();
  
  const httpServer = new EnhancedHttpServer({
    port,
    host,
    projectRoot: process.cwd(),
    projectData,
    evalManager,
    https: options.https
  });

  try {
    await httpServer.start();
    spinner.succeed(`HTTP server running on port ${port}`);
  } catch (error) {
    spinner.fail('Failed to start HTTP server');
    logger.error(error.message);
    
    if (error.code === 'EADDRINUSE') {
      logger.hint(`Port ${port} is already in use`);
      logger.hint(`Try using a different port with --port <number>`);
    }
    
    process.exit(1);
  }

  const wsServer = new EnhancedWebSocketServer({
    httpServer: httpServer.getServer(),
    projectData,
    projectRoot: process.cwd()
  });
  
  wsServer.start();
  logger.success('WebSocket server ready for connections');

  const watcher = new FileWatcher({
    projectRoot: process.cwd(),
    maxWorkers: parseInt(options.maxWorkers),
    onFileChange: (file, content) => {
      logger.info(`File changed: ${file}`);
      wsServer.broadcast({
        type: 'hot_reload',
        file,
        content,
        timestamp: Date.now()
      });
    },
    onFileAdd: (file, content) => {
      logger.info(`File added: ${file}`);
      projectData.files[file] = content;
      wsServer.broadcast({
        type: 'file_added',
        file,
        content,
        timestamp: Date.now()
      });
    },
    onFileDelete: (file) => {
      logger.info(`File deleted: ${file}`);
      delete projectData.files[file];
      wsServer.broadcast({
        type: 'file_deleted',
        file,
        timestamp: Date.now()
      });
    }
  });

  watcher.start();
  logger.success('Watching for file changes');

  const url = `flick://connect?host=${host}&port=${port}`;
  
  console.log('\n' + chalk.cyan('='.repeat(60)));
  console.log(chalk.green.bold('  Flick Server Running'));
  console.log(chalk.cyan('='.repeat(60)) + '\n');

  console.log(chalk.cyan('  Project:  ') + chalk.white(projectData.name));
  console.log(chalk.cyan('  Local:    ') + chalk.white(`http://localhost:${port}`));
  console.log(chalk.cyan('  Network:  ') + chalk.white(`http://${host}:${port}`));
  console.log(chalk.cyan('  dart_eval:') + chalk.white(evalManager.isInstalled ? ' ✓ Ready' : ' ✗ Not available'));
  console.log();

  if (options.qr) {
    const qrGenerator = new QRGenerator();
    console.log(chalk.yellow.bold('  Scan this QR code in Flick app:\n'));
    qrGenerator.generateTerminal(url);
    console.log();
  }

  console.log(chalk.gray('  Watching for changes...'));
  console.log(chalk.gray('  Press Ctrl+C to stop\n'));
  console.log(chalk.cyan('='.repeat(60)) + '\n');

  wsServer.on('client-connected', (clientInfo) => {
    logger.success(`Device connected: ${clientInfo.ip}`);
    logger.info(`Active connections: ${wsServer.getClientCount()}`);
  });

  wsServer.on('client-disconnected', (clientInfo) => {
    logger.warn(`Device disconnected: ${clientInfo.ip}`);
    logger.info(`Active connections: ${wsServer.getClientCount()}`);
  });

  wsServer.on('client-message', (message) => {
    if (message.type === 'log') {
      logger.info(`[Device] ${message.message}`);
    } else if (message.type === 'error') {
      logger.error(`[Device] ${message.error}`);
    }
  });

  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\nShutting down Flick server...\n'));
    
    watcher.stop();
    wsServer.stop();
    await httpServer.stop();
    
    logger.success('Server stopped successfully');
    process.exit(0);
  });
};
