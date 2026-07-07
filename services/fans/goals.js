const {
    WEEKLY_DAILY_GOALS
} = require('../../src/config/club-settings');

function getGoalInfo(date = new Date()) {

    const jakartaNow = new Date(
        date.toLocaleString(
            'en-US',
            {
                timeZone: 'Asia/Jakarta'
            }
        )
    );

    let year =
        jakartaNow.getFullYear();

    let month =
        jakartaNow.getMonth();

    // On the 1st, still use previous month
    if (jakartaNow.getDate() === 1) {

        month--;

        if (month < 0) {
            month = 11;
            year--;
        }

    }

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();

    const weekDays = {
        1: 7,
        2: 7,
        3: 7,
        4: daysInMonth - 21
    };

    const weeklyGoals = {
        1:
            WEEKLY_DAILY_GOALS[1] *
            weekDays[1],

        2:
            WEEKLY_DAILY_GOALS[2] *
            weekDays[2],

        3:
            WEEKLY_DAILY_GOALS[3] *
            weekDays[3],

        4:
            WEEKLY_DAILY_GOALS[4] *
            weekDays[4]
    };

    const monthlyGoal =
        Object.values(weeklyGoals)
            .reduce(
                (sum, value) =>
                    sum + value,
                0
            );

    return {
        daysInMonth,
        weekDays,
        weeklyGoals,
        monthlyGoal
    };
}

module.exports = {
    getGoalInfo
};