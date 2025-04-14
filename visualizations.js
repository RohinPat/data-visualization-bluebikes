// Function to create the station map visualization
function createStationMap(stations) {
    console.log('Creating station map...');
    const container = document.getElementById('station-map');
    if (!container) {
        console.error('Station map container not found');
        return;
    }
    console.log('Found map container:', container);

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

// Function to load visualization data from the server
async function loadVisualizationData() {
    try {
        // Load data from the docs/data.json file
        const response = await fetch('docs/data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stations = await response.json();
        console.log('Loaded station data:', stations);

        // Create the station map
        createStationMap(stations);

        // Sort stations by number of trips for rankings
        const sortedStations = [...stations].sort((a, b) => b.trips - a.trips);
        const top10Stations = sortedStations.slice(0, 10);

        // Calculate daily distribution (assuming trips field contains daily breakdown)
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dailyTotals = daysOfWeek.map(day => 
            stations.reduce((sum, station) => sum + (station.daily_trips?.[day.toLowerCase()] || 0), 0)
        );

        // Calculate hourly distribution
        const hourlyTotals = Array(24).fill(0);
        stations.forEach(station => {
            if (station.hourly_trips) {
                station.hourly_trips.forEach((trips, hour) => {
                    hourlyTotals[hour] += trips;
                });
            }
        });

        // Calculate trip durations for violin plot
        const tripDurations = stations.reduce((durations, station) => {
            if (station.trip_durations) {
                durations.push(...station.trip_durations);
            }
            return durations;
        }, []);

        // Transform station data into visualization format
        const data = {
            daily_usage: {
                data: [{
                    type: 'bar',
                    x: daysOfWeek,
                    y: dailyTotals,
                    marker: { color: 'rgb(55, 83, 109)' }
                }],
                layout: {
                    title: 'Daily Trip Distribution',
                    xaxis: { title: 'Day of Week' },
                    yaxis: { title: 'Number of Trips' }
                }
            },
            hourly_trips: {
                data: [{
                    type: 'scatter',
                    mode: 'lines+markers',
                    x: Array.from({length: 24}, (_, i) => i),
                    y: hourlyTotals,
                    line: { color: 'rgb(55, 83, 109)' }
                }],
                layout: {
                    title: 'Hourly Trip Distribution',
                    xaxis: { 
                        title: 'Hour of Day',
                        tickmode: 'array',
                        ticktext: Array.from({length: 24}, (_, i) => `${i}:00`),
                        tickvals: Array.from({length: 24}, (_, i) => i)
                    },
                    yaxis: { title: 'Number of Trips' }
                }
            },
            violin_data: {
                data: [{
                    type: 'violin',
                    y: tripDurations.length > 0 ? tripDurations : stations.map(s => s.trips),
                    box: { visible: true },
                    line: { color: 'black' },
                    fillcolor: 'rgb(55, 83, 109)',
                    opacity: 0.6,
                    name: 'Trip Distribution'
                }],
                layout: {
                    title: 'Trip Distribution',
                    yaxis: { title: 'Number of Trips' }
                }
            },
            station_rankings: {
                data: [{
                    type: 'bar',
                    x: top10Stations.map(s => s.name.length > 20 ? s.name.substring(0, 17) + '...' : s.name),
                    y: top10Stations.map(s => s.trips),
                    marker: { color: 'rgb(55, 83, 109)' }
                }],
                layout: {
                    title: 'Top 10 Most Used Stations',
                    xaxis: { 
                        title: 'Station',
                        tickangle: -45
                    },
                    yaxis: { title: 'Number of Trips' },
                    margin: {
                        b: 150  // Increase bottom margin for rotated labels
                    }
                }
            }
        };

        return data;
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

// Function to initialize all visualizations
async function initializeVisualizations() {
    console.log('Initializing visualizations...');
    
    try {
        const data = await loadVisualizationData();
        console.log('Loaded visualization data:', data);
        
        if (!data) {
            console.error('Failed to load visualization data');
            return;
        }

        // Create daily usage chart
        const dailyUsageChart = document.getElementById('daily-usage-altair');
        if (dailyUsageChart) {
            Plotly.newPlot('daily-usage-altair', data.daily_usage.data, data.daily_usage.layout);
        }

        // Create hourly trips chart
        const hourlyTripsChart = document.getElementById('hourly-trips');
        if (hourlyTripsChart) {
            Plotly.newPlot('hourly-trips', data.hourly_trips.data, data.hourly_trips.layout);
        }

        // Create violin plot
        const violinPlot = document.getElementById('duration-violin');
        if (violinPlot) {
            Plotly.newPlot('duration-violin', data.violin_data.data, data.violin_data.layout);
        }

        // Create station rankings chart
        const stationRankings = document.getElementById('station-usage-chart');
        if (stationRankings) {
            Plotly.newPlot('station-usage-chart', data.station_rankings.data, data.station_rankings.layout);
        }

        // Create trips heatmap
        const tripsHeatmap = document.getElementById('trips-heatmap');
        if (tripsHeatmap) {
            Plotly.newPlot('trips-heatmap', data.heatmap.data, data.heatmap.layout);
        }

    } catch (error) {
        console.error('Error initializing visualizations:', error);
    }
}

// Initialize visualizations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting initialization...');
    initializeVisualizations();
}); 