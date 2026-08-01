module.exports = [
    {
        name: 'club-report',
        description: 'Club fan report',
        options: [
            {
                name: 'club',
                description: 'Club name',
                type: 3, // STRING
                required: true,
                choices: [
                    {
                        name: 'First',
                        value: 'First'
                    }
                ]
            },
            {
                name: 'period',
                description: 'Report period',
                type: 3, // STRING
                required: true,
                choices: [
                    { name: 'Current Week', value: 'current' },
                    { name: 'Week 1', value: 'week1' },
                    { name: 'Week 2', value: 'week2' },
                    { name: 'Week 3', value: 'week3' },
                    { name: 'Week 4', value: 'week4' },
                    { name: 'Monthly', value: 'monthly' },
                ]
            },
            {
                name: 'source',
                description: 'Data source',
                type: 3, // STRING
                required: true,
                choices: [
                    {
                        name: 'Uma.moe',
                        value: 'uma'
                    },
                    {
                        name: 'Chronogenesis.net',
                        value: 'chrono'
                    }
                ]
            }
        ]
    },
    {
        name: 'funfact',
        description: 'Get a random sil fact',
        options: []
    },
    {
        name: 'update',
        description: 'Manual refresh Club Data and First fans',
        options: []
    },
    {
        name: 'update-cm',
        description: 'Manual refresh CM Data GameTora.com',
        options: []
    },
    {
        name: 'update-skills',
        description: 'Manual refresh Skills Data GameTora.com',
        options: []
    },
    {
        name: 'benchmark',
        description: 'Club benchmark requirements',
        options: []
    },
    {
        name: 'trainer',
        description: 'Trainer fans report',
        options: [
            {
                name: 'period',
                description: 'Report period',
                required: true,
                choices: [
                    { name: 'Current Week', value: 'current' },
                    { name: 'Week 1', value: 'week1' },
                    { name: 'Week 2', value: 'week2' },
                    { name: 'Week 3', value: 'week3' },
                    { name: 'Week 4', value: 'week4' },
                    { name: 'Monthly', value: 'monthly' },
                ]
            },
            {
                name: 'name',
                description: 'Trainer name',
                required: true,
                type: 3   // 3 = STRING
            },
            {
                name: 'source',
                description: 'Data source',
                type: 3, // STRING
                required: true,
                choices: [
                    {
                        name: 'Uma.moe',
                        value: 'uma'
                    },
                    {
                        name: 'Chronogenesis.net',
                        value: 'chrono'
                    }
                ]
            }
        ]
    },
    {
        name: 'anime',
        description: 'Search for an anime on Kitsu',
        options: [
            {
                name: 'title',
                description: 'The anime title to search',
                required: true,
                type: 3   // STRING
            }
        ]
    },
    {
        name: 'manga',
        description: 'Search for a manga on Kitsu',
        options: [
            {
                name: 'title',
                description: 'The manga title to search',
                required: true,
                type: 3   // STRING
            }
        ]
    },
    {
        name: 'screen',
        description: 'Screening new Member',
        options: [
            {
                name: 'trainer-id',
                description: 'Umamusume Trainer ID',
                required: true,
                type: 3   // STRING
            }
        ]
    },
    {
        name: 'cm',
        description: 'Champion Meeting Track',
        options: [
            {
                name: 'cm-numbers',
                description: 'Umamusume Champion Meetings Numbers',
                required: true,
                type: 4,   // INTEGER
                required: true,
            }
        ]
    },
    {
        name: 'skill',
        description: 'Show Uma Musume skill information',
        options: [
            {
            name: 'name',
            description: 'Skill name',
            type: 3,
            required: true,
            autocomplete: true
            }
        ]
    },
    {
        name: 'quota-view',
        description: 'View club quota settings',
        options: [
            {
                name: 'club',
                description: 'Club name',
                type: 3, // STRING
                required: true,
                choices: [
                    {
                        name: 'First',
                        value: 'First'
                    }
                ]
            }
        ]
    },
    {
        name: 'quota-set',
        description: 'Update club quota',
        options: [
            {
                name: 'club',
                description: 'Club name',
                type: 3, // STRING
                required: true,
                choices: [
                    {
                        name: 'First',
                        value: 'First'
                    }
                ]
            },
            {
                name: 'week',
                description: 'Week number',
                type: 4,
                required: true,
                choices: [
                    { name: 'Week 1', value: 1 },
                    { name: 'Week 2', value: 2 },
                    { name: 'Week 3', value: 3 },
                    { name: 'Week 4', value: 4 }
                ]
            },
            {
                name: 'daily',
                description: 'Daily quota',
                type: 4,
                required: true
            }
        ]
    }
];