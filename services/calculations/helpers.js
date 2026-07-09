const DAYS_PER_WEEK = 7;
const KICK_GRACE_DAYS = 1;

function getCurrentWeekInfo() {

    const jakartaNow = new Date(
        new Date().toLocaleString(
            'en-US',
            {
                timeZone: 'Asia/Jakarta'
            }
        )
    );

    const effectiveDay =
        Math.max(
            1,
            jakartaNow.getDate() - 1
        );

    const currentWeekIndex =
        Math.floor(
            (effectiveDay - 1) /
            DAYS_PER_WEEK
        );

    const dayOfCurrentWeek =
        ((effectiveDay - 1) %
            DAYS_PER_WEEK) + 1;

    return {
        effectiveDay,
        currentWeekIndex,
        dayOfCurrentWeek
    };

}

function getLatestUpdate(
    members
) {

    return Math.max(
        ...members.map(
            member =>
                new Date(
                    member.last_updated
                ).getTime()
        )
    );

}

function isMemberKicked(
    member,
    latestUpdate
) {

    const lastUpdate =
        new Date(
            member.last_updated
        ).getTime();

    const graceMs =
        KICK_GRACE_DAYS *
        24 *
        60 *
        60 *
        1000;

    return (
        lastUpdate + graceMs <
        latestUpdate
    );

}

function normalizeName(
    value
) {

    return String(value)
        .normalize('NFKC')
        .trim();

}

function getActiveMonthData(
    daily
) {

    if (
        !Array.isArray(daily) ||
        daily.length < 2
    ) {
        return [];
    }

    let lastActiveIndex = -1;

    for (
        let i = daily.length - 1;
        i >= 0;
        i--
    ) {

        if (
            (Number(daily[i]) || 0) > 0
        ) {

            lastActiveIndex = i;
            break;

        }

    }

    if (lastActiveIndex < 1) {
        return [];
    }

    return daily.slice(
        0,
        lastActiveIndex + 1
    );

}

module.exports = {

    getCurrentWeekInfo,

    getLatestUpdate,

    isMemberKicked,

    normalizeName,

    getActiveMonthData

};