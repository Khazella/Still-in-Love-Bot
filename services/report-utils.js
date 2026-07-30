function extractGoal(description = '') {

    const match = description.match(
        /Goal:\s*([\d.]+)M/i
    );

    if (!match) {
        return 0;
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
    const MAX_WEEK_INDEX = 3;

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

    // Use the same capped week-index calculation as
    // getCurrentWeekInfo() so days 29-31 stay in Week 4.
    const currentWeekIndex =
        Math.min(
            Math.floor(
                (effectiveDay - 1) /
                DAYS_PER_WEEK
            ),
            MAX_WEEK_INDEX
        );

    // Recalculate dayOfCurrentWeek based on the capped
    // week start day (e.g. day 30 → day 9 of Week 4).
    const weekStartDay =
        currentWeekIndex *
        DAYS_PER_WEEK;

    const dayOfCurrentWeek =
        effectiveDay - weekStartDay;

    // Determine how many days are in the current week
    // so we can derive the correct daily target from
    // the weekly goal. Weeks 1-3 always have 7 days.
    // Week 4 has (daysInMonth - 21) days.
    const daysInMonth = new Date(
        jakartaNow.getFullYear(),
        jakartaNow.getMonth() + 1,
        0
    ).getDate();

    const weekDaysCount =
        currentWeekIndex < MAX_WEEK_INDEX
            ? DAYS_PER_WEEK
            : daysInMonth - 21;

    const dailyTarget =
        goal / weekDaysCount;

    return dailyTarget * dayOfCurrentWeek;
}

module.exports = {
    extractGoal,
    getCurrentGoal,
    getCurrentWeeklyGoal
};