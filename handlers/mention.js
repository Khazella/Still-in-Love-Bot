const axios = require('axios');

module.exports = function registerMentionHandler(client) {

    client.on('messageCreate', async message => {

        if (message.author.bot) return;

        const botMention = `<@${client.user.id}>`;
        const botMentionNick = `<@!${client.user.id}>`;

        const isMention =
            message.content.includes(botMention) ||
            message.content.includes(botMentionNick);

        if (!isMention) return;

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

                console.error(
                    'Failed fetching replied message:',
                    err
                );
            }
        }

        const trigger = message.content
            .replace(botMention, '')
            .replace(botMentionNick, '')
            .trim()
            .toLowerCase();

        console.log(
            '[TRIGGER]',
            trigger
        );

        console.log(
            '[REPLIED CONTENT]',
            repliedContent
        );

        // Commands that require replying to another message
        if (
            ['translate', 'summarize', 'explain'].includes(trigger) &&
            (!repliedContent || !repliedContent.trim())
        ) {

            await message.reply(
                `Please reply to a message before using \`${trigger}\`.`
            );

            return;
        }

        try {

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

            console.log(
                '[N8N RESPONSE]',
                JSON.stringify(response.data, null, 2)
            );

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

            await message.reply(reply);

        } catch (error) {

            console.error(
                'Mention webhook error:',
                error.response?.data ||
                error.message
            );

            await message.reply(
                'Failed to contact workflow.'
            );
        }
    });
};