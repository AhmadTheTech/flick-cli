const chalk = require('chalk');
const { execSync } = require('child_process');
const Logger = require('../utils/logger');
const PlatformDetector = require('../utils/platform-detector');

module.exports = async function doctorCommand(options) {
  const logger = new Logger();
  const platform = new PlatformDetector();

  console.log(chalk.cyan('\nRunning Flick diagnostics...\n'));

  const checks = [];

  checks.push({
    name: 'Node.js',
    command: 'node --version',
    required: true
  });

  checks.push({
    name: 'npm',
    command: 'npm --version',
    required: true
  });

  checks.push({
    name: 'Flutter',
    command: 'flutter --version',
    required: true
  });

  checks.push({
    name: 'Dart',
    command: 'dart --version',
    required: true
  });

  if (!options.ios || options.android !== false) {
    checks.push({
      name: 'Android SDK',
      command: 'adb --version',
      required: false,
      platform: 'android'
    });
  }

  if (platform.isMac() && (!options.android || options.ios !== false)) {
    checks.push({
      name: 'Xcode',
      command: 'xcodebuild -version',
      required: false,
      platform: 'ios'
    });

    checks.push({
      name: 'CocoaPods',
      command: 'pod --version',
      required: false,
      platform: 'ios'
    });
  }

  checks.push({
    name: 'Git',
    command: 'git --version',
    required: false
  });

  const results = [];

  for (const check of checks) {
    try {
      const output = execSync(check.command, { encoding: 'utf8', stdio: 'pipe' });
      const version = output.split('\n')[0].trim();
      
      results.push({
        name: check.name,
        status: 'success',
        version,
        required: check.required
      });

      console.log(
        chalk.green('[OK]'),
        check.name.padEnd(20),
        chalk.gray(version)
      );

      if (options.verbose && check.platform) {
        console.log(chalk.gray(`     Platform: ${check.platform}`));
      }

    } catch (error) {
      results.push({
        name: check.name,
        status: 'failed',
        required: check.required
      });

      const symbol = check.required ? chalk.red('[FAIL]') : chalk.yellow('[WARN]');
      console.log(
        symbol,
        check.name.padEnd(20),
        chalk.gray('not found')
      );

      if (check.required) {
        console.log(chalk.red(`     ${check.name} is required for Flick to work`));
      }
    }
  }

  console.log();

  const failed = results.filter(r => r.status === 'failed' && r.required);
  const warnings = results.filter(r => r.status === 'failed' && !r.required);

  if (failed.length > 0) {
    console.log(chalk.red.bold(`${failed.length} required check(s) failed\n`));
    console.log(chalk.yellow('Please install the missing requirements:\n'));
    
    failed.forEach(f => {
      console.log(chalk.yellow(`  - ${f.name}`));
      
      if (f.name === 'Flutter') {
        console.log(chalk.gray('    Visit: https://flutter.dev/docs/get-started/install'));
      } else if (f.name === 'Node.js') {
        console.log(chalk.gray('    Visit: https://nodejs.org/'));
      }
    });
    
    console.log();
    process.exit(1);
  } else {
    console.log(chalk.green.bold('All required checks passed!\n'));
    
    if (warnings.length > 0) {
      console.log(chalk.yellow(`${warnings.length} optional check(s) failed:`));
      warnings.forEach(w => {
        console.log(chalk.yellow(`  - ${w.name} (optional for ${w.platform || 'development'})`));
      });
      console.log();
    }

    console.log(chalk.cyan('Flick is ready to use!'));
    console.log(chalk.gray('Run "flick start" in your Flutter project to begin\n'));
  }
};