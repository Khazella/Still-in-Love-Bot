const DAYS_PER_WEEK = 7;
const KICK_GRACE_DAYS = 1;

function getCurrentWeekInfo(
    dailyFans,
    period = 'current'
) {

    const activeMonth =
        getActiveMonthData(dailyFans);

    const latestDay =
        Math.max(
            activeMonth.length,
            1
        );

    // The latest populated array entry represents
    // the current boundary, so the completed
    // reporting day is one day behind it.
    const latestCompletedDay =
        Math.max(
            latestDay - 1,
            1
        );

    let effectiveDay;

    switch (period) {

        case 'week1':
            effectiveDay = 7;
            break;

        case 'week2':
            effectiveDay = 14;
            break;

        case 'week3':
            effectiveDay = 21;
            break;

        case 'week4':
            effectiveDay =
                latestCompletedDay;
            break;

        case 'current':
        default:
            effectiveDay =
                latestCompletedDay;
            break;

    }

    const MAX_WEEK_INDEX = 3;

    const rawWeekIndex =
        Math.floor(
            (effectiveDay - 1) /
            DAYS_PER_WEEK
        );

    const currentWeekIndex =
        Math.min(
            rawWeekIndex,
            MAX_WEEK_INDEX
        );

    // Recalculate dayOfCurrentWeek based on
    // the capped week start day so that days
    // 29-31 get correct positions within Week 4
    // (e.g. day 29 → day 8, not day 1).
    const weekStartDay =
        currentWeekIndex *
        DAYS_PER_WEEK;

    const dayOfCurrentWeek =
        effectiveDay - weekStartDay;

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