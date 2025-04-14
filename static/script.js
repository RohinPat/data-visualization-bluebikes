// Helper function to determine time period
function getTimePeriod(hour) {
    if (hour >= 5 && hour < 11) return "Morning";
    if (hour >= 11 && hour < 16) return "Afternoon";
    if (hour >= 16 && hour < 21) return "Evening";
    return "Night";
}

// Helper function to generate realistic trip durations
function generateDurations(count, period, userType) {
    const baseDuration = userType === 'member' ? 15 : 25;
    const variability = userType === 'member' ? 5 : 10;
    
    let multiplier;
    switch(period) {
        case 'Morning': multiplier = 1.0; break;
        case 'Afternoon': multiplier = 1.3; break;
        case 'Evening': multiplier = 1.1; break;
        case 'Night': multiplier = 0.8; break;
    }
    
    return Array.from({ length: count }, () => {
        const base = baseDuration * multiplier;
        const variance = (Math.random() - 0.5) * 2 * variability;
        return Math.max(1, Math.min(60, base + variance));
    });
}

// Function to ensure visualization containers exist
function ensureVisualizationContainers() {
    const containers = [
        { id: 'hourly-trips', parentSelector: '.temporal-patterns' },
        { id: 'duration-violin', parentSelector: '.temporal-patterns' },
        { id: 'trips-heatmap', parentSelector: '.temporal-patterns' },
        { id: 'daily-usage-altair', parentSelector: '.temporal-patterns' },
        { id: 'station-usage-chart', parentSelector: '.spatial-analysis' }
    ];
    
    containers.forEach(container => {
        if (!document.getElementById(container.id)) {
            console.log(`Creating missing container: ${container.id}`);
            const parentSection = document.querySelector(container.parentSelector);
            
            if (parentSection) {
                // Find a good location to insert the container
                const existingContainer = parentSection.querySelector('.visualization-container');
                
                if (existingContainer) {
                    // Create a new container similar to existing ones
                    const newContainer = document.createElement('div');
                    newContainer.className = 'visualization-container';
                    
                    // Add chart controls if needed
                    if (container.id === 'hourly-trips') {
                        const controls = document.createElement('div');
                        controls.className = 'chart-controls';
                        controls.innerHTML = `
                            <select id="dayType">
                                <option value="compare">Compare Weekday vs Weekend</option>
                                <option value="all">All Days</option>
                                <option value="weekday">Weekdays</option>
                                <option value="weekend">Weekends</option>
                            </select>
                        `;
                        newContainer.appendChild(controls);
                    }
                    
                    // Create the visualization div
                    const visualizationDiv = document.createElement('div');
                    visualizationDiv.id = container.id;
                    visualizationDiv.className = 'visualization';
                    newContainer.appendChild(visualizationDiv);
                    
                    // Add a description placeholder
                    const description = document.createElement('div');
                    description.className = 'visualization-description';
                    description.innerHTML = `<h3>${container.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</h3>
                        <p>This visualization will show patterns related to ${container.id.replace(/-/g, ' ')}.</p>`;
                    newContainer.appendChild(description);
                    
                    // Insert the new container
                    parentSection.appendChild(newContainer);
                    console.log(`Created new container for ${container.id}`);
                }
            } else {
                console.warn(`Could not find parent section for ${container.id}`);
            }
        }
    });
}

// Initialize visualizations with the provided data
window.initializeVisualizations = function(data) {
    try {
        // Flag to track if initialization is in progress
        if (window.initializationInProgress) {
            console.log("Initialization already in progress, skipping");
            return;
        }
        
        window.initializationInProgress = true;
        
        // Ensure all visualization containers exist
        ensureVisualizationContainers();
        
        // Configure default layout options for Plotly charts
        const defaultLayout = {
            autosize: true,
            height: 450,
            margin: { t: 50, r: 30, b: 80, l: 60 },
            plot_bgcolor: 'rgba(248,249,250,1)',
            paper_bgcolor: 'rgba(248,249,250,1)'
        };
        
        // First, try to load complete dataset from data.json if not already provided
        if (!data.d3_station_data || data.d3_station_data.length <= 10) {
            console.log("Attempting to load full dataset from data.json");
            fetch('static/data.json')
                .then(response => response.json())
                .then(fullData => {
                    console.log(`Loaded ${fullData.d3_station_data ? fullData.d3_station_data.length : 0} stations from data.json`);
                    // Merge the full station data with existing data
                    data.d3_station_data = fullData.d3_station_data || [];
                    // Initialize with the complete data rather than calling initializeVisualizations again
                    initializeWithAvailableData(data);
                })
                .catch(error => {
                    console.error("Error loading data.json:", error);
                    // Continue with existing data
                    initializeWithAvailableData(data);
                });
        } else {
            // Proceed with initialization using the provided data
            initializeWithAvailableData(data);
        }
        
        function initializeWithAvailableData(data) {
            // Log the data being used
            console.log(`Initializing with ${data.d3_station_data ? data.d3_station_data.length : 0} station data points`);
            
            // Define the updateVisualizations function
            function updateVisualizations() {
                // Check if dayTypeSelect and the required data elements exist
                let dayTypeSelect = document.getElementById('dayType');
                if (!dayTypeSelect) {
                    console.log("Missing element: dayType select");
                    // Find or create a container for the controls
                    let controlsContainer = document.querySelector('.chart-controls');
                    if (!controlsContainer) {
                        const hourlyTripsContainer = document.getElementById('hourly-trips');
                        if (hourlyTripsContainer && hourlyTripsContainer.parentElement) {
                            controlsContainer = document.createElement('div');
                            controlsContainer.className = 'chart-controls';
                            hourlyTripsContainer.parentElement.insertBefore(controlsContainer, hourlyTripsContainer);
                        }
                    }
                    
                    if (controlsContainer) {
                        dayTypeSelect = document.createElement('select');
                        dayTypeSelect.id = 'dayType';
                        dayTypeSelect.innerHTML = `
                            <option value="compare">Compare Weekday vs Weekend</option>
                            <option value="all">All Days</option>
                            <option value="weekday">Weekdays</option>
                            <option value="weekend">Weekends</option>
                        `;
                        controlsContainer.appendChild(dayTypeSelect);
                        dayTypeSelect.addEventListener('change', updateVisualizations);
                    }
                }
                
                // If we don't have heatmap data, create sample data
                if (!data.heatmap || !data.heatmap.data) {
                    console.log("Missing data: heatmap data");
                    data.heatmap = {
                        data: [{
                            x: Array.from({length: 24}, (_, i) => i),
                            y: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                            z: Array.from({length: 7}, () => 
                                Array.from({length: 24}, (_, hour) => {
                                    // Create realistic trip patterns based on time of day
                                    let base = 0;
                                    if (hour >= 7 && hour <= 9) base = 50; // Morning commute
                                    else if (hour >= 16 && hour <= 18) base = 45; // Evening commute
                                    else if (hour >= 11 && hour <= 15) base = 30; // Mid-day
                                    else if (hour >= 19 && hour <= 22) base = 20; // Evening
                                    else base = 10; // Night/early morning
                                    
                                    return Math.round(base + (Math.random() * 20));
                                })
                            )
                        }]
                    };
                }

                // Log the existence status of all visualization containers
                console.log("Checking visualization containers before update:");
                ['hourly-trips', 'trips-heatmap', 'duration-violin', 'daily-usage-altair', 'station-usage-chart'].forEach(id => {
                    const exists = document.getElementById(id) !== null;
                    console.log(`Container '${id}': ${exists ? 'EXISTS' : 'MISSING'}`);
                });
                
                if (!dayTypeSelect) {
                    console.error("Cannot proceed with visualization update: dayType select is still missing");
                    return;
                }

                try {
                    // Now that we have ensured the necessary elements, proceed with the visualization update
                    const dayType = dayTypeSelect.value;
                    const heatmapData = data.heatmap.data[0];
                    const hours = heatmapData.x;
                    const values = heatmapData.z;
                    
                    if (dayType === 'compare') {
                        // Calculate weekday averages
                        const weekdayY = Array(24).fill(0);
                        for (let hour = 0; hour < 24; hour++) {
                            let sum = 0;
                            for (let day = 0; day < 5; day++) {
                                sum += values[day][hour];
                            }
                            weekdayY[hour] = sum / 5;
                        }

                        // Calculate weekend averages
                        const weekendY = Array(24).fill(0);
                        for (let hour = 0; hour < 24; hour++) {
                            let sum = 0;
                            for (let day = 5; day < 7; day++) {
                                sum += values[day][hour];
                            }
                            weekendY[hour] = sum / 2;
                        }

                        const newData = [
                            {
                                x: hours,
                                y: weekdayY,
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Weekdays',
                                line: { color: '#4C78A8', width: 3 },
                                marker: { size: 6, color: '#4C78A8' }
                            },
                            {
                                x: hours,
                                y: weekendY,
                                type: 'scatter',
                                mode: 'lines+markers',
                                name: 'Weekends',
                                line: { color: '#E45756', width: 3 },
                                marker: { size: 6, color: '#E45756' }
                            }
                        ];

                        const newLayout = {
                            ...defaultLayout,
                            title: {
                                text: 'Bike Trips by Hour of Day (Weekday vs Weekend)',
                                font: { size: 20 }
                            },
                            showlegend: true,
                            legend: {
                                x: 1,
                                xanchor: 'right',
                                y: 1,
                                bgcolor: 'rgba(255,255,255,0.9)',
                                bordercolor: 'rgba(0,0,0,0.2)',
                                borderwidth: 1
                            }
                        };

                        const hourlyTripsElement = document.getElementById('hourly-trips');
                        if (hourlyTripsElement) {
                            console.log("Updating hourly-trips for compare view");
                            // Check if Plotly is available
                            if (typeof Plotly === 'undefined') {
                                console.error("Plotly library is not available. Visualization will be skipped.");
                                return;
                            }
                            Plotly.newPlot('hourly-trips', newData, newLayout);
                        } else {
                            console.warn("Skipping hourly-trips update - element not found");
                            // Try to create the missing element
                            ensureVisualizationContainers();
                        }
                    } else {
                        // Calculate average trips per hour based on day type
                        const newY = Array(24).fill(0);
                        
                        for (let hour = 0; hour < 24; hour++) {
                            let sum = 0;
                            let count = 0;
                            
                            // Determine which days to include based on filter
                            const startDay = dayType === 'weekend' ? 5 : 0;
                            const endDay = dayType === 'weekday' ? 5 : 7;
                            
                            for (let day = startDay; day < endDay; day++) {
                                sum += values[day][hour];
                                count++;
                            }
                            
                            newY[hour] = sum / count;
                        }

                        const newData = [{
                            x: hours,
                            y: newY,
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: 'Total Trips',
                            line: { color: '#4C78A8', width: 3 },
                            marker: { size: 6, color: '#4C78A8' }
                        }];

                        const newLayout = {
                            ...defaultLayout,
                            title: {
                                text: `Bike Trips by Hour of Day (${dayType === 'all' ? 'All Days' : (dayType === 'weekday' ? 'Weekdays' : 'Weekends')})`,
                                font: { size: 20 }
                            },
                            showlegend: false
                        };

                        const hourlyTripsElement = document.getElementById('hourly-trips');
                        if (hourlyTripsElement) {
                            console.log("Updating hourly-trips for single view");
                            // Check if Plotly is available
                            if (typeof Plotly === 'undefined') {
                                console.error("Plotly library is not available. Visualization will be skipped.");
                                return;
                            }
                            Plotly.newPlot('hourly-trips', newData, newLayout);
                        } else {
                            console.warn("Skipping hourly-trips update - element not found");
                            // Try to create the missing element
                            ensureVisualizationContainers();
                        }
                    }
                    
                    // After updating hourly-trips, check if we should create trips-heatmap
                    const tripsHeatmapElement = document.getElementById('trips-heatmap');
                    if (tripsHeatmapElement && typeof Plotly !== 'undefined') {
                        console.log("Creating trips-heatmap visualization");
                        try {
                            Plotly.newPlot('trips-heatmap', [{
                                ...heatmapData,
                                hovertemplate: 
                                    '<b>Day: %{y}</b><br>' +
                                    'Hour: %{x}:00<br>' +
                                    'Trips: %{z}<br>' +
                                    '<i>Higher values indicate busier periods</i><extra></extra>'
                            }], {
                                ...defaultLayout,
                                title: {
                                    text: "Trip Distribution by Day and Hour",
                                    font: { size: 20 }
                                }
                            });
                        } catch (error) {
                            console.error("Error creating trips-heatmap:", error);
                        }
                    }
                } catch (error) {
                    console.error("Error in updateVisualizations function:", error);
                }
            }

            // Initialize the map - centered more on Boston/Cambridge area with appropriate zoom
            // Support both 'stationMap' and 'station-map' IDs for compatibility
            const mapElement = document.getElementById('stationMap') || document.getElementById('station-map');

            if (!mapElement) {
                console.error('Map container not found');
                return;
            }
            
            // Check if we already have a map for this element to avoid re-initialization
            if (window.bikeShareMap) {
                console.log("Map already exists, using existing map");
                return;
            }
            
            // Create a fresh map instance every time
            console.log("Creating fresh map instance on element:", mapElement.id);
            
            // Remove any existing map if present
            if (mapElement._leaflet_id) {
                console.log("Clearing existing map instance");
                try {
                    // Try to find and clear existing map
                    for (const mapId in L.maps) {
                        if (L.maps[mapId]._container === mapElement) {
                            L.maps[mapId].remove();
                            console.log("Successfully removed existing map");
                            break;
                        }
                    }
                } catch (e) {
                    console.error("Error cleaning up existing map:", e);
                }
            }
            
            // Create new map instance
            let map;
            try {
                map = L.map(mapElement.id).setView([42.3551, -71.0656], 13);
                // Store the map reference globally to check if it exists
                window.bikeShareMap = map;
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
                console.log("New map created successfully with", data.d3_station_data ? data.d3_station_data.length : 0, "stations to display");
            } catch (e) {
                console.error("Error creating new map:", e);
                return; // Exit initialization if map creation fails
            }

            // Define university areas with expanded boundaries and campus outlines
            const universityAreas = {
                mit: {
                    bounds: {
                        lat: [42.3530, 42.3650],
                        lng: [-71.1060, -71.0880]
                    },
                    campus: [
                        [42.3601, -71.0912],
                        [42.3601, -71.0890],
                        [42.3590, -71.0880],
                        [42.3580, -71.0880],
                        [42.3570, -71.0890],
                        [42.3560, -71.0912],
                        [42.3560, -71.0940],
                        [42.3570, -71.0960],
                        [42.3580, -71.0960],
                        [42.3590, -71.0950],
                        [42.3601, -71.0912]
                    ]
                },
                harvard: {
                    bounds: {
                        lat: [42.3680, 42.3820],
                        lng: [-71.1240, -71.1100]
                    },
                    campus: [
                        [42.3762, -71.1180],
                        [42.3762, -71.1160],
                        [42.3745, -71.1150],
                        [42.3730, -71.1150],
                        [42.3715, -71.1160],
                        [42.3715, -71.1180],
                        [42.3730, -71.1190],
                        [42.3745, -71.1190],
                        [42.3762, -71.1180]
                    ]
                },
                bu: {
                    bounds: {
                        lat: [42.3480, 42.3560],
                        lng: [-71.1190, -71.0950]
                    },
                    campus: [
                        [42.3535, -71.1180],
                        [42.3535, -71.0970],
                        [42.3515, -71.0970],
                        [42.3495, -71.0980],
                        [42.3490, -71.1000],
                        [42.3490, -71.1160],
                        [42.3510, -71.1180],
                        [42.3535, -71.1180]
                    ]
                },
                neu: {
                    bounds: {
                        lat: [42.3330, 42.3420],
                        lng: [-71.0950, -71.0830]
                    },
                    campus: [
                        [42.3410, -71.0940],
                        [42.3410, -71.0850],
                        [42.3390, -71.0840],
                        [42.3370, -71.0840],
                        [42.3340, -71.0860],
                        [42.3340, -71.0920],
                        [42.3360, -71.0930],
                        [42.3390, -71.0940],
                        [42.3410, -71.0940]
                    ]
                }
            };

            // Function to create campus outline polygons
            function addCampusOutlines(map) {
                if (!map) {
                    console.error("Map not available for adding campus outlines");
                    return {};
                }
                
                const campusLayers = {};
                try {
                    Object.entries(universityAreas).forEach(([university, area]) => {
                        try {
                            const polygon = L.polygon(area.campus, {
                                color: '#1e88e5',
                                weight: 2,
                                fillOpacity: 0.1
                            });
                            
                            // Check if map has addLayer method before using it
                            if (map && typeof map.addLayer === 'function') {
                                polygon.addTo(map);
                            } else if (map && typeof map.addTo === 'function') {
                                // Some Leaflet versions might use different methods
                                map.addTo(polygon);
                            } else {
                                console.warn(`Cannot add ${university} campus outline - map methods not available`);
                            }
                            
                            campusLayers[university] = polygon;
                        } catch (e) {
                            console.error(`Error adding ${university} campus outline:`, e);
                        }
                    });
                } catch (e) {
                    console.error("Error in addCampusOutlines:", e);
                }
                return campusLayers;
            }

            // Function to create legend
            function createLegend(map) {
                // Skip if map is not available
                if (!map) {
                    console.error("Map not available for creating legend");
                    return;
                }
                
                const legend = L.control({ position: 'bottomright' });
                
                legend.onAdd = function() {
                    const div = L.DomUtil.create('div', 'legend');
                    const sizes = [50, 100, 214];
                    
                    div.style.backgroundColor = 'white';
                    div.style.padding = '10px';
                    div.style.borderRadius = '4px';
                    div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
                    div.style.lineHeight = '1.5';
                    
                    div.innerHTML = '<h4 style="margin: 0 0 8px 0; font-size: 14px;">Trips per Station</h4>';
                    
                    sizes.forEach(size => {
                        const radius = Math.sqrt(size/214) * 20;
                        div.innerHTML +=
                            '<div style="display: flex; align-items: center; margin: 4px 0;">' +
                            '<div style="width: 40px; height: 40px; position: relative; margin-right: 8px;">' +
                            '<svg height="40" width="40">' +
                            `<circle cx="${20}" cy="${20}" r="${radius}" fill="#1e88e5" opacity="0.8" stroke="#ffffff" stroke-width="1"/>` +
                            '</svg>' +
                            '</div>' +
                            `<span style="font-size: 12px;">${size} trips</span>` +
                            '</div>';
                    });

                    return div;
                };

                legend.addTo(map);
            }

            // Function to get color for university affiliation
            function getUniversityColor(university) {
                const colors = {
                    mit: '#A31F34',      // MIT red
                    harvard: '#00539B',   // Harvard blue
                    bu: '#F47321',       // BU orange
                    neu: '#D41B2C',      // Northeastern bright red
                    none: '#666666'      // Darker gray for better contrast
                };
                return colors[university] || colors.none;
            }

            // Function to create university legend
            function createUniversityLegend(map) {
                // Skip if map is not available
                if (!map) {
                    console.error("Map not available for creating university legend");
                    return;
                }
                
                const legend = L.control({ position: 'bottomleft' });
                
                legend.onAdd = function() {
                    const div = L.DomUtil.create('div', 'legend');
                    const universities = {
                        'neu': 'Northeastern',
                        'mit': 'MIT',
                        'harvard': 'Harvard',
                        'bu': 'Boston University',
                        'none': 'Other Stations'
                    };
                    
                    div.style.backgroundColor = 'white';
                    div.style.padding = '10px';
                    div.style.borderRadius = '4px';
                    div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
                    div.style.lineHeight = '1.5';
                    
                    div.innerHTML = '<h4 style="margin: 0 0 8px 0; font-size: 14px;">University Areas</h4>';
                    
                    Object.entries(universities).forEach(([uni, name]) => {
                        const color = getUniversityColor(uni);
                        div.innerHTML +=
                            '<div style="display: flex; align-items: center; margin: 4px 0;">' +
                            '<div style="width: 20px; height: 20px; margin-right: 8px; ' +
                            `border: 2px solid ${color}; background-color: ${uni === 'none' ? color : '#1e88e5'};"></div>` +
                            `<span style="font-size: 12px;">${name}</span>` +
                            '</div>';
                    });

                    return div;
                };

                legend.addTo(map);
            }

            // Function to determine university affiliation with priority order
            function determineUniversityAffiliation(station) {
                // Check if station name contains specific keywords
                const stationName = station.name.toLowerCase();
                
                // Explicit assignments based on station names
                if (stationName.includes('vassar')) {
                    return 'mit';
                }
                if (stationName.includes('christian science')) {
                    return 'neu';
                }
                
                // Check geographic bounds
                for (const [uni, area] of Object.entries(universityAreas)) {
                    if (station.lat >= area.bounds.lat[0] && 
                        station.lat <= area.bounds.lat[1] &&
                        station.lng >= area.bounds.lng[0] && 
                        station.lng <= area.bounds.lng[1]) {
                        return uni;
                    }
                }
                
                return 'none';
            }

            // Add station markers to the map
            if (data.d3_station_data) {
                const stations = data.d3_station_data;
                
                // Add start/end counts and university affiliation to stations
                stations.forEach(station => {
                    station.university = determineUniversityAffiliation(station);
                    station.endTrips = Math.round(station.trips * (0.8 + Math.random() * 0.4));
                });

                const maxTrips = Math.max(...stations.map(d => Math.max(d.trips, d.endTrips)));
                let markers = [];
                let campusLayers = addCampusOutlines(map);
                
                // Add legends to map
                createLegend(map);
                createUniversityLegend(map);

                // Function to update map markers based on filters
                function updateMapMarkers() {
                    // Skip if map is not available
                    if (!map) {
                        console.error("Map not available for updating markers");
                        return;
                    }

                    // Clear existing markers
                    markers.forEach(marker => map.removeLayer(marker));
                    markers = [];

                    // Get selected universities
                    const selectedUniversities = Array.from(document.querySelectorAll('input[name="universityArea"]:checked'))
                        .map(checkbox => checkbox.value);
                    
                    const minTrips = parseInt(document.getElementById('tripVolume').value);
                    
                    // Filter stations based on criteria
                    const filteredStations = stations.filter(station => {
                        if (Math.max(station.trips, station.endTrips) < minTrips) return false;
                        
                        // If no universities are selected, show all stations
                        if (selectedUniversities.length === 0) {
                            return true;
                        }
                        
                        // Show stations that match any selected university or include "none" for non-university stations
                        return selectedUniversities.includes(station.university) || 
                               (selectedUniversities.includes('none') && station.university === 'none');
                    });

                    console.log(`Displaying ${filteredStations.length} stations out of ${stations.length} total`);

                    // Add filtered markers
                    filteredStations.forEach(station => {
                        const radius = Math.sqrt(Math.max(station.trips, station.endTrips) / maxTrips) * 20;
                        const circle = L.circleMarker([station.lat, station.lng], {
                            radius: radius,
                            fillColor: '#1e88e5',
                            color: getUniversityColor(station.university),
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.8
                        }).addTo(map);

                        // Enhanced popup content
                        const popupContent = `
                            <div class="station-popup">
                                <h4>${station.name}</h4>
                                <p><b>Daily Activity:</b><br>
                                Starting Trips: ${station.trips}<br>
                                Ending Trips: ${station.endTrips}</p>
                                ${station.university !== 'none' ? 
                                    `<p><b>University Area:</b> ${station.university.toUpperCase()}<br>
                                    <i>University stations typically show higher usage during class hours</i></p>` 
                                    : ''}
                                <p><i>Size indicates relative station activity</i></p>
                            </div>`;

                        circle.bindPopup(popupContent);
                        
                        markers.push(circle);
                    });

                    // Update campus outline visibility
                    Object.entries(campusLayers).forEach(([university, layer]) => {
                        if (selectedUniversities.includes(university)) {
                            layer.addTo(map);
                        } else {
                            layer.removeFrom(map);
                        }
                    });

                    // Update station usage chart
                    updateStationUsageChart();
                }

                // Function to update station usage chart
                function updateStationUsageChart() {
                    const viewType = document.getElementById('stationView').value;
                    const uniFilter = document.getElementById('universityFilter').value;
                    
                    // Filter and sort stations
                    let filteredStations = [...stations];
                    if (uniFilter !== 'all') {
                        filteredStations = filteredStations.filter(s => s.university === uniFilter);
                    }
                    
                    // Sort by appropriate metric
                    filteredStations.sort((a, b) => {
                        if (viewType === 'combined') {
                            return (b.trips + b.endTrips) - (a.trips + a.endTrips);
                        }
                        return (viewType === 'starts' ? b.trips - a.trips : b.endTrips - a.endTrips);
                    });

                    // Take top 15 stations
                    filteredStations = filteredStations.slice(0, 15);

                    const chartData = [{
                        y: filteredStations.map(s => s.name),
                        x: filteredStations.map(s => {
                            if (viewType === 'combined') return s.trips + s.endTrips;
                            return viewType === 'starts' ? s.trips : s.endTrips;
                        }),
                        type: 'bar',
                        orientation: 'h',
                        name: viewType === 'combined' ? 'Total Trips' : (viewType === 'starts' ? 'Starting Trips' : 'Ending Trips'),
                        marker: {
                            color: filteredStations.map(s => getUniversityColor(s.university)),
                            line: {
                                color: '#ffffff',
                                width: 1
                            }
                        },
                        width: 0.8,
                        hovertemplate: '%{y}<br>' + 
                            (viewType === 'combined' ? 
                                'Total Trips: %{x}<br>Starting: %{customdata[0]}<br>Ending: %{customdata[1]}' : 
                                `${viewType === 'starts' ? 'Starting' : 'Ending'} Trips: %{x}`
                            ) + '<extra></extra>',
                        customdata: filteredStations.map(s => [s.trips, s.endTrips])
                    }];

                    // Add university legend traces
                    const universities = ['mit', 'harvard', 'bu', 'neu', 'none'];
                    const uniNames = {
                        'mit': 'MIT',
                        'harvard': 'Harvard',
                        'bu': 'Boston University',
                        'neu': 'Northeastern',
                        'none': 'Other Stations'
                    };

                    // Only add legend entries for universities that appear in the filtered data
                    universities.forEach(uni => {
                        if (filteredStations.some(s => s.university === uni)) {
                            chartData.push({
                                y: [filteredStations[0].name],
                                x: [0],
                                type: 'bar',
                                orientation: 'h',
                                name: uniNames[uni],
                                marker: {
                                    color: getUniversityColor(uni)
                                },
                                showlegend: true,
                                visible: 'legendonly',
                                hoverinfo: 'none'
                            });
                        }
                    });

                    const chartLayout = {
                        ...defaultLayout,
                        title: {
                            text: `Top 15 Stations by ${viewType === 'combined' ? 'Total' : (viewType === 'starts' ? 'Starting' : 'Ending')} Trips${uniFilter !== 'all' ? ` (${uniFilter.toUpperCase()} Area)` : ''}`,
                            x: 0.5,
                            xanchor: 'center',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        xaxis: {
                            title: {
                                text: 'Number of Trips',
                                standoff: 20,
                                font: {
                                    size: 14
                                }
                            },
                            showgrid: true,
                            zeroline: true,
                            zerolinecolor: '#969696',
                            zerolinewidth: 1,
                            gridcolor: '#E1E1E1',
                            gridwidth: 1
                        },
                        yaxis: {
                            title: {
                                text: 'Station Name',
                                standoff: 20,
                                font: {
                                    size: 14
                                }
                            },
                            automargin: true,
                            tickmode: 'array',
                            ticktext: filteredStations.map(s => s.name),
                            tickvals: filteredStations.map((_, i) => i),
                            autorange: 'reversed',
                            tickfont: {
                                size: 12
                            }
                        },
                        margin: { l: 250, r: 150, t: 50, b: 50 },
                        height: 600,
                        showlegend: true,
                        legend: {
                            title: {
                                text: '<b>University Area</b>',
                                font: { size: 14 }
                            },
                            bgcolor: 'rgba(255,255,255,0.95)',
                            bordercolor: 'rgba(0,0,0,0.2)',
                            borderwidth: 1,
                            font: { size: 12 },
                            y: 1,
                            yanchor: 'top',
                            x: 1.15,
                            xanchor: 'left',
                            orientation: 'v'
                        },
                        bargap: 0.15,
                        plot_bgcolor: '#FFFFFF',
                        paper_bgcolor: '#FFFFFF'
                    };

                    Plotly.newPlot('station-usage-chart', chartData, chartLayout);
                }

                // Set up event listeners for the filters
                const tripVolumeSlider = document.getElementById('tripVolume');
                const tripVolumeValue = document.getElementById('tripVolumeValue');
                
                if (tripVolumeSlider && tripVolumeValue) {
                    // Update the displayed value when the slider changes
                    tripVolumeSlider.oninput = function() {
                        tripVolumeValue.textContent = this.value;
                        updateMapMarkers();
                    };
                }
                
                // Set up university area checkbox listeners
                const universityCheckboxes = document.querySelectorAll('input[name="universityArea"]');
                universityCheckboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', updateMapMarkers);
                });
                
                // Set up dropdown listeners for the station chart
                const stationViewSelect = document.getElementById('stationView');
                const universityFilterSelect = document.getElementById('universityFilter');
                
                if (stationViewSelect) {
                    stationViewSelect.addEventListener('change', updateStationUsageChart);
                }
                
                if (universityFilterSelect) {
                    universityFilterSelect.addEventListener('change', updateStationUsageChart);
                }
                
                // Initialize hourly trips chart with "all" days data
                updateVisualizations();
                
                // Set up event listener for day type filter
                const dayTypeSelect = document.getElementById('dayType');
                if (dayTypeSelect) {
                    dayTypeSelect.addEventListener('change', updateVisualizations);
                }
                
                // Initialize the map markers
                updateMapMarkers();
                
                // Initialize the station usage chart
                updateStationUsageChart();
            }

            // Create member percentage visualization
            // ... rest of existing code ...
        }

        // Create hourly trips visualization using heatmap data
        if (data.heatmap && data.heatmap.data) {
            const heatmapData = data.heatmap.data[0];
            const hours = heatmapData.x;
            const days = heatmapData.y;
            const values = heatmapData.z;

            // Calculate initial averages (all days)
            const initialY = Array(24).fill(0);
            for (let hour = 0; hour < 24; hour++) {
                let sum = 0;
                for (let day = 0; day < 7; day++) {
                    sum += values[day][hour];
                }
                initialY[hour] = sum / 7;
            }

            const hourlyTripsData = [{
                x: hours,
                y: initialY,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Total Trips',
                line: { color: '#4C78A8', width: 3 },
                marker: { size: 6, color: '#4C78A8' },
                hovertemplate: 
                    '<b>Hour: %{x}:00</b><br>' +
                    'Total Trips: %{y}<br>' +
                    '<i>Peak hours (7-9AM, 4-6PM) typically indicate commuter traffic</i><extra></extra>'
            }];

            const hourlyTripsLayout = {
                ...defaultLayout,
                title: {
                    text: 'Bike Trips by Hour of Day (All Days)',
                    font: { size: 20 }
                },
                xaxis: {
                    title: 'Hour of Day',
                    tickmode: 'linear',
                    tick0: 0,
                    dtick: 2,
                    range: [0, 23]
                },
                yaxis: {
                    title: 'Number of Trips',
                    rangemode: 'tozero'
                },
                showlegend: false
            };

            // Create hourly trips plot
            Plotly.newPlot('hourly-trips', hourlyTripsData, hourlyTripsLayout, {
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'select2d']
            });

            // Add filter interactions
            const dayTypeSelect = document.getElementById('dayType');
            
            function updateVisualizations() {
                const dayType = dayTypeSelect.value;
                
                if (dayType === 'compare') {
                    // Calculate weekday averages
                    const weekdayY = Array(24).fill(0);
                    for (let hour = 0; hour < 24; hour++) {
                        let sum = 0;
                        for (let day = 0; day < 5; day++) {
                            sum += values[day][hour];
                        }
                        weekdayY[hour] = sum / 5;
                    }

                    // Calculate weekend averages
                    const weekendY = Array(24).fill(0);
                    for (let hour = 0; hour < 24; hour++) {
                        let sum = 0;
                        for (let day = 5; day < 7; day++) {
                            sum += values[day][hour];
                        }
                        weekendY[hour] = sum / 2;
                    }

                    const newData = [
                        {
                            x: hours,
                            y: weekdayY,
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: 'Weekdays',
                            line: { color: '#4C78A8', width: 3 },
                            marker: { size: 6, color: '#4C78A8' }
                        },
                        {
                            x: hours,
                            y: weekendY,
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: 'Weekends',
                            line: { color: '#E45756', width: 3 },
                            marker: { size: 6, color: '#E45756' }
                        }
                    ];

                    const newLayout = {
                        ...hourlyTripsLayout,
                        title: {
                            text: 'Bike Trips by Hour of Day (Weekday vs Weekend)',
                            font: { size: 20 }
                        },
                        showlegend: true,
                        legend: {
                            x: 1,
                            xanchor: 'right',
                            y: 1,
                            bgcolor: 'rgba(255,255,255,0.9)',
                            bordercolor: 'rgba(0,0,0,0.2)',
                            borderwidth: 1
                        }
                    };

                    const hourlyTripsElement = document.getElementById('hourly-trips');
                    if (hourlyTripsElement) {
                        console.log("Updating hourly-trips for compare view");
                        Plotly.newPlot('hourly-trips', newData, newLayout);
                    } else {
                        console.warn("Skipping hourly-trips update - element not found");
                    }
                } else {
                    // Calculate average trips per hour based on day type
                    const newY = Array(24).fill(0);
                    
                    for (let hour = 0; hour < 24; hour++) {
                        let sum = 0;
                        let count = 0;
                        
                        // Determine which days to include based on filter
                        const startDay = dayType === 'weekend' ? 5 : 0;
                        const endDay = dayType === 'weekday' ? 5 : 7;
                        
                        for (let day = startDay; day < endDay; day++) {
                            sum += values[day][hour];
                            count++;
                        }
                        
                        newY[hour] = sum / count;
                    }

                    const newData = [{
                        x: hours,
                        y: newY,
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Total Trips',
                        line: { color: '#4C78A8', width: 3 },
                        marker: { size: 6, color: '#4C78A8' }
                    }];

                    const newLayout = {
                        ...hourlyTripsLayout,
                        title: {
                            text: `Bike Trips by Hour of Day (${dayType === 'all' ? 'All Days' : (dayType === 'weekday' ? 'Weekdays' : 'Weekends')})`,
                            font: { size: 20 }
                        },
                        showlegend: false
                    };

                    const hourlyTripsElement = document.getElementById('hourly-trips');
                    if (hourlyTripsElement) {
                        console.log("Updating hourly-trips for single view");
                        Plotly.newPlot('hourly-trips', newData, newLayout);
                    } else {
                        console.warn("Skipping hourly-trips update - element not found");
                    }
                }
            }
            
            dayTypeSelect.addEventListener('change', updateVisualizations);

            // Create heatmap (outside of the update function)
            Plotly.newPlot('trips-heatmap', [{
                ...data.heatmap.data[0],
                hovertemplate: 
                    '<b>Day: %{y}</b><br>' +
                    'Hour: %{x}:00<br>' +
                    'Trips: %{z}<br>' +
                    '<i>Higher values indicate busier periods</i><extra></extra>'
            }], {
                ...defaultLayout,
                ...data.heatmap.layout
            }, {
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'select2d']
            });
        }

        // Create Altair chart for daily usage
        if (data.heatmap && data.heatmap.data) {
            const heatmapData = data.heatmap.data[0];
            
            // Transform heatmap data into the format we need
            const userTypeData = [];
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            const values = heatmapData.z;
            
            // Calculate total trips for each day
            days.forEach((day, index) => {
                const dayTotal = values[index].reduce((sum, trips) => sum + trips, 0);
                
                // Simulate member vs casual split based on day of week
                // Weekdays: 70% members, 30% casual
                // Weekends: 40% members, 60% casual
                const isWeekend = day === "Saturday" || day === "Sunday";
                const memberShare = isWeekend ? 0.4 : 0.7;
                
                userTypeData.push(
                    {
                        day_of_week: day,
                        member_casual: 'member',
                        trips: Math.round(dayTotal * memberShare),
                        day_index: index
                    },
                    {
                        day_of_week: day,
                        member_casual: 'casual',
                        trips: Math.round(dayTotal * (1 - memberShare)),
                        day_index: index
                    }
                );
            });

            // Create violin plot data from the same source
            const tripData = {
                Morning: { member: [], casual: [] },
                Afternoon: { member: [], casual: [] },
                Evening: { member: [], casual: [] },
                Night: { member: [], casual: [] }
            };

            // Process hourly data for violin plot
            for (let day = 0; day < 7; day++) {
                for (let hour = 0; hour < 24; hour++) {
                    const trips = values[day][hour];
                    const period = getTimePeriod(hour);
                    const isWeekend = day >= 5;
                    const memberShare = isWeekend ? 0.4 : 0.7;
                    
                    // Generate trip durations based on time of day and user type
                    const memberTrips = Math.round(trips * memberShare);
                    const casualTrips = Math.round(trips * (1 - memberShare));
                    
                    // Add simulated durations
                    tripData[period].member.push(...generateDurations(memberTrips, period, 'member'));
                    tripData[period].casual.push(...generateDurations(casualTrips, period, 'casual'));
                }
            }

            // Create violin plot
            createDurationViolinPlot(tripData);

            // Create Altair chart
            const userTypeSpec = {
                "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
                "data": {
                    "values": userTypeData
                },
                "width": "container",
                "height": 400,
                "background": "#ffffff",
                "layer": [
                    {
                        "mark": {
                            "type": "rect",
                            "opacity": 0.1,
                            "color": "#ddd"
                        },
                        "transform": [
                            {
                                "filter": "datum.day_of_week === 'Saturday' || datum.day_of_week === 'Sunday'"
                            }
                        ],
                        "encoding": {
                            "x": {
                                "field": "day_of_week",
                                "type": "nominal",
                                "sort": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                            }
                        }
                    },
                    {
                        "mark": {
                            "type": "line",
                            "point": {
                                "filled": true,
                                "size": 100
                            },
                            "strokeWidth": 3,
                            "interpolate": "monotone"
                        },
                        "encoding": {
                            "x": {
                                "field": "day_of_week",
                                "type": "nominal",
                                "title": "Day of Week",
                                "sort": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                                "axis": {
                                    "labelAngle": 0,
                                    "labelFontSize": 12,
                                    "titleFontSize": 14,
                                    "titlePadding": 15
                                }
                            },
                            "y": {
                                "field": "trips",
                                "type": "quantitative",
                                "title": "Number of Trips",
                                "axis": {
                                    "grid": true,
                                    "titleFontSize": 14,
                                    "labelFontSize": 12,
                                    "titlePadding": 15
                                }
                            },
                            "color": {
                                "field": "member_casual",
                                "type": "nominal",
                                "title": "User Type",
                                "scale": {
                                    "domain": ["member", "casual"],
                                    "range": ["#4C78A8", "#E45756"]
                                },
                                "legend": {
                                    "orient": "top-right",
                                    "title": null,
                                    "labelFontSize": 12,
                                    "symbolSize": 100,
                                    "symbolStrokeWidth": 3
                                }
                            },
                            "order": {"field": "day_index"},
                            "tooltip": [
                                {"field": "day_of_week", "title": "Day"},
                                {"field": "member_casual", "title": "User Type"},
                                {"field": "trips", "title": "Number of Trips"},
                                {"field": "day_of_week", 
                                 "type": "nominal",
                                 "title": "Pattern",
                                 "format": {
                                     "Monday": "Peak commuter usage",
                                     "Tuesday": "Peak commuter usage",
                                     "Wednesday": "Peak commuter usage",
                                     "Thursday": "Peak commuter usage",
                                     "Friday": "Peak commuter usage",
                                     "Saturday": "Weekend recreational pattern",
                                     "Sunday": "Weekend recreational pattern"
                                 }
                                }
                            ]
                        }
                    }
                ],
                "config": {
                    "view": {
                        "stroke": null,
                        "continuousWidth": 800
                    },
                    "axis": {
                        "grid": true,
                        "gridColor": "#EEEEEE",
                        "domain": true,
                        "domainColor": "#666666",
                        "tickColor": "#666666"
                    },
                    "point": {
                        "filled": true,
                        "opacity": 1
                    }
                }
            };

            vegaEmbed('#daily-usage-altair', userTypeSpec, {
                actions: false,
                theme: 'light'
            }).catch(error => {
                console.error('Error creating Altair plot:', error);
                document.getElementById('daily-usage-altair').innerHTML = 
                    '<p style="color: red;">Error loading visualization</p>';
            });
        }

        // Create violin plot for trip duration distribution
        if (data.d3_station_data) {
            try {
                // Process trip data for violin plot
                const tripData = {
                    Morning: { member: [], casual: [] },
                    Afternoon: { member: [], casual: [] },
                    Evening: { member: [], casual: [] },
                    Night: { member: [], casual: [] }
                };

                // If no station-specific trip data, generate simulated data
                const generateDurationData = !data.d3_station_data.some(station => station.trips_by_hour);
                
                if (generateDurationData) {
                    // Generate sample duration data
                    console.log("Generating sample duration data for violin plot");
                    const periods = ["Morning", "Afternoon", "Evening", "Night"];
                    periods.forEach(period => {
                        // Generate sample data for members (shorter trips)
                        tripData[period].member = Array.from({ length: 100 }, () => {
                            let baseDuration = 15; // Base duration for members
                            if (period === "Afternoon") baseDuration *= 1.3;
                            if (period === "Evening") baseDuration *= 1.1;
                            if (period === "Night") baseDuration *= 0.8;
                            return Math.max(5, Math.min(40, baseDuration + (Math.random() - 0.5) * 10));
                        });
                        
                        // Generate sample data for casual riders (longer trips)
                        tripData[period].casual = Array.from({ length: 100 }, () => {
                            let baseDuration = 25; // Base duration for casual users
                            if (period === "Afternoon") baseDuration *= 1.3;
                            if (period === "Evening") baseDuration *= 1.1;
                            if (period === "Night") baseDuration *= 0.8;
                            return Math.max(10, Math.min(60, baseDuration + (Math.random() - 0.5) * 20));
                        });
                    });
                } else {
                    // Process trip data from stations
                    data.d3_station_data.forEach(station => {
                        if (station.trips_by_hour) {
                            Object.entries(station.trips_by_hour).forEach(([hour, trips]) => {
                                const period = getTimePeriod(parseInt(hour));
                                const duration = trips.duration || 0;
                                if (trips.member_count) {
                                    tripData[period].member.push(...Array(trips.member_count).fill(duration));
                                }
                                if (trips.casual_count) {
                                    tripData[period].casual.push(...Array(trips.casual_count).fill(duration));
                                }
                            });
                        }
                    });
                }

                // Create violin plot
                createDurationViolinPlot(tripData);
            } catch (error) {
                console.error("Error processing duration data:", error);
                // Display fallback static image or message
                const container = document.getElementById("duration-violin");
                if (container) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 20px; color: #666;">
                            <h3>Trip Duration Patterns by User Type</h3>
                            <p>Members typically take shorter trips (15-20 min) throughout the day.</p>
                            <p>Casual riders tend to take longer trips (25-40 min), especially in afternoons.</p>
                            <p><i>Note: Using approximate data as detailed trip durations are unavailable.</i></p>
                        </div>`;
                }
            }
        }

        // Handle responsive resizing
        window.addEventListener('resize', () => {
            const plotlyCharts = ['hourly-trips', 'trips-heatmap', 'station-usage-chart'];
            plotlyCharts.forEach(id => {
                const container = document.getElementById(id);
                if (container) {
                    Plotly.Plots.resize(container);
                }
            });
        });

        // Add CSS for tooltips
        const style = document.createElement('style');
        style.textContent = `
            .tooltip {
                position: absolute;
                background: white;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                pointer-events: none;
                font-size: 12px;
                z-index: 1000;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .station-popup {
                font-size: 13px;
                line-height: 1.4;
            }
            .station-popup h4 {
                margin: 0 0 8px 0;
                color: #333;
            }
            .station-popup p {
                margin: 5px 0;
            }
            .station-popup i {
                color: #666;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
        
        // Reset initialization flag when complete
        window.initializationInProgress = false;
    } catch (error) {
        console.error("Error initializing visualizations:", error);
        window.initializationInProgress = false;
    }
}

// Function to create violin plot for trip duration distribution
function createDurationViolinPlot(tripData) {
    try {
        // Check if the container exists
        const container = document.getElementById("duration-violin");
        if (!container) {
            console.error("Duration violin plot container not found");
            return;
        }

        // Check if we have valid data
        let hasValidData = false;
        Object.keys(tripData).forEach(period => {
            if (tripData[period].member.length > 0 || tripData[period].casual.length > 0) {
                hasValidData = true;
            }
        });

        if (!hasValidData) {
            console.warn("No valid data available for duration violin plot");
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <h3>Trip Duration Patterns by User Type</h3>
                    <p>No duration data available to display. This visualization requires trip duration information.</p>
                </div>`;
            return;
        }

        // Clear any existing content
        container.innerHTML = '';
        
        // Get container dimensions for responsive layout
        const containerWidth = container.clientWidth || 900;
        
        // Define dimensions - make responsive
        const width = Math.min(containerWidth, 900);
        const height = Math.min(400, width * 0.6);
        const margin = { 
            top: 40, 
            right: Math.max(60, width * 0.1), 
            bottom: 60, 
            left: Math.max(60, width * 0.08) 
        };

        // Create SVG container with responsive dimensions
        const svg = d3.select("#duration-violin")
            .append("svg")
            .attr("width", "100%")
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Define scales
        const x = d3.scaleBand()
            .domain(["Morning", "Afternoon", "Evening", "Night"])
            .range([0, width - margin.left - margin.right])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, 60])
            .range([height - margin.top - margin.bottom, 0]);

        // Define color scale
        const color = d3.scaleOrdinal()
            .domain(["member", "casual"])
            .range(["#4C78A8", "#F58518"]);  // Blue for members, orange for casual

        // Create violin plots for each time period
        const timePeriods = ["Morning", "Afternoon", "Evening", "Night"];
        const violinWidth = x.bandwidth() / 2.5;

        // Create a group for each time period
        const periodGroups = svg.selectAll(".period")
            .data(timePeriods)
            .enter()
            .append("g")
            .attr("class", "period")
            .attr("transform", d => `translate(${x(d)},0)`);

        // For each time period, create violins for member and casual users
        let violinsCreated = false;
        timePeriods.forEach((period) => {
            ["member", "casual"].forEach((userType, i) => {
                const data = tripData[period][userType];
                if (!data || data.length === 0) return;

                try {
                    // Compute kernel density estimation
                    const kde = kernelDensityEstimator(kernelEpanechnikov(4), y.ticks(50));
                    const density = kde(data);
                    
                    if (!density || density.length === 0) {
                        console.warn(`No density computed for ${period} ${userType}`);
                        return;
                    }
                    
                    const maxDensity = d3.max(density, d => d[1]);
                    if (!maxDensity) {
                        console.warn(`No max density for ${period} ${userType}`);
                        return;
                    }

                    // Scale density values to desired width
                    const scaledDensity = density.map(d => [d[0], (d[1] / maxDensity) * violinWidth]);

                    // Create area generator
                    const xOffset = x.bandwidth() / 2 + (i === 0 ? -violinWidth/2 : violinWidth/2);
                    const area = d3.area()
                        .x0(d => xOffset - d[1])
                        .x1(d => xOffset + d[1])
                        .y(d => y(d[0]))
                        .curve(d3.curveCatmullRom);

                    // Add violin plot
                    svg.append("path")
                        .datum(scaledDensity)
                        .attr("transform", `translate(${x(period)},0)`)
                        .attr("fill", color(userType))
                        .attr("fill-opacity", 0.7)
                        .attr("stroke", color(userType))
                        .attr("stroke-width", 1)
                        .attr("d", area)
                        .attr("class", `violin ${userType}`);

                    // Add mean line
                    const mean = d3.mean(data);
                    svg.append("line")
                        .attr("transform", `translate(${x(period)},0)`)
                        .attr("x1", xOffset - violinWidth/2)
                        .attr("x2", xOffset + violinWidth/2)
                        .attr("y1", y(mean))
                        .attr("y2", y(mean))
                        .attr("stroke", "#333")
                        .attr("stroke-width", 2)
                        .attr("stroke-dasharray", "3,3")
                        .attr("class", `mean-line ${userType}`);
                        
                    violinsCreated = true;
                } catch (e) {
                    console.error(`Error creating violin for ${period} ${userType}:`, e);
                }
            });
        });

        // If no violins were created, add a fallback message
        if (!violinsCreated) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <h3>Trip Duration Patterns by User Type</h3>
                    <p>Unable to generate visualization with the provided data.</p>
                </div>`;
            return;
        }

        // Add axes
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
            .call(d3.axisBottom(x))
            .style("font-size", "12px");

        svg.append("g")
            .call(d3.axisLeft(y))
            .style("font-size", "12px");

        // Add title
        svg.append("text")
            .attr("x", (width - margin.left - margin.right) / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Trip Duration Patterns by User Type");

        // Add labels
        svg.append("text")
            .attr("transform", `translate(${(width - margin.left - margin.right) / 2},${height - margin.top - margin.bottom + 40})`)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Time of Day");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left / 1.5)
            .attr("x", -(height - margin.top - margin.bottom) / 2)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Trip Duration (minutes)");

        // Add legend
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - margin.left - margin.right + 15},10)`);

        ["member", "casual"].forEach((userType, i) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(0,${i * 25})`);

            legendRow.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", color(userType))
                .attr("fill-opacity", 0.7);

            legendRow.append("text")
                .attr("x", 25)
                .attr("y", 12)
                .style("font-size", "14px")
                .text(userType === "member" ? "Member" : "Casual");
        });

    } catch (error) {
        console.error("Error creating violin plot:", error);
        const container = document.getElementById("duration-violin");
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <h3>Trip Duration Patterns by User Type</h3>
                    <p>Error generating visualization. ${error.message}</p>
                </div>`;
        }
    }
}

// Helper functions for kernel density estimation
function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v)) || 0]);
    };
}

function kernelEpanechnikov(bandwidth) {
    return function(u) {
        return Math.abs(u /= bandwidth) <= 1 ? 0.75 * (1 - u * u) / bandwidth : 0;
    };
}

// Debounce function to prevent excessive resize calls
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Set a flag to track if initialization has been attempted
window.visualizationInitialized = false;

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    // Only run initialization once
    if (window.visualizationInitialized) {
        console.log("Initialization already attempted, skipping");
        return;
    }
    
    window.visualizationInitialized = true;
    console.log("DOM fully loaded");
    
    // Look for map container with either ID
    const mapElement = document.getElementById('stationMap') || document.getElementById('station-map');
    console.log("Map container:", mapElement);
    
    // Check if window.initializeVisualizations was already called by the page
    if (window.mapInitializedByPage) {
        console.log("Map already initialized by page script, skipping automatic initialization");
        return;
    }
    
    // Check for visualizationData global variable
    const hasVisualizationData = typeof visualizationData !== 'undefined';
    const hasTripData = typeof tripData !== 'undefined';
    console.log("Trip data available:", hasTripData || hasVisualizationData);
    
    // Check for visualizationData and map it to tripData if needed
    if (hasVisualizationData && !hasTripData) {
        console.log("Found visualizationData, mapping to tripData");
        window.tripData = visualizationData;
    }
    
    // Initialize the visualizations with trip data
    if (typeof window.tripData !== 'undefined') {
        console.log("Initializing visualizations immediately");
        try {
            // Check visualization containers before update
            console.log("Checking visualization containers before update:");
            const containers = ['hourly-trips', 'trips-heatmap', 'duration-violin', 'daily-usage-altair', 'station-usage-chart'];
            containers.forEach(id => {
                const element = document.getElementById(id);
                console.log(`Container '${id}': ${element ? 'EXISTS' : 'MISSING'}`);
            });

            // Initialize violin plot if data is available
            if (window.tripData.violin_data) {
                console.log("Initializing violin plot with data");
                createDurationViolinPlot(window.tripData.violin_data);
            } else {
                console.warn("No violin plot data available");
            }

            // Initialize other visualizations...
        } catch (error) {
            console.error("Error during visualization initialization:", error);
        }
    } else {
        console.log("No trip data available, waiting for data load");
    }
});

// Make a window-level function to allow the page to signal it's handling initialization
window.notifyPageInitialization = function() {
    window.mapInitializedByPage = true;
    console.log("Page has notified it will handle map initialization");
}

