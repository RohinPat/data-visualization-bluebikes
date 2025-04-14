// Global flag to track initialization state
let isInitialized = false;

// Function to load visualization data
async function loadVisualizationData() {
    try {
        // Get the base URL for the current environment
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? '.' 
            : window.location.pathname.split('/')[1] ? `/${window.location.pathname.split('/')[1]}` : '';
        
        // Load the data from the static files using relative paths
        const [stationsData, durationsData, hourlyData, dailyData] = await Promise.all([
            fetch(`${baseUrl}/static/stations.json`).then(res => res.json()),
            fetch(`${baseUrl}/static/durations.json`).then(res => res.json()),
            fetch(`${baseUrl}/static/hourly_usage.json`).then(res => res.json()),
            fetch(`${baseUrl}/static/daily_usage.json`).then(res => res.json())
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
            tickangle: -45,
            range: [0, 6]  // Focus on the 7 days
        },
        yaxis: {
            title: 'Hour of Day',
            tickmode: 'linear',
            tick0: 0,
            dtick: 1,
            range: [0, 23]  // Focus on the 24 hours
        },
        margin: {
            b: 100,  // Add more bottom margin for rotated labels
            t: 50,   // Add top margin
            l: 50,   // Add left margin
            r: 50    // Add right margin
        },
        coloraxis: {
            colorscale: 'Viridis',
            colorbar: {
                title: 'Number of Trips',
                len: 0.8  // Make colorbar shorter
            }
        },
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1
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
        type: 'bar',
        marker: { color: 'blue' }
    };

    const trace2 = {
        x: casualData.map(d => d.day),
        y: casualData.map(d => d.count),
        name: 'Casual',
        type: 'bar',
        marker: { color: 'red' }
    };

    const layout = {
        title: 'Daily Usage by User Type',
        barmode: 'group',
        xaxis: { 
            title: 'Day of Week',
            range: [-0.5, 6.5]  // Focus on the 7 days
        },
        yaxis: { 
            title: 'Number of Trips',
            range: [0, Math.max(...memberData.map(d => d.count), ...casualData.map(d => d.count)) * 1.1]  // Add 10% padding
        },
        margin: {
            t: 50,
            b: 50,
            l: 50,
            r: 50
        },
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1
        }
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
            mode: 'lines+markers',
            line: { color: 'blue' },
            marker: { color: 'blue' }
        },
        {
            x: casualWeekday.map(d => d.hour),
            y: casualWeekday.map(d => d.count),
            name: 'Casual (Weekday)',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: 'red' },
            marker: { color: 'red' }
        },
        {
            x: memberWeekend.map(d => d.hour),
            y: memberWeekend.map(d => d.count),
            name: 'Member (Weekend)',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: 'lightblue', dash: 'dash' },
            marker: { color: 'lightblue' }
        },
        {
            x: casualWeekend.map(d => d.hour),
            y: casualWeekend.map(d => d.count),
            name: 'Casual (Weekend)',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: 'pink', dash: 'dash' },
            marker: { color: 'pink' }
        }
    ];

    const layout = {
        title: 'Hourly Trips by User Type and Day Type',
        xaxis: { 
            title: 'Hour of Day',
            range: [0, 23]  // Focus on the 24 hours
        },
        yaxis: { 
            title: 'Number of Trips',
            range: [0, Math.max(
                ...memberWeekday.map(d => d.count),
                ...casualWeekday.map(d => d.count),
                ...memberWeekend.map(d => d.count),
                ...casualWeekend.map(d => d.count)
            ) * 1.1]  // Add 10% padding
        },
        margin: {
            t: 50,
            b: 50,
            l: 50,
            r: 50
        },
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1
        }
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
            range: [0, 23]  // Focus on the 24 hours
        },
        yaxis: { 
            title: 'Duration (minutes)',
            range: [0, Math.max(
                ...memberData.map(d => d.mean + d.std),
                ...casualData.map(d => d.mean + d.std)
            ) * 1.1]  // Add 10% padding
        },
        margin: {
            t: 50,
            b: 50,
            l: 50,
            r: 50
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

    // Initialize the map with a higher zoom level and better center point
    const map = L.map('station-map', {
        center: [42.3601, -71.0922],  // Centered on MIT area
        zoom: 15,  // Increased zoom level for better detail
        maxZoom: 19,
        minZoom: 12
    });

    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Create a feature group for the stations
    const stationsLayer = L.featureGroup().addTo(map);

    // Define university areas with proper geographic boundaries
    const universityAreas = {
        mit: {
            center: [42.3601, -71.0922],
            radius: 1.0  // 1km radius
        },
        harvard: {
            center: [42.3744, -71.1169],
            radius: 1.0
        },
        bu: {
            center: [42.3505, -71.1054],
            radius: 1.0
        },
        northeastern: {
            center: [42.3398, -71.0892],
            radius: 1.0
        }
    };

    // Helper function to check if a point is within a circle
    function isPointInCircle(point, center, radius) {
        const R = 6371; // Earth's radius in km
        const dLat = (point[0] - center[0]) * Math.PI / 180;
        const dLon = (point[1] - center[1]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(center[0] * Math.PI / 180) * Math.cos(point[0] * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return distance <= radius;
    }

    // Function to determine which university area a station belongs to
    function getStationUniversityArea(station) {
        for (const [univ, area] of Object.entries(universityAreas)) {
            if (isPointInCircle([station.lat, station.lng], area.center, area.radius)) {
                console.log(`Station ${station.name} is in ${univ} area`);
                return univ;
            }
        }
        console.log(`Station ${station.name} is not in any university area`);
        return 'none';
    }

    // Function to update markers based on filters
    function updateMarkers() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][name="universityArea"]');
        const tripVolumeSlider = document.getElementById('tripVolume');
        const minTrips = parseInt(tripVolumeSlider.value);
        const selectedAreas = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        console.log('Selected areas:', selectedAreas);
        stationsLayer.clearLayers();
        
        // Find max trips for scaling
        const maxTrips = Math.max(...stations.map(s => s.trips));
        
        // Calculate center point based on visible stations
        let visibleStations = [];
        stations.forEach(station => {
            if (station.trips >= minTrips) {
                const stationArea = getStationUniversityArea(station);
                if (selectedAreas.includes(stationArea)) {
                    visibleStations.push(station);
                }
            }
        });

        // Calculate average coordinates for centering
        if (visibleStations.length > 0) {
            const avgLat = visibleStations.reduce((sum, s) => sum + s.lat, 0) / visibleStations.length;
            const avgLng = visibleStations.reduce((sum, s) => sum + s.lng, 0) / visibleStations.length;
            map.setView([avgLat, avgLng], 15);
        }
        
        // Add markers
        visibleStations.forEach(station => {
            const marker = L.circleMarker([station.lat, station.lng], {
                radius: Math.sqrt(station.trips) * 1.2,
                fillColor: '#1f77b4',
                color: '#1f77b4',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            marker.bindPopup(`
                <strong>${station.name}</strong><br>
                Trips: ${station.trips}<br>
                Location: (${station.lat.toFixed(4)}, ${station.lng.toFixed(4)})<br>
                Area: ${getStationUniversityArea(station) === 'none' ? 'Other' : getStationUniversityArea(station).toUpperCase()}
            `);

            marker.addTo(stationsLayer);
        });

        // Create or update legend
        const legend = L.control({position: 'bottomright'});
        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'info legend');
            const tripValues = [0, 50, 100, 200, maxTrips];
            const labels = [];
            
            // Add title
            div.innerHTML = '<h4>Number of Trips</h4>';
            
            // Add legend entries
            for (let i = 0; i < tripValues.length; i++) {
                const radius = Math.sqrt(tripValues[i]) * 1.2;
                labels.push(
                    `<div class="legend-entry">
                        <span class="legend-circle" style="width:${radius * 2}px; height:${radius * 2}px; background-color:#1f77b4;"></span>
                        <span class="legend-label">${tripValues[i]}</span>
                    </div>`
                );
            }
            
            div.innerHTML += labels.join('');
            return div;
        };
        
        // Remove existing legend if it exists
        if (map.legend) {
            map.removeControl(map.legend);
        }
        map.legend = legend;
        legend.addTo(map);

        // Update the map bounds to show all visible markers
        if (stationsLayer.getLayers().length > 0) {
            map.fitBounds(stationsLayer.getBounds());
        }
    }

    // Add event listeners for filters
    const checkboxes = document.querySelectorAll('input[type="checkbox"][name="universityArea"]');
    const tripVolumeSlider = document.getElementById('tripVolume');
    const tripVolumeValue = document.getElementById('tripVolumeValue');

    // Set slider max value based on data
    const maxTrips = Math.max(...stations.map(s => s.trips));
    tripVolumeSlider.max = maxTrips - 1; // Set max to just under the maximum trips
    tripVolumeSlider.value = 0;
    tripVolumeValue.textContent = '0';

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            console.log('Checkbox changed:', this.value, this.checked);
            updateMarkers();
        });
    });

    tripVolumeSlider.addEventListener('input', function() {
        tripVolumeValue.textContent = this.value;
        updateMarkers();
    });

    // Initial update
    updateMarkers();
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