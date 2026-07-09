require('dotenv').config();

const {
    LOCAL_COMMANDS,
    handleLocalCommand
} = require('../handlers/local');

const {
    handleWebhookCommand
} = require('../handlers/webhook');

const registerMentionHandler =
    require('../handlers/mention');

const skillsDb =
    require('../services/database/skills');

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

registerMentionHandler(client);

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

        if (
            LOCAL_COMMANDS.has(
                interaction.commandName
            )
        ) {

            return handleLocalCommand(
                interaction,
                client
            );

        }

        return handleWebhookCommand(
            interaction
        );
    }

);

client.login(process.env.DISCORD_TOKEN);

