// Function to load visualization data from the server
async function loadVisualizationData() {
    try {
        const response = await fetch('/data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Loaded visualization data:', data);
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