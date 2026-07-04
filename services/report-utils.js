function extractGoal(description = '') {

    const match = description.match(
        /Goals:\s*([\d.]+)M/i
    );

    if (!match) {
        return 69000000;
    }

    return Number(match[1]) * 1000000;
}

function getCurrentGoal(goal) {

    const jakartaNow = new Date(
        new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta'
        })
    );

    const currentDay = jakartaNow.getDate();

    // Day 1 = still previous month
    if (currentDay === 1) {

        const previousMonthDays = new Date(
            jakartaNow.getFullYear(),
            jakartaNow.getMonth(),
            0
        ).getDate();

        return goal;
    }

    const daysInMonth = new Date(
        jakartaNow.getFullYear(),
        jakartaNow.getMonth() + 1,
        0
    ).getDate();

    const dailyTarget =
        goal / daysInMonth;

    return dailyTarget * (currentDay - 1);
}

function getCurrentWeeklyGoal(goal) {

    const DAYS_PER_WEEK = 7;

    const jakartaNow = new Date(
        new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta'
        })
    );

    const effectiveDay =
        Math.max(
            1,
            jakartaNow.getDate() - 1
        );

    const dayOfCurrentWeek =
        ((effectiveDay - 1) % DAYS_PER_WEEK) + 1;

    const dailyTarget =
        goal / DAYS_PER_WEEK;

    return dailyTarget * dayOfCurrentWeek;
}

function getRankIconFile(description = '') {

    const match = description.match(
        /Monthly Rank:\s*(\d+)/i
    );

    if (!match) {
        return 'ranks/rank_1000_icon.png';
    }

    const rank = Number(match[1]);

    if (rank <= 10) {
        return 'ranks/rank_10_icon.png';
    }

    if (rank <= 30) {
        return 'ranks/rank_30_icon.png';
    }

    if (rank <= 100) {
        return 'ranks/rank_100_icon.png';
    }

    if (rank <= 500) {
        return 'ranks/rank_500_icon.png';
    }

    return 'ranks/rank_1000_icon.png';
}

module.exports = {
    extractGoal,
    getCurrentGoal,
    getCurrentWeeklyGoal,
    getRankIconFile
};