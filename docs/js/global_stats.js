/// <reference types="d3" />

// ######################## Load data #############################################
// Load atp datasets
const atp_rankings = await d3.csv("data/atp_rankings.csv", d3.autoType);
const atp_players_array = await d3.csv("data/atp_players_expanded.csv", d3.autoType);
const atp_players = atp_players_array.reduce((acc, player) => {
    acc[player.player_id] = player;
    return acc;
}, {});

// Load wta datasets
// const wta_rankings = await d3.csv("data/wta_rankings.csv", d3.autoType);
// const wta_players_array = await d3.csv("data/wta_players_expanded.csv", d3.autoType);
// const wta_players = wta_players_array.reduce((acc, player) => {
//     acc[player.player_id] = player;
//     return acc;
// }, {});

async function loadCountryCoords() {
    const countries_raw = await fetch("data/countries.json")
    if (!countries_raw.ok) {
        throw new Error("Loading of countries json failed")
    }
    return await countries_raw.json()
}

const countryCoords = await loadCountryCoords()

// ######################## Declare UI elements #################################
const playersDropdown = document.getElementById("playersDropdown")





playersDropdown.addEventListener("change", function (event) {
    //app.addressFilter = event.target.value
});




// ####################### Code #################################################
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

function draw_statsbydate_linechart(stats) {

    // Step 4: Line Chart
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#statsbydate-linechart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(stats, d => d.ranking_date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([d3.min(stats, d => d.avg_retirement), d3.max(stats, d => d.avg_retirement)]).nice()
        .range([height, 0]);

    const line = d3.line()
        .x(d => x(d.ranking_date))
        .y(d => y(d.avg_retirement));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("path")
        .datum(stats)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);
}

function draw_word_map(countryCounts) {
    // Setup svg and projection
    const width = 900, height = 500;

    const svg = d3.select("#world-map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const projection = d3.geoMercator()
        .scale(130) // Adjust for zoom
        .translate([width / 2, height / 1.5]); // Center map nicely

    const radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(Object.values(countryCounts))])
        .range([5, 40]);

    // Draw Bubbles
    const data = Object.entries(countryCounts)
        .map(([ioc, count]) => {
            const coords = countryCoords[ioc];
            if (!coords) {
                console.log(`Country ${ioc} not found`)
                return null
            }
            const [x, y] = projection(coords);
            // x0 and y0 are ideal positions, x,y are the simulated positions to avoid overlap.
            return { ioc, count, x0: x, y0: y, x, y, r: radiusScale(count) };
        })
        .filter(d => d !== null);

    const simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(d => d.x0).strength(0.5))
        .force("y", d3.forceY(d => d.y0).strength(0.5))
        .force("collide", d3.forceCollide(d => d.r + 1).iterations(3))
        .stop();

    // Run the simulation synchronously for a fixed number of ticks
    for (let i = 0; i < 120; ++i) simulation.tick();

    const nodes = svg.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.r)
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0.6)
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .append("title")
        .text(d => `${d.ioc}: ${d.count} players`);
}

const stats = await get_stats_per_date(atp_rankings, atp_players)
// draw_statsbydate_linechart(stats)
draw_word_map(stats[1000].country_counts)