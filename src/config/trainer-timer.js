/**
 * Trainer Timer configuration.
 *
 * Every user-facing string for the Trainer Timer feature lives here so it can
 * be edited without digging through the timer implementation. Add, remove, or
 * reword entries freely — the timer logic reads everything from this module.
 */

module.exports = {

    // How long a single trainer timer lasts.
    durationMinutes: 50,

    // How often the bot checks the database for expired timers. This controls
    // INTERNAL timer checking only — it never triggers a Discord message edit.
    // The board is only edited when a timer actually expires or a user clicks
    // the button.
    expirationCheckInterval: 5 * 1000,

    // How long a completion notification stays in the thread before it is
    // automatically deleted.
    notificationDeleteAfterMs: 10 * 60 * 1000,

    // =====================================================================
    // PERSISTENT TIMER-BOARD EMBED
    // =====================================================================
    embed: {

        title: '⏱️ Trainer Timer',

        // Shown whenever the board is rendered. {offlineStart} and {offlineEnd}
        // are replaced with Discord native timestamps "<t:UNIX:t>" for the next
        // SiL offline window, so each viewer sees their own local time.
        description:
            'Umamusume Global Independent Training timer reminder.\n\n' +
            'Still in Love offline at {offlineStart} - {offlineEnd}',

        activeHeader: 'Active Trainers',

        // Shown in the "Active Trainers" field when no timers are running.
        noActiveText: 'No active timers.',

        // One line per active trainer (name and timer on the same line).
        // Placeholders replaced at render time:
        //   {name}         – the trainer's display name
        //   {endsRelative} – Discord relative timestamp "<t:UNIX:R>" (Discord
        //                    keeps it up to date, e.g. "in 42 minutes")
        //   {ends}         – Discord absolute timestamp "<t:UNIX:t>" for the
        //                    end time; Discord localizes it per viewer.
        userLine: '🟢 {name} — Ends {endsRelative} · {ends}',

        footer: 'Still in Love',

        color: 0xff69b4
    },

    // =====================================================================
    // SIL OFFLINE SCHEDULE
    // =====================================================================
    // The offline period is anchored to the SiL operational timezone
    // (Asia/Jakarta) but is DISPLAYED through Discord native timestamps so
    // each viewer sees the window in their own local time. This is separate
    // from the Trainer Timer itself, which stays timezone-neutral (50 min).
    offlineSchedule: {
        timezone: 'Asia/Jakarta',
        startHour: 1,   // 01:00 Asia/Jakarta
        endHour: 6      // 06:00 Asia/Jakarta
    },

    // =====================================================================
    // START BUTTON
    // =====================================================================
    button: {

        label: 'Start',

        // Stable custom ID — the button keeps working after restarts.
        customId: 'trainer_timer_start',

        // One of: primary, secondary, success, danger
        style: 'primary'
    },

    // =====================================================================
    // COMPLETION MESSAGES
    // =====================================================================
    // One is chosen at random when a timer actually expires while the bot is
    // running. <@USER_ID> is replaced with the real Discord mention.
    completionMessages: [
        '⏰ <@USER_ID> Your 50-minute trainer timer is finished!',
        '🏇 <@USER_ID> Training session complete!',
        '🔔 <@USER_ID> Your trainer timer has reached 0!',
        '⏱️ <@USER_ID> That\'s 50 minutes! Time to check your trainee!',
        '🏁 <@USER_ID> Timer finished — back to training!'
    ]
};
