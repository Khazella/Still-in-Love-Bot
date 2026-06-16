require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commandConfig = require('../commands');

// =======================================================
// BUILD SLASH COMMANDS
// =======================================================
const commands = commandConfig.map(cmd => {

    const slash = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription(cmd.description);

    if (cmd.options && Array.isArray(cmd.options)) {

        cmd.options.forEach(option => {

            slash.addStringOption(opt => {

                opt
                    .setName(option.name)
                    .setDescription(option.description)
                    .setRequired(option.required || false);

                if (option.choices && Array.isArray(option.choices)) {

                    option.choices.forEach(choice => {

                        opt.addChoices({
                            name: choice.name,
                            value: choice.value
                        });

                    });

                }

                return opt;
            });

        });

    }

    return slash.toJSON();
});

console.log('Commands being registered:');
console.log(JSON.stringify(commands, null, 2));

// =======================================================
// REST CLIENT
// =======================================================
const rest = new REST({ version: '10' })
    .setToken(process.env.DISCORD_TOKEN);

// =======================================================
// DEPLOY FUNCTION
// =======================================================
(async () => {
    try {

        if (!process.env.GUILD_ID) {
            throw new Error("GUILD_ID is missing in .env");
        }

        const guildIds = process.env.GUILD_ID.split(',');

        console.log('Registering GUILD commands...');

        for (const guildId of guildIds) {

            const trimmedGuildId = guildId.trim();

            if (!trimmedGuildId) continue;

            console.log(`Deploying to guild: ${trimmedGuildId}`);

            await rest.put(
                Routes.applicationGuildCommands(
                    process.env.CLIENT_ID,
                    trimmedGuildId
                ),
                {
                    body: commands
                }
            );

        }

        console.log('Commands registered successfully (ALL GUILDS).');

    } catch (error) {

        console.error('Registration failed:');
        console.error(error);

    }
})();
