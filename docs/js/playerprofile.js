
let csvWTAPlayerPerf = [];
let csvWTAPlayerProfile = [];
let csvWTAPlayerStats = [];
let csvWTAPropSurfaceSunburst = [];

let csvATPPlayerPerf = [];
let csvATPPlayerProfile = [];
let csvATPPlayerStats = [];
let csvATPPropSurfaceSunburst = [];

let csvWinRates = [];

// Load CSV on page load
function loadCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      complete: function (results) {
        const data = results.data;

        if (url.includes('atp_player_perf')) {
          csvATPPlayerPerf = data;
        } else if (url.includes('atp_player_profile')) {
          csvATPPlayerProfile = data;
        } else if (url.includes('atp_player_stats')) {
          csvATPPlayerStats = data;
        } else if (url.includes('atp_prop_surface_sunburst')) {
          csvATPPropSurfaceSunburst = data;
        } else if (url.includes('wta_player_perf')) {
          csvWTAPlayerPerf = data;
        } else if (url.includes('wta_player_profile')) {
          csvWTAPlayerProfile = data;
        } else if (url.includes('wta_player_stats')) {
          csvWTAPlayerStats = data;
        } else if (url.includes('wta_prop_surface_sunburst')) {
          csvWTAPropSurfaceSunburst = data;
        } else if(url.includes('win_rates.csv')) {
          csvWinRates = data;
        }

        resolve();
      },
      error: function (err) {
        reject(err);
      }
    });
  });
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function loadStats(playerName, data) {
  // Stats Section
  playerData = data.filter(row => row.player_name === playerName);

  const statWrapper = document.createElement("div");
  statWrapper.className = "flex gap-3";

  const surfaceColors = {
    Hard: { bg: "bg-blue-50", text: "text-blue-500" },
    Clay: { bg: "bg-orange-50", text: "text-orange-500" },
    Grass: { bg: "bg-green-50", text: "text-green-500" },
    Carpet: { bg: "bg-gray-50", text: "text-gray-500" }
  };

  for (const surface in surfaceColors) {
    surfaceStats = playerData.filter(row => row.surface === surface)
    var winRate;
    if (surfaceStats.length === 0) {
      winRate = -1
    } else {
      winRate = parseFloat(surfaceStats[0].win_rate).toFixed(0);
    }

    //const winRate = surfaceStats[surface];
    const color = surfaceColors[surface] || { bg: "bg-gray-100", text: "text-gray-500" };

    const statBlock = document.createElement("div");
    statBlock.className = "flex flex-col items-center";

    const circle = document.createElement("div");
    circle.className = `flex items-center justify-center h-10 w-10 rounded-full ${color.bg} mb-1`;

    const span = document.createElement("span");
    span.className = `text-base font-bold ${color.text}`;
    span.textContent = winRate == -1 ? `NA`: `${winRate}%`;

    circle.appendChild(span);

    const label = document.createElement("span");
    label.className = "text-xs text-gray-500 text-center";
    label.textContent = surface;

    statBlock.appendChild(circle);
    statBlock.appendChild(label);
    statWrapper.appendChild(statBlock);
  }

  //container.appendChild(statWrapper);
  document.getElementById("perf-overview").appendChild(statWrapper);
}


function playerDescription(playerName, data) {
    const filtered = data.filter(row => {
        return row['winner_name'] === playerName;

    });

    if (filtered.length == 1) {
        const player = filtered[0];

        // career years
        const career = document.getElementById('career-years');
        career.textContent = player['career_start'] + " - " + player['career_end'];

        // win rate
        const winRate = document.getElementById('win-rate');
        winRate.textContent = (parseInt(player['matches_won']) / parseInt(player['total']) * 100).toFixed(2) + "%";

        // grand slam titles
        const titles = document.getElementById('titles');
        titles.textContent = player['G_titles'];

        // hand
        const hand = document.getElementById('hand');
        hand.textContent = player['hand'] === 'R'? 'Right' : 'Left';
    }
}

function drawTimelineChart(playerName, data) {
  const ctx = document.getElementById('timelineChart').getContext('2d');

  // Filter data for the selected player
  const playerData = data.filter(row => row.winner_name === playerName);
  if (playerData.length === 0) {
    console.warn(`No data found for player: ${playerName}`);
    return;
  }

  const years = [...new Set(playerData.map(row => row.tourney_year))];
  const tournamentLevels = [...new Set(playerData.map(row => row.tourney_level))];

  const matchWins = {};
  const titles = {};
  const playerRanks = {};
  const points = { 'G': 2000, 'M': 1000, 'F': 1500, 'A': 500, 'D': 200 };

  tournamentLevels.forEach(level => {
    matchWins[level] = years.map(year => {
      const match = playerData.find(row => row.tourney_year === year && row.tourney_level === level);
      return match ? parseInt(match.match_count) : 0;
    });

    titles[level] = years.map(year => {
      const match = playerData.find(row => row.tourney_year === year && row.tourney_level === level);
      return match ? parseInt(match.titles) : 0;
    });
  });

  years.forEach(year => {
    const row = playerData.find(r => r.tourney_year === year);
    playerRanks[year] = row ? parseInt(row.best_rank) : 0;
  });

  const bubbleColors = {
    'G': 'rgba(255, 99, 132, 0.7)',
    'M': 'rgba(54, 162, 235, 0.7)',
    'A': 'rgba(75, 192, 192, 0.7)',
    'F': 'rgba(200, 192, 0, 0.7)',
    'D': 'rgba(150, 150, 150, 0.7)'
  };

  const bubbleDatasets = tournamentLevels.map(level => {
    const dataset = years.map((year, i) => {
      const wins = matchWins[level][i];
      const pts = points[level];
      const titleCount = titles[level][i];
      if (wins === 0) return null;
      return {
        x: year,
        y: wins,
        r: pts / 100,
        //title: titleCount > 0 ? '★' : ''
      };
    }).filter(d => d !== null);

    return {
      label: level,
      data: dataset,
      backgroundColor: bubbleColors[level] || 'rgba(150, 150, 150, 0.6)',
      borderColor: bubbleColors[level] || 'rgba(150, 150, 150, 1)',
      borderWidth: 1,
      type: 'bubble'
    };
  });

  const lineDataset = {
    label: 'Rank',
    data: years.map(year => playerRanks[year] || 0),
    borderColor: 'rgba(255, 206, 86, 1)',
    backgroundColor: 'rgba(255, 206, 86, 0.5)',
    yAxisID: 'ranking',
    type: 'line',
    fill: false,
    tension: 0.3,
    pointStyle: 'circle'
  };

  new Chart(ctx, {
    data: {
      labels: years,
      datasets: [...bubbleDatasets, lineDataset]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          title: {
            display: true,
            text: 'Matches Won',
            font: {
              size: 18,
              weight: 'bold'
            }
          },
          beginAtZero: true,
          ticks: {
            font: {
              size: 14
            }
          }
        },
        ranking: {
          type: 'logarithmic',
          position: 'right',
          title: {
            display: true,
            text: 'Rank',
            font: {
              size: 18,
              weight: 'bold'
            }
          },
          reverse: true,
          beginAtZero: false,
          ticks: {
            font: {
              size: 14
            }
          }
        },
        x: {
          title: {
            display: true,
            text: 'Year',
            font: {
              size: 18,
              weight: 'bold'
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              if (context.dataset.type === 'bubble') {
                const star = context.raw.title ? ` ${context.raw.title}` : '';
                return `${context.dataset.label}: ${context.raw.y} wins, ${context.raw.r * 100} pts${star}`;
              }
              return `Rank: ${context.raw}`;
            }
          }
        },
        legend: {
          position: 'top'
        }
      }
    }
  });
}

function drawTimelineChart2(playerName, data) {
  const container = document.getElementById("timelineHolder");
  const width = container.clientWidth;
  const height = container.clientHeight;

  const svg = d3.select("#timelineChart").attr('viewBox', '0 0 ' + width + ' ' + height);
  svg.selectAll("*").remove();


  // Filter data for player
  const playerData = data.filter(d => d.winner_name === playerName);
  if (playerData.length === 0) {
    console.warn(`No data found for player: ${playerName}`);
    return;
  }

  // Parse numeric fields
  playerData.forEach(d => {
    d.tourney_year = +d.tourney_year;
    d.match_count = +d.match_count;
    d.titles = +d.titles;
    d.best_rank = +d.best_rank;
  });

  const years = Array.from(new Set(playerData.map(d => d.tourney_year))).sort();
  const levels = Array.from(new Set(playerData.map(d => d.tourney_level)));

  const points = { 'G': 2000, 'M': 1000, 'F': 1500, 'A': 500, 'D': 200 };

  // Prepare aggregated data
  const matchWins = {};
  const titles = {};
  const playerRanks = {};
  levels.forEach(level => {
    matchWins[level] = years.map(year => {
      const row = playerData.find(d => d.tourney_year === year && d.tourney_level === level);
      return row ? row.match_count : 0;
    });
    titles[level] = years.map(year => {
      const row = playerData.find(d => d.tourney_year === year && d.tourney_level === level);
      return row ? row.titles : 0;
    });
  });
  years.forEach(year => {
    const row = playerData.find(d => d.tourney_year === year);
    playerRanks[year] = row ? row.best_rank : null;
  });

  // Chart dimensions
  const margin = { top: 50, right: 60, bottom: 50, left: 60 };

  console.log(width, height);
  //const width = +svg.attr("width") - margin.left - margin.right;
  //const height = +svg.attr("height") - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const x = d3.scaleBand()
    .domain(years)
    .range([0, innerWidth])
    .padding(0.3);

  const yLeft = d3.scaleLinear()
    .domain([0, d3.max(Object.values(matchWins).flat()) * 1.1])
    .range([innerHeight, 0]);

  const yRight = d3.scaleLog()
    .domain([d3.max(Object.values(playerRanks)), 1])
    .range([innerHeight, 0])
    .clamp(true);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("g")
    .call(d3.axisLeft(yLeft))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height/2)
    .attr("y", -45)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Matches Won");

  g.append("g")
    .attr("transform", `translate(${innerWidth},0)`)
    .call(d3.axisRight(yRight).ticks(5, ".0s"))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height/2)
    .attr("y", 45)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .text("Rank (log scale)");

  // Colors for levels
  const colors = {
    'G': 'rgba(255, 99, 132, 0.7)',
    'M': 'rgba(54, 162, 235, 0.7)',
    'A': 'rgba(75, 192, 192, 0.7)',
    'F': 'rgba(200, 192, 0, 0.7)',
    'D': 'rgba(150, 150, 150, 0.7)'
  };

  // Bubble chart (circles) for match wins
  levels.forEach(level => {
    g.selectAll(`circle.${level}`)
      .data(years.map((year, i) => ({
        year,
        wins: matchWins[level][i],
        titleCount: titles[level][i]
      })).filter(d => d.wins > 0))
      .join("circle")
      .attr("class", level)
      .attr("cx", d => x(d.year) + x.bandwidth() / 2)
      .attr("cy", d => yLeft(d.wins))
      .attr("r", d => points[level] / 200) // Scale radius down for visibility
      .attr("fill", colors[level] || 'gray')
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .append("title")
      .text(d => `${level}: ${d.wins} wins${d.titleCount > 0 ? ', ★' : ''}`);
  });

  // Line chart for Rank
  const line = d3.line()
    .defined(d => d.rank !== null && d.rank > 0)
    .x(d => x(d.year) + x.bandwidth() / 2)
    .y(d => yRight(d.rank))
    .curve(d3.curveMonotoneX);

  const rankData = years.map(year => ({
    year,
    rank: playerRanks[year]
  }));

  g.append("path")
    .datum(rankData)
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Points on the rank line
  g.selectAll("circle.rank-point")
    .data(rankData.filter(d => d.rank !== null))
    .join("circle")
    .attr("class", "rank-point")
    .attr("cx", d => x(d.year) + x.bandwidth() / 2)
    .attr("cy", d => yRight(d.rank))
    .attr("r", 4)
    .attr("fill", "orange")
    .append("title")
    .text(d => `Rank: ${d.rank}`);

  // Legend (simple)
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left},${10})`);

  levels.forEach((level, i) => {
    legend.append("rect")
      .attr("x", i * 80)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", colors[level] || 'gray');

    legend.append("text")
      .attr("x", i * 80 + 20)
      .attr("y", 12)
      .text(level)
      .attr("font-size", "12px")
      .attr("alignment-baseline", "middle");
  });

  // Title
  svg.append("text")
    .attr("x", (innerWidth + margin.left + margin.right) / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .text(`Timeline Chart for ${playerName}`);
}

function drawRadarChart(playerName, data) {
  const axisLabels = {
    ace_pct: "Aces",
    "1stIn_pct": "1st In",
    "1stWon_pct": "1st Won",
    "2ndWon_pct": "2nd Won",
    df_pct: "Double Faults",
    bpSaved_pct: "BP Saved"
  };

  const svg = d3.select("#radarChart");
  svg.selectAll("*").remove();

  const container = document.getElementById("radarContainer");
  const width = container.clientWidth;
  const height = container.clientHeight;

  const margin = 40;
  const radius = Math.min(width, height) / 2 - margin;

  const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

  // Radar axes
  const axes = Object.keys(axisLabels);
  const angleSlice = (Math.PI * 2) / axes.length;

  // Filter data
  const playerData = data.find(d => d.winner_name === playerName);
  if (!playerData) {
    console.warn(`No data for player: ${playerName}`);
    return;
  }

  // Normalize data between 0 and 100
  const values = axes.map(axis => +playerData[axis]);

  // Scale for radius
  const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

  // Draw grid circles
  const levels = 5;
  for (let level = 1; level <= levels; level++) {
    const levelFactor = radius * (level / levels);
    g.selectAll(".levels")
        .data(axes)
        .enter()
        .append("line")
        .attr("x1", (d, i) => rScale(level / levels * 100) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y1", (d, i) => rScale(level / levels * 100) * Math.sin(angleSlice * i - Math.PI / 2))
        .attr("x2", (d, i) => rScale(level / levels * 100) * Math.cos(angleSlice * (i + 1) - Math.PI / 2))
        .attr("y2", (d, i) => rScale(level / levels * 100) * Math.sin(angleSlice * (i + 1) - Math.PI / 2))
        .attr("stroke", "#ccc")
        .attr("stroke-width", "0.5px");
  }

  // Axis lines
  const axisGrid = g.selectAll(".axis")
      .data(axes)
      .enter()
      .append("g")
      .attr("class", "axis");

  axisGrid.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", (d, i) => rScale(100) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y2", (d, i) => rScale(100) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr("stroke", "#999")
      .attr("stroke-width", "1px");

  // Axis labels
  axisGrid.append("text")
      .attr("x", (d, i) => (rScale(110) * Math.cos(angleSlice * i - Math.PI / 2)))
      .attr("y", (d, i) => (rScale(110) * Math.sin(angleSlice * i - Math.PI / 2)))
      .text(d => d)
      .style("font-size", "12px")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle");

  // Radar path
  const radarLine = d3.lineRadial()
      .radius((d, i) => rScale(d))
      .angle((d, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

  g.append("path")
      .datum(values)
      .attr("d", radarLine)
      .attr("fill", "rgba(54, 162, 235, 0.7)")
      .attr("stroke", "rgba(54, 162, 235, 1)")
      .attr("stroke-width", 2);

  // Data points
  g.selectAll(".radarCircle")
      .data(values)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => rScale(d) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("cy", (d, i) => rScale(d) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr("r", 3)
      .attr("fill", "rgba(54, 162, 235, 1)");

  // Add data point values
  g.selectAll(".value-label")
      .data(values)
      .enter()
      .append("text")
      .attr("class", "value-label")
      .attr("x", (d, i) => rScale(d) * Math.cos(angleSlice * i - Math.PI / 2) * 1.2)
      .attr("y", (d, i) => rScale(d) * Math.sin(angleSlice * i - Math.PI / 2) * 1.2)
      .text(d => `${d.toFixed(2)}%`)
      .attr("font-size", "12px")
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em");
}

function generateRadarDatasets(playerName, data) {
  const statKeys = [
    "ace_pct",
    "1stIn_pct",
    "1stWon_pct",
    "2ndWon_pct",
    "df_pct",
    "bpSaved_pct"
  ];

  /*const colors = [
    "rgba(255, 99, 132, 0.5)",
    "rgba(54, 162, 235, 0.5)",
    "rgba(255, 206, 86, 0.5)",
    "rgba(75, 192, 192, 0.5)"
  ];*/
  /*backgroundColor: "rgba(153, 102, 255, 0.25)",
      borderColor: "rgba(153, 102, 255, 1)"*/
  const surfaceColorMap = {
    "Carpet": {
      backgroundColor: "rgba(150, 150, 150, 0.25)",
      borderColor: 'rgba(150, 150, 150, 1)'
    },
    "Clay": {
      backgroundColor: "rgba(255, 159, 64, 0.25)",
      borderColor: "rgba(255, 159, 64, 1)"
    },
    "Grass": {
      backgroundColor: "rgba(75, 192, 192, 0.25)",
      borderColor: "rgba(75, 192, 192, 1)"
    },
    "Hard": {
      backgroundColor: "rgba(54, 162, 235, 0.25)",
      borderColor: "rgba(54, 162, 235, 1)"
    }
  };

  return data
    .filter(d => d.winner_name === playerName)
    .map((d) => {
      const surface = d.surface;
      const colors = surfaceColorMap[surface] || {
        backgroundColor: "rgba(200,200,200,0.3)",
        borderColor: "rgba(200,200,200,1)"
      };

      return {
        label: surface,
        data: statKeys.map(key => +d[key]),
        fill: true,
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        pointBackgroundColor: colors.borderColor,
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: colors.borderColor
      };
    });
}

function drawRadarChartjs(playerName, data) {
  const ctx = document.getElementById('radarChart2').getContext('2d');

  const radarDataset = generateRadarDatasets(playerName, data);

  const radarData = {
    labels: ['Ace %', 'First In %', 'First In Win %', 'Second In Win %', 'Double Fault %', 'Break Point Saved %'],
    datasets: radarDataset
  }

  const config = {
    type: "radar",
    data: radarData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: function (context) {
              const label = context.dataset.label || '';
              const value = context.formattedValue || '';
              return `${label}: ${value}%`;
            }
          }
        },
        title: {
          display: true,
          text: 'Performance by Surface'
        }
      },
      elements: {
        line: {
          borderWidth: 2
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: 100,
          ticks: {
            stepSize: 10,
            callback: value => value + "%"
          }
        },
      }
    }
  };
  new Chart(ctx, config);
}

function loadGraphs(playerName, association) {
    if (association === 'atp') {
        playerDescription(playerName, csvATPPlayerProfile);
        drawTimelineChart(playerName, csvATPPlayerPerf);
        //drawRadarChart(playerName, csvATPPlayerStats);
        drawRadarChartjs(playerName, csvATPPlayerStats);
    } else if (association === 'wta') {
        playerDescription(playerName, csvWTAPlayerProfile);
        drawTimelineChart(playerName, csvWTAPlayerPerf);
        drawRadarChart(playerName, csvWTAPlayerStats);
    } else {
        console.log('error')
    }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Promise.all([
      loadCSV('../data/atp_player_perf.csv'),
      loadCSV('../data/atp_player_profile.csv'),
      loadCSV('../data/atp_player_stats.csv'),
      loadCSV('../data/atp_prop_surface_sunburst.csv'),
      loadCSV('../data/wta_player_perf.csv'),
      loadCSV('../data/wta_player_profile.csv'),
      loadCSV('../data/wta_player_stats.csv'),
      loadCSV('../data/wta_prop_surface_sunburst.csv'),
      loadCSV('../data/win_rates.csv')
    ]);

    // All CSVs loaded, now safe to use:
    const playerName = getQueryParam('name').split("_").join(" ");
    const nameEl = document.getElementById('player-name');
    const association = getQueryParam('association');

    if (playerName && nameEl) {
      nameEl.textContent = decodeURIComponent(playerName);
      loadStats(playerName, csvWinRates);
      loadGraphs(playerName, association);
    }
  } catch (err) {
    console.error("Error loading one or more CSVs:", err);
  }
});
