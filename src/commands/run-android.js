const chalk = require('chalk');
const ora = require('ora');
const { execSync, spawn } = require('child_process');
const Logger = require('../utils/logger');
const PlatformDetector = require('../utils/platform-detector');

module.exports = async function runAndroidCommand(options) {
  const logger = new Logger();
  const platform = new PlatformDetector();

  logger.info('Preparing to run on Android');

  const spinner = ora('Checking Android setup').start();

  try {
    execSync('adb --version', { stdio: 'ignore' });
    spinner.succeed('ADB found');
  } catch (error) {
    spinner.fail('ADB not found');
    logger.error('Android Debug Bridge (adb) is not installed');
    logger.hint('Install Android SDK Platform Tools');
    logger.hint('Visit: https://developer.android.com/tools/releases/platform-tools');
    process.exit(1);
  }

  spinner.text = 'Looking for connected devices';
  spinner.start();

  let devices;
  try {
    const output = execSync('adb devices', { encoding: 'utf8' });
    devices = output
      .split('\n')
      .slice(1)
      .filter(line => line.trim() && !line.includes('List of devices'))
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return { id: parts[0], status: parts[1] };
      })
      .filter(device => device.status === 'device');

    if (devices.length === 0) {
      spinner.fail('No Android devices found');
      logger.error('No connected Android devices or emulators');
      logger.hint('Connect a device via USB or start an emulator');
      logger.hint('Run "adb devices" to see connected devices');
      process.exit(1);
    }

    spinner.succeed(`Found ${devices.length} Android device(s)`);
  } catch (error) {
    spinner.fail('Failed to list devices');
    logger.error(error.message);
    process.exit(1);
  }

  let targetDevice = devices[0].id;
  
  if (options.device) {
    const found = devices.find(d => d.id === options.device);
    if (!found) {
      logger.error(`Device ${options.device} not found`);
      logger.info('Available devices:');
      devices.forEach(d => logger.info(`  - ${d.id}`));
      process.exit(1);
    }
    targetDevice = options.device;
  } else if (devices.length > 1) {
    logger.warn('Multiple devices connected, using first device');
    logger.info(`Target device: ${targetDevice}`);
  }

  if (options.bundler) {
    logger.info('Starting bundler server');
    const startCommand = require('./start');
    await startCommand({ port: options.port, qr: false, clear: false });
  }

  spinner.text = `Building and installing on ${targetDevice}`;
  spinner.start();

  const flutterArgs = [
    'run',
    '-d', targetDevice,
    '--${options.variant}'
  ];

  const flutterProcess = spawn('flutter', flutterArgs, {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  flutterProcess.on('error', (error) => {
    spinner.fail('Failed to run Flutter');
    logger.error(error.message);
    process.exit(1);
  });

  flutterProcess.on('exit', (code) => {
    if (code === 0) {
      spinner.succeed('App running on Android device');
    } else {
      spinner.fail(`Flutter exited with code ${code}`);
      process.exit(code);
    }
  });

  process.on('SIGINT', () => {
    logger.info('Stopping Flutter');
    flutterProcess.kill();
    process.exit(0);
  });
};