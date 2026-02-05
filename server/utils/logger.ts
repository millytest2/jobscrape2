import fs from 'fs';

const LOG_FILE = '/tmp/scraper-debug.log';

export function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  
  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

export function clearLogFile() {
  try {
    fs.writeFileSync(LOG_FILE, '');
    logToFile('=== LOG CLEARED ===');
  } catch (error) {
    console.error('Failed to clear log:', error);
  }
}

export function readLogFile(): string {
  try {
    return fs.readFileSync(LOG_FILE, 'utf-8');
  } catch (error) {
    return 'Log file not found';
  }
}
