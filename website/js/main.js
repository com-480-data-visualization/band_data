// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    // Load components
    loadComponent('components/landing.html', 'landing-section');
    loadComponent('components/about.html', 'about-section');
    
    // Setup cursor selection
    setupCursorSelector();
});

// Function to load HTML components
function loadComponent(url, targetId) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(targetId).innerHTML = data;
            
            // Initialize component-specific functions after loading
            if (url.includes('landing.html')) {
                initLandingAnimations();
            }
        })
        .catch(error => {
            console.error('Error loading component:', error);
            document.getElementById(targetId).innerHTML = '<p>Error loading content</p>';
        });
}

// Initialize landing page animations
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