/// <reference types="d3" />

import atp_stats from "/data/overview_atp_stats.json" with {type: "json"}
import wta_stats from "/data/overview_wta_stats.json" with {type: "json"}
import * as countriesLib from "https://esm.sh/countries-list@3.1.1"

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
const overviewStatsDropdown = document.getElementById("overviewStatsDropdown")


// ####################### Code #################################################

class LineChart {
    constructor(containerId = "#statsbydate-linechart") {
        this.containerId = containerId;
        this.margin = { top: 20, right: 30, bottom: 30, left: 40 };
        this.svg = null;
        this.width = 0;
        this.height = 0;

        this.stats = null
        this.on = null

        window.addEventListener("resize", () => this.draw()); // Redraw on resize
        this._initSVG();
    }

    _initSVG() {
        // Clear old svg
        d3.select(this.containerId).select("svg").remove();

        const container = document.querySelector(this.containerId);
        const fullWidth = container.clientWidth;
        const fullHeight = 400;

        this.width = fullWidth - this.margin.left - this.margin.right;
        this.height = fullHeight - this.margin.top - this.margin.bottom;

        this.svg = d3.select(this.containerId)
            .append("svg")
            .attr("width", fullWidth)
            .attr("height", fullHeight)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
    }

    draw(stats = null, on = null) {
        if (stats == null) stats = this.stats
        else this.stats = stats
        if (on == null) on = this.on
        else this.on = on
        this._initSVG(); // Clear and reset SVG each draw

        if (!stats || stats.length === 0 || on == null) return;

        const x = d3.scaleTime()
            .domain(d3.extent(stats, d => d.ranking_date))
            .range([0, this.width]);

        const y = d3.scaleLinear()
            .domain(d3.extent(stats.filter(d => d[on] != null), d => d[on])).nice()
            .range([this.height, 0]);

        const line = d3.line()
            .defined(d => d[on] != null)
            .x(d => x(d.ranking_date))
            .y(d => y(d[on]));

        // X Axis
        this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(x));

        // Y Axis
        this.svg.append("g")
            .call(d3.axisLeft(y));

        // Line path
        this.svg.append("path")
            .datum(stats)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line);
    }
}

class Table {
    constructor(containerId = "topplayers_table") {
        this.containerId = containerId;
        this.gridInstance = null;
    }

    draw(data) {
        if (this.gridInstance) {
            this.gridInstance.updateConfig({ data }).forceRender();
        } else {
            this.gridInstance = new gridjs.Grid({
                columns: ["Rank", "Name"],
                data,
                fixedHeader: true,
                search: true,
                style: {
                    table: {
                        'white-space': 'nowrap'
                    }
                },
            }).render(document.getElementById(this.containerId));
        }
    }
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
                const info = countryCoords[ioc]
                const coords = info?.coords;
                if (!coords) {
                    console.log(`Country ${ioc} not found`)
                    return null
                }
                const [x, y] = this.projection(coords);
                // x0 and y0 are ideal positions, x,y are the simulated positions to avoid overlap.
                return { info, ioc, count, x0: x, y0: y, x, y, r: this.radiusScale(count) };
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
        this.svg.selectAll("g.country-bubble") // all g (group) elements with class country-bubble
            .data(data, d => d.ioc)
            .join(
                enter => {
                    const g = enter.append("g")
                        .attr("class", "country-bubble");
                    g.append("circle")
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y)
                        .attr("r", d => d.r)
                        .attr("fill", d => continentToColor(d.info.continent))
                        .attr("fill-opacity", 0.6)
                        .attr("stroke", "black")
                        .attr("stroke-width", 0.5)

                    g.append("title")
                        .text(d => `${d.info.country}: ${d.count} players`)
                    
                    g.append("text")
                        .filter(d => d.r > 10) // Show label only if radius is large enough
                        .attr("x", d => d.x)
                        .attr("y", d => d.y + d.r * 0.07)
                        .attr("text-anchor", "middle")
                        .attr("dominant-baseline", "middle")
                        .attr("pointer-events", "none") // Let clicks go through the label
                        .attr("fill", "black")
                        .attr("font-size", d => Math.min(d.r, 50) + "px")
                        //.attr("font-weight", "bold")
                        .text(d => d.info.emojiflag);
                    return g
            },

                update => {
                    console.log("Haha")
                    update.select("circle").transition().duration(300)
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y)
                        .attr("r", d => d.r);
                    
                    update.select("text")
                        .filter(d => d.r > 10)
                        .transition().duration(300)
                        .attr("x", d => d.x)
                        .attr("y", d => d.y + d.r * 0.07)
                        .attr("font-size", d => Math.min(d.r, 50) + "px")
                        .text(d => d.info.emojiflag);
                    return update;
                }
            );
    }
}

function continentToColor(continent) {
    switch (continent) {
        case 'AF': return "#8dd3c7" // Africa
        case 'AN': return "#ffffb3" // Antartica
        case 'AS': return "#fb8072" // Asia
        case 'EU': return "#80b1d3" // Europa
        case 'NA': return "#bebada" // North America
        case 'OC': return "#ffffb3" // Oceania (Australia)
        case 'SA': return "#fdb462" // South America
        default: return "#000000"
    }
}

// ######################## UI reactivity #################################

class OverviewApp {
    constructor() {
        const initstats = atp_stats[1000]
        this.worldMap=new WorldMap()
        this.timeSlider =new TimeSlider(initstats.ranking_date, this)
        this.lineChart = new LineChart()
        this.table = new Table()
        this.statsOn=atp_stats
        this.stats=initstats
        this.statOverTime="avg_retirement"
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
        this.lineChart.draw(group, this.statOverTime)
    }

    #stats
    get stats() {
        return this.#stats
    }
    set stats(s) {
        if (s === this.#stats) return
        this.#stats = s

        this.worldMap.draw(s.country_counts)
        this.table.draw(s.players)
        this.timeSlider.slider.value(s.ranking_date) // Does not dispatch on change, so no loop
    }

    #statOverTime
    get statOverTime() {
        return this.#statOverTime
    }
    set statOverTime(s) {
        console.log("Hey!")
        if (!Array.from(overviewStatsDropdown.options).some(option => option.value === s))  {
            console.log(`Tried to set illegal time stat "${s}"`)
            return
        }
        if (s === this.#statOverTime) return
        overviewStatsDropdown.value = s

        this.#statOverTime = s
        this.lineChart.draw(this.statsOn, s)
    }
}

const app = new OverviewApp()

overviewStatsDropdown.addEventListener("change", function (event) {
    app.statOverTime = event.target.value
})

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