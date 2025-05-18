
let csvWTAPlayerPerf = [];
let csvWTAPlayerProfile = [];
let csvWTAPlayerStats = [];
let csvWTAPropSurfaceSunburst = [];
let csvWTARivalries = [];
let csvWTAWinRates = [];

let csvATPPlayerPerf = [];
let csvATPPlayerProfile = [];
let csvATPPlayerStats = [];
let csvATPPropSurfaceSunburst = [];
let csvATPRivalries = [];
let csvATPWinRates = [];

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
        } else if (url.includes('atp_prop_surface')) {
          csvATPPropSurfaceSunburst = data;
        } else if (url.includes('atp_win_rates')) {
          csvATPWinRates = data;
        } else if (url.includes('atp_rivalries')) {
          csvATPRivalries = data;
        } else if (url.includes('wta_player_perf')) {
          csvWTAPlayerPerf = data;
        } else if (url.includes('wta_player_profile')) {
          csvWTAPlayerProfile = data;
        } else if (url.includes('wta_player_stats')) {
          csvWTAPlayerStats = data;
        } else if (url.includes('wta_prop_surface')) {
          csvWTAPropSurfaceSunburst = data;
        } else if(url.includes('wta_win_rates')) {
          csvWTAWinRates = data ;
        } else if (url.includes('wta_rivalries')) {
          csvWTARivalries = data;
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

function loadStats(playerId, data) {
  // Stats Section
  playerData = data.filter(row => row.player_id === playerId);

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

function playerDescription(playerId, data) {
    const filtered = data.filter(row => {
        return row['player_id'] === playerId;

    });

    if (filtered.length == 1) {
        const player = filtered[0];

        // career years
        const career = document.getElementById('career-years');
        career.textContent = player['career_start'] + " - " + player['career_end'];

        // win rate
        const winRate = document.getElementById('win-rate');
        winRate.textContent = (parseFloat(player['win_rate'])*100).toFixed(2) + "%";

        // grand slam titles
        const titles = document.getElementById('titles');
        titles.textContent = player['G_titles'];

        // hand
        const hand = document.getElementById('hand');
        hand.textContent = player['hand'] === 'R'? 'Right' : 'Left';
    }
}

function drawTimelineChart(playerId, data) {
  const ctx = document.getElementById('timelineChart').getContext('2d');

  // Filter data for the selected player
  const playerData = data.filter(row => row.player_id === playerId);
  if (playerData.length === 0) {
    console.warn(`No data found for player: ${playerId}`);
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
  const playerData = data.filter(d => d.player_id === playerId);
  if (playerData.length === 0) {
    console.warn(`No data found for player: ${playerId}`);
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
    .text(`Timeline Chart for ${playerId}`);
}

function drawRadarChart(playerId, data) {
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
  const playerData = data.find(d => d.player_id === playerId);
  if (!playerData) {
    console.warn(`No data for player: ${playerId}`);
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

function generateRadarDatasets(playerId, data) {
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
    .filter(d => d.player_id === playerId)
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

function drawRadarChartjs(playerId, data) {
  const ctx = document.getElementById('radarChart2').getContext('2d');

  const radarDataset = generateRadarDatasets(playerId, data);

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

function classifyImprovements(playerId, data) {
  const statLabels = {
    ace_pct: "Aces",
    "1stIn_pct": "First Serve In %",
    "1stWon_pct": "First Serve Win %",
    "2ndWon_pct": "Second Serve Win %",
    df_pct: "Double Fault %",
    bpSaved_pct: "Break Points Saved %"
  };

  const strengthThresholds = {
    ace_pct: 12,
    '1stIn_pct': 70,
    '1stWon_pct': 70,
    '2ndWon_pct': 70,
    df_pct: 3, // interpreted as low double fault = strength
    bpSaved_pct: 70
  };

  const improvementThresholds = {
    ace_pct: 7,
    '1stIn_pct': 55,
    '1stWon_pct': 55,
    '2ndWon_pct': 55,
    df_pct: 10,
    bpSaved_pct: 55
  };

  const playerData = data.filter(d => d.player_id === playerId);
  return playerData.map(row => {
    const surface = row.surface;
    const strengths = [];
    const improvements = [];

    for (const stat in statLabels) {
      const value = parseFloat(row[stat]);

      if (stat === 'df_pct') {
        // For DF, lower is better
        if (value <= strengthThresholds[stat]) {
          strengths.push({ label: statLabels[stat], value: value.toFixed(1) });
        } else if (value >= improvementThresholds[stat]) {
          improvements.push({ label: statLabels[stat], value: value.toFixed(1) });
        }
      } else {
        if (value >= strengthThresholds[stat]) {
          strengths.push({ label: statLabels[stat], value: value.toFixed(1) });
        } else if (value <= improvementThresholds[stat]) {
          improvements.push({ label: statLabels[stat], value: value.toFixed(1) });
        }
      }
    }
    return { surface, strengths, improvements };
  });
}

function loadImprovements(playerId, data) {
  const insightData = classifyImprovements(playerId, data);
  const container = document.getElementById('improvementsContainer');
  if (!container) return;
  container.innerHTML = ''; // Clear any existing content

  const createBox = (title, color, icon, groupedItems) => {
    const box = document.createElement('div');
    box.className = 'bg-gray-50 rounded-lg p-4 mb-6 hover:scale-102 transition';

    const heading = document.createElement('h4');
    heading.className = 'text-sm font-semibold text-gray-700 flex items-center mb-3';
    heading.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-${color}-500 mr-2"></span>${title}`;

    box.appendChild(heading);
    // Each surface group
    groupedItems.forEach(({ surface, items }) => {
      if (items.length === 0) return;

      const surfaceTitle = document.createElement('h5');
      surfaceTitle.className = 'text-xs font-medium text-gray-600 mt-2 mb-1';
      surfaceTitle.textContent = surface;

      const list = document.createElement('ul');
      list.className = 'mb-2';

      items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'flex items-center text-xs text-gray-600';
        li.innerHTML = `<span class="text-${color}-500 mr-2">${icon}</span> ${item.label} (${item.value}%)`;
        list.appendChild(li);
      });
      box.appendChild(surfaceTitle);
      box.appendChild(list);
    });

    return box;
  };

  const strengthsBySurface = [];
  const improvementsBySurface = [];

  insightData.forEach(({ surface, strengths, improvements }) => {
    strengthsBySurface.push({ surface, items: strengths });
    improvementsBySurface.push({ surface, items: improvements });
  });

  const strengthsBox = createBox('Strengths', 'green', '▲', strengthsBySurface);
  const improvementsBox = createBox('Improvement Areas', 'red', '▼', improvementsBySurface);

  container.appendChild(strengthsBox);
  container.appendChild(improvementsBox);
}

function buildHierarchy(data) {
  const root = { name: data[0].player_name, children: [] };
  const surfaceMap = new Map();

  data.forEach(row => {
    const { surface, tourney_level, tourney_name, count } = row;

    if (!surfaceMap.has(surface)) {
      const surfaceNode = { name: surface, children: [] };
      surfaceMap.set(surface, surfaceNode);
      root.children.push(surfaceNode);
    }

    const surfaceNode = surfaceMap.get(surface);
    let levelNode = surfaceNode.children.find(n => n.name === tourney_level);
    if (!levelNode) {
      levelNode = { name: tourney_level, children: [] };
      surfaceNode.children.push(levelNode);
    }

    levelNode.children.push({ name: tourney_name, value: +count });
  });

  return root;
}

function drawSunburstChart(playerId, data) {
  const playerData = data.filter(row => row.player_id === playerId)
  if (playerData.length === 0) {
    return;
  }
  const hierarchyData = buildHierarchy(playerData);

  // Color by surface
  const surfaceColors = {
    Hard: "rgba(54, 162, 235, 1)",
    Clay: "rgba(255, 159, 64, 1)",
    Grass: "rgba(75, 192, 192, 1)",
    Carpet: 'rgba(150, 150, 150, 1)'
  };

  // Set dimensions
  const container = document.getElementById("sunburstContainer");
  const width = Math.min(container.clientWidth);
  const radius = width / 8;

  const partition = hierarchyData => {
    const root = d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
    return d3.partition()
        .size([2 * Math.PI, root.height + 1])(root);
  };

  const root = partition(hierarchyData);
  root.each(d => d.current = d);

  const svg = d3.select("#sunburstChart")
      .append("svg")
      .attr("viewBox", [0, 0, width, width])
      .style("font-family", "'Source Sans Pro', sans-serif")
      .style("font-size", "12px");

  const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${width / 2})`);

  const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0 * radius)
      .outerRadius(d => d.y1 * radius - 1);

  const color = d => {
    const surface = d.ancestors().find(a => surfaceColors[a.data.name]);
    return surface ? surfaceColors[surface.data.name] : "#ccc";
  };

  const path = g.append("g")
      .selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("fill", d => color(d))
      .attr("d", d => arc(d.current))
      .attr("stroke", "#fff")
      .attr("stroke-width", "1px");

  const label = g.append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
    .attr("dy", "0.35em")
    .attr("fill-opacity", d => +labelVisible(d.current))
    .attr("transform", d => labelTransform(d.current))
    .text(d => d.data.name);


  path.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join(" → ")}\n${d.value}`);

  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d) {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  function clicked(event, p) {
    root.each(d => d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.y0),
      y1: Math.max(0, d.y1 - p.y0)
    });

    const t = g.transition().duration(750);

    path.transition(t)
        .tween("hierarchyData", d => {
          const i = d3.interpolate(d.current, d.target);
          return t => d.current = i(t);
        })
        .attrTween("d", d => () => arc(d.current));
    label.transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attr("transform", d => labelTransform(d.target));

  }

  path.on("click", clicked);

  // Add center label and zoom-out
  g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .text(hierarchyData.name)
      .style("cursor", "pointer")
      .on("click", () => clicked(null, root));
}

function drawOpponentPacking(playerId, data, association) {
  const container = document.getElementById("rivalryContainer");
  const width = container.clientWidth;
  const height = width;
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

  const filtered = data.filter(d => d.player_id === playerId);
  const hierarchy = {
      name: "root",
      children: Array.from(
        d3.group(filtered, d => d.surface),
        ([surface, entries]) => ({
          name: surface,
          children: Array.from(
            d3.rollups(
              entries,
              v => d3.sum(v, d => +d.match_count),
              d => `${d.opponent}|||${d.opponent_id}`
            ),
            ([key, count]) => {
              const [opponent, opponent_id] = key.split("|||");
              return { name: opponent, id: opponent_id, value: count };
            }
          )
        })
      )
    };

    const root = d3.pack()
      .size([width, height])
      .padding(4)(
        d3.hierarchy(hierarchy)
          .sum(d => d.value)
          .sort((a, b) => b.value - a.value)
      );

    const svg = d3.select("#rivalryChart")
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .style("font-family", "'Source Sans Pro', sans-serif")
      .style("font-size", "11px");

    const tooltip = d3.select("body").append("div")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "5px 10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("display", "none");

    const node = svg.selectAll("g")
      .data(root.descendants().slice(1))
      .join("g")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => {
        const surface = d.ancestors().find(a => a.depth === 1)?.data.name;
        const colorSet = surfaceColorMap[surface] || {};

        if (d.depth === 1) {
          // Surface circle
          return colorSet.backgroundColor || "#eee";
        } else if (d.depth === 2) {
          // Opponent circle
          return colorSet.borderColor || "#ccc";
        } else {
          return "#fff"; // fallback
        }
      })
      .attr("stroke-width", 2)
      .on("mouseover", (event, d) => {
        if (d.data.name && d.data.value) {
          tooltip.html(`<strong>${d.data.name}</strong><br/>Matches: ${d.data.value}`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY}px`)
            .style("display", "block");
        }
      })
      .on("mousemove", event => {
        tooltip.style("left", `${event.pageX + 10}px`)
               .style("top", `${event.pageY}px`);
      })
      .on("mouseout", () => tooltip.style("display", "none"))
      .on("click", (event, d) => {
        if (d.data.id) {
          const url = `player-profile.html?name=${encodeURIComponent(d.data.name)}&playerId=${d.data.id}&association=${association}`;
        window.open(url, "_blank");
        }
      });
    node.filter(d => !d.children).append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .text(d => {
      const limit = d.r / 4;
      return d.data.name.length > limit ? d.data.name.slice(0, limit) + "…" : d.data.name;
    })
    .style("pointer-events", "none")
    .style("fill", "#000");

  // Add legend
  const legend = svg.append("g")
    .attr("transform", `translate(10, ${height - 20 * Object.keys(surfaceColors).length - 10})`);

  Object.entries(surfaceColors).forEach(([surface, color], i) => {
    const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    g.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color)
    g.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(surface);
  });

  svg.on("click", (event) => zoom(event, root));
  let focus = root;
  let view;
  zoomTo([focus.x, focus.y, focus.r * 2]);

  function zoomTo(v) {
    const k = width / v[2];

    view = v;

    label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("r", d => d.r * k);
  }

  function zoom(event, d) {
    const focus0 = focus;

    focus = d;

    const transition = svg.transition()
        .duration(event.altKey ? 7500 : 750)
        .tween("zoom", d => {
          const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
          return t => zoomTo(i(t));
        });

    label
      .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
      .transition(transition)
        .style("fill-opacity", d => d.parent === focus ? 1 : 0)
        .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
        .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
  }
}

function loadGraphs(playerId, association) {
    if (association === 'atp') {
        loadImprovements(playerId, csvATPPlayerStats);
        playerDescription(playerId, csvATPPlayerProfile);
        drawTimelineChart(playerId, csvATPPlayerPerf);
        drawRadarChartjs(playerId, csvATPPlayerStats);
        drawSunburstChart(playerId, csvATPPropSurfaceSunburst);
        drawOpponentPacking(playerId, csvATPRivalries, association);
    } else if (association === 'wta') {
        loadImprovements(playerId, csvWTAPlayerStats);
        playerDescription(playerId, csvWTAPlayerProfile);
        drawTimelineChart(playerId, csvWTAPlayerPerf);
        drawRadarChartjs(playerId, csvWTAPlayerStats);
        drawSunburstChart(playerId, csvWTAPropSurfaceSunburst);
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
          loadCSV('../data/atp_prop_surface.csv'),
          loadCSV('../data/wta_player_perf.csv'),
          loadCSV('../data/wta_player_profile.csv'),
          loadCSV('../data/wta_player_stats.csv'),
          loadCSV('../data/wta_prop_surface.csv'),
          loadCSV('../data/atp_win_rates.csv'),
          loadCSV('../data/wta_win_rates.csv'),
          loadCSV('../data/wta_rivalries.csv'),
          loadCSV('../data/atp_rivalries.csv'),
      ]);

    // All CSVs loaded, now safe to use:
    const playerName = getQueryParam('name').split("_").join(" ");
    const nameEl = document.getElementById('player-name');
    const association = getQueryParam('association');
    const playerId = getQueryParam('playerId');

    if (playerName && nameEl) {
      nameEl.textContent = decodeURIComponent(playerName);
      if (association === 'atp') {
        loadStats(playerId, csvATPWinRates);
      } else if (association === 'wta') {
        loadStats(playerId, csvWTAWinRates);
      }
      loadGraphs(playerId, association);
    }
  } catch (err) {
    console.error("Error loading one or more CSVs:", err);
  }
});
