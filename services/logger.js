/**
 * Production-style logger with request IDs, WIB timestamps,
 * daily log rotation, and 30-day auto-cleanup.
 *
 * Log levels (LOG_LEVEL env var):
 *   DEBUG  – everything to console + file
 *   INFO   – INFO/ERROR to console, everything to file (default)
 *   ERROR  – ERROR only to console + file
 *   QUIET  – everything suppressed
 *
 * Console output (LOG_LEVEL=INFO):
 *   [INFO]  command start, command done, warnings
 *   [ERROR] errors with stack trace
 *
 * File output (daily logs/YYYY-MM-DD.log):
 *   [DEBUG] handler, service, calc, render, puppeteer
 *   [INFO]  command, done
 *   [ERROR] errors with stack trace
 *
 * Usage:
 *   const logger = require('./services/logger');
 *
 *   // Wrap an interaction in a request context:
 *   logger.createContext(() => handleInteraction(interaction));
 *
 *   // Inside the context, all calls automatically include the reqId:
 *   logger.command('/trainer');
 *   logger.handler('handleLocalCommand');
 *   logger.service('trainer.generateWeeklyReport()', 126); // with timing
 *   logger.done('/trainer', 4347);
 *   logger.error('/trainer', new Error('...'));
 */

const { AsyncLocalStorage } = require('async_hooks');
const fs = require('fs');
const path = require('path');

// =====================================================================
// CONFIG
// =====================================================================

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_RETENTION_DAYS = 30;

const LEVEL = {
    QUIET: 0,
    ERROR: 1,
    INFO: 2,
    DEBUG: 3
};

const LEVEL_NAMES = {
    QUIET: 'QUIET',
    ERROR: 'ERROR',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

const envLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
const CURRENT_LEVEL = LEVEL[envLevel] !== undefined ? LEVEL[envLevel] : LEVEL.INFO;

// =====================================================================
// ASYNC LOCAL STORAGE
// =====================================================================

const als = new AsyncLocalStorage();

function currentStore() {
    return als.getStore();
}

function reqId() {
    const store = currentStore();
    return store?.reqId || '------';
}

// =====================================================================
// REQUEST ID GENERATION
// =====================================================================

function generateReqId() {
    return Math.random()
        .toString(16)
        .substring(2, 6)
        .toUpperCase();
}

// =====================================================================
// TIMESTAMP (Asia/Jakarta – WIB, UTC+7)
// =====================================================================

function toJakarta(date) {
    // UTC+7 offset in milliseconds
    const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
    return new Date(date.getTime() + JAKARTA_OFFSET_MS + date.getTimezoneOffset() * 60 * 1000);
}

function formatTimestamp(date) {
    const jkt = toJakarta(date);
    const y = jkt.getFullYear();
    const mo = String(jkt.getMonth() + 1).padStart(2, '0');
    const d = String(jkt.getDate()).padStart(2, '0');
    const h = String(jkt.getHours()).padStart(2, '0');
    const mi = String(jkt.getMinutes()).padStart(2, '0');
    const s = String(jkt.getSeconds()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}:${s} WIB`;
}

function dateKey(date) {
    const jkt = toJakarta(date);
    const y = jkt.getFullYear();
    const mo = String(jkt.getMonth() + 1).padStart(2, '0');
    const d = String(jkt.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
}

// =====================================================================
// LOG FILE MANAGEMENT
// =====================================================================

function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    return LOG_DIR;
}

function logFilePath() {
    return path.join(ensureLogDir(), `${dateKey(new Date())}.log`);
}

function appendToFile(message) {
    try {
        fs.appendFileSync(logFilePath(), message + '\n');
    } catch (err) {
        console.error(`[LOGGER] Failed to write log file: ${err.message}`);
    }
}

// =====================================================================
// OLD LOG CLEANUP
// =====================================================================

function cleanupOldLogs() {
    try {
        if (!fs.existsSync(LOG_DIR)) return;

        const now = new Date();
        const cutoff = toJakarta(now);
        cutoff.setDate(cutoff.getDate() - LOG_RETENTION_DAYS);
        // Set to end of that day in WIB
        cutoff.setHours(23, 59, 59, 999);

        const files = fs.readdirSync(LOG_DIR);
        for (const file of files) {
            if (!file.endsWith('.log')) continue;
            const dateStr = file.replace('.log', '');
            // Parse as YYYY-MM-DD in WIB
            const [y, m, d] = dateStr.split('-').map(Number);
            const fileDate = new Date(Date.UTC(y, m - 1, d, 23, 59, 59) - 7 * 60 * 60 * 1000);
            if (fileDate < cutoff) {
                fs.unlinkSync(path.join(LOG_DIR, file));
            }
        }
    } catch (err) {
        console.error(`[LOGGER] Cleanup error: ${err.message}`);
    }
}

// Run cleanup once at startup, then once per day
cleanupOldLogs();
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

// =====================================================================
// CORE LOG FUNCTION
// =====================================================================

/**
 * @param {'DEBUG'|'INFO'|'ERROR'} level
 * @param {string} tag            – e.g. COMMAND, SERVICE, CALC, RENDER, DONE
 * @param {string} message
 * @param {number|null} duration  – elapsed ms (optional)
 * @param {Error|null} error      – Error object (optional, for ERROR level)
 */
function writeLog(level, tag, message, duration, error) {
    // QUIET suppresses everything
    if (CURRENT_LEVEL <= LEVEL.QUIET) return;

    const levelNum = LEVEL[level];
    const id = reqId();
    const ts = formatTimestamp(new Date());
    const dur = duration != null ? ` (${duration}ms)` : '';
    const base = `${ts} [${level}] [${id}] [${tag}] ${message}${dur}`;

    // ---- FILE: write if this level passes the file threshold ----
    // At INFO level the file also captures DEBUG so you get the full trace.
    const fileThreshold =
        CURRENT_LEVEL === LEVEL.INFO
            ? LEVEL.DEBUG   // file gets everything
            : CURRENT_LEVEL; // file matches the configured level

    if (levelNum <= fileThreshold) {
        if (error) {
            appendToFile(base);
            appendToFile(`Error: ${error.message}`);
            if (error.stack) {
                for (const line of error.stack.split('\n')) {
                    appendToFile(line);
                }
            }
        } else {
            appendToFile(base);
        }
    }

    // ---- CONSOLE: only show at or above the configured level ----
    if (levelNum <= CURRENT_LEVEL) {
        if (error) {
            console.error(base);
            console.error(`Error: ${error.message}`);
            if (error.stack) {
                console.error(error.stack);
            }
        } else if (level === 'ERROR') {
            console.error(base);
        } else {
            console.log(base);
        }
    }
}

// =====================================================================
// LOGGER PUBLIC API
// =====================================================================

const logger = {

    // ---- Context management ----

    /**
     * Run an async function inside a request-scoped context.
     * Generates a short request ID that is automatically included
     * in all log calls made within the function (including nested
     * async calls).
     *
     * @param {Function} fn – async function to wrap
     * @returns {Promise<any>} resolved value of fn
     *
     * @example
     *   logger.createContext(() => handleLocalCommand(interaction, client));
     */
    createContext(fn) {
        const context = { reqId: generateReqId(), startTime: Date.now() };
        return als.run(context, fn);
    },

    /**
     * Return the current request ID (useful for debugging).
     */
    getReqId() {
        return reqId();
    },

    // ---- Logging methods ----

    /**
     * Log a command start. (INFO – console + file)
     * @param {string} cmd – e.g. "/trainer"
     */
    command(cmd) {
        writeLog('INFO', 'COMMAND', cmd);
    },

    /**
     * Log a handler entry. (DEBUG – file only)
     * @param {string} name – e.g. "handleLocalCommand"
     */
    handler(name) {
        writeLog('DEBUG', 'HANDLER', `${name}()`);
    },

    /**
     * Log a service call. (DEBUG – file only)
     * @param {string} name     – e.g. "trainer.generateWeeklyReport()"
     * @param {number} [duration] – elapsed ms
     */
    service(name, duration) {
        writeLog('DEBUG', 'SERVICE', name, duration);
    },

    /**
     * Log a calculation step. (DEBUG – file only)
     * @param {string} name – e.g. "getCurrentWeekInfo()"
     */
    calc(name) {
        writeLog('DEBUG', 'CALC', name);
    },

    /**
     * Log a renderer entry. (DEBUG – file only)
     * @param {string} name     – e.g. 'renderTemplate("club")'
     * @param {number} [duration] – elapsed ms
     */
    render(name, duration) {
        writeLog('DEBUG', 'RENDER', name, duration);
    },

    /**
     * Log a Puppeteer screenshot event. (DEBUG – file only)
     * @param {string} msg      – e.g. "Screenshot generated"
     * @param {number} [duration] – elapsed ms
     */
    puppeteer(msg, duration) {
        writeLog('DEBUG', 'PUPPETEER', msg, duration);
    },

    /**
     * Log a mention trigger. (INFO – console + file)
     *
     * @param {string} trigger – e.g. "translate" or "ai"
     */
    mention(trigger) {
        writeLog('INFO', 'MENTION', trigger);
    },

    /**
     * Log a webhook interaction step. (DEBUG – file only)
     *
     * @param {string} msg – e.g. "Sending request" or "Response received"
     * @param {number} [duration] – elapsed ms
     */
    webhook(msg, duration) {
        writeLog('DEBUG', 'WEBHOOK', msg, duration);
    },

    /**
     * Log a Discord API interaction. (DEBUG – file only)
     *
     * @param {string} msg – e.g. "Reply sent"
     */
    discord(msg) {
        writeLog('DEBUG', 'DISCORD', msg);
    },

    /**
     * Log a general info message. (INFO – console + file)
     * @param {string} message
     */
    info(message) {
        writeLog('INFO', 'INFO', message);
    },

    /**
     * Log a debug message. (DEBUG – file only, console only if LOG_LEVEL=DEBUG)
     * @param {string} message
     */
    debug(message) {
        writeLog('DEBUG', 'DEBUG', message);
    },

    /**
     * Log a warning. (INFO level – console + file)
     * @param {string} message
     */
    warn(message) {
        writeLog('INFO', 'WARN', message);
    },

    /**
     * Log an error with full stack trace.
     * Always appears on console AND file (unless QUIET).
     *
     * @param {string} context – e.g. "/trainer" or "trainer.generateWeeklyReport()"
     * @param {Error}  error
     */
    error(context, error) {
        writeLog('ERROR', 'ERROR', context, null, error);
    },

    /**
     * Log command completion. (INFO – console + file)
     *
     * @param {string} cmd  – e.g. "/trainer"
     * @param {number} ms   – elapsed milliseconds
     */
    done(cmd, ms) {
        writeLog('INFO', 'DONE', cmd, ms);
    }

};

module.exports = logger;
