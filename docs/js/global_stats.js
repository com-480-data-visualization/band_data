/// <reference types="d3" />

import atp_stats from "/data/overview_atp_stats.json" with {type: "json"}
import wta_stats from "/data/overview_wta_stats.json" with {type: "json"}

// ######################## Load data #############################################
// Load atp datasets
// const atp_rankings = await d3.csv("data/atp_rankings.csv", d3.autoType);
// const atp_players_array = await d3.csv("data/atp_players_expanded.csv", d3.autoType);
// const atp_players = atp_players_array.reduce((acc, player) => {
//     acc[player.player_id] = player;
//     return acc;
// }, {});

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
let playersDropdown = document.getElementById("playersDropdown")

playersDropdown = document.getElementById("playersDropdown")
playersDropdown.addEventListener("change", function (event) {
    const value = event.target.value
    switch (value) {
        case "top100_atp":
            worldMap.draw(atp_stats[1000].country_counts)
            break
        case "top100_wta":
            worldMap.draw(wta_stats[1000].country_counts)
            break
        case "top100":
            break
    }
    console.log(value)
});




// ####################### Code #################################################


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

class WorldMap {
    constructor() {
        // Setup svg and projection
        const width = 900, height = 500;

        this.svg = d3.select("#world-map")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        this.projection = d3.geoMercator()
            .scale(130) // Adjust for zoom
            .translate([width / 2, height / 1.5]); // Center map nicely

        this.radiusScale = d3.scaleSqrt().range([5, 40]);
    }

    draw(countryCounts) {
        console.log(countryCounts)

        this.radiusScale = d3.scaleSqrt().domain([0, d3.max(Object.values(countryCounts))]).range([5, 40]);
        //this.radiusScale.domain([0, d3.max(Object.values(countryCounts))]);

        // Draw Bubbles
        const data = Object.entries(countryCounts)
            .map(([ioc, count]) => {
                const coords = countryCoords[ioc];
                if (!coords) {
                    console.log(`Country ${ioc} not found`)
                    return null
                }
                const [x, y] = this.projection(coords);
                // x0 and y0 are ideal positions, x,y are the simulated positions to avoid overlap.
                return { ioc, count, x0: x, y0: y, x, y, r: this.radiusScale(count) };
            })
            .filter(d => d !== null);

        const simulation = d3.forceSimulation(data)
            .force("x", d3.forceX(d => d.x0).strength(0.5))
            .force("y", d3.forceY(d => d.y0).strength(0.5))
            .force("collide", d3.forceCollide(d => d.r + 1).iterations(3))
            .stop();

        // Run the simulation synchronously for a fixed number of ticks
        for (let i = 0; i < 120; ++i) simulation.tick();

        // d => d.ioc here tells d3 that d.ioc is the id to look for to know if it's a knew circle or not
        this.svg.selectAll("circle")
            .data(data, d => d.ioc)
            .join(
                enter => {
                    const circle = enter.append("circle")
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y)
                        .attr("r", d => d.r)
                        .attr("fill", "steelblue")
                        .attr("fill-opacity", 0.6)
                        .attr("stroke", "black")
                        .attr("stroke-width", 0.5)

                    circle.append("title")
                        .text(d => `${d.ioc}: ${d.count} players`)
                    return circle
            },

                update => {
                    update.transition().duration(300)
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y)
                        .attr("r", d => d.r);
                    return update;
                }
            );
    }
}
 

const worldMap = new WorldMap()
// draw_statsbydate_linechart(stats)
worldMap.draw(atp_stats[1000].country_counts)