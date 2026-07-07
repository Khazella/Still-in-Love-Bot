require('dotenv').config();

const skillsDb =
    require('../services/database/skills');

const clubDb =
    require('../services/database/club');

const weeklyFans =
    require('../services/fans/weekly');

const monthlyFans =
    require('../services/fans/monthly');

const clubSettingsDb =
    require('../services/database/club-settings');

const {
    getGoalInfo
} = require('../services/fans/goals');

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const greetingConfigs =
    require('./config/greetings');

skillsDb.testConnection()
    .then(count => {
        console.log(
            `Postgres OK: ${count} skills`
        );
    })
    .catch(error => {
        console.error(
            'Postgres ERROR:',
            error.message
        );
    });

const axios = require('axios');
const { renderTemplate } = require('../services/renderer');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {

    const addedRoles = newMember.roles.cache.filter(role =>
        !oldMember.roles.cache.has(role.id)
    );

    for (const role of addedRoles.values()) {

        const config = greetingConfigs.find(
            c => c.roleId === role.id
        );

        if (!config) continue;

        const channel =
            newMember.guild.channels.cache.get(
                config.channelId
            );

        if (!channel) continue;

        const message =
            config.message
                .replace('{user}', `${newMember}`)
                .replace('{username}', newMember.user.username);

        const embed = new EmbedBuilder()
            .setColor(0xff69b4)
            .setTitle('🌸 Welcome!')
            .setDescription(message)
            .setFooter({
                text: 'Still in Love'
            })
            .setTimestamp();

        await channel.send({
            embeds: [embed]
        });

        console.log(
            `Greeting sent to ${newMember.user.tag} for role ${role.name}`
        );
    }
});

// =========================
// TITLE FORMAT
// =========================
function formatTitle(cmd) {
    if (!cmd) return 'Report';

    return cmd
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// =========================
// RENDERABLE DETECTION
// =========================
function isRenderable(data) {

    if (
        Array.isArray(data?.rows) &&
        data.rows.length > 0
    ) {
        return true;
    }

    if (
        Array.isArray(data?.fields) &&
        data.fields.length > 0
    ) {
        return true;
    }

    if (
        data?.trainer_name &&
        Array.isArray(data?.fan_history)
    ) {
        return true;
    }

    return false;
}

// =========================
// N8N RESPONSE NORMALIZER
// =========================
function normalizeN8nResponse(raw) {
    return Array.isArray(raw)
        ? raw[0]
        : raw?.data
            ? raw.data
            : raw;
}

// =========================
// IMAGE COMMANDS
// =========================
const IMAGE_COMMANDS = {
    fans: options =>
        options.period === 'weekly'
            ? 'fans-weekly'
            : 'fans-monthly',

    trainer: options =>
        options.period === 'weekly'
            ? 'trainer-weekly'
            : 'trainer-monthly',

    benchmark: () =>
        'benchmark',

    screen: () =>
        'screen-report'
};

// =========================
// EMBED BUILDER
// =========================
function buildNormalEmbed(
    data,
    commandName
) {

    const embed = new EmbedBuilder()
        .setColor(data.color || 0xff3b3b)
        .setTitle(
            data.title ||
            formatTitle(commandName)
        )
        .setDescription(
            data.description ||
            'Report generated'
        );

    if (
        data.url &&
        typeof data.url === 'string'
    ) {
        embed.setURL(data.url);
    }

    if (
        data.thumbnail &&
        typeof data.thumbnail === 'string'
    ) {
        embed.setThumbnail(
            data.thumbnail
        );
    }

    if (
        data.image &&
        typeof data.image === 'string'
    ) {
        embed.setImage(
            data.image
        );
    }

    if (Array.isArray(data.fields)) {
        embed.addFields(
            data.fields.map(field => ({
                name: field.name,
                value: field.value,
                inline: field.inline ?? false
            }))
        );
    }

    embed.setFooter({
        text:
            data.footer ||
            'n8n analytics'
    });

    embed.setTimestamp();

    return embed;
}

// =========================
// SLASH COMMANDS
// =========================
client.on(
    'interactionCreate',
    async interaction => {

        // =========================
        // AUTOCOMPLETE
        // =========================
        if (interaction.isAutocomplete()) {

            console.log(
                'AUTOCOMPLETE:',
                interaction.commandName,
                interaction.options.getFocused()
            );

            try {

                if (
                    interaction.commandName !== 'skill'
                ) {
                    return;
                }

                const focused =
                    interaction.options.getFocused();

                const result =
                    await skillsDb.autocompleteSkills(
                        focused
                    );

                console.log(
                    result.map(row => ({
                        name: row.internal_name_en,
                        len: row.internal_name_en?.length
                    }))
                );

                await interaction.respond(
                    result.map(row => ({
                        name: row.internal_name_en,
                        value: row.internal_name_en
                    }))
                );

            } catch (error) {

                console.error(
                    'Autocomplete error:',
                    error
                );

            }

            return;
        }

        // =========================
        // NORMAL SLASH COMMANDS
        // =========================
        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }

        await interaction.deferReply();

        try {

            const options = {};

            for (
                const option
                of interaction.options.data
            ) {
                options[option.name] =
                    option.value;
            }

            // =========================
            // LOCAL CLUB COMMAND
            // =========================
            if (interaction.commandName === 'club') {

                const latest =
                    await clubDb.getLatestClubData();

                const settings =
                    await clubSettingsDb.getClubSettings(
                        'First'
                    );

                const report =
                    options.period === 'weekly'
                        ? weeklyFans.generateWeeklyReport(
                            latest,
                            settings
                        )
                        : monthlyFans.generateMonthlyReport(
                            latest,
                            settings
                        );

                const templateName =
                    options.period === 'weekly'
                        ? 'fans-weekly'
                        : 'fans-monthly';

                const imageBuffer =
                    await renderTemplate(
                        templateName,
                        report
                    );

                const attachment =
                    new AttachmentBuilder(
                        imageBuffer,
                        {
                            name: `${templateName}.png`
                        }
                    );

                await interaction.editReply({
                    files: [attachment]
                });

                return;
            }

            // =========================
            // LOCAL QUOTA COMMAND
            // =========================

            if (
                interaction.commandName ===
                'quota-view'
            ) {

                const club =
                    interaction.options.getString(
                        'club'
                    );

                const settings =
                    await clubSettingsDb.getClubSettings(
                        club
                    );

                if (!settings) {

                    await interaction.editReply({
                        content:
                            `Club "${club}" not found.`
                    });

                    return;
                }

                const goalInfo = getGoalInfo(settings);

                const embed = {
                    title: `📋 ${settings.display_name} Quotas`,
                    color: 0xff69b4,
                    fields: [
                        {
                            name: 'Current Quotas',
                            value:
                                `Week 1: ${(settings.week1_daily / 1000000).toFixed(1)}M/day → ${(goalInfo.weeklyGoals[1] / 1000000).toFixed(1)}M\n` +
                                `Week 2: ${(settings.week2_daily / 1000000).toFixed(1)}M/day → ${(goalInfo.weeklyGoals[2] / 1000000).toFixed(1)}M\n` +
                                `Week 3: ${(settings.week3_daily / 1000000).toFixed(1)}M/day → ${(goalInfo.weeklyGoals[3] / 1000000).toFixed(1)}M\n` +
                                `Week 4: ${(settings.week4_daily / 1000000).toFixed(1)}M/day → ${(goalInfo.weeklyGoals[4] / 1000000).toFixed(1)}M\n\n` +
                                `Monthly Goal: ${(goalInfo.monthlyGoal / 1000000).toFixed(1)}M`,
                            inline: false
                        }
                    ]
                };

                await interaction.editReply({
                    embeds: [embed]
                });

                return;
            }

            if (
                interaction.commandName ===
                'quota-set'
            ) {

                const club =
                    interaction.options.getString(
                        'club'
                    );

                const week =
                    interaction.options.getInteger(
                        'week'
                    );

                const daily =
                    interaction.options.getInteger(
                        'daily'
                    );

                const updated =
                    await clubSettingsDb.updateWeekGoal(
                        club,
                        week,
                        daily
                    );

                if (!updated) {

                    await interaction.editReply({
                        content:
                            `Club "${club}" not found.`
                    });

                    return;
                }

                const embed = {
                    title: '✅ Quota Updated',
                    color: 0x57f287,
                    fields: [
                        {
                            name: 'Club',
                            value: updated.display_name,
                            inline: true
                        },
                        {
                            name: 'Week',
                            value: String(week),
                            inline: true
                        },
                        {
                            name: 'Daily Goal',
                            value: `${(daily / 1000000).toFixed(1)}M/day`,
                            inline: false
                        }
                    ]
                };

                await interaction.editReply({
                    embeds: [embed]
                });

                return;
            }

            // =========================
            // N8N COMMANDS
            // =========================
            const response =
                await axios.post(
                    process.env.N8N_WEBHOOK,
                    {
                        command:
                            interaction.commandName,
                        options,
                        user:
                            interaction.user.username,
                        guild:
                            interaction.guild?.name
                    }
                );

            const data =
                normalizeN8nResponse(
                    response.data
                );

            const templateResolver =
                IMAGE_COMMANDS[
                    interaction.commandName
                ];

            if (
                templateResolver &&
                isRenderable(data)
            ) {

                const templateName =
                    templateResolver(
                        options
                    );

                const imageBuffer =
                    await renderTemplate(
                        templateName,
                        data
                    );

                const attachment =
                    new AttachmentBuilder(
                        imageBuffer,
                        {
                            name:
                                `${templateName}.png`
                        }
                    );

                const components = [];

                if (
                    interaction.commandName === 'screen' &&
                    data.profile_url
                ) {

                    components.push(
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setLabel('Open Profile')
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(data.profile_url)
                            )
                    );

                }

                await interaction.editReply({
                    content: null,
                    embeds: [],
                    files: [attachment],
                    components
                });

                return;
            }

            const embed =
                buildNormalEmbed(
                    data,
                    interaction.commandName
                );

            await interaction.editReply({
                embeds: [embed],
                content: null
            });

        } catch (error) {

            console.error(error);

            const localCommands = [
                'club'
            ];

            const isLocalCommand =
                localCommands.includes(
                    interaction.commandName
                );

            if (
                interaction.deferred ||
                interaction.replied
            ) {

                await interaction.editReply(
                    isLocalCommand
                        ? 'Still in Love was too busy chasing you, Trainer-san, and forgot to finish the report. Please try again later.'
                        : 'Still in Love sent a request to the support team, but nobody answered the phone. Please try again later.'
                );

            }

        }

    }

);

// @ Mention Translation

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


client.login(process.env.DISCORD_TOKEN);

