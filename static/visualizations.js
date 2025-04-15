// Global flag to track initialization state
let isInitialized = false;

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
        center: [42.3405, -71.0867],  // Adjusted to center of Northeastern campus
        radius: 1.5  // Increased radius to capture more surrounding stations
    }
};

// Define university colors
const universityColors = {
    mit: '#8A8B8C',       // MIT's secondary gray
    harvard: '#1E1B84',   // Harvard's secondary blue
    bu: '#000000',        // BU Black
    northeastern: '#D41B2C', // Northeastern Red (keeping this one)
    none: '#6BAED6'       // Light blue for other stations
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
            return univ;
        }
    }
    return 'none';
}

// Function to load visualization data
async function loadVisualizationData() {
    try {
        // Get the base URL for the current environment
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? '' 
            : window.location.pathname.replace(/\/+$/, '');
        
        // Load the data from the static files using relative paths
        const [stationsData, durationsData, hourlyData, dailyData] = await Promise.all([
            fetch(`${baseUrl}/static/stations.json`).then(res => res.json()),
            fetch(`${baseUrl}/static/durations.json`).then(res => res.json()),
            fetch(`${baseUrl}/static/hourly_usage.json`).then(res => res.json()),
            fetch(`${baseUrl}/static/daily_usage.json`).then(res => res.json())
        ]);

        const data = {
            stations: visualizationData.station_data,
            durations: durationsData,
            hourlyUsage: hourlyData,
            dailyUsage: visualizationData.daily_usage.data[0].y.map((count, index) => ({
                member_casual: 'member',
                day: visualizationData.daily_usage.data[0].x[index],
                count: count
            }))
        };

        console.log('Loaded visualization data:', data);
        return data;
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
    const originalHeatmapData = visualizationData.heatmap.data[0];
    
    // Function to update the heatmap based on selected view
    function updateHeatmap(view) {
        let filteredData = { ...originalHeatmapData };
        
        switch(view) {
            case 'weekdays':
                // Filter for weekdays (Monday to Friday)
                filteredData.y = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                filteredData.z = originalHeatmapData.z.slice(0, 5);
                break;
            case 'weekends':
                // Filter for weekends (Saturday and Sunday)
                filteredData.y = ['Saturday', 'Sunday'];
                filteredData.z = originalHeatmapData.z.slice(5);
                break;
            case 'averaged':
                // Calculate average for weekdays and weekends
                const weekdayData = originalHeatmapData.z.slice(0, 5);
                const weekendData = originalHeatmapData.z.slice(5);
                
                // Calculate average for each hour across weekdays
                const avgWeekday = weekdayData[0].map((_, hourIndex) => {
                    const sum = weekdayData.reduce((acc, day) => acc + day[hourIndex], 0);
                    return Math.round(sum / 5); // Average across 5 weekdays
                });
                
                // Calculate average for each hour across weekends
                const avgWeekend = weekendData[0].map((_, hourIndex) => {
                    const sum = weekendData.reduce((acc, day) => acc + day[hourIndex], 0);
                    return Math.round(sum / 2); // Average across 2 weekend days
                });
                
                // Create new heatmap data with averaged values
                filteredData = {
                    ...originalHeatmapData,
                    y: ['Weekday Average', 'Weekend Average'],
                    z: [avgWeekday, avgWeekend],
                    colorscale: 'Viridis',
                    hovertemplate: 'Hour: %{x}<br>Day Type: %{y}<br>Average Trips: %{z}<extra></extra>'
                };
                break;
            case 'member_casual':
                // Create two heatmaps side by side for member vs casual
                const memberData = { ...originalHeatmapData };
                const casualData = { ...originalHeatmapData };
                
                // Update titles and colors
                memberData.name = 'Member Riders';
                casualData.name = 'Casual Riders';
                memberData.colorscale = 'Blues';
                casualData.colorscale = 'Reds';
                
                // Create a subplot layout
                const subplotLayout = {
                    title: 'Weekly Trip Patterns by Hour (Member vs Casual)',
                    grid: { rows: 1, columns: 2, pattern: 'independent' },
                    showlegend: true
                };
                
                // Add individual layouts for each subplot
                memberData.xaxis = 'x1';
                memberData.yaxis = 'y1';
                casualData.xaxis = 'x2';
                casualData.yaxis = 'y2';
                
                Plotly.newPlot('trips-heatmap', [memberData, casualData], subplotLayout);
                return;
            default:
                // 'all' view - use original data
                break;
        }

        const layout = {
            title: view === 'all' ? 'Weekly Trip Patterns by Hour' : 
                   view === 'weekdays' ? 'Weekday Trip Patterns by Hour' :
                   view === 'weekends' ? 'Weekend Trip Patterns by Hour' :
                   'Average Trip Patterns by Day Type',
            xaxis: {
                title: 'Hour of Day',
                tickmode: 'linear',
                tick0: 0,
                dtick: 1,
                range: [0, 23]
            },
            yaxis: {
                title: view === 'averaged' ? 'Day Type' : 'Day of Week',
                tickangle: 0,
                range: [-0.5, filteredData.y.length - 0.5]
            },
            margin: {
                b: 50,
                t: 50,
                l: 100,
                r: 50
            },
            coloraxis: {
                colorscale: 'Viridis',
                colorbar: {
                    title: 'Number of Trips',
                    len: 0.8
                }
            },
            showlegend: true,
            legend: {
                x: 1,
                xanchor: 'right',
                y: 1
            }
        };

        Plotly.newPlot('trips-heatmap', [filteredData], layout);
    }

    // Add event listeners for radio buttons
    const radioButtons = document.querySelectorAll('input[name="heatmapView"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateHeatmap(e.target.value);
        });
    });

    // Initialize with default view
    updateHeatmap('all');
}

// Function to create the daily usage visualization
function createDailyUsage(data) {
    const container = document.getElementById('daily-usage-altair');
    if (!container) {
        console.error('Daily usage container not found');
        return;
    }

    // Get the base URL for the current environment
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? '' 
        : window.location.pathname.replace(/\/+$/, '');

    // Load the static Altair spec and data
    fetch(`${baseUrl}/static/daily_usage.json`)
        .then(response => response.json())
        .then(chartData => {
            // Update the spec with the actual data
            const spec = chartData.spec;
            spec.data.values = chartData.data;

            // Render the chart using Vega-Embed
            vegaEmbed('#daily-usage-altair', spec, {
                actions: false,
                theme: 'light',
                renderer: 'svg'
            }).catch(console.error);
        })
        .catch(error => {
            console.error('Error loading daily usage data:', error);
        });
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

    // Get the selected view type
    const viewType = document.getElementById('viewType').value;

    let traces = [];
    let title = '';

    switch(viewType) {
        case 'weekday_weekend':
            // Combine member and casual for each day type
            const weekdayTotal = memberWeekday.map((d, i) => ({
                hour: d.hour,
                count: d.count + (casualWeekday[i] ? casualWeekday[i].count : 0)
            }));
            const weekendTotal = memberWeekend.map((d, i) => ({
                hour: d.hour,
                count: d.count + (casualWeekend[i] ? casualWeekend[i].count : 0)
            }));
            
            traces = [
                {
                    x: weekdayTotal.map(d => d.hour),
                    y: weekdayTotal.map(d => d.count),
                    name: 'Weekday',
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: { color: 'blue' },
                    marker: { color: 'blue' }
                },
                {
                    x: weekendTotal.map(d => d.hour),
                    y: weekendTotal.map(d => d.count),
                    name: 'Weekend',
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: { color: 'red' },
                    marker: { color: 'red' }
                }
            ];
            title = 'Hourly Trips by Day Type';
            break;

        case 'member_casual':
            // Combine weekday and weekend for each user type
            const memberTotal = memberWeekday.map((d, i) => ({
                hour: d.hour,
                count: d.count + (memberWeekend[i] ? memberWeekend[i].count : 0)
            }));
            const casualTotal = casualWeekday.map((d, i) => ({
                hour: d.hour,
                count: d.count + (casualWeekend[i] ? casualWeekend[i].count : 0)
            }));
            
            traces = [
                {
                    x: memberTotal.map(d => d.hour),
                    y: memberTotal.map(d => d.count),
                    name: 'Member',
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: { color: 'blue' },
                    marker: { color: 'blue' }
                },
                {
                    x: casualTotal.map(d => d.hour),
                    y: casualTotal.map(d => d.count),
                    name: 'Casual',
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: { color: 'red' },
                    marker: { color: 'red' }
                }
            ];
            title = 'Hourly Trips by User Type';
            break;

        case 'all_types':
        default:
            traces = [
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
            title = 'Hourly Trips by User Type and Day Type';
            break;
    }

    const layout = {
        title: title,
        xaxis: { 
            title: 'Hour of Day',
            range: [0, 23]  // Focus on the 24 hours
        },
        yaxis: { 
            title: 'Number of Trips',
            range: [0, Math.max(
                ...traces.flatMap(trace => trace.y)
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

    // Create filter controls
    const filterContainer = document.createElement('div');
    filterContainer.className = 'duration-filters';
    filterContainer.innerHTML = `
        <div class="filter-group">
            <label>Time Range:</label>
            <select id="timeRange">
                <option value="all">All Hours</option>
                <option value="day">Day (6AM-6PM)</option>
                <option value="night">Night (6PM-6AM)</option>
                <option value="peak">Peak Hours (7AM-9AM, 4PM-6PM)</option>
            </select>
        </div>
    `;
    container.parentNode.insertBefore(filterContainer, container);

    // Process data for violin plot
    const memberData = data.filter(d => d.member_casual === 'member');
    const casualData = data.filter(d => d.member_casual === 'casual');

    function createTraces(filteredMemberData, filteredCasualData) {
        const traces = [];
        
        // Helper function to create a trace
        function createTrace(data, name, color, isMean) {
            return {
                x: data.map(d => d.hour),
                y: data.map(d => isMean ? d.mean : d.median),
                error_y: isMean ? {
                    type: 'data',
                    array: data.map(d => d.std),
                    visible: true
                } : undefined,
                name: name,
                type: 'scatter',
                mode: 'lines+markers',
                line: { 
                    color: color,
                    dash: isMean ? undefined : 'dash'
                },
                marker: { color: color },
                hovertemplate: `
                    <b>${name}</b><br>
                    Hour: %{x}<br>
                    ${isMean ? 'Mean' : 'Median'}: %{y:.1f} min<br>
                    ${isMean ? 'Median' : 'Mean'}: ${data.find(d => d.hour === '%{x}')?.[isMean ? 'median' : 'mean'].toFixed(1)} min<br>
                    Count: ${data.find(d => d.hour === '%{x}')?.count}<br>
                    Q1-Q3: ${data.find(d => d.hour === '%{x}')?.q1.toFixed(1)}-${data.find(d => d.hour === '%{x}')?.q3.toFixed(1)} min<extra></extra>
                `
            };
        }

        const timeRange = document.getElementById('timeRange').value;
        
        if (timeRange === 'night') {
            // Split night data into evening and morning
            const memberEvening = filteredMemberData.filter(d => d.hour >= 18);
            const memberMorning = filteredMemberData.filter(d => d.hour < 6);
            const casualEvening = filteredCasualData.filter(d => d.hour >= 18);
            const casualMorning = filteredCasualData.filter(d => d.hour < 6);

            // Member traces
            traces.push(createTrace(memberEvening, 'Member Evening (Mean)', 'blue', true));
            traces.push(createTrace(memberEvening, 'Member Evening (Median)', 'lightblue', false));
            traces.push(createTrace(memberMorning, 'Member Morning (Mean)', 'blue', true));
            traces.push(createTrace(memberMorning, 'Member Morning (Median)', 'lightblue', false));

            // Casual traces
            traces.push(createTrace(casualEvening, 'Casual Evening (Mean)', 'red', true));
            traces.push(createTrace(casualEvening, 'Casual Evening (Median)', 'pink', false));
            traces.push(createTrace(casualMorning, 'Casual Morning (Mean)', 'red', true));
            traces.push(createTrace(casualMorning, 'Casual Morning (Median)', 'pink', false));
        } else if (timeRange === 'peak') {
            // Split peak data into morning and evening peaks
            const memberMorningPeak = filteredMemberData.filter(d => d.hour >= 7 && d.hour < 9);
            const memberEveningPeak = filteredMemberData.filter(d => d.hour >= 16 && d.hour < 18);
            const casualMorningPeak = filteredCasualData.filter(d => d.hour >= 7 && d.hour < 9);
            const casualEveningPeak = filteredCasualData.filter(d => d.hour >= 16 && d.hour < 18);

            // Member traces
            traces.push(createTrace(memberMorningPeak, 'Member Morning Peak (Mean)', 'blue', true));
            traces.push(createTrace(memberMorningPeak, 'Member Morning Peak (Median)', 'lightblue', false));
            traces.push(createTrace(memberEveningPeak, 'Member Evening Peak (Mean)', 'blue', true));
            traces.push(createTrace(memberEveningPeak, 'Member Evening Peak (Median)', 'lightblue', false));

            // Casual traces
            traces.push(createTrace(casualMorningPeak, 'Casual Morning Peak (Mean)', 'red', true));
            traces.push(createTrace(casualMorningPeak, 'Casual Morning Peak (Median)', 'pink', false));
            traces.push(createTrace(casualEveningPeak, 'Casual Evening Peak (Mean)', 'red', true));
            traces.push(createTrace(casualEveningPeak, 'Casual Evening Peak (Median)', 'pink', false));
        } else {
            // For other time ranges, create normal traces
            traces.push(createTrace(filteredMemberData, 'Member (Mean)', 'blue', true));
            traces.push(createTrace(filteredMemberData, 'Member (Median)', 'lightblue', false));
            traces.push(createTrace(filteredCasualData, 'Casual (Mean)', 'red', true));
            traces.push(createTrace(filteredCasualData, 'Casual (Median)', 'pink', false));
        }

        return traces;
    }

    function filterData(timeRange) {
        let filteredMemberData = [...memberData];
        let filteredCasualData = [...casualData];

        // Apply time range filter
        if (timeRange !== 'all') {
            const hourFilter = {
                'day': h => h >= 6 && h < 18,
                'night': h => h < 6 || h >= 18,
                'peak': h => (h >= 7 && h < 9) || (h >= 16 && h < 18)
            }[timeRange];
            
            filteredMemberData = filteredMemberData.filter(d => hourFilter(d.hour));
            filteredCasualData = filteredCasualData.filter(d => hourFilter(d.hour));
        }

        return { filteredMemberData, filteredCasualData };
    }

    function updatePlot() {
        const timeRange = document.getElementById('timeRange').value;
        const { filteredMemberData, filteredCasualData } = filterData(timeRange);
        const traces = createTraces(filteredMemberData, filteredCasualData);

        // Calculate reasonable y-axis range
        const maxDuration = Math.max(
            ...filteredMemberData.map(d => d.mean + d.std),
            ...filteredCasualData.map(d => d.mean + d.std)
        );
        const yAxisMax = Math.min(maxDuration * 1.1, 120); // Cap at 2 hours

        const layout = {
            title: {
                text: 'Trip Duration by Hour and User Type',
                y: 0.95,
                x: 0.5,
                xanchor: 'center',
                yanchor: 'top'
            },
            xaxis: { 
                title: 'Hour of Day',
                range: [0, 23],
                tickmode: 'linear',
                tick0: 0,
                dtick: 1
            },
            yaxis: { 
                title: 'Duration (minutes)',
                range: [0, yAxisMax],
                tickmode: 'linear',
                tick0: 0,
                dtick: 15
            },
            margin: {
                t: 100,
                b: 50,
                l: 50,
                r: 50
            },
            showlegend: true,
            legend: {
                x: 1,
                xanchor: 'right',
                y: 1
            },
            annotations: [
                {
                    x: 0.5,
                    y: 1.05,
                    xref: 'paper',
                    yref: 'paper',
                    text: 'Note: Only hours with at least 10 trips are shown. Solid lines show mean, dashed lines show median.',
                    showarrow: false,
                    font: {
                        size: 12
                    }
                }
            ]
        };

        Plotly.newPlot('duration-violin', traces, layout);
    }

    // Add event listener for time range filter
    document.getElementById('timeRange').addEventListener('change', updatePlot);

    // Initial plot
    updatePlot();
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

    // Get dropdown elements
    const viewSelect = document.getElementById('stationView');
    const areaSelect = document.getElementById('universityFilter');

    function updateChart() {
        // Filter data based on selected area
        let filteredData = [...data];
        const selectedArea = areaSelect.value;
        if (selectedArea !== 'all') {
            filteredData = data.filter(station => {
                const stationArea = getStationUniversityArea(station);
                return stationArea === selectedArea;
            });
        }

        // Process data based on view type
        const viewType = viewSelect.value;
        const processedData = filteredData.map(station => ({
            name: station.name,
            trips: viewType === 'starts' ? station.start_trips : 
                   viewType === 'ends' ? station.end_trips : 
                   station.trips,
            area: getStationUniversityArea(station)
        }));

        // Sort and get top 10
        const topStations = processedData
            .sort((a, b) => b.trips - a.trips)
            .slice(0, 10);

        // Create a single trace with all stations
        const trace = {
            x: topStations.map(s => s.name),
            y: topStations.map(s => s.trips),
            type: 'bar',
            marker: {
                color: topStations.map(s => universityColors[s.area])
            },
            showlegend: false,  // Hide this trace from the legend
            hovertemplate: '%{y} trips<extra></extra>'  // Clean up hover text
        };

        // Create separate traces for legend only
        const areas = ['mit', 'harvard', 'bu', 'northeastern', 'none'];
        const legendTraces = areas.map(area => ({
            name: area === 'none' ? 'Other' : area.toUpperCase(),
            x: [topStations[0].name],  // Use first station name as dummy x value
            y: [0],  // Hide the bar by setting y to 0
            type: 'bar',
            marker: {
                color: universityColors[area]
            },
            showlegend: true,
            hoverinfo: 'none',
            visible: true
        }));

        const layout = {
            title: {
                text: 'Top 10 Stations by Trip Volume',
                font: {
                    size: 20
                },
                y: 0.95  // Move title up slightly
            },
            xaxis: {
                title: 'Station Name',
                tickangle: 45,
                tickfont: {
                    size: 10
                },
                automargin: true
            },
            yaxis: {
                title: 'Number of Trips'
            },
            margin: {
                l: 60,
                r: 20,
                t: 100,  // Increased top margin for legend
                b: 120
            },
            showlegend: true,
            legend: {
                title: {
                    text: 'University Area'
                },
                orientation: 'h',
                yanchor: 'bottom',
                y: 1.15,  // Moved legend up
                xanchor: 'center',
                x: 0.5,   // Centered horizontally
                traceorder: 'normal'
            },
            barmode: 'stack'
        };

        Plotly.newPlot('station-usage-chart', [trace, ...legendTraces], layout);
    }

    // Add event listeners to dropdowns
    viewSelect.addEventListener('change', updateChart);
    areaSelect.addEventListener('change', updateChart);

    // Initial chart render
    updateChart();
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
            // Store hourly usage data in global scope
            window.hourlyTripsData = data.hourlyUsage;
            
            // Create station map first
            createStationMap(data.stations);
            
            // Then create other visualizations
            createHeatmap(data.hourlyUsage);
            createDailyUsage(data.dailyUsage);
            createHourlyTrips(data.hourlyUsage);
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

// Add event listener for dropdown change
document.addEventListener('DOMContentLoaded', function() {
    const viewTypeSelect = document.getElementById('viewType');
    if (viewTypeSelect) {
        viewTypeSelect.addEventListener('change', function() {
            // Assuming the data is available in the global scope
            createHourlyTrips(window.hourlyTripsData);
        });
    }
}); 