# Flick CLI

Preview your Flutter apps instantly - like Expo Go for Flutter.

## Installation
```bash
npm install -g flick-cli
```

## Quick Start
```bash
cd my_flutter_app
flick start
```

Scan the QR code with the Flick mobile app and start developing!

## Commands

### flick start

Start the development server and display a QR code.
```bash
flick start [options]
```

Options:
- `-p, --port <port>` - Port number (default: 8765)
- `-h, --host <host>` - Host address (auto-detected)
- `--no-qr` - Don't display QR code
- `--clear` - Clear terminal before starting
- `--https` - Enable HTTPS
- `--max-workers <number>` - Max file watchers (default: 4)

### flick run:android

Build and run on Android device or emulator.
```bash
flick run:android [options]
```

Options:
- `-d, --device <deviceId>` - Specific device ID
- `--variant <variant>` - Build variant (debug/release)
- `--no-bundler` - Don't start bundler
- `--port <port>` - Bundler port

### flick run:ios

Build and run on iOS simulator (Mac only).
```bash
flick run:ios [options]
```

Options:
- `-d, --device <deviceId>` - Specific device ID
- `--simulator <name>` - Simulator name
- `--configuration <config>` - Build configuration
- `--no-bundler` - Don't start bundler

### flick doctor

Check system requirements.
```bash
flick doctor [options]
```

Options:
- `--verbose` - Show detailed information
- `--android` - Check Android requirements only
- `--ios` - Check iOS requirements only

### flick install

Install Flick configuration in your project.
```bash
flick install [options]
```

Options:
- `--skip-dependencies` - Skip dependency installation
- `--force` - Overwrite existing configuration

### flick whoami

Display current Flick configuration.
```bash
flick whoami
```

## Requirements

- Node.js 16 or higher
- Flutter SDK
- Dart SDK

For iOS development:
- macOS
- Xcode
- CocoaPods

For Android development:
- Android SDK
- ADB

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

Copyright 2026 Ahmad