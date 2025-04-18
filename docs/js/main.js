// Configure Tailwind animations
tailwind.config = {
  theme: {
    extend: {
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
    }
  },
  variants: {
    animation: ['responsive', 'motion-safe', 'motion-reduce']
  }
}

// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    loadComponent('components/landing.html', 'landing-section');
    loadComponent('components/about.html', 'about-section');
    loadComponent('components/players-overview.html', 'players-overview');
    loadComponent('components/find-your-player.html', 'player-finder-section');
    loadComponent('components/player-profile.html', 'player-profile-section');
    
    // Setup cursor selection
    setupCursorSelector();
});

// Load HTML components
function loadComponent(url, targetId) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(targetId).innerHTML = data;
            
            // Initialize component-specific functions after loading
            if (url.includes('landing.html')) {
                initLandingAnimations();
            }
            
            // Initialize player finder dropdowns if that component is loaded
            if (url.includes('find-your-player.html')) {
                createPlayerDropdowns();
                setupPlayerProfileNavigation();
            }

            if (url.includes('players-overview.html')) {
                new gridjs.Grid({
                    columns: ["Rank", "Name"],
                    data: [
                      ["1", "Roger Federer"],
                      ["2", "Novak Djokovic"],
                      ["3", "Raphael Nadal"],
                      ["4", "Roger Federer"],
                      ["5", "Novak Djokovic"]
                    ],
                    fixedHeader: true,
                    search: true,
                    style: { 
                        table: { 
                          'white-space': 'nowrap'
                        }
                      },
                  }).render(document.getElementById("topplayers_table"));
            }
        })
        .catch(error => {
            console.error('Error loading component:', error);
            document.getElementById(targetId).innerHTML = '<p>Error loading content</p>';
        });
}

// Setup navigation between player finder and profile
function setupPlayerProfileNavigation() {
    // Add event listener to the Find my player button
    const findPlayerButton = document.querySelector('#player-finder button');
    if (findPlayerButton) {
        findPlayerButton.addEventListener('click', function() {
            document.getElementById('player-profile-section').scrollIntoView({behavior: 'smooth'});
        });
    }
}

// 1. Initialize landing page animations
function initLandingAnimations() {
    setTimeout(function() { 
        document.getElementById('tennis').classList.add('show'); 
    }, 500);
    
    setTimeout(function() { 
        document.getElementById('for').classList.add('show'); 
    }, 1500);
    
    setTimeout(function() { 
        document.getElementById('dummies').classList.add('show'); 
    }, 2500);
}

function createDropdown(containerId, dropdownName, options) {
    // Create the dropdown container
    const dropdownContainer = document.createElement('div');
    dropdownContainer.classList.add('relative', 'inline-block', 'w-full', 'text-left');

    // Create the dropdown button
    const button = document.createElement('button');
    button.classList.add('w-full', 'px-6', 'py-3', 'font-bold', 'text-black', 'bg-white', 'border-4', 'border-black', 'rounded-full', 'shadow-md', 'focus:outline-none', 'flex', 'items-center', 'justify-between');
    button.innerHTML = `
        <span>${dropdownName}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
    `;

    // Create the dropdown menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.classList.add('hidden', 'absolute', 'right-0', 'w-full', 'mt-2', 'origin-top-right', 'bg-white', 'shadow-lg', 'rounded-3xl', 'border', 'border-black', 'z-10');
    dropdownMenu.innerHTML = options.map(option => `
        <a href="#" class="block px-6 py-3 text-gray-700 hover:bg-gray-100">${option}</a>
    `).join('');

    // Append the button and menu to the container
    dropdownContainer.appendChild(button);
    dropdownContainer.appendChild(dropdownMenu);

    // Add event listener to toggle the menu visibility
    button.addEventListener('click', () => {
        dropdownMenu.classList.toggle('hidden');
    });

    // Close dropdowns if clicked outside
    window.addEventListener('click', (event) => {
        if (!dropdownContainer.contains(event.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });

    // Append the dropdown to the container
    const container = document.getElementById(containerId);
    if (container) {
        container.appendChild(dropdownContainer);
    }
}


// 2. Function to create player finder dropdowns
function createPlayerDropdowns() {
    // Create all dropdowns
    createDropdown('dropdownsContainer', 'Tournament', ['All', 'G - Grand Slam', 'M - Masters', 'F - Tour-level finals', 'A - Other Tour-level events', 'D - Davis Cup']);
    createDropdown('dropdownsContainer', 'Court Surface', ['All', 'Clay', 'Grass', 'Hard', 'Carpet']);
    createDropdown('dropdownsContainer', 'Decade', ['90s', '00s', '10s', '20s']);
    createDropdown('dropdownsContainer', 'Gender', ['Male', 'Female']);
    createDropdown('dropdownsContainer', 'Nationality', ['All', 'Switzerland', 'Canada', 'UK']);
    createDropdown('dropdownsContainer', 'Handedness', ['All', 'Left', 'Right']);
}
// Setup cursor selector functionality
function setupCursorSelector() {
    document.querySelectorAll('.cursor-option').forEach(function(option) {
        option.addEventListener('click', function() {
            // Remove active class from all options
            document.querySelectorAll('.cursor-option').forEach(function(opt) {
                opt.classList.remove('active');
            });
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Apply cursor
            var cursorValue = this.getAttribute('data-cursor');
            if (cursorValue === 'auto') {
                document.body.style.cursor = 'auto';
            } else {
                document.body.style.cursor = 'url(' + cursorValue + '), auto';
            }
        });
    });
}