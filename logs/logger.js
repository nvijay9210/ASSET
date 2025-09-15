const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.development') });

if (!process.env.PHOTO_URL) {
  throw new Error('PHOTO_URL not defined in .env.development file');
}

// Create logs folder
const logDir = path.join(process.env.PHOTO_URL, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

// Log file stream
const logFilePath = path.join(logDir, 'dev.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Helper to format arguments
const formatArg = (arg) => {
  if (arg instanceof Error) return `${arg.message}\n${arg.stack}`;
  if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
  return arg;
};

// Core logger
const writeLog = (level, message, req = null) => {
  const timestamp = new Date().toLocaleString();
  let operation = '';
  let url = '';

  if (req) {
    operation = req.method || '';
    url = req.originalUrl || req.url || '';
  }

  const logMsg = `[${level.toUpperCase()}] ${timestamp} ${operation ? '- ' + operation : ''} ${url ? '- ' + url : ''} - ${message}\n`;

  logStream.write(logMsg);

  if (level === 'error') process.stderr.write(`\x1b[31m${logMsg}\x1b[0m`);
  else if (level === 'warn') process.stdout.write(`\x1b[33m${logMsg}\x1b[0m`);
  else if (level === 'info') process.stdout.write(`\x1b[36m${logMsg}\x1b[0m`);
  else process.stdout.write(logMsg);
};

// Override global console
['log', 'info', 'warn', 'error'].forEach((method) => {
  const original = console[method];
  console[method] = function (...args) {
    const message = args.map(formatArg).join(' ');

    // Try to detect HTTP request from first argument
    const req = args.find(a => a && a.method && a.url);

    let level = method === 'log' ? 'info' : method;
    writeLog(level, message, req);

    original.apply(console, args);
  };
});

// Express middleware for request context
const logRequest = (req, res, next) => {
  // Capture every request start
  writeLog('info', 'Incoming request', req);

  // Capture response finish
  res.on('finish', () => {
    writeLog('info', `Response status ${res.statusCode}`, req);
  });

  next();
};

module.exports = {
  logFilePath,
  logStream,
  writeLog,
  logRequest
};
