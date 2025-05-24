import { readFile, writeFile } from 'fs/promises';
import * as d3 from 'd3';

const LAST_YEAR = 2024;
const ACTIVE_CUTOFF = LAST_YEAR - 1; // Players active in 2023 or 2024 are considered 

const atp_conf = {
  name: "ATP players",
  matches_prefix: "../../tennis_atp/atp_matches_",
  players_csv: "../../tennis_atp/atp_players.csv",
  expanded_players_csv: "../docs/data/atp_players_expanded.csv"
}

const wta_conf = {
  name: "WTA players",
  matches_prefix: "../../tennis_wta/wta_matches_",
  players_csv: "../../tennis_wta/wta_players.csv",
  expanded_players_csv: "../docs/data/wta_players_expanded.csv"
}

// Load all match files from 1991 to 2024
async function loadMatches(conf) {
  const matches = [];

  for (let year = 1991; year <= LAST_YEAR; year++) {
    const filePath = `${conf.matches_prefix}${year}.csv`;
    const content = await readFile(filePath, 'utf8');
    const parsed = d3.csvParse(content, d3.autoType);
    matches.push(...parsed);
  }

  return matches;
}

// Find each player's first tournament win
function getFirstTournamentWins(matches) {
  const finals = matches.filter(m => m.round === 'F');
  const firstWins = {};

  for (const match of finals) {
    const playerId = match.winner_id;
    const tourneyDate = match.tourney_date;
    const winnerAge = match.winner_age;

    if (
      playerId != null &&
      winnerAge != null &&
      (firstWins[playerId] == null || tourneyDate < firstWins[playerId].tourneyDate)
    ) {
      firstWins[playerId] = {
        tourneyDate,
        age: winnerAge
      };
    }
  }

  return firstWins;
}

// Determine each player's last match and retirement age
function getRetirementAges(matches) {
  const lastSeen = {};

  for (const match of matches) {
    const update = (playerId, age, date) => {
      if (
        playerId != null &&
        age != null &&
        (lastSeen[playerId] == null || date > lastSeen[playerId].tourneyDate)
      ) {
        lastSeen[playerId] = { age, tourneyDate: date };
      }
    };

    update(match.winner_id, match.winner_age, match.tourney_date);
    update(match.loser_id, match.loser_age, match.tourney_date);
  }

  const retirementAges = {};
  for (const [playerId, { age, tourneyDate }] of Object.entries(lastSeen)) {
    const year = Math.floor(tourneyDate / 10000);
    if (year < ACTIVE_CUTOFF) {
      retirementAges[playerId] = age;
    }
  }

  return retirementAges;
}

// Expand player data
async function expandPlayers(conf, firstWins, retirementAges) {
  const content = await readFile(conf.players_csv, 'utf8');
  const players = d3.csvParse(content, d3.autoType);

  const expanded = players.map(player => {
    const firstWin = firstWins[player.player_id];
    const retirementAge = retirementAges[player.player_id];

    return {
      ...player,
      first_title_date: firstWin?.tourneyDate ?? '',
      age_at_first_title: firstWin?.age ?? '',
      retirement_age: retirementAge ?? ''
    };
  });

  return expanded;
}

// Main
async function main(conf) {
  console.log('\x1b[32m%s\x1b[0m', conf.name);
  console.log("Loading match data...");
  const matches = await loadMatches(conf);

  console.log("Calculating first title wins...");
  const firstWins = getFirstTournamentWins(matches);

  console.log("Calculating retirement ages...");
  const retirementAges = getRetirementAges(matches);

  console.log("Expanding player data...");
  const expandedPlayers = await expandPlayers(conf, firstWins, retirementAges);

  console.log("Writing atp_players_expanded.csv...");
  const output = d3.csvFormat(expandedPlayers);
  await writeFile(conf.expanded_players_csv, output, 'utf8');

  console.log("Done.");
}

await main(atp_conf);
await main(wta_conf);