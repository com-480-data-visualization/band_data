
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

Chart.defaults.font.family = "'Source Sans Pro', sans-serif"

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

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = url;
  });
}


function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function loadStats(playerId, data) {
  const container = document.getElementById("perf-overview");
  const blockWrapper = document.createElement("div");

  const heading = document.createElement("div");
  heading.textContent = "Win Rate per Surface";
  heading.className = "font-semibold text-gray-700 mb-2 w-full"; // Full width heading
  blockWrapper.appendChild(heading);

  const statWrapper = document.createElement("div");
  statWrapper.className = "flex gap-3";

  const playerData = data.filter(row => row.player_id === playerId);

  const surfaceColors = {
    Hard: { bg: "bg-[#36A2EB40]", text: "text-[#2688c9]" },
    Clay: { bg: "bg-[#FF9F4040]", text: "text-[#e0852b]" },
    Grass: { bg: "bg-[#4BC0C030]", text: "text-[#3eadad]" },
    Carpet: { bg: "bg-[#8A2D3B40]", text: "text-[#8A2D3B]" }
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
  blockWrapper.appendChild(statWrapper);
  container.appendChild(blockWrapper);
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

function renderPlayerChart(playerId, data) {
  const roundOrder = ['RR', 'BR', 'ER', 'R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'Titles'];
  const levelColors = {
    'G': 'rgba(255, 99, 132, 0.7)',
    'M': 'rgba(54, 162, 235, 0.7)',
    'P': 'rgba(54, 162, 235, 0.7)',
    'A': 'rgba(75, 192, 192, 0.7)',
    'PM': 'rgba(75, 192, 192, 0.7)',
    'F': 'rgba(200, 192, 0, 0.7)',
    'D': 'rgba(150, 150, 150, 0.7)'
  };

  const playerData = data.filter(d => d.player_id === playerId);

  // Group best ranks per year (lowest rank = best)
  const yearRankMap = {};
  playerData.forEach(d => {
    if (!yearRankMap[d.tourney_year] || d.best_rank < yearRankMap[d.tourney_year]) {
      yearRankMap[d.tourney_year] = d.best_rank;
    }
  });

  const rankLabels = Object.keys(yearRankMap).sort((a, b) => +a - +b);
  const rankDataset = {
    type: 'line',
    label: 'Best Rank',
    data: rankLabels.map(year => ({
      x: +year.toString(),
      y: yearRankMap[year]
    })),
    borderColor: 'rgba(255, 206, 86, 1)',
    backgroundColor: 'rgba(255, 206, 86, 0.5)',
    tension: 0.3,
    yAxisID: 'y-rank',
  };

  // Bubble dataset
  const tourneyLevels = [...new Set(playerData.map(d => d.tourney_level))];
  const bubbleDatasets = tourneyLevels.map(level => {
    return {
      type: 'bubble',
      label: `${level} Matches`,
      data: playerData.filter(d => d.tourney_level === level).map(d => ({
        x: +d.tourney_year,
        y: roundOrder.indexOf(d.round),
        r: Math.sqrt(d.match_count) * 5,
        round: d.round,
        match_count: d.match_count,
        tourney_level: d.tourney_level
      })),
      pointStyle: (level === 'A' ? 'star' : 'circle'),
      backgroundColor: levelColors[level] || 'gray',
      borderColor: levelColors[level] || 'gray',
      yAxisID: 'y-round'
    };
  });

  const highlightMatches = playerData.filter(d => d.tourney_level === 'G' && d.round === 'F' && d.match_count > 0);
  /*const trophyImage = await loadImage('assets/icons/trophy-svgrepo-com.png');

  function resizeImage(img, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const resizedImg = new Image();
    resizedImg.src = canvas.toDataURL();
    return new Promise(resolve => {
      resizedImg.onload = () => resolve(resizedImg);
    });
  }
  resizedImage = await resizeImage(trophyImage, 30, 30)*/

  const highlightDataset = {
    type: 'scatter',
    label: 'Grand Slam Titles',
    data: highlightMatches.map(d => ({
      x: +d.tourney_year,
      y: roundOrder.indexOf('Titles'),
      r: Math.sqrt(d.match_count) * 10,
      match_count: d.match_count
    })),
    pointStyle: 'triangle',
    pointRadius: ctx => ctx.raw ? ctx.raw.r : 1,
    backgroundColor: "rgba(255, 159, 64, 0.7)",
    borderColor: "rgba(255, 159, 64, 1)",
    borderWidth: 1,
    yAxisID: 'y-round'
  };


  const ctx = document.getElementById('timelineChart').getContext('2d');

  new Chart(ctx, {
    type: 'scatter', // parent type needed for mixed chart
    data: {
      datasets: [...bubbleDatasets, highlightDataset, rankDataset]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      scales: {
        x: {
          title: {display: true, text: 'Year'},
          type: 'linear',
          ticks: {
            stepSize: 1,
            callback: value => value.toString()  // display as plain number
          },
          grid: {
            display: false
          }
        },
        'y-rank': {
          type: 'logarithmic',
          position: 'right',
          reverse: true,
          title: {display: true, text: 'Rank'},
          beginAtZero: false,
          grid: {
            drawOnChartArea: false // avoid overlapping
          }
        },
        'y-round': {
          position: 'left',
          type: 'linear',
          title: {display: true, text: 'Tournament Round'},
          min: -1,
          max: roundOrder.length,
          ticks: {
            callback: value => roundOrder[value],
            stepSize: 1
          },
          grid: {
            drawOnChartArea: true
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => {
              const d = ctx.raw;
              if (ctx.dataset.type === 'line') {
                return `Rank: ${d.y}`;
              }
              if (ctx.dataset.label === 'Grand Slam Titles') {
                return `🏆 Grand Slam Titles: ${d.match_count}`;
              }
              return `Level ${d.tourney_level} - Round ${d.round}, ${d.match_count} Match(es) Won`;
            }
          }
        }
      }
    }
  });
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

  const surfaceColorMap = {
    "Carpet": {
      backgroundColor: "rgb(138, 45, 59, 0.25)", //"rgba(150, 150, 150, 0.25)",
      borderColor: "rgb(138, 45, 59, 0.75)"//'rgba(150, 150, 150, 1)'
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
    labels: ['Ace %', 'First Serve In %', 'First Serve Won %', 'Second Serve Won %', 'Double Fault %', 'Break Point Saved %'],
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
          display: false,
          text: 'Performance by Surface',
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
            callback: value => value + "%",
          }, pointLabels: {
            font: {
              size: 14,
            },
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
    heading.className = 'text-lg font-semibold text-gray-700 flex items-center mb-3 justify-center';
    heading.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-${color}-500 mr-2"></span>${title}`;

    box.appendChild(heading);
    // Each surface group
    groupedItems.forEach(({ surface, items }) => {
      if (items.length === 0) return;

      const surfaceTitle = document.createElement('h5');
      surfaceTitle.className = 'text-base font-medium text-gray-600 mt-2 mb-1';
      surfaceTitle.textContent = surface;

      const list = document.createElement('ul');
      list.className = 'mb-2';

      items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'flex items-center text-sm text-gray-600';
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
    Carpet: "rgb(138, 45, 59, 0.75)" //'rgba(150, 150, 150, 1)'
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
      backgroundColor: "rgb(138, 45, 59, 0.25)", //"rgba(150, 150, 150, 0.25)",
      borderColor: "rgb(138, 45, 59, 0.75)"//'rgba(150, 150, 150, 1)'
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
            .style("display", "block")
            .style("fontsize", "12");
        }
      })
      .on("mousemove", event => {
        tooltip.style("left", `${event.pageX + 10}px`)
               .style("top", `${event.pageY}px`);
      })
      .on("mouseout", () => tooltip.style("display", "none"))
      .on("click", (event, d) => {
        if (d.data.id) {
          const url = `player-profile.html?playerName=${encodeURIComponent(d.data.name)}&playerId=${d.data.id}&association=${association}`;
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
  /*const legend = svg.append("g")
    .attr("transform", `translate(10, ${height - 20 * Object.keys(surfaceColorMap).length - 10})`);*/
  const legend = svg.append("g")
    .attr("transform", `translate(${(width - 100 * Object.keys(surfaceColorMap).length)/2}, 20)`);

  Object.entries(surfaceColorMap).forEach(([surface, color], i) => {
    const g = legend.append("g").attr("transform", `translate(${i * 100}, 0)`);
    g.append("rect")
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", color['borderColor'])
    g.append("text")
      .attr("x", 25)
      .attr("y", 15)
      .text(surface);
  });

  /*svg.on("click", (event) => zoom(event, root));
  let focus = root;
  let view;
  zoomTo([focus.x, focus.y, focus.r * 2]);

  function zoomTo(v) {
    const k = width / v[2];

    view = v;

    //label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
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

    /*label
      .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
      .transition(transition)
        .style("fill-opacity", d => d.parent === focus ? 1 : 0)
        .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
        .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
  }*/
}

function loadGraphs(playerId, association) {
    if (association === 'atp') {
        loadImprovements(playerId, csvATPPlayerStats);
        playerDescription(playerId, csvATPPlayerProfile);
        renderPlayerChart(playerId, csvATPPlayerPerf);
        drawRadarChartjs(playerId, csvATPPlayerStats);
        drawSunburstChart(playerId, csvATPPropSurfaceSunburst);
        drawOpponentPacking(playerId, csvATPRivalries, association);
    } else if (association === 'wta') {
        loadImprovements(playerId, csvWTAPlayerStats);
        playerDescription(playerId, csvWTAPlayerProfile);
        renderPlayerChart(playerId, csvWTAPlayerPerf);
        drawRadarChartjs(playerId, csvWTAPlayerStats);
        drawSunburstChart(playerId, csvWTAPropSurfaceSunburst);
        drawOpponentPacking(playerId, csvWTARivalries, association);
    } else {
        console.log('error')
    }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
      await Promise.all([
          loadCSV('data/atp_player_perf.csv'),
          loadCSV('data/atp_player_profile.csv'),
          loadCSV('data/atp_player_stats.csv'),
          loadCSV('data/atp_prop_surface.csv'),
          loadCSV('data/wta_player_perf.csv'),
          loadCSV('data/wta_player_profile.csv'),
          loadCSV('data/wta_player_stats.csv'),
          loadCSV('data/wta_prop_surface.csv'),
          loadCSV('data/atp_win_rates.csv'),
          loadCSV('data/wta_win_rates.csv'),
          loadCSV('data/wta_rivalries2.csv'),
          loadCSV('data/atp_rivalries2.csv'),
      ]);
  } catch (err) {
    console.error("Error loading one or more CSVs:", err);
  }
  // All CSVs loaded, now safe to use:
  const playerName = getQueryParam('playerName');
  const association = getQueryParam('association');
  const playerId = getQueryParam('playerId');

  console.log(playerName);
  console.log(association);

  if (playerName && playerId) {
    const nameEl = document.getElementById('player-name');
    nameEl.textContent = decodeURIComponent(playerName);

    const headerEl = document.getElementById('header-name');
    headerEl.textContent = decodeURIComponent(playerName) + " Profile";

    if (association === 'atp') {
      loadStats(playerId, csvATPWinRates);
    } else if (association === 'wta') {
      loadStats(playerId, csvWTAWinRates);
    }
    loadGraphs(playerId, association);
  }
});
