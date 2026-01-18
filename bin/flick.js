#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');
const startCommand = require('../src/commands/start');
const runAndroidCommand = require('../src/commands/run-android');
const runIosCommand = require('../src/commands/run-ios');
const doctorCommand = require('../src/commands/doctor');
const installCommand = require('../src/commands/install');

const notifier = updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 * 24 });
if (notifier.update) {
  notifier.notify({
    message: 'Update available: {currentVersion} -> {latestVersion}\nRun npm install -g flick-cli to update'
  });
}

const program = new Command();

console.log(chalk.cyan(`
${'='.repeat(50)}
                                       
         Flick for Flutter         
    Preview apps instantly - v${pkg.version}    
                                       
${'='.repeat(50)}
`));

program
  .name('flick')
  .description('Preview your Flutter app instantly - like Expo Go')
  .version(pkg.version);

program
  .command('start')
  .description('Start development server and show QR code')
  .option('-p, --port <port>', 'Port number for the server', '8765')
  .option('-h, --host <host>', 'Host address (auto-detected by default)')
  .option('--no-qr', 'Do not display QR code in terminal')
  .option('--clear', 'Clear terminal before starting')
  .option('--https', 'Enable HTTPS for the development server')
  .option('--max-workers <number>', 'Maximum number of file watchers', '4')
  .option('--tunnel', 'Enable tunneling for remote access')
  .action(startCommand);

program
  .command('run:android')
  .description('Build and run app on Android device or emulator')
  .option('-d, --device <deviceId>', 'Specific device ID to run on')
  .option('--variant <variant>', 'Build variant (debug/release)', 'debug')
  .option('--no-bundler', 'Do not start the bundler automatically')
  .option('--port <port>', 'Port number for the bundler', '8765')
  .action(runAndroidCommand);

program
  .command('run:ios')
  .description('Build and run app on iOS device or simulator (Mac only)')
  .option('-d, --device <deviceId>', 'Specific device ID or simulator name')
  .option('--simulator <name>', 'Simulator to use (e.g., "iPhone 15 Pro")')
  .option('--configuration <config>', 'Build configuration (Debug/Release)', 'Debug')
  .option('--scheme <scheme>', 'Xcode scheme to build')
  .option('--no-bundler', 'Do not start the bundler automatically')
  .option('--port <port>', 'Port number for the bundler', '8765')
  .action(runIosCommand);

program
  .command('doctor')
  .description('Check system requirements and Flutter installation')
  .option('--verbose', 'Show detailed diagnostic information')
  .option('--android', 'Check Android-specific requirements only')
  .option('--ios', 'Check iOS-specific requirements only')
  .action(doctorCommand);

program
  .command('install')
  .description('Install Flick configuration in your Flutter project')
  .option('--skip-dependencies', 'Skip installing additional dependencies')
  .option('--force', 'Overwrite existing Flick configuration')
  .action(installCommand);

program
  .command('whoami')
  .description('Display current Flick configuration')
  .action(() => {
    const config = require('../src/utils/config-manager');
    console.log(chalk.cyan('\nFlick Configuration:'));
    console.log(chalk.gray('  Version:'), pkg.version);
    console.log(chalk.gray('  Default Port:'), config.get('port') || '8765');
    console.log(chalk.gray('  Cache Directory:'), config.getCacheDir());
    console.log();
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}