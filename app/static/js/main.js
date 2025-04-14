// Configure default layout options
const defaultLayout = {
    autosize: true,
    height: 450,
    margin: { t: 50, r: 30, b: 80, l: 60 }
};

// Fetch and initialize visualizations
async function initializeVisualizations() {
    try {
        const response = await fetch('/data');
        const data = await response.json();
        
        // Create all plots with consistent layout
        const plots = [
            {
                id: 'hourly-trips',
                data: data.hourly_trips.data,
                layout: { ...defaultLayout, ...data.hourly_trips.layout }
            },
            {
                id: 'trips-heatmap',
                data: data.heatmap.data,
                layout: { ...defaultLayout, ...data.heatmap.layout }
            },
            {
                id: 'station-usage-chart',
                data: data.station_rankings.data,
                layout: { ...defaultLayout, ...data.station_rankings.layout }
            }
        ];

        // Create all plots
        for (const plot of plots) {
            await Plotly.newPlot(plot.id, plot.data, plot.layout, {
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'select2d']
            });
        }

        // Set up event listeners
        setupEventListeners(data);

    } catch (error) {
        console.error('Error initializing visualizations:', error);
        displayError('Error loading visualizations. Please try refreshing the page.');
    }
}

// Set up event listeners for interactive elements
function setupEventListeners(data) {
    const dayTypeSelect = document.getElementById('dayType');
    const stationViewSelect = document.getElementById('stationView');
    const universityFilterSelect = document.getElementById('universityFilter');

    if (dayTypeSelect) {
        dayTypeSelect.addEventListener('change', () => updateTemporalVisualizations(data));
    }

    if (stationViewSelect && universityFilterSelect) {
        stationViewSelect.addEventListener('change', () => updateSpatialVisualizations(data));
        universityFilterSelect.addEventListener('change', () => updateSpatialVisualizations(data));
    }
}

// Update temporal visualizations based on day type selection
function updateTemporalVisualizations(data) {
    const dayType = document.getElementById('dayType').value;
    // Implementation will depend on specific visualization requirements
}

// Update spatial visualizations based on view and filter selections
function updateSpatialVisualizations(data) {
    const view = document.getElementById('stationView').value;
    const filter = document.getElementById('universityFilter').value;
    // Implementation will depend on specific visualization requirements
}

// Display error message
function displayError(message) {
    const containers = document.querySelectorAll('.visualization-container');
    containers.forEach(container => {
        container.innerHTML = `<p class="error-message">${message}</p>`;
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    const plots = ['hourly-trips', 'trips-heatmap', 'station-usage-chart'];
    plots.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            Plotly.Plots.resize(container);
        }
    });
});

// Initialize visualizations when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeVisualizations); 