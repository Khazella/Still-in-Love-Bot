require('dotenv').config();

const logger = require('../services/logger');

const {
    LOCAL_COMMANDS,
    handleLocalCommand
} = require('../handlers/local');

const {
    handleWebhookCommand
} = require('../handlers/webhook');

const registerMentionHandler =
    require('../handlers/mention');

const {
    handleTimerButton
} = require('../handlers/trainer-timer');

const timerManager =
    require('../services/trainer-timer/timer-manager');

const skillsDb =
    require('../services/database/skills');

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require('discord.js');

const greetingConfigs =
    require('./config/greetings');

// ---- Startup timing ----
const BOT_START_TIME = Date.now();

// Run DB connection test early and hold the promise for the banner.
const dbPromise = skillsDb.testConnection()
    .then(count => ({ connected: true, count }))
    .catch(error => ({ connected: false, error: error.message }));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

registerMentionHandler(client);

client.once('clientReady', async () => {
    const dbStatus = await dbPromise;
    const { printStartupBanner } = require('../services/startup-banner');
    printStartupBanner(client, BOT_START_TIME, dbStatus);

    // Trainer timer startup recovery + monitoring loop.
    timerManager.init(client)
        .catch(error => {
            logger.error('Trainer Timer init', error);
        });
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
// SLASH COMMANDS
// =========================
client.on(
    'interactionCreate',
    async interaction => {

        // =========================
        // AUTOCOMPLETE
        // =========================
        if (interaction.isAutocomplete()) {

            return logger.createContext(async () => {

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

                    await interaction.respond(
                        result.map(row => ({
                            name: row.internal_name_en,
                            value: row.internal_name_en
                        }))
                    );

                } catch (error) {

                    logger.error(
                        `autocomplete /${interaction.commandName}`,
                        error
                    );

                }

            });

        }

        // =========================
        // BUTTON INTERACTIONS
        // =========================
        if (interaction.isButton()) {

            return await handleTimerButton(
                interaction,
                client
            );

        }

        // =========================
        // NORMAL SLASH COMMANDS
        // =========================
        if (
            !interaction.isChatInputCommand()
        ) {
            return;
        }

        return logger.createContext(async () => {

            const commandName = interaction.commandName;

            try {

                if (
                    LOCAL_COMMANDS.has(commandName)
                ) {

                    return await handleLocalCommand(
                        interaction,
                        client
                    );

                }

                return await handleWebhookCommand(
                    interaction
                );

            } catch (error) {

                logger.error(
                    `/${commandName}`,
                    error
                );

            }

        });

    }

);

client.login(process.env.DISCORD_TOKEN)
    .catch(error => {
        console.error('==============================================================');
        console.error('                  Still in Love Discord Bot');
        console.error('==============================================================');
        console.error('');
        console.error('Status         : 🔴 STARTUP FAILED');
        console.error('');
        console.error('==============================================================');
        console.error('Bot failed to start.');
        console.error('==============================================================');
        console.error(`Error: ${error.message}`);
        process.exit(1);
    });

