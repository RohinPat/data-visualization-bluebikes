// Global flag to track initialization state
let isInitialized = false;

// Function to load visualization data
async function loadVisualizationData() {
    try {
        // Load the data from the static files using relative paths
        const [stationsData, durationsData, hourlyData, dailyData] = await Promise.all([
            fetch('./static/stations.json').then(res => res.json()),
            fetch('./static/durations.json').then(res => res.json()),
            fetch('./static/hourly_usage.json').then(res => res.json()),
            fetch('./static/daily_usage.json').then(res => res.json())
        ]);

        const visualizationData = {
            stations: stationsData,
            durations: durationsData,
            hourlyUsage: hourlyData,
            dailyUsage: dailyData
        };

        console.log('Loaded visualization data:', visualizationData);
        return visualizationData;
    } catch (error) {
        console.error('Error loading visualization data:', error);
        return null;
    }
}

// Function to create the heatmap visualization
function createHeatmap(data) {
    const container = document.getElementById('trips-heatmap');
    if (!container) {
        console.error('Heatmap container not found');
        return;
    }

    // Get the heatmap data from the visualization data
    const heatmapData = visualizationData.heatmap.data[0];
    const layout = {
        title: 'Weekly Trip Patterns by Hour',
        xaxis: {
            title: 'Day of Week',
            tickangle: -45
        },
        yaxis: {
            title: 'Hour of Day',
            tickmode: 'linear',
            tick0: 0,
            dtick: 1
        },
        margin: {
            b: 100  // Add more bottom margin for rotated labels
        },
        coloraxis: {
            colorscale: 'Viridis',
            colorbar: {
                title: 'Number of Trips'
            }
        }
    };

    Plotly.newPlot('trips-heatmap', [heatmapData], layout);
}

// Function to create the daily usage visualization
function createDailyUsage(data) {
    if (!data || !Array.isArray(data)) {
        console.error('No daily usage data available');
        return;
    }
    
    const container = document.getElementById('daily-usage-altair');
    if (!container) {
        console.error('Daily usage container not found');
        return;
    }

    // Process data for daily usage
    const memberData = data.filter(d => d.member_casual === 'member');
    const casualData = data.filter(d => d.member_casual === 'casual');

    const trace1 = {
        x: memberData.map(d => d.day),
        y: memberData.map(d => d.count),
        name: 'Member',
        type: 'bar'
    };

    const trace2 = {
        x: casualData.map(d => d.day),
        y: casualData.map(d => d.count),
        name: 'Casual',
        type: 'bar'
    };

    const layout = {
        title: 'Daily Usage by User Type',
        barmode: 'group',
        xaxis: { title: 'Day of Week' },
        yaxis: { title: 'Number of Trips' }
    };

    Plotly.newPlot('daily-usage-altair', [trace1, trace2], layout);
}

// Function to create the hourly trips visualization
function createHourlyTrips(data) {
    if (!data || !Array.isArray(data)) {
        console.error('No hourly trips data available');
        return;
    }
    
    const container = document.getElementById('hourly-trips');
    if (!container) {
        console.error('Hourly trips container not found');
        return;
    }

    // Process data for hourly trips
    const memberWeekday = data.filter(d => d.member_casual === 'member' && d.day_type === 'weekday');
    const casualWeekday = data.filter(d => d.member_casual === 'casual' && d.day_type === 'weekday');
    const memberWeekend = data.filter(d => d.member_casual === 'member' && d.day_type === 'weekend');
    const casualWeekend = data.filter(d => d.member_casual === 'casual' && d.day_type === 'weekend');

    const traces = [
        {
            x: memberWeekday.map(d => d.hour),
            y: memberWeekday.map(d => d.count),
            name: 'Member (Weekday)',
            type: 'scatter',
            mode: 'lines+markers'
        },
        {
            x: casualWeekday.map(d => d.hour),
            y: casualWeekday.map(d => d.count),
            name: 'Casual (Weekday)',
            type: 'scatter',
            mode: 'lines+markers'
        },
        {
            x: memberWeekend.map(d => d.hour),
            y: memberWeekend.map(d => d.count),
            name: 'Member (Weekend)',
            type: 'scatter',
            mode: 'lines+markers'
        },
        {
            x: casualWeekend.map(d => d.hour),
            y: casualWeekend.map(d => d.count),
            name: 'Casual (Weekend)',
            type: 'scatter',
            mode: 'lines+markers'
        }
    ];

    const layout = {
        title: 'Hourly Trips by User Type and Day Type',
        xaxis: { title: 'Hour of Day' },
        yaxis: { title: 'Number of Trips' }
    };

    Plotly.newPlot('hourly-trips', traces, layout);
}

// Function to create the violin plot
function createViolinPlot(data) {
    if (!data || !Array.isArray(data)) {
        console.error('No violin plot data available');
        return;
    }
    
    const container = document.getElementById('duration-violin');
    if (!container) {
        console.error('Violin plot container not found');
        return;
    }

    // Process data for violin plot
    const memberData = data.filter(d => d.member_casual === 'member');
    const casualData = data.filter(d => d.member_casual === 'casual');

    const traces = [
        {
            x: memberData.map(d => d.hour),
            y: memberData.map(d => d.mean),
            error_y: {
                type: 'data',
                array: memberData.map(d => d.std),
                visible: true
            },
            name: 'Member',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: 'blue' },
            marker: { color: 'blue' }
        },
        {
            x: casualData.map(d => d.hour),
            y: casualData.map(d => d.mean),
            error_y: {
                type: 'data',
                array: casualData.map(d => d.std),
                visible: true
            },
            name: 'Casual',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: 'red' },
            marker: { color: 'red' }
        }
    ];

    const layout = {
        title: 'Average Trip Duration by Hour and User Type',
        xaxis: { 
            title: 'Hour of Day',
            tickmode: 'linear',
            tick0: 0,
            dtick: 1
        },
        yaxis: { 
            title: 'Duration (minutes)',
            range: [0, 40] // Adjust based on your data range
        },
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1
        }
    };

    Plotly.newPlot('duration-violin', traces, layout);
}

// Function to create the station usage chart
function createStationUsage(data) {
    if (!data || !Array.isArray(data)) {
        console.error('No station rankings data available');
        return;
    }
    
    const container = document.getElementById('station-usage-chart');
    if (!container) {
        console.error('Station usage chart container not found');
        return;
    }

    // Process data for station usage
    const topStations = data
        .sort((a, b) => b.trips - a.trips)
        .slice(0, 10);

    const trace = {
        x: topStations.map(s => s.name),
        y: topStations.map(s => s.trips),
        type: 'bar'
    };

    const layout = {
        title: 'Top 10 Stations by Trip Volume',
        xaxis: { title: 'Station Name', tickangle: 45 },
        yaxis: { title: 'Number of Trips' }
    };

    Plotly.newPlot('station-usage-chart', [trace], layout);
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

// Function to initialize all visualizations
async function initializeVisualizations() {
    if (isInitialized) {
        console.log('Visualizations already initialized');
        return;
    }

    console.log('Initializing visualizations...');
    
    try {
        const data = await loadVisualizationData();
        if (data) {
            // Create station map first
            createStationMap(data.stations);
            
            // Then create other visualizations
            createHeatmap(data.hourlyUsage);
            createDailyUsage(data.dailyUsage);
            createHourlyTrips(data.hourlyUsage);
            createViolinPlot(data.durations);
            createStationUsage(data.stations);
            
            isInitialized = true;
            console.log('Visualizations initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing visualizations:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting initialization...');
    initializeVisualizations();
}); 