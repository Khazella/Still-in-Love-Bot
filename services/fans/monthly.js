const {
    KICK_GRACE_DAYS,
    MONTHLY_FAN_THRESHOLD
} = require('../../src/config/club-settings');

const THRESHOLD_LABEL =
    `${(MONTHLY_FAN_THRESHOLD / 1_000_000).toFixed(1)}M`;

// ================================
// HELPERS
// ================================

function normalizeName(str) {

    return String(str)
        .normalize('NFKC')
        .trim();

}

function isMemberKicked(
    member,
    latestUpdate
) {

    if (!member?.last_updated) {
        return false;
    }

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

// ================================
// GET ACTIVE MONTH DATA
// ================================

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

// ================================
// MAIN
// ================================

function generateMonthlyReport(
    row
) {

    try {

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

        // ================================
        // KEEP ACTIVE MEMBERS ONLY
        // ================================

        const latestUpdate =
            Math.max(
                ...members
                    .filter(
                        member =>
                            member?.last_updated
                    )
                    .map(
                        member =>
                            new Date(
                                member.last_updated
                            ).getTime()
                    )
            );

        const filteredMembers =
            members.filter(
                member =>
                    !isMemberKicked(
                        member,
                        latestUpdate
                    )
            );

        if (
            !filteredMembers.length
        ) {
            throw new Error(
                'No active members found'
            );
        }

        // ================================
        // AGGREGATION
        // ================================

        const monthlyResults = [];

        for (
            const member of filteredMembers
        ) {

            const daily =
                member.daily_fans;

            if (
                !Array.isArray(daily) ||
                daily.length < 2
            ) {
                continue;
            }

            const activeData =
                getActiveMonthData(
                    daily
                );

            if (
                activeData.length < 2
            ) {
                continue;
            }

            let totalGain = 0;

            for (
                let i = 1;
                i < activeData.length;
                i++
            ) {

                const today =
                    Number(
                        activeData[i]
                    ) || 0;

                const prev =
                    Number(
                        activeData[i - 1]
                    ) || 0;

                if (
                    today <= 0 ||
                    prev <= 0
                ) {
                    continue;
                }

                const gain =
                    today - prev;

                if (gain <= 0) {
                    continue;
                }

                totalGain += gain;

            }

            monthlyResults.push({
                memberName:
                    normalizeName(
                        member.trainer_name ||
                        member.name ||
                        `ID_${member.viewer_id}`
                    ),

                fan_gain:
                    totalGain,

                dayCount:
                    Math.max(
                        1,
                        activeData.length - 1
                    ),

                shame_score:
                    member.shame_score ?? 0
            });

        }

        if (
            monthlyResults.length === 0
        ) {
            throw new Error(
                'No valid processed data'
            );
        }

        // ================================
        // SORT + TOP 30
        // ================================

        const top =
            monthlyResults
                .sort(
                    (a, b) =>
                        b.fan_gain -
                        a.fan_gain
                )
                .slice(0, 30);

        // ================================
        // FORMAT ROWS
        // ================================

        const rows =
            top.map(
                (r, index) => {

                    const dailyAvg =
                        r.fan_gain > 0
                            ? Math.round(
                                r.fan_gain /
                                r.dayCount
                            )
                            : 0;

                    return {
                        rank:
                            index + 1,

                        name:
                            r.memberName,

                        fans:
                            r.fan_gain.toLocaleString(),

                        daily:
                            dailyAvg.toLocaleString(),

                        shame:
                            r.shame_score
                    };

                }
            );

        // ================================
        // OUTPUT
        // ================================

        return {

            title:
                'First : Monthly Fan Report',

            description:
                `Goals: ${THRESHOLD_LABEL}\n` +
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
    generateMonthlyReport
};