require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const axios = require('axios');
const { renderTemplate } = require('../services/renderer');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
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

            if (
                interaction.deferred ||
                interaction.replied
            ) {
                await interaction.editReply(
                    'Failed to contact n8n workflow.'
                );
            }

        }

    }
);
client.login(process.env.DISCORD_TOKEN);

