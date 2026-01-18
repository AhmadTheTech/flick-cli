module.exports = {
  DEFAULT_PORT: 8765,
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  WEBSOCKET_PING_INTERVAL: 30000,
  FILE_WATCH_DEBOUNCE: 300,
  SUPPORTED_DART_EXTENSIONS: ['.dart'],
  IGNORED_PATTERNS: [
    '**/*.g.dart',
    '**/*.freezed.dart',
    '**/build/**',
    '**/.dart_tool/**',
    '**/.*'
  ],
  CONNECTION_TIMEOUT: 10000,
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000
};