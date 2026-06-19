require('dotenv').config();

const {
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const commandConfig = require('../commands');

// =======================================================
// PRIVATE COMMANDS
// =======================================================
// Commands in this list are only deployed
// to the FIRST guild in GUILD_ID.
const PRIVATE_COMMANDS = [
    'update',
    'update-cm',
    'update-skills'
];

// =======================================================
// BUILD SLASH COMMANDS
// =======================================================
const commands = commandConfig.map(cmd => {

    const slash = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription(cmd.description);

    if (
        cmd.options &&
        Array.isArray(cmd.options)
    ) {

        cmd.options.forEach(option => {

            slash.addStringOption(opt => {

                opt
                    .setName(option.name)
                    .setDescription(option.description)
                    .setRequired(
                        option.required || false
                    );

                // =========================
                // AUTOCOMPLETE SUPPORT
                // =========================
                if (
                    option.autocomplete === true
                ) {
                    opt.setAutocomplete(true);
                }

                // =========================
                // CHOICES SUPPORT
                // =========================
                if (
                    option.choices &&
                    Array.isArray(option.choices)
                ) {

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

console.log(
    'Commands being registered:'
);

console.log(
    JSON.stringify(
        commands,
        null,
        2
    )
);

// =======================================================
// REST CLIENT
// =======================================================
const rest = new REST({
    version: '10'
}).setToken(
    process.env.DISCORD_TOKEN
);

// =======================================================
// DEPLOY FUNCTION
// =======================================================
(async () => {

    try {

        if (!process.env.GUILD_ID) {

            throw new Error(
                'GUILD_ID is missing in .env'
            );

        }

        const guildIds =
            process.env.GUILD_ID
                .split(',')
                .map(v => v.trim())
                .filter(Boolean);

        const primaryGuildId =
            guildIds[0];

        console.log(
            'Registering GUILD commands...'
        );

        for (const guildId of guildIds) {

            console.log(
                `Deploying to guild: ${guildId}`
            );

            let guildCommands =
                commands;

            // =====================================
            // REMOVE PRIVATE COMMANDS
            // FROM NON-PRIMARY GUILDS
            // =====================================
            if (
                guildId !== primaryGuildId
            ) {

                guildCommands =
                    commands.filter(
                        command =>
                            !PRIVATE_COMMANDS.includes(
                                command.name
                            )
                    );

            }

            console.log(
                `Commands for guild ${guildId}:`,
                guildCommands.map(
                    c => c.name
                )
            );

            await rest.put(
                Routes.applicationGuildCommands(
                    process.env.CLIENT_ID,
                    guildId
                ),
                {
                    body: guildCommands
                }
            );

        }

        console.log(
            'Commands registered successfully.'
        );

    } catch (error) {

        console.error(
            'Registration failed:'
        );

        console.error(error);

    }

})();