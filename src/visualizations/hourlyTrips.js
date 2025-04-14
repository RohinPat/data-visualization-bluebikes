export function createHourlyTripsChart(data, containerId) {
    const hourlyData = processHourlyData(data);
    
    const layout = {
        title: 'Total Bike Trips by Hour of Day',
        height: 450,
        margin: { t: 50, r: 30, b: 80, l: 60 },
        xaxis: {
            title: 'Hour of Day',
            tickmode: 'linear',
            tick0: 0,
            dtick: 1,
            range: [0, 23]
        },
        yaxis: {
            title: 'Number of Trips'
        }
    };

    Plotly.newPlot(containerId, [{
        x: hourlyData.hours,
        y: hourlyData.trips,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#4C78A8', width: 3 },
        marker: { size: 8, color: '#4C78A8' }
    }], layout, {
        responsive: true,
        displayModeBar: false
    });
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