export function createHourlyTripsChart(data, containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        Plotly.newPlot(containerId, data.data, data.layout);
    } catch (error) {
        console.error('Error creating hourly trips chart:', error);
    }
}

function processHourlyData(data) {
    const hourCounts = new Array(24).fill(0);
    
    data.forEach(trip => {
        const hour = new Date(trip.started_at).getHours();
        hourCounts[hour]++;
    });

    return {
        hours: Array.from({length: 24}, (_, i) => i),
        trips: hourCounts
    };
} 