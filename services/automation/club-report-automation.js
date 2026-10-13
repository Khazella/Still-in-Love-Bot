/**
 * Scheduled Club Report automation.
 *
 * Posts the equivalent of:
 *   /club-report club: First period: Current Week source: Uma.moe
 * DIRECTLY into the parent channel configured by BOT_AUTOMATION_CHANNEL_ID.
 *
 * Design notes:
 *   - The report is generated through the SAME shared logic as the manual
 *     slash command (services/club-report/generate.js) — no second report
 *     implementation, no simulated slash command.
 *   - The Discord channel ID is only ever read from process.env at runtime; it
 *     is never hardcoded or logged.
 *   - NO THREADS. The report image is sent straight to the automation channel
 *     via channel.send({ files: [club.png] }).
 *   - A self-correcting setTimeout chain computes the next run time after every
 *     execution, so the schedule never drifts (no fixed setInterval).
 *   - The scheduler is a singleton: init() is guarded so reconnects / repeated
 *     ready events / module reloads can never start a second timer.
 *   - Every failure path is caught and logged; the bot never crashes and simply
 *     waits for the next scheduled run.
 */

const logger = require('../logger');

const config =
    require('../../src/config/automation').clubReport;

const {
    generateClubReport
} = require('../club-report/generate');

const {
    computeNextRun,
    computeNextIntervalRun,
    formatJakarta
} = require('./schedule');

const {
    AttachmentBuilder
} = require('discord.js');

// =====================================================================
// SINGLETON STATE
// =====================================================================

let clientRef = null;
let initialized = false;
let timer = null;
let running = false;

// =====================================================================
// CHANNEL RESOLUTION
// =====================================================================

/**
 * Fetch the parent automation channel. Returns null (and logs) when the
 * channel ID is missing or the channel cannot be fetched, without throwing so
 * the caller can simply retry on the next scheduled run.
 *
 * @returns {Promise<import('discord.js').TextBasedChannel|null>}
 */
async function resolveParentChannel() {

    const channelId =
        process.env[config.channelIdEnv];

    if (!channelId) {
        logger.error(
            `[Automation] ${config.channelIdEnv} is not set; cannot resolve automation channel`
        );
        return null;
    }

    if (!clientRef) {
        logger.error(
            '[Automation] Discord client is not ready; cannot resolve automation channel'
        );
        return null;
    }

    return clientRef.channels
        .fetch(channelId)
        .catch(error => {
            logger.error(
                `[Automation] Failed to fetch automation channel (${config.channelIdEnv})`,
                error
            );
            return null;
        });

}

// =====================================================================
// RUN
// =====================================================================

/**
 * Generate and post one Club Report directly into the automation channel.
 * Safe to call on demand for verification as it never touches the schedule.
 *
 * On failure the technical error is logged server-side and the bot simply
 * waits for the next scheduled run — it never crashes. No thread is involved.
 */
async function runScheduledReport() {

    if (running) {
        logger.warn(
            '[Automation] Club Report run skipped — a previous run is still in progress'
        );
        return;
    }

    running = true;

    logger.info('[Automation] Running scheduled Club Report');

    try {

        const channel =
            await resolveParentChannel();

        if (!channel) {
            throw new Error(
                'Automation channel is unavailable (missing ID or fetch failed)'
            );
        }

        const { imageBuffer } =
            await generateClubReport({
                club: config.club,
                period: config.period,
                source: config.source
            });

        const attachment =
            new AttachmentBuilder(
                imageBuffer,
                {
                    name: 'club.png'
                }
            );

        await channel.send({
            files: [attachment]
        });

        logger.info('[Automation] Club Report posted successfully');

    } catch (error) {

        logger.error('Automation Club Report run', error);

    } finally {

        running = false;

    }

}

// =====================================================================
// SCHEDULING LIFECYCLE
// =====================================================================

/**
 * (Re)compute the next run time and arm a single self-correcting timer. Any
 * previously armed timer is cleared first, guaranteeing at most one pending
 * timer exists.
 *
 * Two modes, both read from src/config/automation.js:
 *   - intervalMinutes set  -> every-N-minute test schedule (e.g. 15 ->
 *                             :00/:15/:30/:45)
 *   - intervalMinutes null -> production hourly schedule at HH:<minute>
 *
 * @returns {Date} the next run instant
 */
function scheduleNext() {

    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    const now = new Date();

    const next =
        config.intervalMinutes
            ? computeNextIntervalRun(now, config.intervalMinutes)
            : computeNextRun(now, config.minute);

    const delay = Math.max(0, next.getTime() - now.getTime());

    timer = setTimeout(() => {
        logger
            .createContext(() => runScheduledReport())
            .catch(error =>
                logger.error('Automation Club Report run', error)
            )
            .finally(() => scheduleNext());
    }, delay);

    logger.info(
        `[Automation] Next Club Report scheduled for ${formatJakarta(next)}`
    );

    return next;

}

/**
 * Initialize the Club Report automation exactly once.
 *
 * Must be called from the clientReady handler. If BOT_AUTOMATION_CHANNEL_ID is
 * missing the automation is disabled (logged) without crashing the bot. The
 * scheduler never posts immediately on startup — it only waits for the next
 * scheduled run.
 *
 * @param {import('discord.js').Client} client
 * @returns {Promise<Date|null>} the next scheduled run instant, or null when disabled
 */
async function init(client) {

    if (initialized) {
        logger.warn(
            '[Automation] Club Report scheduler already initialized — ignoring duplicate init'
        );
        return null;
    }

    initialized = true;
    clientRef = client;

    if (!process.env[config.channelIdEnv]) {

        logger.error(
            `[Automation] ${config.channelIdEnv} is not set — Club Report automation is DISABLED`
        );

        return null;

    }

    logger.info('[Automation] Club Report scheduler initialized');

    return scheduleNext();

}

module.exports = {
    init,
    runScheduledReport,
    scheduleNext,
    resolveParentChannel,
    // exposed for tests
    computeNextRun,
    computeNextIntervalRun,
    formatJakarta
};
