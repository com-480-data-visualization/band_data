/// <reference types="d3" />

// ######################## Load data #############################################
import atp_stats from "../data/overview_atp_stats.json" with {type: "json"}
import wta_stats from "../data/overview_wta_stats.json" with {type: "json"}
import atp_player_stats from "../data/atp_player_stats.json" with {type: "json"}
import wta_player_stats from "../data/wta_player_stats.json" with {type: "json"}
import countryCoords from "../data/countries.json" with {type: "json"}
// import * as countriesLib from "https://esm.sh/countries-list@3.1.1"

const parseDate = d3.timeParse("%Y%m%d");
atp_stats.forEach(x => x.ranking_date = parseDate(x.ranking_date))
wta_stats.forEach(x => x.ranking_date = parseDate(x.ranking_date))

function enrich_stats(stats, player_stats) {
    for (const stat of stats) {
        stat.hard = stat.player_ids.map(id => player_stats.Hard[id])
        stat.clay = stat.player_ids.map(id => player_stats.Clay[id])
        stat.grass = stat.player_ids.map(id => player_stats.Grass[id])
        stat.carpet = stat.player_ids.map(id => player_stats.Carpet[id])
    }
}
enrich_stats(atp_stats, atp_player_stats)
enrich_stats(wta_stats, wta_player_stats)

// ##################### Declare UI elements #################################
const playersDropdown = document.getElementById("playersDropdown")
const overviewStatsDropdown = document.getElementById("overviewStatsDropdown")
const overviewSurfaceDropdown = document.getElementById("overviewSurfaceDropdown")


// ####################### Charts #################################################

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
    constructor(containerId = "topplayers_table", gridjsClass="topplayers-gridjs-container") {
        this.containerId = containerId;
        this.gridjsClass = gridjsClass
        this.gridInstance = null;
    }

    draw(data, affiliation) {
        if (affiliation !== "atp" && affiliation !== "wta") {
            console.log(affiliation)
            console.log("Error: Expected affiliation to be atp or wta")
        }
        this.affiliation = affiliation
        if (this.gridInstance) {
            this.gridInstance.updateConfig({ data }).forceRender();
        } else {
            this.gridInstance = new gridjs.Grid({
                columns: ["Rank", "Name", {name: "ioc", hidden: true}, {name: "player_id", hidden: true}],
                data,
                fixedHeader: true,
                search: true,
                className: {
                    container: this.gridjsClass,
                },
            }).on("rowClick", this._rowclickevent.bind(this)).render(document.getElementById(this.containerId));
        }
    }

    _rowclickevent(event, row) {
        const params = new URLSearchParams({
            playerName: row.cells[1].data,
            playerId: row.cells[3].data,
            association: this.affiliation || 'wta',
      });
        window.location.href = `player-profile.html?${params.toString()}`;
    }
}

class TimeSliders {
    constructor(initvalue = null, app) {
        const positions = [
            ["#slider-container", "#slider-date-label"],
            ["#slider-container2", "#slider-date-label2"],
            ["#slider-container3", "#slider-date-label3"],
        ]
        this.sliders = []
        for (const position of positions) {
            this.sliders.push(new TimeSlider(initvalue, app, position[0], position[1]))
        }
    }

    draw(stats) {
        for (const slider of this.sliders) {
            slider.draw(stats)
        }
    }

    setValue(value) {
        for (const slider of this.sliders) {
            if (slider.slider)
                slider.setValue(value)
        }
    }
}

class TimeSlider {

    constructor(initvalue = null, app, containerId, labelId) {
        this.containerId=containerId
        this.labelId=labelId
        this.initValue = initvalue // date
        this.app = app
        this.slider = null

        window.addEventListener("resize", () => {
            this.draw(this.app.statsOn); // re-render the slider on window resize
        });
    }

    _formatWeek(date) {
        const year = date.getFullYear();
        const week = d3.timeFormat("%U")(date); // %U = week number starting Sunday
        return `${year} Week ${+week}`;
    }


    draw(stats) {
        const containerWidth = document.querySelector(this.containerId).clientWidth;
        // Convert stats to indexable by date
        const dateToStats = new Map(stats.map(s => [s.ranking_date.toISOString().slice(0, 10), s]));

        // --- D3 Slider (Time-based) ---
        const dates = stats.map(d => d.ranking_date);

        // Choose when to put ticks
        const groupedByYear = Array.from(d3.group(dates, d => d.getFullYear()).values());
        const approxLabelWidth = 80; // px per label
        const maxTicks = Math.floor((containerWidth - 50) / approxLabelWidth); // account for padding
        const everyNthYear = Math.ceil(groupedByYear.length / maxTicks);
        const tickValues = groupedByYear
            .filter((group, i) => i % everyNthYear === 0)
            .map(group => group[0]); // first date of each selected year

        this._onchangeCallback =  date => {
            d3.select(this.labelId).text(this._formatWeek(date));
            const key = date.toISOString().slice(0, 10);
            const stat = dateToStats.get(key);
            if (stat) this.app.stats = stat;
        }


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
            .on('onchange', date => this._onchangeCallback(date));

        d3.select(this.containerId).select("svg").remove();
        d3.select(this.containerId)
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", 70)
            .append("g")
            .attr("transform", "translate(30,30)")
            .call(this.slider);
        
        d3.select(this.labelId).text(this._formatWeek(newValue ?? dates[0]));
        const key = this.slider.value().toISOString().slice(0, 10);
        const stat = dateToStats.get(key);
        if (stat) this.app.stats = stat;
    }

    setValue(value) {
        this.slider.on("onchange", null)
        d3.select(this.labelId).text(this._formatWeek(value));
        this.slider.value(value)
        if (this._onchangeCallback) {
            this.slider.on("onchange", date => this._onchangeCallback(date))
        }
    }
}

class WorldMap {
    constructor(containerId = "#world-map", maxHeightRatio = 0.6) {
        this.containerId = containerId;
        this.maxHeightRatio = maxHeightRatio;
        this.svg = null;
        this.radiusScale = d3.scaleSqrt().range([5, 50]);
        this.table = new Table("countrymap-popup-table", "countrymap-gridjs-container");

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

        // Setup projection (0.45 instead of 0.5 to be sure new zealand is visible)
        this.projection = d3.geoMercator()
            .scale((width / 800) * 130) // scale relative to original 800px width
            .translate([width * 0.45, height / 1.5]); // center projection (center is a bit in the north)
        
        this.draw()
    }

    draw(stats = null) {
        if (stats == null) stats = this.stats
        else this.stats = stats
        if (stats == null || this.svg == null) return
        const countryCounts = stats.country_counts

        document.getElementById("countrymap-popup").classList.add("hidden");

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
                        .attr("cursor", "pointer")
                        .attr("fill-opacity", 0.6)
                        .attr("stroke", "black")
                        .attr("stroke-width", 0.5)
                        .on("click", (event, d) => this.openPopup(d, stats));

                    g.append("title")
                        .text(d => `${d.info.country}: ${d.count} players`)
                    
                    g.append("text")
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
                    update.select("circle")
                        .on("click", (event, d) => this.openPopup(d, stats))
                        .transition().duration(300)
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y)
                        .attr("r", d => d.r);
                    
                    update.select("title")
                        .text(d => `${d.info.country}: ${d.count} players`)

                    update.select("text")
                        .transition().duration(300)
                        .attr("x", d => d.x)
                        .attr("y", d => d.y + d.r * 0.07)
                        .attr("font-size", d => Math.min(d.r, 50) + "px")
                        .text(d => d.info.emojiflag);
                    return update;
                }
            );
    }

    openPopup(d, stats) {
        const players = stats.players
        const popup = d3.select("#countrymap-popup");
        const title = d3.select("#countrymap-popup-title");
        const popupTable = d3.select("#countrymap-popup-table");

        // Clear and show popup
        popup.classed("hidden", false);
        title.text(d.info.country); // Use a mapping of IOC to full country name
        popupTable.html("");

        this.table.draw(players.filter(p => p[2] == d.ioc), stats.affiliation);

        // Positioning based on circle's projected center
        const circleX = d.x;
        const circleY = d.y;

        // Get SVG's position relative to the document
        const svgNode = this.svg.node();
        const svgRect = svgNode.getBoundingClientRect();

        const popupWidth = 350;

        const arrowHeight = 10; //must match css
        const left = svgRect.left + window.scrollX + circleX - popupWidth / 2;
        const bottom = window.innerHeight - (svgRect.top + window.scrollY + circleY - d.r - arrowHeight);

        popup
            .style("left", `${left}px`)
            .style("bottom", `${bottom}px`)
            .style("width", `${popupWidth}px`)
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

class ParallelCoordsChart {
    constructor(containerId = "#overview-parallelcoordschart") {
        this.containerId = containerId;
        this.margin = { top: 30, right: 10, bottom: 30, left: 10 };
        this.dimensions = [
            "Ace%",
            "First In%",
            "First In Win%",
            "Second In Win%",
            "Double Fault%",
            "Break Point Saved%"
        ];

        this._init();
        window.addEventListener("resize", () => this._init()); 
    }

    _init() {
        const container = document.querySelector(this.containerId);
        this.width = container.clientWidth;
        this.height = 400;
        this.chartWidth = this.width - this.margin.left - this.margin.right;
        this.chartHeight = this.height - this.margin.top - this.margin.bottom;

        d3.select(this.containerId).select("svg").remove();

        this.svg = d3.select(this.containerId)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // X: position of axes
        this.x = d3.scalePoint()
            .range([0, this.chartWidth])
            .padding(0.5)
            .domain(this.dimensions);

        // Y: one scale per dimension
        this.y = {};
        for (const dim of this.dimensions) {
            this.y[dim] = d3.scaleLinear()
                .domain([1, 100])
                .range([this.chartHeight, 0]);
        }

        // Draw static axes
        this.svg.selectAll(".dimension")
            .data(this.dimensions)
            .join("g")
            .attr("class", "dimension")
            .attr("transform", d => `translate(${this.x(d)})`)
            .each((d, i, nodes) => {
                d3.select(nodes[i])
                    .call(d3.axisLeft(this.y[d]).ticks(5))
                    .append("text")
                    .attr("y", -10)
                    .style("text-anchor", "middle")
                    .style("fill", "#000")
                    .text(d);
            });

        this.draw()

    }

    draw(data) {
        if (data == null) data = this.data
        else this.data = data
        if (data == null) return

        // Filter out invalid data rows
        const validData = data.filter(d => {
            return d && this.dimensions.every(dim => typeof d[dim] === "number" && !isNaN(d[dim]));
        });

        const linePath = d => d3.line()(this.dimensions.map(p => [this.x(p), this.y[p](d[p])]));

        this.svg.selectAll(".data-line")
            .data(validData, d => d.id)
            .join(
                enter => {
                    const path = enter.append("path")

                    path.attr("class", "data-line")
                        .attr("fill", "none")
                        .attr("stroke", "steelblue")
                        .attr("stroke-width", 1.5)
                        .attr("stroke-opacity", 0.6)
                        .attr("d", linePath)
                        .attr("opacity", 0)
                        .transition().duration(400)
                        .attr("opacity", 1)

                    return path
                },

                update => {
                    update
                        .transition().duration(500)
                        .attr("d", linePath)
                    return update
                },

                exit => {
                    exit
                        .transition().duration(300)
                        .attr("opacity", 0)
                        .remove()
                }
            );
    }
}

// ######################## UI reactivity #################################

class OverviewApp {
    constructor() {
        const initstats = atp_stats[1000]
        this.worldMap=new WorldMap()
        this.timeSlider =new TimeSliders(initstats.ranking_date, this)
        this.lineChart = new LineChart()
        this.parallelCoordsChart = new ParallelCoordsChart()
        this.table = new Table()
        this.statsOn=atp_stats
        this.surfaceType="hard"
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
        // This clearing is necessary as ids of atp and wta may overlap.
        this.parallelCoordsChart.data = null
        this.parallelCoordsChart._init()
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

        this.worldMap.draw(s)
        this.table.draw(s.players, s.affiliation)
        if (this.surfaceType)
            this.parallelCoordsChart.draw(s[this.surfaceType])
        this.timeSlider.setValue(s.ranking_date) // Does not dispatch on change, so no loop
    }

    #statOverTime
    get statOverTime() {
        return this.#statOverTime
    }
    set statOverTime(s) {
        if (!Array.from(overviewStatsDropdown.options).some(option => option.value === s))  {
            console.log(`Tried to set illegal time stat "${s}"`)
            return
        }
        if (s === this.#statOverTime) return
        this.#statOverTime = s
        overviewStatsDropdown.value = s

        this.lineChart.draw(this.statsOn, s)
    }

    #surfaceType
    get surfaceType() {
        return this.#surfaceType
    }
    set surfaceType(s) {
        if (!Array.from(overviewSurfaceDropdown.options).some(option => option.value === s))  {
            console.log(`Tried to set illegal surface type "${s}"`)
            return
        }
        if (s === this.#surfaceType) return
        this.#surfaceType = s
        overviewSurfaceDropdown.value = s

        if (this.stats)
            this.parallelCoordsChart.draw(this.stats[s])
    }
}

const app = new OverviewApp()

overviewStatsDropdown.addEventListener("change", function (event) {
    app.statOverTime = event.target.value
})

overviewSurfaceDropdown.addEventListener("change", function (event) {
    app.surfaceType = event.target.value
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
});

document.getElementById("countrymap-popup-close").addEventListener("click", () => {
    document.getElementById("countrymap-popup").classList.add("hidden");
});
