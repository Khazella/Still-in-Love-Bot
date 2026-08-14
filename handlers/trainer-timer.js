const logger = require('../services/logger');
const config = require('../src/config/trainer-timer');
const trainerTimerDb = require('../services/database/trainer-timer');
const timerManager = require('../services/trainer-timer/timer-manager');
const timerMessage = require('../services/trainer-timer/timer-message');

const BUTTON_CUSTOM_ID = config.button.customId;

/**
 * Handle the trainer-timer start button.
 *
 * The Discord user is read from interaction.user.id and the board location
 * from interaction.channelId (the channel/thread containing the board) — no
 * user input or /timer command is involved.
 *
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {import('discord.js').Client} client
 */
async function handleTimerButton(interaction, client) {
    if (interaction.customId !== BUTTON_CUSTOM_ID) {
        return;
    }

    await logger.createContext(async () => {
        const startTime = Date.now();
        logger.handler('handleTimerButton');

        try {
            // The board location is wherever the button was clicked.
            const channelId = interaction.channelId || interaction.channel?.id;
            const userId = interaction.user.id;

            // Acknowledge the click silently — no confirmation message is sent.
            // The updated persistent timer embed is the only feedback.
            await interaction.deferUpdate();

            await timerManager.startOrResetTimer(channelId, userId);

            logger.done('Trainer Timer button', Date.now() - startTime);
        } catch (error) {
            logger.error('Trainer Timer button', error);
        }
    });
}

/**
 * Setup command: create (or refresh) a persistent timer-board message in the
 * current channel/thread. The location is determined from the interaction
 * itself, so the board can be created in any channel/thread within the
 * configured SiL guild. Reuses an existing registered board instead of
 * posting a duplicate; recreates it only when the stored message is gone.
 *
 * Assumes the interaction has already been deferred (editReply is used).
 *
 * @param {import('discord.js').CommandInteraction} interaction
 * @param {import('discord.js').Client} client
 */
async function handleTimerBoardCommand(interaction, client) {
    const channel = interaction.channel;

    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
        await interaction.editReply({
            content: 'Run this command inside a thread or text channel.'
        });
        return;
    }

    // Board location = the channel/thread where the command was executed.
    const boardChannelId = channel.id;

    const existing = await trainerTimerDb.getBoard(boardChannelId);

    if (existing) {
        // Reuse the registered board if the message still exists.
        const found = await channel.messages
            .fetch(existing.message_id)
            .catch(() => null);

        if (found) {
            await timerMessage.updateBoard(client, existing);
            await interaction.editReply({
                content: 'Trainer timer board already exists in this thread — refreshed it.'
            });
            return;
        }

        // Board message was deleted: drop the stale record and recreate.
        logger.warn(
            `Trainer timer: board ${existing.message_id} missing in ${channel.id}, recreating`
        );
        await trainerTimerDb.deleteBoard(channel.id);
        timerManager.clearBoardCache(channel.id);
    }

    await timerManager.createBoardForChannel(channel);

    await interaction.editReply({
        content: '✅ Trainer timer board created in this channel.'
    });
}

module.exports = {
    BUTTON_CUSTOM_ID,
    handleTimerButton,
    handleTimerBoardCommand
};
