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

// Generate stats
console.log("Generate stats")
const atp_stats = await get_stats_per_date(atp_rankings, atp_players)
const wta_stats = await get_stats_per_date(wta_rankings, wta_players)

// Write stats
console.log("Write stats")
try {
  await fsExtra.writeJson("../docs/data/overview_atp_stats.json", atp_stats, { spaces: 2 });
  await fsExtra.writeJson("../docs/data/overview_wta_stats.json", wta_stats, { spaces: 2 });
  console.log('JSON file written successfully!');
} catch (err) {
  console.error('Error writing JSON file:', err);
}


async function get_stats_per_date(rankings, players) {

    // Step 1: Filter rank <= 100
    const filtered = rankings.filter(d => d.rank <= 100);

    // Step 2: Group by ranking_date
    const grouped = d3.group(filtered, d => d.ranking_date);

    // Step 3: Compute stat per date (e.g. average rank)
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

        const avgHeight = countHeight ? sumHeight / countHeight : null;
        const avgBegin = countTitleAge ? sumTitleAge / countTitleAge : null;
        const avgEnd = countRetireAge ? sumRetireAge / countRetireAge : null;

        const parseDate = d3.timeParse("%Y%m%d");

        return {
            ranking_date: parseDate(date),
            avg_height: avgHeight,
            avg_first_title: avgBegin,
            avg_retirement: avgEnd,
            pct_never_won_title: (neverWon / top100.length) * 100,
            pct_still_active: (stillActive / top100.length) * 100,
            country_counts: countryCounts
        };
    }).sort((a, b) => a.ranking_date - b.ranking_date);
}