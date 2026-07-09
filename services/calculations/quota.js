function getQuotaInfo(
    settings,
    date = new Date()
) {

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

    const dailyGoals = {
        1: Number(settings.week1_daily || 0),
        2: Number(settings.week2_daily || 0),
        3: Number(settings.week3_daily || 0),
        4: Number(settings.week4_daily || 0)
    };

    const weeklyGoals = {
        1:
            dailyGoals[1] *
            weekDays[1],

        2:
            dailyGoals[2] *
            weekDays[2],

        3:
            dailyGoals[3] *
            weekDays[3],

        4:
            dailyGoals[4] *
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
        dailyGoals,
        weeklyGoals,
        monthlyGoal
    };
}

module.exports = {
    getQuotaInfo
};