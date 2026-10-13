/**
 * Pure scheduling helpers for the automations.
 *
 * This module has NO Discord or database dependencies so the time math can be
 * unit-tested in isolation (see scripts/test-club-report-scheduler.js).
 *
 * Timezone handling follows the project convention: a fixed Asia/Jakarta
 * offset (UTC+7, no DST) is applied via Date#getTimezoneOffset(), exactly like
 * services/trainer-timer/timer-message.js and services/logger.js.
 */

// UTC+7 offset in milliseconds.
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Shift a real instant so that its LOCAL date fields read as the equivalent
 * Asia/Jakarta wall-clock time. The returned Date is only meaningful when read
 * through its local getters (getHours(), getMinutes(), ...).
 *
 * @param {Date} date
 * @returns {Date}
 */
function toJakarta(date) {
    return new Date(
        date.getTime() +
        JAKARTA_OFFSET_MS +
        date.getTimezoneOffset() * 60 * 1000
    );
}

/**
 * Format an instant as "YYYY-MM-DD HH:MM WIB" (Asia/Jakarta) for logging.
 *
 * @param {Date} date
 * @returns {string}
 */
function formatJakarta(date) {
    const jkt = toJakarta(date);
    const y = jkt.getFullYear();
    const mo = String(jkt.getMonth() + 1).padStart(2, '0');
    const d = String(jkt.getDate()).padStart(2, '0');
    const h = String(jkt.getHours()).padStart(2, '0');
    const mi = String(jkt.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi} WIB`;
}

/**
 * Compute the next occurrence of "HH:<minute>" in Asia/Jakarta on/after `now`.
 *
 * The result is a real absolute instant, so the caller can simply wait
 * `next.getTime() - Date.now()` milliseconds. Because it is recomputed after
 * every run, a slow or delayed execution never causes the schedule to drift:
 * the next target is always the next wall-clock HH:<minute>.
 *
 *   - If the current Jakarta minute is before <minute>  -> this hour at <minute>
 *   - Otherwise                                          -> next hour at <minute>
 *
 * @param {Date}   [now=new Date()]
 * @param {number} [minute=1] target minute of the hour (HH:01 by default)
 * @returns {Date} the next run instant
 */
function computeNextRun(now = new Date(), minute = 1) {
    const jkt = toJakarta(now);

    // Build the desired Jakarta wall-clock time on top of the shifted date.
    const target = new Date(jkt.getTime());
    target.setMilliseconds(0);
    target.setSeconds(0);

    if (jkt.getMinutes() < minute) {
        // We are still within the 00..<minute-1> window of this hour.
        target.setMinutes(minute);
    } else {
        // This hour's slot has passed — aim at the next hour.
        target.setHours(target.getHours() + 1);
        target.setMinutes(minute);
    }

    // Convert the Jakarta wall-clock target back to a real instant.
    const reverseOffset =
        JAKARTA_OFFSET_MS +
        now.getTimezoneOffset() * 60 * 1000;

    return new Date(target.getTime() - reverseOffset);
}

/**
 * Compute the next interval-aligned run instant in Asia/Jakarta.
 *
 * Boundaries fall on multiples of `intervalMinutes` past midnight Jakarta. For
 * the temporary 15-minute test this yields :00, :15, :30, :45; for 30 it yields
 * :00 and :30. The boundary strictly AFTER `now` is returned, so an execution
 * landing exactly on a boundary advances to the following one (no re-fire).
 *
 * @param {Date}   [now=new Date()]
 * @param {number} [intervalMinutes=15] interval in minutes (must be > 0)
 * @returns {Date} the next run instant
 */
function computeNextIntervalRun(now = new Date(), intervalMinutes = 15) {
    const step =
        intervalMinutes > 0
            ? intervalMinutes
            : 15;

    const jkt = toJakarta(now);

    const target = new Date(jkt.getTime());
    target.setMilliseconds(0);
    target.setSeconds(0);

    const minutes = target.getMinutes();

    // First boundary strictly after the current minute. Date normalizes a
    // value >= 60 into the following hour (e.g. 45 + 15 = 60 -> next hour :00).
    const nextBoundary =
        (Math.floor(minutes / step) + 1) * step;

    target.setMinutes(nextBoundary);

    const reverseOffset =
        JAKARTA_OFFSET_MS +
        now.getTimezoneOffset() * 60 * 1000;

    return new Date(target.getTime() - reverseOffset);
}

module.exports = {
    JAKARTA_OFFSET_MS,
    toJakarta,
    formatJakarta,
    computeNextRun,
    computeNextIntervalRun
};
