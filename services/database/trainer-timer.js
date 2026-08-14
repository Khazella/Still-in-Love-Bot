const pool = require('./postgres');

const STATUS_ACTIVE = 'active';
const STATUS_COMPLETED = 'completed';

/**
 * Create the trainer timer tables if they do not already exist.
 * Idempotent — safe to run on every startup.
 */
async function ensureSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS trainer_timers (
            id         BIGSERIAL PRIMARY KEY,
            user_id    TEXT        NOT NULL,
            thread_id  TEXT        NOT NULL,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ends_at    TIMESTAMPTZ NOT NULL,
            status     TEXT        NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_trainer_timers_user_thread UNIQUE (user_id, thread_id)
        );

        CREATE INDEX IF NOT EXISTS idx_trainer_timers_status_ends
            ON trainer_timers (status, ends_at);

        CREATE TABLE IF NOT EXISTS trainer_timer_boards (
            id         BIGSERIAL PRIMARY KEY,
            thread_id  TEXT        NOT NULL UNIQUE,
            message_id TEXT        NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
}

/**
 * Create or reset a user's timer for a board location.
 *
 * thread_id stores the Discord channel/thread ID that contains the board (from
 * interaction.channelId). One row per (user_id, thread_id) keeps a user's
 * timers independent across different boards. Clicking the button again simply
 * updates the existing row with a fresh 50-minute window, so duplicates never
 * occur.
 *
 * @param {string} userId
 * @param {string} threadId  – Discord channel/thread ID of the board
 * @param {Date}   startedAt
 * @param {Date}   endsAt
 */
async function startTimer(userId, threadId, startedAt, endsAt) {
    const result = await pool.query(
        `
        INSERT INTO trainer_timers (user_id, thread_id, started_at, ends_at, status)
        VALUES ($1, $2, $3, $4, '${STATUS_ACTIVE}')
        ON CONFLICT (user_id, thread_id)
        DO UPDATE SET
            started_at = EXCLUDED.started_at,
            ends_at    = EXCLUDED.ends_at,
            status     = '${STATUS_ACTIVE}',
            updated_at = NOW()
        RETURNING *
        `,
        [userId, threadId, startedAt, endsAt]
    );

    return result.rows[0];
}

/**
 * All currently active timers in a board location, oldest first.
 *
 * @param {string} threadId  – Discord channel/thread ID of the board
 */
async function findActiveTimers(threadId) {
    const result = await pool.query(
        `
        SELECT *
        FROM trainer_timers
        WHERE thread_id = $1
          AND status = '${STATUS_ACTIVE}'
        ORDER BY started_at ASC
        `,
        [threadId]
    );

    return result.rows;
}

/**
 * All active timers across every thread (used by the monitoring loop and
 * startup recovery).
 */
async function findAllActiveTimers() {
    const result = await pool.query(
        `
        SELECT *
        FROM trainer_timers
        WHERE status = '${STATUS_ACTIVE}'
        ORDER BY thread_id, started_at ASC
        `
    );

    return result.rows;
}

/**
 * Active timers whose end time is at or before the given date.
 *
 * @param {Date} date
 */
async function findActiveTimersWithEndsBefore(date) {
    const result = await pool.query(
        `
        SELECT *
        FROM trainer_timers
        WHERE status = '${STATUS_ACTIVE}'
          AND ends_at <= $1
        `,
        [date]
    );

    return result.rows;
}

/**
 * Mark a timer as completed. This is used both when a timer expires while the
 * bot is running (after the notification was sent) and when a stale timer is
 * silently cleared at startup (without any notification).
 *
 * @param {number} id
 */
async function completeTimer(id) {
    const result = await pool.query(
        `
        UPDATE trainer_timers
        SET status = '${STATUS_COMPLETED}', updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );

    return result.rows[0];
}

// =====================================================================
// TIMER-BOARD MESSAGE REGISTRY
// =====================================================================

/**
 * Get the registered board message for a thread (or null).
 *
 * @param {string} threadId
 */
async function getBoard(threadId) {
    const result = await pool.query(
        `
        SELECT *
        FROM trainer_timer_boards
        WHERE thread_id = $1
        `,
        [threadId]
    );

    return result.rows[0] ?? null;
}

/**
 * Register (or update) the board message for a thread.
 *
 * @param {string} threadId
 * @param {string} messageId
 */
async function saveBoard(threadId, messageId) {
    const result = await pool.query(
        `
        INSERT INTO trainer_timer_boards (thread_id, message_id)
        VALUES ($1, $2)
        ON CONFLICT (thread_id)
        DO UPDATE SET
            message_id = EXCLUDED.message_id,
            updated_at = NOW()
        RETURNING *
        `,
        [threadId, messageId]
    );

    return result.rows[0];
}

/**
 * Remove the board registration for a thread (used when the Discord message
 * was deleted manually and must be recreated).
 *
 * @param {string} threadId
 */
async function deleteBoard(threadId) {
    await pool.query(
        `
        DELETE FROM trainer_timer_boards
        WHERE thread_id = $1
        `,
        [threadId]
    );
}

/**
 * Every registered board across all threads (used at startup to rebuild
 * the embeds and resume monitoring).
 */
async function getAllBoards() {
    const result = await pool.query(
        'SELECT * FROM trainer_timer_boards'
    );

    return result.rows;
}

module.exports = {
    ensureSchema,
    startTimer,
    findActiveTimers,
    findAllActiveTimers,
    findActiveTimersWithEndsBefore,
    completeTimer,
    getBoard,
    saveBoard,
    deleteBoard,
    getAllBoards
};
