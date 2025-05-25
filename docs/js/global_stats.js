/// <reference types="d3" />

import atp_stats from "/data/overview_atp_stats.json" with {type: "json"}
import wta_stats from "/data/overview_wta_stats.json" with {type: "json"}

const parseDate = d3.timeParse("%Y%m%d");
atp_stats.forEach(x => x.ranking_date = parseDate(x.ranking_date))
wta_stats.forEach(x => x.ranking_date = parseDate(x.ranking_date))
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

// ##################### Declare UI elements #################################
const playersDropdown = document.getElementById("playersDropdown")


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

class TimeSlider {

    constructor(initvalue = null, app) {
        this.initValue = initvalue // date
        this.app = app
        this.slider = null

        window.addEventListener("resize", () => {
            this.draw(this.app.statsOn); // re-render the slider on window resize
        });
    }


    draw(stats) {
        const containerWidth = document.getElementById("slider-container").clientWidth;
        // Convert stats to indexable by date
        const dateToStats = new Map(stats.map(s => [s.ranking_date.toISOString().slice(0, 10), s]));

        // --- D3 Slider (Time-based) ---
        const dates = stats.map(d => d.ranking_date);

        const formatWeek = date => {
            const year = date.getFullYear();
            const week = d3.timeFormat("%U")(date); // %U = week number starting Sunday
            return `${year} Week ${+week}`;
        };

        // Choose when to put ticks
        const groupedByYear = Array.from(d3.group(dates, d => d.getFullYear()).values());
        const approxLabelWidth = 80; // px per label
        const maxTicks = Math.floor((containerWidth - 50) / approxLabelWidth); // account for padding
        const everyNthYear = Math.ceil(groupedByYear.length / maxTicks);
        const tickValues = groupedByYear
            .filter((group, i) => i % everyNthYear === 0)
            .map(group => group[0]); // first date of each selected year

        const newValue = this.slider?.value() ?? this.initValue
        this.slider = d3.sliderBottom()
            .min(d3.min(dates))
            .max(d3.max(dates))
            .step(1000 * 60 * 60 * 24 * 7) // 1 week
            .width(containerWidth - 50) // subtract some padding
            .tickFormat(d3.timeFormat("%Y"))
            .tickValues(tickValues) // Show 1 tick per year
            .displayValue(false) // Do not show current date as its not very readable
            .default(newValue ?? dates[0])
            .on('onchange', date => {
                d3.select("#slider-date-label").text(formatWeek(date));
                const key = date.toISOString().slice(0, 10);
                const stat = dateToStats.get(key);
                if (stat) this.app.stats = stat;
            });

        d3.select("#slider-container").select("svg").remove();
        d3.select("#slider-container")
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", 70)
            .append("g")
            .attr("transform", "translate(30,30)")
            .call(this.slider);
        
        d3.select("#slider-date-label").text(formatWeek(newValue ?? dates[0]));
        const key = this.slider.value().toISOString().slice(0, 10);
        const stat = dateToStats.get(key);
        if (stat) this.app.stats = stat;
    }
}

class WorldMap {
    constructor(containerId = "#world-map", maxHeightRatio = 0.6) {
        this.containerId = containerId;
        this.maxHeightRatio = maxHeightRatio;
        this.svg = null;
        this.radiusScale = d3.scaleSqrt().range([5, 40]);

        this._init();
        window.addEventListener("resize", () => this._init()); // Update on resize
    }

    _init() {
        // Remove previous SVG if it exists
        d3.select(this.containerId).select("svg").remove();

        const container = document.querySelector(this.containerId);
        const maxWidth = container.clientWidth; //clientwidth excludes scrollbar (inner would be with)
        const maxHeight = window.innerHeight * this.maxHeightRatio;
        const height = Math.min(maxWidth * 0.55, maxHeight); // maintain aspect ratio (approx 16:9)
        const width = height / 0.55


        // Create new SVG
        this.svg = d3.select(this.containerId)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("display", "block")
            .style("margin", "0 auto"); // center horizontally

        // Setup projection
        this.projection = d3.geoMercator()
            .scale((width / 800) * 130) // scale relative to original 800px width
            .translate([width / 2, height / 1.5]); // center projection (center is a bit in the north)
        
        this.draw()
    }

    draw(countryCounts = null) {
        if (countryCounts == null) countryCounts = this.countryCounts
        else this.countryCounts = countryCounts
        if (countryCounts == null || this.svg == null) return

        this.radiusScale.domain([0, d3.max(Object.values(countryCounts))]);

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

// ######################## Declare UI elements #################################

class OverviewApp {
    constructor() {
        const initstats = atp_stats[1000]
        this.worldMap=new WorldMap()
        this.timeSlider =new TimeSlider(initstats.ranking_date, this)
        this.statsOn=atp_stats
        this.stats=initstats
    }

    #statsOn
    get statsOn() {
        return this.#statsOn
    }
    set statsOn(group) {
        if (group !== atp_stats && group !== wta_stats) {
            console.log(`Tried to set illegal players group ${group}`)
            return
        }
        if (group === this.#statsOn) return
        this.#statsOn = group
        switch (group) {
            case atp_stats:
                playersDropdown.value = "top100_atp"
                break
            case wta_stats:
                playersDropdown.value = "top100_wta"
                break
        }
        this.timeSlider.draw(group)
    }

    #stats
    get stats() {
        return this.#stats
    }
    set stats(s) {
        if (s === this.#stats) return
        this.#stats = s

        this.worldMap.draw(s.country_counts)
        this.timeSlider.slider.value(s.ranking_date) // Does not dispatch on change, so no loop
    }
}

const app = new OverviewApp()

playersDropdown.addEventListener("change", function (event) {
    const value = event.target.value
    switch (value) {
        case "top100_atp":
            app.statsOn = atp_stats
            break
        case "top100_wta":
            app.statsOn = wta_stats
            break
        case "top100":
            break
    }
    console.log(value)
});