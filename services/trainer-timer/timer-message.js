const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const logger = require('../logger');
const config = require('../../src/config/trainer-timer');
const trainerTimerDb = require('../database/trainer-timer');

// =====================================================================
// TIME FORMATTING (timezone-neutral)
// =====================================================================
// Clock times are shown using Discord's native timestamps so each viewer sees
// their own local time. The bot never determines the user's timezone.

/**
 * Build a Discord native timestamp for a Date.
 *
 * Discord renders the timestamp according to the viewer's own client
 * timezone, so the same instant can read "8:20 PM" for one user and
 * "9:20 AM" for another. The bot never determines the user's timezone.
 *
 * @param {Date} date
 * @param {string} style – Discord timestamp style, e.g. 't' (short time),
 *                         'R' (relative), 'f' (full date/time).
 */
function discordTimestamp(date, style = 't') {
    const unix = Math.floor(date.getTime() / 1000);
    return `<t:${unix}:${style}>`;
}

// =====================================================================
// SIL OFFLINE WINDOW (Asia/Jakarta source timezone)
// =====================================================================
// The offline period is anchored to the SiL operational timezone using the
// same manual-offset approach (UTC+7, no DST) as the rest of the project.
// The resulting instants are then rendered via Discord native timestamps so
// each viewer sees the window in their own local time.

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function toJakarta(date) {
    return new Date(
        date.getTime() +
        JAKARTA_OFFSET_MS +
        date.getTimezoneOffset() * 60 * 1000
    );
}

/**
 * Compute the next applicable SiL offline window in the configured source
 * timezone (Asia/Jakarta) and return its start/end as absolute Dates.
 *
 * - Before 01:00 Jakarta  -> today 01:00 -> today 06:00
 * - During 01:00–06:00    -> today 01:00 -> today 06:00 (current window)
 * - After 06:00           -> tomorrow 01:00 -> tomorrow 06:00
 *
 * @param {Date} [now]
 * @returns {{start: Date, end: Date}}
 */
function getOfflineWindow(now = new Date()) {
    const startHour = config.offlineSchedule.startHour;
    const endHour = config.offlineSchedule.endHour;

    const jkt = toJakarta(now);
    const year = jkt.getFullYear();
    const month = jkt.getMonth();
    const day = jkt.getDate();
    const hour = jkt.getHours();

    // Once the window has ended (>= endHour), the next window is tomorrow.
    const dayOffset = hour >= endHour ? 1 : 0;

    // Build the window as Jakarta wall-clock times, then convert to instants.
    const startJkt = new Date(year, month, day + dayOffset, startHour, 0, 0, 0);
    const endJkt = new Date(year, month, day + dayOffset, endHour, 0, 0, 0);

    const reverseOffset = JAKARTA_OFFSET_MS + now.getTimezoneOffset() * 60 * 1000;

    return {
        start: new Date(startJkt.getTime() - reverseOffset),
        end: new Date(endJkt.getTime() - reverseOffset)
    };
}

// =====================================================================
// EMBED / BUTTON BUILDING
// =====================================================================

/**
 * Best-effort display name for a Discord user. Falls back to the raw user ID
 * when the member is not cached (e.g. they left the server).
 *
 * @param {import('discord.js').Guild|null} guild
 * @param {string} userId
 */
function resolveMemberName(guild, userId) {
    const member = guild?.members?.cache?.get(userId);
    return member?.displayName || member?.user?.username || userId;
}

/**
 * Build the persistent timer-board embed.
 *
 * @param {Array<object>} timers – active timers for the thread
 * @param {import('discord.js').Guild|null} guild
 */
function buildEmbed(timers, guild) {
    const embed = new EmbedBuilder()
        .setTitle(config.embed.title)
        .setColor(config.embed.color);

    const now = Date.now();
    const active = timers.filter(
        timer =>
            timer.status === 'active' &&
            new Date(timer.ends_at).getTime() > now
    );

    // The description always shows the reminder plus the next SiL offline
    // window (regenerated on every board build/edit, as Discord timestamps
    // represent a specific instant, not a recurring schedule).
    const offline = getOfflineWindow();
    embed.setDescription(
        config.embed.description
            .replace('{offlineStart}', discordTimestamp(offline.start, 't'))
            .replace('{offlineEnd}', discordTimestamp(offline.end, 't'))
    );

    // One line per active trainer; show a placeholder when none are running.
    const lines = active.map(timer => {
        const name = resolveMemberName(guild, timer.user_id);
        const endsAt = new Date(timer.ends_at);

        return config.embed.userLine
            .replace('{name}', name)
            .replace('{endsRelative}', discordTimestamp(endsAt, 'R'))
            .replace('{ends}', discordTimestamp(endsAt, 't'));
    });

    embed.addFields({
        name: config.embed.activeHeader,
        value: lines.length > 0
            ? lines.join('\n')
            : config.embed.noActiveText
    });

    if (config.embed.footer) {
        embed.setFooter({ text: config.embed.footer });
        embed.setTimestamp();
    }

    return embed;
}

/**
 * Build the ActionRow containing the start button.
 */
function buildComponents() {
    const styles = {
        primary: ButtonStyle.Primary,
        secondary: ButtonStyle.Secondary,
        success: ButtonStyle.Success,
        danger: ButtonStyle.Danger
    };

    const button = new ButtonBuilder()
        .setCustomId(config.button.customId)
        .setLabel(config.button.label)
        .setStyle(styles[config.button.style] || ButtonStyle.Primary);

    if (config.button.emoji) {
        button.setEmoji(config.button.emoji);
    }

    return new ActionRowBuilder().addComponents(button);
}

// =====================================================================
// BOARD MESSAGE ACTIONS
// =====================================================================

/**
 * Post a new timer-board message in a thread/channel and register it.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').TextBasedChannel} channel
 */
async function createBoard(client, channel) {
    const timers = await trainerTimerDb.findActiveTimers(channel.id);

    const message = await channel.send({
        embeds: [buildEmbed(timers, channel.guild)],
        components: [buildComponents()]
    });

    await trainerTimerDb.saveBoard(channel.id, message.id);

    logger.discord(`Trainer timer board created in ${channel.id} (message ${message.id})`);

    return message;
}

/**
 * Edit an existing board message in place. Returns false (and logs) when the
 * channel or the board message no longer exists, without crashing the bot.
 *
 * @param {import('discord.js').Client} client
 * @param {{thread_id: string, message_id: string}} board
 * @returns {Promise<boolean>}
 */
async function updateBoard(client, board) {
    const channel = await client.channels
        .fetch(board.thread_id)
        .catch(() => null);

    if (!channel) {
        logger.warn(`Trainer timer: channel ${board.thread_id} not found, skipping board update`);
        return false;
    }

    const message = await channel.messages
        .fetch(board.message_id)
        .catch(() => null);

    if (!message) {
        logger.warn(
            `Trainer timer: board message ${board.message_id} missing in ${board.thread_id} — run the setup command to recreate it`
        );
        return false;
    }

    const timers = await trainerTimerDb.findActiveTimers(board.thread_id);

    await message.edit({
        embeds: [buildEmbed(timers, channel.guild)],
        components: [buildComponents()]
    });

    return true;
}

// =====================================================================
// COMPLETION NOTIFICATION
// =====================================================================

/**
 * Send a completion notification into a thread and schedule its deletion
 * after the configured notification deletion time.
 *
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {string} content
 */
async function sendCompletionNotification(channel, content) {
    const notification = await channel.send({ content });

    setTimeout(() => {
        notification.delete().catch(() => {
            logger.debug('Trainer timer: completion notification already deleted, skipping delete');
        });
    }, config.notificationDeleteAfterMs);

    return notification;
}

module.exports = {
    discordTimestamp,
    getOfflineWindow,
    buildEmbed,
    buildComponents,
    createBoard,
    updateBoard,
    sendCompletionNotification
};
