const logger = require('../services/logger');

const axios = require('axios');

const processedMessages = new Set();

module.exports = function registerMentionHandler(client) {

    client.on('messageCreate', async message => {

        if (message.author.bot) return;

        if (processedMessages.has(message.id)) return;
        processedMessages.add(message.id);
        setTimeout(() => processedMessages.delete(message.id), 5000);

        const botMention = `<@${client.user.id}>`;
        const botMentionNick = `<@!${client.user.id}>`;

        const isMention =
            message.content.includes(botMention) ||
            message.content.includes(botMentionNick);

        if (!isMention) return;

        // =========================
        // WRAP IN REQUEST CONTEXT
        // =========================

        await logger.createContext(async () => {

            const startTime = Date.now();

            let repliedContent = null;
            let repliedAuthor = null;

            if (message.reference?.messageId) {

                try {

                    const repliedMessage =
                        await message.channel.messages.fetch(
                            message.reference.messageId
                        );

                    repliedContent =
                        repliedMessage.content;

                    repliedAuthor =
                        repliedMessage.author.username;

                } catch (err) {

                    logger.error(
                        'Mention fetch replied',
                        err
                    );
                }
            }

            // =========================
            // EXTRACT TRIGGER
            // =========================

            const trigger = message.content
                .replace(botMention, '')
                .replace(botMentionNick, '')
                .trim()
                .toLowerCase();

            // =========================
            // DETERMINE FEATURE NAME
            // =========================
            // Log only the feature type, never the user's prompt.

            const KNOWN_COMMANDS = ['translate', 'summarize', 'explain'];

            const featureName =
                KNOWN_COMMANDS.includes(trigger)
                    ? trigger.charAt(0).toUpperCase() + trigger.slice(1)
                    : 'AI';

            logger.mention(featureName);
            logger.handler('handleMention');

            // =========================
            // VALIDATE REPLY REQUIREMENT
            // =========================

            if (
                KNOWN_COMMANDS.includes(trigger) &&
                (!repliedContent || !repliedContent.trim())
            ) {

                await message.reply(
                    `Please reply to a message before using \`${trigger}\`.`
                );

                logger.done(
                    `Mention ${featureName}`,
                    Date.now() - startTime
                );

                return;
            }

            // =========================
            // N8N WEBHOOK CALL
            // =========================

            try {

                logger.webhook('Sending request');

                const response = await axios.post(
                    process.env.N8N_MENTION_WEBHOOK,
                    {
                        trigger,
                        reply_text: repliedContent,
                        reply_author: repliedAuthor,
                        user: message.author.username,
                        guild: message.guild?.name,
                        channel: message.channel.id
                    }
                );

                logger.webhook('Response received');

                // =========================
                // EXTRACT REPLY
                // =========================

                let reply = 'No response';

                if (Array.isArray(response.data)) {

                    const translation =
                        response.data[0]?.translation?.trim();

                    reply =
                        translation ||
                        response.data[0]?.reply ||
                        response.data[0]?.message ||
                        response.data[0]?.content ||
                        'No translation was returned.';

                } else {

                    reply =
                        response.data?.translation ||
                        response.data?.reply ||
                        response.data?.message ||
                        response.data?.content ||
                        JSON.stringify(response.data);
                }

                // =========================
                // SEND REPLY
                // =========================

                await message.reply(reply);

                logger.discord('Reply sent');

                logger.done(
                    `Mention ${featureName}`,
                    Date.now() - startTime
                );

            } catch (error) {

                logger.error(
                    `Mention ${featureName}`,
                    error
                );

                await message.reply(
                    'Failed to contact workflow.'
                );
            }
        });

    });
};
