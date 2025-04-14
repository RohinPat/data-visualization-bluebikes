export function createTripHeatmapChart(data, containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const heatmapData = processHeatmapData(data);
        
        const layout = {
            title: 'Trip Distribution by Day and Hour',
            height: 500,
            margin: { t: 50, r: 30, b: 50, l: 120 },
            xaxis: {
                title: 'Hour of Day',
                ticktext: Array.from({length: 24}, (_, i) => 
                    i === 0 ? '12 AM' : 
                    i < 12 ? `${i} AM` : 
                    i === 12 ? '12 PM' : 
                    `${i-12} PM`
                ),
                tickvals: Array.from({length: 24}, (_, i) => i)
            },
            yaxis: {
                title: 'Day of Week',
                ticktext: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                tickvals: [0, 1, 2, 3, 4, 5, 6]
            },
            font: {
                family: 'Arial, sans-serif'
            }
        };

        Plotly.newPlot(containerId, [{
            x: heatmapData.hours,
            y: heatmapData.days,
            z: heatmapData.counts,
            type: 'heatmap',
            colorscale: 'Viridis',
            hoverongaps: false,
            hovertemplate: 
                'Day: %{y}<br>' +
                'Hour: %{x}<br>' +
                'Trips: %{z:,d}<extra></extra>'
        }], layout, {
            responsive: true
        });
    } catch (error) {
        console.error('Error creating trip heatmap chart:', error);
    }
}

function processHeatmapData(data) {
    // Initialize 7x24 matrix for days (rows) x hours (columns)
    const counts = Array.from({length: 7}, () => Array(24).fill(0));
    
    data.forEach(trip => {
        const date = new Date(trip.started_at);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        // Adjust to make Monday = 0, Sunday = 6
        const adjustedDay = (dayOfWeek + 6) % 7;
        
        counts[adjustedDay][hour]++;
    });

    return {
        days: Array.from({length: 7}, (_, i) => i),
        hours: Array.from({length: 24}, (_, i) => i),
        counts: counts
    };
} 