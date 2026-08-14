const logger = require('../logger');
const config = require('../../src/config/trainer-timer');
const trainerTimerDb = require('../database/trainer-timer');
const timerMessage = require('./timer-message');

let clientRef = null;
let checkInterval = null;
let tickRunning = false;

// threadId -> { thread_id, message_id } cache of registered boards.
let boardCache = new Map();

// =====================================================================
// MESSAGE BUILDING HELPERS
// =====================================================================

/**
 * Pick one random completion message from the configured list.
 */
function pickCompletionMessage() {
    const messages = config.completionMessages;
    if (!Array.isArray(messages) || messages.length === 0) {
        return '<@USER_ID> Your trainer timer is finished!';
    }
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Build the completion notification content, mentioning the real user.
 *
 * @param {string} userId
 */
function buildCompletionContent(userId) {
    return pickCompletionMessage().replace(/<@USER_ID>/g, `<@${userId}>`);
}

// =====================================================================
// BOARD REFRESH
// =====================================================================

function getBoard(threadId) {
    return boardCache.get(threadId);
}

function clearBoardCache(threadId) {
    boardCache.delete(threadId);
}

/**
 * Refresh the persistent board message for a thread (if one is registered).
 *
 * @param {string} threadId
 */
async function refreshBoard(threadId) {
    const board = boardCache.get(threadId) ||
        await trainerTimerDb.getBoard(threadId);

    if (!board) {
        return false;
    }

    boardCache.set(threadId, board);

    try {
        return await timerMessage.updateBoard(clientRef, board);
    } catch (error) {
        logger.error(`trainer-timer.refreshBoard(${threadId})`, error);
        return false;
    }
}

// =====================================================================
// TIMER ACTIONS
// =====================================================================

/**
 * Start or reset a user's timer in a thread, then refresh the board.
 *
 * @param {string} threadId
 * @param {string} userId
 * @returns {Promise<Date>} the new ends_at
 */
async function startOrResetTimer(threadId, userId) {
    const now = new Date();
    const endsAt = new Date(now.getTime() + config.durationMinutes * 60 * 1000);

    await trainerTimerDb.startTimer(userId, threadId, now, endsAt);
    await refreshBoard(threadId);

    return endsAt;
}

/**
 * Handle one expired timer: send its completion notification and mark the
 * timer completed in the database. Does NOT update the board itself — the
 * caller (checkExpirations) batches a single board update after processing
 * all expired timers.
 *
 * @param {object} timer
 */
async function handleExpiration(timer) {
    const content = buildCompletionContent(timer.user_id);

    try {
        const channel = await clientRef.channels.fetch(timer.thread_id);
        if (channel) {
            await timerMessage.sendCompletionNotification(channel, content);
            logger.info(
                `Trainer timer: completion notification sent in ${timer.thread_id} for <@${timer.user_id}>`
            );
        } else {
            logger.warn(`Trainer timer: channel ${timer.thread_id} not found, skipping notification`);
        }
    } catch (error) {
        logger.error(`trainer-timer.expiration notification (${timer.thread_id})`, error);
    }

    await trainerTimerDb.completeTimer(timer.id);
}

/**
 * Find and process timers that have reached their end time.
 *
 * If nothing expired this check produces zero Discord API calls. If one or
 * more timers expired, all of them are processed (notifications + DB) and each
 * affected board is edited exactly ONCE for the whole batch.
 */
async function checkExpirations() {
    const now = new Date();
    const expired = await trainerTimerDb.findActiveTimersWithEndsBefore(now);

    if (expired.length === 0) {
        return;
    }

    const affectedBoards = new Set();

    for (const timer of expired) {
        affectedBoards.add(timer.thread_id);
        await handleExpiration(timer);
    }

    // Rebuild each affected board once after processing the whole batch.
    for (const boardChannelId of affectedBoards) {
        await refreshBoard(boardChannelId);
    }
}

/**
 * One internal expiration check. Runs on the configured interval but never
 * touches Discord unless a timer actually expired (checkExpirations handles
 * that with a single board update).
 */
async function tick() {
    await checkExpirations();
}

// =====================================================================
// STARTUP / MONITORING LIFECYCLE
// =====================================================================

/**
 * Full feature bootstrap. Runs the schema creation, startup recovery, then
 * starts the internal expiration-check loop. This loop never edits the board
 * itself — the board is only edited when a timer actually expires or a user
 * clicks the button.
 *
 * Boards are dynamic: every channel/thread where `/timer-board` was run gets
 * its own independent board, so there is no configured board location.
 *
 * @param {import('discord.js').Client} client
 */
async function init(client) {
    clientRef = client;

    await trainerTimerDb.ensureSchema();

    await recover(client);

    if (checkInterval) {
        clearInterval(checkInterval);
    }

    checkInterval = setInterval(() => {
        if (tickRunning) {
            return;
        }
        tickRunning = true;
        tick()
            .catch(error => logger.error('trainer-timer.tick', error))
            .finally(() => {
                tickRunning = false;
            });
    }, config.expirationCheckInterval);

    // Immediate first check so expirations are caught without waiting.
    tick()
        .catch(error => logger.error('trainer-timer.tick (initial)', error));

    logger.info(
        `Trainer Timer expiration checks started (every ${config.expirationCheckInterval}ms; no periodic Discord edits)`
    );
}

/**
 * Startup recovery across every registered board:
 *   1. Silently clear timers that expired while the bot was offline — no pings.
 *   2. Load all registered boards into the cache for future edits.
 *   3. Rebuild only the boards whose active list changed during recovery.
 *   4. Resume monitoring of still-active timers (done by the loop).
 *
 * @param {import('discord.js').Client} client
 */
async function recover(client) {
    clientRef = client;

    // Stale timers from downtime are completed without any notification.
    const stale = await trainerTimerDb.findActiveTimersWithEndsBefore(new Date());
    const staleByBoard = new Map();
    for (const timer of stale) {
        await trainerTimerDb.completeTimer(timer.id);
        staleByBoard.set(timer.thread_id, (staleByBoard.get(timer.thread_id) || 0) + 1);
    }
    if (stale.length > 0) {
        logger.info(
            `Trainer Timer: cleared ${stale.length} stale timer(s) from downtime (no pings sent)`
        );
    }

    // Load every registered board for future edits.
    const boards = await trainerTimerDb.getAllBoards();
    boardCache = new Map(boards.map(board => [board.thread_id, board]));

    // Only rebuild a board now if recovery changed its active list. When the
    // bot starts with no stale timers the boards are left untouched (0 edits).
    for (const board of boards) {
        if (staleByBoard.has(board.thread_id)) {
            try {
                await timerMessage.updateBoard(client, board);
            } catch (error) {
                logger.error(`trainer-timer.recover board (${board.thread_id})`, error);
            }
        }
    }

    logger.info(`Trainer Timer: monitoring ${boardCache.size} board(s)`);
}

/**
 * Post a new timer-board message in a thread/channel (setup command).
 *
 * @param {import('discord.js').TextBasedChannel} channel
 */
async function createBoardForChannel(channel) {
    const message = await timerMessage.createBoard(clientRef, channel);
    const record = { thread_id: channel.id, message_id: message.id };

    boardCache.set(channel.id, record);

    return record;
}

module.exports = {
    init,
    recover,
    tick,
    startOrResetTimer,
    createBoardForChannel,
    getBoard,
    clearBoardCache
};
