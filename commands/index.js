module.exports = [
    {
        name: 'fans',
        description: 'First Club Fans Reports',
        options: [
            {
                name: 'period',
                description: 'Report period',
                required: true,
                choices: [
                    { name: 'weekly', value: 'weekly' },
                    { name: 'monthly', value: 'monthly' }
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
        description: 'Manual refresh uma.moe',
        options: []
    },
    {
        name: 'benchmark',
        description: 'Club benchmark requirements',
        options: []
    },
    {
        name: 'trainer',
        description: 'Trainer fan report',
        options: [
            {
                name: 'period',
                description: 'Report period',
                required: true,
                choices: [
                    { name: 'weekly', value: 'weekly' },
                    { name: 'monthly', value: 'monthly' }
                ]
            },
            {
                name: 'name',
                description: 'Trainer name',
                required: true,
                type: 3   // 3 = STRING
            }
        ]
    },
    {
        name: 'anime',
        description: 'Search for an anime on MyAnimeList',
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
        description: 'Search for a manga on MyAnimeList',
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
];