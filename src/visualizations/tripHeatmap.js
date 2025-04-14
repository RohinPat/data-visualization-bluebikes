export function createTripHeatmap(data, containerId) {
    const heatmapData = processHeatmapData(data);
    
    const layout = {
        title: 'Trip Distribution by Day and Hour',
        height: 500,
        margin: { t: 50, r: 30, b: 80, l: 120 },
        xaxis: {
            title: 'Hour of Day',
            tickmode: 'linear',
            tick0: 0,
            dtick: 1,
            ticktext: Array.from({length: 24}, (_, i) => i),
            tickvals: Array.from({length: 24}, (_, i) => i)
        },
        yaxis: {
            title: 'Day of Week',
            tickmode: 'array',
            ticktext: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            tickvals: [0, 1, 2, 3, 4, 5, 6],
            autorange: 'reversed'
        }
    };

    Plotly.newPlot(containerId, [{
        z: heatmapData,
        type: 'heatmap',
        colorscale: 'YlOrRd',
        hoverongaps: false,
        hovertemplate: 'Hour: %{x}:00<br>Trips: %{z}<extra></extra>'
    }], layout, {
        responsive: true,
        displayModeBar: false
    });
}

function processHeatmapData(data) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const heatmapData = Array(7).fill().map(() => Array(24).fill(0));
    
    data.forEach(trip => {
        const date = new Date(trip.started_at);
        const hour = date.getHours();
        const dayIndex = date.getDay();
        // Adjust for Sunday being 0
        const adjustedDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        heatmapData[adjustedDayIndex][hour]++;
    });
    
    return heatmapData;
} 