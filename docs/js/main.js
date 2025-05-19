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
    //loadComponent('components/player-profile.html', 'player-profile-section');
    
    // Setup cursor selection
    setupCursorSelector();

    if (window.location.hash === "#player-finder-section") {
      scrollToSectionWhenReady("player-finder-section");
    }
});

function scrollToSectionWhenReady(id) {
  const checkExist = setInterval(() => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      clearInterval(checkExist);
    }
  }, 100);
}


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
                populatePlayers().then(
                    loadDropdownMappings().then(
                       // createPlayerDropdowns
                    )
                );
                //createPlayerDropdowns();
                //setupFindPlayerButton();
                //setupPlayerProfileNavigation();
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
/*function setupPlayerProfileNavigation() {
    // Add event listener to the Find my player button
    const findPlayerButton = document.querySelector('#player-finder button');
    if (findPlayerButton) {
        findPlayerButton.addEventListener('click', function() {
            document.getElementById('player-profile-section').scrollIntoView({behavior: 'smooth'});
        });
    }
}*/

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