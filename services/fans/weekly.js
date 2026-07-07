const {
    getGoalInfo
} = require('./goals');

const DAYS_PER_WEEK = 7;
const KICK_GRACE_DAYS = 1;

// =======================================================
// DATE HELPERS
// =======================================================

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

// =======================================================
// HELPERS
// =======================================================

function getLatestUpdate(members) {

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

function normalizeName(value) {

    return String(value)
        .normalize('NFKC')
        .trim();

}

// =======================================================
// MAIN
// =======================================================

function generateWeeklyReport(
    row,
    settings
) {

    try {

        const {
            currentWeekIndex,
            dayOfCurrentWeek
        } = getCurrentWeekInfo();

        const goalInfo =
            getGoalInfo(settings);

        const weeklyGoal =
            goalInfo.weeklyGoals[
                currentWeekIndex + 1
            ];

        const THRESHOLD_DISPLAY_TEXT =
            `${(
                weeklyGoal /
                1_000_000
            ).toFixed(1)}M`;

        const members =
            row.members ||
            row.data?.members;

        if (
            !Array.isArray(members) ||
            members.length === 0
        ) {
            throw new Error(
                'No members data found in input'
            );
        }

        const scrapedAtUtc =
            row.scraped_at_utc ||
            row.data?.scraped_at_utc ||
            row.scraped_at ||
            null;

        const circle =
            row.data?.circle ??
            row.circle ??
            {};

        const latestUpdate =
            getLatestUpdate(members);

        const filteredMembers =
            members.filter(
                member =>
                    !isMemberKicked(
                        member,
                        latestUpdate
                    )
            );

        const weeklyResults = [];

        for (
            const member of filteredMembers
        ) {

            const dailyTotals =
                member.daily_fans;

            if (
                !Array.isArray(dailyTotals) ||
                dailyTotals.length < 2
            ) {
                continue;
            }

            const weeklyTotals = [];
            const weeklyActiveDays = [];

            for (
                let i = 1;
                i < dailyTotals.length;
                i++
            ) {

                const today =
                    Number(
                        dailyTotals[i]
                    ) || 0;

                const yesterday =
                    Number(
                        dailyTotals[i - 1]
                    ) || 0;

                if (
                    today === 0 &&
                    yesterday === 0
                ) {
                    continue;
                }

                if (
                    today <= 0 ||
                    yesterday <= 0
                ) {
                    continue;
                }

                if (
                    today < yesterday
                ) {
                    continue;
                }

                const gain =
                    today - yesterday;

                if (gain <= 0) {
                    continue;
                }

                const weekIndex =
                    Math.floor(
                        (i - 1) /
                        DAYS_PER_WEEK
                    );

                weeklyTotals[
                    weekIndex
                ] =
                    (
                        weeklyTotals[
                            weekIndex
                        ] || 0
                    ) + gain;

                weeklyActiveDays[
                    weekIndex
                ] =
                    (
                        weeklyActiveDays[
                            weekIndex
                        ] || 0
                    ) + 1;
            }

            weeklyResults.push({
                memberName:
                    member.trainer_name ||
                    member.name ||
                    `ID_${member.viewer_id}`,

                weeklyTotals,
                weeklyActiveDays,

                shame_score:
                    member.shame_score ?? 0
            });
        }

        const report =
            weeklyResults.map(r => {

                const fanGain =
                    r.weeklyTotals[
                        currentWeekIndex
                    ] || 0;

                const elapsedWeekDays =
                    Math.max(
                        1,
                        dayOfCurrentWeek
                    );

                const dailyAvg =
                    fanGain > 0
                        ? Math.round(
                            fanGain /
                            elapsedWeekDays
                        )
                        : 0;

                return {
                    name:
                        r.memberName,
                    fans:
                        fanGain,
                    daily:
                        dailyAvg,
                    shame:
                        r.shame_score
                };
            });

        const sorted =
            report.sort(
                (a, b) =>
                    b.fans - a.fans
            );

        const rows =
            sorted.map(
                (r, index) => ({
                    rank:
                        index + 1,
                    name:
                        normalizeName(
                            r.name
                        ),
                    fans:
                        r.fans.toLocaleString(),
                    daily:
                        r.daily.toLocaleString(),
                    shame:
                        r.shame
                })
            );

        return {
            title:
                `${settings.display_name} : Weekly Fan Report — Week ${currentWeekIndex + 1}`,

            description:
                `Goal: ${THRESHOLD_DISPLAY_TEXT}\n` +
                `Monthly Rank: ${circle.monthly_rank ?? '-'}\n` +
                `Last Month Rank: ${circle.last_month_rank ?? '-'}\n` +
                `Members: ${filteredMembers.length}/30`,

            color: 0xff3b3b,

            footer:
                scrapedAtUtc
                    ? `Data source: uma.moe | Last data updated: ${scrapedAtUtc}`
                    : 'Data source: uma.moe',

            rows
        };

    } catch (error) {

        return {
            title: 'Error',
            description:
                error.message,
            color: 0xff0000,
            rows: []
        };

    }

}

module.exports = {
    generateWeeklyReport
};