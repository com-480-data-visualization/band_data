// Global state
selectedOptions = {};
csvATPData = [];
csvWTAData = [];
csvPlayers = [];
let mapping = {'Association':'association','Tournament': 'tourney_level', 'Court Surface':'surface', 'Decade':'decade', 'Nationality':'ioc', 'Handedness': 'hand'};



// Load CSV on page load
function loadCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      complete: function (results) {
        const data = results.data;
        if (url.includes('atp_filter_player')) {
          csvATPData = data;
        } else if (url.includes('wta_filter_player')) {
          csvWTAData = data;
        } else if (url.includes('all_players')) {
          csvPlayers = data;
        }
        resolve();
      },
      error: function (err) {
        reject(err);
      }
    });
  });
}

function createDropdown(containerId, dropdownName, options, selectedOptions) {
    const dropdownContainer = document.createElement('div');
    dropdownContainer.classList.add('relative', 'inline-block', 'w-full', 'text-left');

    const button = document.createElement('button');
    button.classList.add('w-full', 'px-6', 'py-3', 'font-bold', 'text-black', 'bg-white', 'border-4', 'border-black', 'rounded-full', 'shadow-md', 'focus:outline-none', 'flex', 'items-center', 'justify-between');
    button.innerHTML = `
        <span>${dropdownName}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
    `;

    const dropdownMenu = document.createElement('div');
    dropdownMenu.classList.add('hidden', 'absolute', 'right-0', 'w-full', 'mt-2', 'origin-top-right', 'bg-white', 'shadow-lg', 'rounded-3xl', 'border', 'border-black', 'z-10');
    dropdownMenu.innerHTML = options.map(option => `
        <a href="#" class="block px-6 py-3 text-gray-700 hover:bg-gray-100">${option}</a>
    `).join('');

    const optionElements = dropdownMenu.querySelectorAll('a');
    optionElements.forEach(optionElement => {
        optionElement.addEventListener('click', (event) => {
            event.preventDefault();
            const selectedValue = optionElement.textContent;
            button.querySelector('span').textContent = selectedValue;

            // Store selected value
            selectedOptions[mapping[dropdownName]] = selectedValue;

            dropdownMenu.classList.add('hidden');
        });
    });

    button.addEventListener('click', () => {
        dropdownMenu.classList.toggle('hidden');
    });

    window.addEventListener('click', (event) => {
        if (!dropdownContainer.contains(event.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });

    dropdownContainer.appendChild(button);
    dropdownContainer.appendChild(dropdownMenu);
    const container = document.getElementById(containerId);
    if (container) {
        container.appendChild(dropdownContainer);
    }
}

function populatePlayers() {
    return new Promise((resolve) => {
        const datalist = document.getElementById("players");
        console.log(datalist);
        console.log(csvPlayers.length);
        csvPlayers.forEach(player => {
            const option = document.createElement("option");
            option.value = player.player_name;
            datalist.appendChild(option);
        });
        resolve(); // Notify that we're done
  });
}


// Function to create player finder dropdowns
function createPlayerDropdowns() {
    // Create all dropdowns
    createDropdown('dropdownsContainer', 'Association', ['ATP', 'WTA'], selectedOptions);
    createDropdown('dropdownsContainer', 'Tournament', ['All', 'G - Grand Slam', 'M - Masters', 'F - Tour-level finals', 'A - Other Tour-level events', 'D - Davis Cup'], selectedOptions);
    createDropdown('dropdownsContainer', 'Court Surface', ['All', 'Clay', 'Grass', 'Hard', 'Carpet'], selectedOptions);
    createDropdown('dropdownsContainer', 'Decade', ['90s', '00s', '10s', '20s'], selectedOptions);
    createDropdown('dropdownsContainer', 'Nationality', ['All', 'Switzerland', 'Canada', 'UK'], selectedOptions);
    createDropdown('dropdownsContainer', 'Handedness', ['All', 'Left', 'Right'], selectedOptions);
}

function showPlayers(playersToShow) {
  const container = document.querySelector("#results-container");
  container.innerHTML = ''; // Clear previous results

  playersToShow.forEach((player, index) => {
    const params = new URLSearchParams({
      playerName: player.player_name,
      playerId: player.player_id,
      association: player.association || 'atp', // fallback if missing
    });

    const card = document.createElement("div");
    card.className = "flex justify-center text-center";
    card.innerHTML = `
      <a href="player-profile.html?${params.toString()}" class="transform hover:scale-105 transition-all">
        <img src="assets/icons/tennis-player-silhouette-svgrepo-com-2.svg" alt="Player Icon" class="w-4/5 max-w-xs rounded-lg" />
        <p>${player.player_name}</p>
      </a>
    `;
    container.appendChild(card);
  });
}


function handleFindPlayer() {
  const inputVal = document.getElementById("playerInput").value.trim();
  // player name manually selected
  if (inputVal) {
      const selectedPlayer = csvPlayers.find(p => p.player_name === inputVal);
      if (!selectedPlayer) {
        alert("Please select a valid player.");
        return;
      }

      document.getElementById("player-name-1").textContent = selectedPlayer.player_name;

      const params = new URLSearchParams({
        playerName: selectedPlayer.player_name,
        playerId: selectedPlayer.player_id,
        association: selectedPlayer.association,
      });

      document.getElementById("player-link-1").href = `player-profile.html?${params.toString()}`;
      document.getElementById("player-result-1").classList.remove("hidden");
  } else {
      console.log(selectedOptions)
      var csvData;
      if (selectedOptions['association'] === 'ATP') {
          csvData = csvATPData;
      } else {
          csvData = csvWTAData;
      }
      const filtered = csvData.filter(row => {
        for (let key in selectedOptions) {
            if (key === 'association') continue;

            const value = selectedOptions[key];
            if (key === 'hand' && value === 'All') continue;
            if (key === 'ioc' && value === 'All') continue;
            if (row[key] !== value) {
                return false;
            }
        }
        return true;
      });
      const topPlayers = filtered
          .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
          .slice(0, 3);
      if (topPlayers.length === 0) {
          alert("No players match your criteria.");
          return;
      }
      showPlayers(topPlayers);
  }

}


// Filter data & update DOM
function filterCSVData() {
    console.log(selectedOptions)

  const filtered = csvData.filter(row => {
    for (let key in selectedOptions) {
        if (key === 'association') continue;
      const value = selectedOptions[key];
      if (value === 'All') continue;
      if (row[key] !== value) {
          return false;
      }
    }
    return true;
  });
    console.log(filtered.length)

  // Sort by rank (or whatever makes sense for your data)
  filtered.sort((a, b) => parseInt(a.score) - parseInt(b.score)); // Replace with "Score" if needed

  const topPlayer = filtered[0];
  console.log(topPlayer);
  const nameEl = document.getElementById('top-player-name');

  if (topPlayer && nameEl) {
    nameEl.textContent = topPlayer.Name;
  } else if (nameEl) {
    nameEl.textContent = "No matching player";
  }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
      await Promise.all([
          loadCSV('../data/atp_filter_player_data.csv'),
          loadCSV('../data/wta_filter_player_data.csv'),
          loadCSV('../data/all_players.csv', ''),

      ]);
    } catch (err) {
        console.error("Error loading one or more CSVs:", err);
    }
    try{
        await populatePlayers()
    } catch (err) {
        console.error("Error loading populatePlayers():", err);
    }

});