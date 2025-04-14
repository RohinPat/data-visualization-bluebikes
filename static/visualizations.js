// Function to load visualization data from the server
async function loadVisualizationData() {
    try {
        // Load data from the local data.json file
        const response = await fetch('./data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stations = await response.json();
        console.log('Loaded station data:', stations);

        // Transform station data into visualization format for other charts
        const data = {
            station_data: stations, // Add the raw station data
            daily_usage: {
                data: [{
                    type: 'bar',
                    x: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    y: [1200, 1300, 1400, 1500, 1600, 1000, 800],
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
                    mode: 'lines',
                    x: Array.from({length: 24}, (_, i) => i),
                    y: Array.from({length: 24}, (_, i) => Math.sin(i/24 * Math.PI * 2) * 100 + 500),
                    line: { color: 'rgb(55, 83, 109)' }
                }],
                layout: {
                    title: 'Hourly Trip Distribution',
                    xaxis: { title: 'Hour of Day' },
                    yaxis: { title: 'Number of Trips' }
                }
            },
            violin_data: {
                data: [{
                    type: 'violin',
                    y: Array.from({length: 1000}, () => Math.random() * 60),
                    box: { visible: true },
                    line: { color: 'black' },
                    fillcolor: 'rgb(55, 83, 109)',
                    opacity: 0.6
                }],
                layout: {
                    title: 'Trip Duration Distribution',
                    yaxis: { title: 'Duration (minutes)' }
                }
            },
            station_rankings: {
                data: [{
                    type: 'bar',
                    x: stations.slice(0, 10).map(s => s.name),
                    y: stations.slice(0, 10).map(s => s.trips),
                    marker: { color: 'rgb(55, 83, 109)' }
                }],
                layout: {
                    title: 'Top 10 Most Used Stations',
                    xaxis: { title: 'Station' },
                    yaxis: { title: 'Number of Trips' }
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

// Initialize all visualizations
async function initializeVisualizations() {
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
    }
}

// Wait for the DOM to be loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting initialization...');
    initializeVisualizations();
}); 