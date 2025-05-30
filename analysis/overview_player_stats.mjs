import { readFile } from 'fs/promises';
import { csvParse, autoType } from 'd3-dsv';
import * as d3 from 'd3';
import fsExtra from 'fs-extra';
import process from 'process';

const csv = async (path) => csvParse(await readFile(path, 'utf-8'), d3.autoType);

// Load ATP data
console.log("Load ATP data")
const atp_players_array = await csv('../docs/data/atp_players_expanded.csv');
const atp_players = atp_players_array.reduce((acc, player) => {
    acc[player.player_id] = player;
    return acc;
}, {});

const periods = ["90s", "00s", "10s", "20s", "current"];
const atp_rankings = (
  await Promise.all(
    periods.map(period => csv(`../../tennis_atp/atp_rankings_${period}.csv`))
  )
).flat();
const atp_rankings_ids = count_ids_in_ranking(atp_rankings)

// Load WTA data
console.log("Load WTA data")
const wta_players_array = await csv('../docs/data/wta_players_expanded.csv');
const wta_players = wta_players_array.reduce((acc, player) => {
    acc[player.player_id] = player;
    return acc;
}, {});

const wta_rankings = (
  await Promise.all(
    periods.map(period => csv(`../../tennis_wta/wta_rankings_${period}.csv`))
  )
).flat();
const wta_rankings_ids = count_ids_in_ranking(wta_rankings)

console.log("Load player stats (Charlotte)")
const atp_play_stats_csv = await csv('../docs/data/atp_player_stats.csv')
const wta_play_stats_csv = await csv('../docs/data/wta_player_stats.csv')

console.log("Filter and group stats")
const atp_play_stats = group_stats(atp_play_stats_csv, atp_rankings_ids)
const wta_play_stats = group_stats(wta_play_stats_csv, wta_rankings_ids)

// Generate stats
console.log("Generate stats")
const atp_stats = await get_stats_per_date(atp_rankings, atp_players, "atp")
const wta_stats = await get_stats_per_date(wta_rankings, wta_players, "wta")

// Write stats
console.log("Write stats")
try {
    await fsExtra.writeJson("../docs/data/overview_atp_stats.json", atp_stats, { spaces: 2 });
    await fsExtra.writeJson("../docs/data/overview_wta_stats.json", wta_stats, { spaces: 2 });
    await fsExtra.writeJson("../docs/data/atp_player_stats.json", atp_play_stats, { spaces: 2 });
    await fsExtra.writeJson("../docs/data/wta_player_stats.json", wta_play_stats, { spaces: 2 });
    console.log('JSON file written successfully!');
} catch (err) {
    console.error('Error writing JSON file:', err);
}


function group_stats(stats_csv, ids) {
    const stats_dict = {
        "Hard": {},
        "Clay": {},
        "Grass": {},
        "Carpet": {},
    }
    for (const stat of stats_csv) {
        if (ids.has(stat.player_id)) {
            stats_dict[stat.surface][stat.player_id] = {
                "id": stat.player_id,
                "Ace%": stat.ace_pct,
                "First In%": stat["1stIn_pct"],
                "First In Win%": stat["1stWon_pct"],
                "Second In Win%": stat["2ndWon_pct"],
                "Double Fault%": stat.df_pct,
                "Break Point Saved%": stat.bpSaved_pct
            }
        }
    }
    return stats_dict
}

function count_ids_in_ranking(ranking) {
    const ids = new Set()
    for (const r of ranking) {
        ids.add(r.player)
    }
    return ids
}

async function get_stats_per_date(rankings, players, affiliation) {

    const filtered = rankings.filter(d => d.rank <= 100);
    const grouped = d3.group(filtered, d => d.ranking_date);

    return Array.from(grouped, ([date, top100]) => {
        let sumHeight = 0, countHeight = 0;
        let sumTitleAge = 0, countTitleAge = 0;
        let sumRetireAge = 0, countRetireAge = 0;

        let neverWon = 0;
        let stillActive = 0;

        const countryCounts = {};

        for (const { player: id } of top100) {
            const p = players[id];

            // Height
            if (p.height != null && !isNaN(p.height)) {
                sumHeight += p.height;
                countHeight++;
            }

            // First title
            if (p.age_at_first_title != null && !isNaN(p.age_at_first_title)) {
                sumTitleAge += p.age_at_first_title;
                countTitleAge++;
            } else {
                neverWon++;
            }

            // Retirement age
            if (p.retirement_age != null && !isNaN(p.retirement_age)) {
                sumRetireAge += p.retirement_age;
                countRetireAge++;
            } else {
                stillActive++;
            }

            // Country counts
            if (p.ioc) {
                countryCounts[p.ioc] = (countryCounts[p.ioc] || 0) + 1;
            }
        }

        const out_players = top100.map(record => players[record.player]).map((p,i) => ([i+1, `${p.name_first} ${p.name_last}`, p.ioc, p.player_id]))
        const player_ids = top100.map(record => record.player)
        const avgHeight = countHeight ? sumHeight / countHeight : null;
        const avgBegin = countTitleAge ? sumTitleAge / countTitleAge : null;
        const avgEnd = countRetireAge ? sumRetireAge / countRetireAge : null;

        return {
            affiliation,
            ranking_date: date,
            avg_height: avgHeight,
            avg_first_title: avgBegin,
            avg_retirement: avgEnd,
            pct_never_won_title: (neverWon / top100.length) * 100,
            pct_still_active: (stillActive / top100.length) * 100,
            country_counts: countryCounts,
            players: out_players,
            player_ids: player_ids
        };
    }).sort((a, b) => {
        const parseDate = d3.timeParse("%Y%m%d");
        return parseDate(a.ranking_date) - parseDate(b.ranking_date)
    });
}