export function createDailyUsageChart(data, containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        Plotly.newPlot(containerId, data.data, data.layout);
    } catch (error) {
        console.error('Error creating daily usage chart:', error);
    }
} 