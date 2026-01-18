const chalk = require('chalk');
const ora = require('ora');
const { execSync, spawn } = require('child_process');
const Logger = require('../utils/logger');
const PlatformDetector = require('../utils/platform-detector');

module.exports = async function runIosCommand(options) {
  const logger = new Logger();
  const platform = new PlatformDetector();

  if (!platform.isMac()) {
    logger.error('iOS development requires macOS');
    logger.hint('You can only run iOS apps on a Mac computer');
    process.exit(1);
  }

  logger.info('Preparing to run on iOS');

  const spinner = ora('Checking iOS setup').start();

  try {
    execSync('xcodebuild -version', { stdio: 'ignore' });
    spinner.succeed('Xcode found');
  } catch (error) {
    spinner.fail('Xcode not found');
    logger.error('Xcode is not installed or not in PATH');
    logger.hint('Install Xcode from the Mac App Store');
    logger.hint('Run "xcode-select --install" to install command line tools');
    process.exit(1);
  }

  spinner.text = 'Looking for iOS devices and simulators';
  spinner.start();

  let devices;
  try {
    const output = execSync('xcrun simctl list devices available --json', { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    devices = [];

    for (const runtime in parsed.devices) {
      const runtimeDevices = parsed.devices[runtime];
      runtimeDevices.forEach(device => {
        if (device.isAvailable) {
          devices.push({
            id: device.udid,
            name: device.name,
            state: device.state,
            runtime: runtime
          });
        }
      });
    }

    if (devices.length === 0) {
      spinner.fail('No iOS simulators available');
      logger.error('No available iOS simulators found');
      logger.hint('Open Xcode and install iOS simulators');
      process.exit(1);
    }

    spinner.succeed(`Found ${devices.length} iOS simulator(s)`);
  } catch (error) {
    spinner.fail('Failed to list iOS devices');
    logger.error(error.message);
    process.exit(1);
  }

  let targetDevice;

  if (options.simulator) {
    const found = devices.find(d => d.name.toLowerCase().includes(options.simulator.toLowerCase()));
    if (!found) {
      logger.error(`Simulator "${options.simulator}" not found`);
      logger.info('Available simulators:');
      devices.forEach(d => logger.info(`  - ${d.name}`));
      process.exit(1);
    }
    targetDevice = found.id;
  } else if (options.device) {
    targetDevice = options.device;
  } else {
    const booted = devices.find(d => d.state === 'Booted');
    if (booted) {
      targetDevice = booted.id;
      logger.info(`Using booted simulator: ${booted.name}`);
    } else {
      targetDevice = devices[0].id;
      logger.info(`Using simulator: ${devices[0].name}`);
    }
  }

  if (options.bundler) {
    logger.info('Starting bundler server');
    const startCommand = require('./start');
    await startCommand({ port: options.port, qr: false, clear: false });
  }

  spinner.text = `Building and running on iOS simulator`;
  spinner.start();

  const flutterArgs = [
    'run',
    '-d', targetDevice,
    '--${options.configuration.toLowerCase()}'
  ];

  if (options.scheme) {
    flutterArgs.push('--flavor', options.scheme);
  }

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
      spinner.succeed('App running on iOS simulator');
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