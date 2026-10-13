/**
 * Automation configuration.
 *
 * Centralizes the settings for scheduled (non-interactive) bot automations so
 * the schedule and report parameters can be reviewed in one place. The Discord
 * channel itself is NEVER stored here — it is read at runtime from the
 * environment variable named in `channelIdEnv`, so no real channel ID ever
 * lives in source control.
 */

module.exports = {

    // =====================================================================
    // CLUB REPORT AUTOMATION
    // =====================================================================
    clubReport: {

        // Name of the environment variable that holds the parent automation
        // Discord channel ID. Read via process.env[channelIdEnv] at runtime.
        // The value itself is intentionally not referenced anywhere here.
        channelIdEnv: 'BOT_AUTOMATION_CHANNEL_ID',

        // =================================================================
        // >>> TEMPORARY TEST TOGGLE <<<
        // =================================================================
        // Controls the schedule mode:
        //   null -> PRODUCTION behavior: hourly at HH:<minute> (see `minute`).
        //   15   -> TEMPORARY TEST: run every 15 minutes (:00/:15/:30/:45).
        //
        // To restore the original "Hourly at HH:01" behavior after testing,
        // set this back to null (with `minute: 1`). This is the ONLY value
        // that controls the temporary 15-minute test schedule.
        intervalMinutes: null,

        // Minute of every hour (0-59) used for the HOURLY schedule
        // (i.e. when intervalMinutes is null). Original value: 1 -> HH:01.
        minute: 1,

        // Operational timezone used by the project for date calculations.
        // Asia/Jakarta is UTC+7 with no DST, matching the manual-offset
        // convention used elsewhere in the project.
        timezone: 'Asia/Jakarta',

        // Report parameters — identical to manually running:
        //   /club-report club: First period: Current Week source: Uma.moe
        club: 'First',
        period: 'current',
        source: 'uma'
    }

};
