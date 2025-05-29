// Global state
selectedOptions = {'association':'WTA', 'tourney_level':'All', 'surface':'All', 'decade':'20s','ioc':'All', 'hand':'All'};
csvATPData = [];
csvWTAData = [];
csvPlayers = [];
let titleMapping = {'Association':'association','Tournament': 'tourney_level', 'Court Surface':'surface', 'Decade':'decade', 'Nationality':'ioc', 'Handedness': 'hand'};
let dropdownMappings = {}


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

async function loadDropdownMappings() {
  const res = await fetch("data/labels_mapping.json");
  dropdownMappings = await res.json();
}

function populatePlayers() {
    return new Promise((resolve) => {
        const datalist = document.getElementById("players");
        csvPlayers.forEach(player => {
            const option = document.createElement("option");
            option.value = player.player_name;
            datalist.appendChild(option);
        });
        resolve(); // Notify that we're done
  });
}

function createDropdown(containerId, dropdownName, selectedOptions) {
    const dropdownContainer = document.createElement('div');
    dropdownContainer.classList.add('relative', 'inline-block', 'w-full', 'text-left');

    const button = document.createElement('button');
    button.classList.add('w-full', 'px-6', 'py-3', 'text-black', 'bg-white', 'border-4', 'border-black', 'rounded-full', 'shadow-md', 'focus:outline-none', 'flex', 'items-center', 'justify-between');
    button.innerHTML = `
        <span>${dropdownName}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
    `;

    const mapping = dropdownMappings[titleMapping[dropdownName]] || {};
    const entries = Object.entries(mapping);

    const dropdownMenu = document.createElement('div');
    dropdownMenu.classList.add('hidden', 'absolute', 'right-0', 'w-full', 'mt-2', 'origin-top-right', 'bg-white', 'shadow-lg', 'rounded-3xl', 'border', 'border-black', 'z-10');

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = `Search ${dropdownName}...`;
    searchInput.classList.add('w-full', 'px-4', 'py-2', 'border-b', 'border-gray-300', 'focus:outline-none', 'rounded-t-3xl');

    dropdownMenu.appendChild(searchInput);

    const optionsWrapper = document.createElement('div');
    entries.forEach(([displayText, internalValue]) => {
        const option = document.createElement('a');
        option.href = '#';
        option.dataset.value = internalValue;
        option.textContent = displayText;
        option.classList.add('block', 'px-6', 'py-3', 'text-gray-700', 'hover:bg-gray-100');

        option.addEventListener('click', (event) => {
            event.preventDefault();
            button.querySelector('span').textContent = displayText;
            selectedOptions[titleMapping[dropdownName]] = internalValue;
            dropdownMenu.classList.add('hidden');
        });
        optionsWrapper.appendChild(option);
    });

    dropdownMenu.appendChild(optionsWrapper);

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        optionsWrapper.querySelectorAll('a').forEach(option => {
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(query) ? 'block' : 'none';
        });
    });

    button.addEventListener('click', () => {
        dropdownMenu.classList.toggle('hidden');
        if (!dropdownMenu.classList.contains('hidden')) {
            searchInput.focus();
        }
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

// Function to create player finder dropdowns
function createPlayerDropdowns() {
    return new Promise((resolve) => {
        // Create all dropdowns
        createDropdown('dropdownsContainer', 'Association', selectedOptions);
        createDropdown('dropdownsContainer', 'Tournament', selectedOptions);
        createDropdown('dropdownsContainer', 'Court Surface', selectedOptions);
        createDropdown('dropdownsContainer', 'Decade',  selectedOptions);
        createDropdown('dropdownsContainer', 'Nationality',  selectedOptions);
        createDropdown('dropdownsContainer', 'Handedness',  selectedOptions);

        // Wait for next frame to ensure DOM is updated (optional but safer)
        requestAnimationFrame(() => {
            resolve();
        });
    });
}

function showPlayers(playersToShow, association) {
    const container = document.querySelector("#results-container");
    container.innerHTML = ''; // Clear previous results

    playersToShow.forEach((player, index) => {
      const params = new URLSearchParams({
        playerName: player.player_name,
        playerId: player.player_id,
        association: association || 'wta', // fallback if missing
      });

      const card = document.createElement("div");
      card.className = "flex justify-center text-center opacity-0 translate-y-4 transition-all duration-500"; // Start hidden + moved down

      card.innerHTML = `
        <a href="player-profile.html?${params.toString()}" class="transform hover:scale-105 transition-all">
          <img src="assets/icons/tennis-player-silhouette-svgrepo-com-2.svg" alt="Player Icon" class="w-4/5 max-w-xs rounded-lg" />
          <p>${player.player_name}</p>
        </a>
      `;

      container.appendChild(card);
      setTimeout(() => {
        card.classList.remove("opacity-0", "translate-y-4");
        card.classList.add("opacity-100", "translate-y-0");
      }, index * 200); // 100ms stagger
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
      showPlayers([selectedPlayer], selectedPlayer.association);
      /*const container = document.querySelector("#results-container");
      container.innerHTML = '';

      const params = new URLSearchParams({
        playerName: selectedPlayer.player_name,
        playerId: selectedPlayer.player_id,
        association: selectedPlayer.association,
      });

      const card = document.createElement("div");
      card.className = "flex justify-center text-center opacity-0 translate-y-4 transition-all duration-500"; // Start hidden + moved down

      card.innerHTML = `
        <a href="player-profile.html?${params.toString()}" class="transform hover:scale-105 transition-all">
          <img src="assets/icons/tennis-player-silhouette-svgrepo-com-2.svg" alt="Player Icon" class="w-4/5 max-w-xs rounded-lg" />
          <p>${selectedPlayer.player_name}</p>
        </a>
      `;

      container.appendChild(card);
      setTimeout(() => {
        card.classList.remove("opacity-0", "translate-y-4");
        card.classList.add("opacity-100", "translate-y-0");
      });*/
  } else {
      var csvData;
      var assoc = 'wta'
      if (selectedOptions['association'] === 'ATP') {
          csvData = csvATPData;
          assoc = 'atp'
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
      showPlayers(topPlayers, assoc);
  }

}

document.addEventListener('DOMContentLoaded', async () => {
    /*try {
      await Promise.all([
          loadCSV('../data/atp_filter_player_data.csv'),
          loadCSV('../data/wta_filter_player_data.csv'),
          loadCSV('../data/all_players.csv', ''),
          loadDropdownMappings()
      ]);
    } catch (err) {
        console.error("Error loading one or more CSVs:", err);
    }
    await createPlayerDropdowns()
    try{
        await populatePlayers()
    } catch (err) {
        console.error("Error loading populatePlayers():", err);
    }*/
});