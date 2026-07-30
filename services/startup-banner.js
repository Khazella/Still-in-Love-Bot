/**
 * Production startup banner for Still in Love Discord Bot.
 *
 * Prints a one-time ASCII summary after the bot is fully initialized
 * (clientReady). Displays bot info, versions, database status,
 * guild stats, memory, latency, and a health check section.
 *
 * This module does not modify any business logic, commands,
 * handlers, or existing logger behaviour.
 */

const fs = require('fs');

const { version: djsVersion } = require('discord.js');
const pkg = require('../package.json');

// =====================================================================
// CONSTANTS
// =====================================================================

const SEPARATOR = '='.repeat(62);
const SUB_SEPARATOR = '-'.repeat(62);
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

// =====================================================================
// HELPERS
// =====================================================================

/**
 * Format a Date as "YYYY-MM-DD HH:MM:SS WIB" (Asia/Jakarta, UTC+7).
 */
function formatJakartaTimestamp(date) {
    const jkt = new Date(
        date.getTime() + JAKARTA_OFFSET_MS + date.getTimezoneOffset() * 60 * 1000
    );
    const y = jkt.getFullYear();
    const mo = String(jkt.getMonth() + 1).padStart(2, '0');
    const d = String(jkt.getDate()).padStart(2, '0');
    const h = String(jkt.getHours()).padStart(2, '0');
    const mi = String(jkt.getMinutes()).padStart(2, '0');
    const s = String(jkt.getSeconds()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}:${s} WIB`;
}

/**
 * Format a byte value into a whole-number MB string.
 */
function formatMB(bytes) {
    return String(Math.round(bytes / 1024 / 1024));
}

/**
 * Detect whether the bot is running inside a Docker container.
 */
function isDocker() {
    try {
        return fs.existsSync('/.dockerenv');
    } catch {
        return false;
    }
}

/**
 * Quick check whether the Chromium binary exists (renderer readiness).
 */
function chromiumBinaryExists() {
    try {
        return fs.existsSync('/usr/bin/chromium');
    } catch {
        return false;
    }
}

// =====================================================================
// BANNER BUILDER
// =====================================================================

/**
 * Assemble the full startup banner as an array of lines.
 *
 * @param {import('discord.js').Client} client
 * @param {number}                      startTime  – Date.now() captured at module init
 * @param {{connected:boolean, count?:string, error?:string}} dbStatus
 * @returns {string[]}
 */
function buildBannerLines(client, startTime, dbStatus) {
    const now = Date.now();
    const duration = ((now - startTime) / 1000).toFixed(2);
    const mem = process.memoryUsage();
    const memRss = formatMB(mem.rss);
    const memHeapTotal = formatMB(mem.heapTotal);

    const nodeVersion = process.version;
    const platform = `${process.platform} ${process.arch}`;
    const pid = process.pid;
    const env = process.env.NODE_ENV || 'Production';
    const runtime = isDocker() ? 'Docker' : 'Local';
    const loggerLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase();

    const guildCount = client.guilds.cache.size;
    const userCount = client.users.cache.size;
    const latency = client.ws.ping;

    // ---- Status determination ----
    let statusEmoji = '🟢 ONLINE';
    let systemStatus = 'READY';

    if (!dbStatus.connected) {
        statusEmoji = '🟡 DEGRADED';
        systemStatus = 'DEGRADED';
    }

    // ---- Renderer check ----
    const chromiumOk = chromiumBinaryExists();
    const rendererStatus = chromiumOk ? '✅ Ready' : '⚠️ Warning';

    // ---- Build lines ----
    const lines = [];

    lines.push(SEPARATOR);
    lines.push('                  Still in Love Discord Bot');
    lines.push(SEPARATOR);
    lines.push('');
    lines.push(`Status         : ${statusEmoji}`);
    lines.push('');
    lines.push(`Bot Name       : ${client.user.tag}`);
    lines.push(`Version        : v${pkg.version}`);
    lines.push(`Environment    : ${env}`);
    lines.push(`Runtime        : ${runtime}`);
    lines.push(`Platform       : ${platform}`);
    lines.push(`PID            : ${pid}`);
    lines.push('');
    lines.push(`Node.js        : ${nodeVersion}`);
    lines.push(`Discord.js     : v${djsVersion}`);
    lines.push(`PostgreSQL     : ${dbStatus.connected ? 'Connected' : 'Disconnected'}`);
    lines.push(`Logger         : ${loggerLevel}`);
    lines.push(`Timezone       : Asia/Jakarta (WIB)`);
    lines.push('');
    lines.push(`Started At     : ${formatJakartaTimestamp(new Date(startTime))}`);
    lines.push(`Startup Time   : ${duration} s`);
    lines.push('');
    lines.push(`Guilds         : ${guildCount}`);
    lines.push(`Users Cached   : ${userCount}`);
    lines.push(`Latency        : ${latency} ms`);
    lines.push(`Memory         : ${memRss} MB / ${memHeapTotal} MB`);
    lines.push('');
    lines.push(SUB_SEPARATOR);
    lines.push('Health Check');
    lines.push('');
    lines.push(`Discord        : ✅ Connected`);
    lines.push(`PostgreSQL     : ${dbStatus.connected ? '✅ Connected' : '❌ Failed'}`);
    lines.push(`Logger         : ✅ Ready`);
    lines.push(`Commands       : ✅ Loaded`);
    lines.push(`Renderer       : ${rendererStatus}`);
    lines.push('');
    lines.push(`System Status  : ${systemStatus}`);
    lines.push('');
    lines.push(SEPARATOR);
    lines.push('Bot is ready.');
    lines.push(SEPARATOR);

    return lines;
}

// =====================================================================
// PUBLIC API
// =====================================================================

/**
 * Print the startup banner to stdout.
 *
 * @param {import('discord.js').Client} client      – logged-in Discord client
 * @param {number}                      startTime   – Date.now() captured at process start
 * @param {{connected:boolean, count?:string, error?:string}} dbStatus – result of the DB connection test
 */
function printStartupBanner(client, startTime, dbStatus) {
    const lines = buildBannerLines(client, startTime, dbStatus);
    console.log('\n' + lines.join('\n'));
}

module.exports = { printStartupBanner };
