// Global flag to track initialization state
let isInitialized = false;

// Function to load visualization data
async function loadVisualizationData() {
    try {
        // Use the data from data.js directly
        if (typeof visualizationData === 'undefined') {
            throw new Error('Visualization data not loaded');
        }
        console.log('Loaded visualization data:', visualizationData);
        return visualizationData;
    } catch (error) {
        console.error('Error loading visualization data:', error);
        return null;
    }
}

// Function to create the heatmap visualization
function createHeatmap(data) {
    if (!data || !data.heatmap) {
        console.error('No heatmap data available');
        return;
    }
    
    const container = document.getElementById('trips-heatmap');
    if (!container) {
        console.error('Heatmap container not found');
        return;
    }
    
    Plotly.newPlot('trips-heatmap', data.heatmap.data, data.heatmap.layout);
}

// Function to create the daily usage visualization
function createDailyUsage(data) {
    if (!data || !data.daily_usage) {
        console.error('No daily usage data available');
        return;
    }
    
    const container = document.getElementById('daily-usage-altair');
    if (!container) {
        console.error('Daily usage container not found');
        return;
    }
    
    Plotly.newPlot('daily-usage-altair', data.daily_usage.data, data.daily_usage.layout);
}

// Function to create the hourly trips visualization
function createHourlyTrips(data) {
    if (!data || !data.hourly_trips) {
        console.error('No hourly trips data available');
        return;
    }
    
    const container = document.getElementById('hourly-trips');
    if (!container) {
        console.error('Hourly trips container not found');
        return;
    }
    
    Plotly.newPlot('hourly-trips', data.hourly_trips.data, data.hourly_trips.layout);
}

// Function to create the violin plot
function createViolinPlot(data) {
    if (!data || !data.violin_data) {
        console.error('No violin plot data available');
        return;
    }
    
    const container = document.getElementById('duration-violin');
    if (!container) {
        console.error('Violin plot container not found');
        return;
    }
    
    Plotly.newPlot('duration-violin', data.violin_data.data, data.violin_data.layout);
}

// Function to create the station usage chart
function createStationUsage(data) {
    if (!data || !data.station_rankings) {
        console.error('No station rankings data available');
        return;
    }
    
    const container = document.getElementById('station-usage-chart');
    if (!container) {
        console.error('Station usage chart container not found');
        return;
    }
    
    Plotly.newPlot('station-usage-chart', data.station_rankings.data, data.station_rankings.layout);
}

// Function to create the station map visualization
function createStationMap(stations) {
    console.log('Creating station map...');
    const container = document.getElementById('station-map');
    if (!container) {
        console.error('Station map container not found');
        return;
    }
    console.log('Found map container:', container);

    // Check if map is already initialized
    if (container._leaflet_map) {
        console.log('Map already initialized, skipping');
        return;
    }

    try {
        // Initialize the map centered on Boston
        console.log('Initializing Leaflet map...');
        const map = L.map('station-map', {
            center: [42.3601, -71.0589],
            zoom: 13
        });
        console.log('Map initialized:', map);

        // Add the OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        console.log('Added tile layer');

        // Create a feature group for the stations
        const stationsLayer = L.featureGroup().addTo(map);
        console.log('Adding stations:', stations.length);

        // Add each station as a circle marker
        stations.forEach(station => {
            const marker = L.circleMarker([station.lat, station.lng], {
                radius: Math.sqrt(station.trips) * 0.5,
                fillColor: '#1f77b4',
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            marker.bindPopup(`
                <strong>${station.name}</strong><br>
                Trips: ${station.trips}<br>
                Location: (${station.lat.toFixed(4)}, ${station.lng.toFixed(4)})
            `);

            marker.addTo(stationsLayer);
        });

        // Fit the map to show all stations
        map.fitBounds(stationsLayer.getBounds());
        console.log('Map bounds set');

        // Add event listeners for filters
        setupMapFilters(stations, stationsLayer, map);
        console.log('Map setup complete');

    } catch (error) {
        console.error('Error creating map:', error);
    }
}

// Function to set up map filters
function setupMapFilters(stations, stationsLayer, map) {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][name="universityArea"]');
    const tripVolumeSlider = document.getElementById('tripVolume');
    const tripVolumeValue = document.getElementById('tripVolumeValue');

    function updateMarkers() {
        const minTrips = parseInt(tripVolumeSlider.value);
        const selectedAreas = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        stationsLayer.clearLayers();
        
        stations.forEach(station => {
            if (station.trips >= minTrips) {
                const isUniversityArea = station.name.toLowerCase().includes('mit') || 
                                       station.name.toLowerCase().includes('harvard') ||
                                       station.name.toLowerCase().includes('bu') ||
                                       station.name.toLowerCase().includes('northeastern');
                
                const shouldShow = selectedAreas.includes('none') ? !isUniversityArea :
                                 selectedAreas.some(area => station.name.toLowerCase().includes(area));

                if (shouldShow) {
                    const marker = L.circleMarker([station.lat, station.lng], {
                        radius: Math.sqrt(station.trips) * 0.5,
                        fillColor: '#1f77b4',
                        color: '#000',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    marker.bindPopup(`
                        <strong>${station.name}</strong><br>
                        Trips: ${station.trips}<br>
                        Location: (${station.lat.toFixed(4)}, ${station.lng.toFixed(4)})
                    `);

                    marker.addTo(stationsLayer);
                }
            }
        });
    }

    // Add event listeners
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateMarkers);
    });

    tripVolumeSlider.addEventListener('input', function() {
        tripVolumeValue.textContent = this.value;
        updateMarkers();
    });
}

// Initialize all visualizations
async function initializeVisualizations() {
    // Prevent multiple initializations
    if (isInitialized) {
        console.log('Visualizations already initialized, skipping');
        return;
    }
    
    console.log('Initializing visualizations...');
    const data = await loadVisualizationData();
    
    if (data) {
        // Create station map first
        createStationMap(data.station_data);
        
        // Then create other visualizations
        createHeatmap(data);
        createDailyUsage(data);
        createHourlyTrips(data);
        createViolinPlot(data);
        createStationUsage(data);
        
        // Mark as initialized
        isInitialized = true;
    }
}

// Wait for the DOM to be loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting initialization...');
    initializeVisualizations();
}); 