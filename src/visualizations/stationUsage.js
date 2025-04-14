export function createStationUsageChart(data, containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const stationData = processStationData(data);
        
        const layout = {
            title: 'Top 15 Stations by Total Trips',
            height: 600,
            margin: { t: 50, r: 30, b: 80, l: 250 },
            xaxis: {
                title: 'Number of Trips',
                tickformat: ',d'  // Format numbers with thousands separator
            },
            yaxis: {
                title: 'Station Name',
                autorange: 'reversed'
            },
            showlegend: false,
            font: {
                family: 'Arial, sans-serif'
            }
        };

        Plotly.newPlot(containerId, [{
            x: stationData.trips,
            y: stationData.names,
            type: 'bar',
            orientation: 'h',
            marker: {
                color: '#4C78A8',
                opacity: 0.8
            },
            hovertemplate: '<b>%{y}</b><br>Trips: %{x:,}<extra></extra>'
        }], layout, {
            responsive: true,
            displayModeBar: false
        });
    } catch (error) {
        console.error('Error creating station usage chart:', error);
    }
}

function processStationData(data) {
    // Count trips per station
    const stationCounts = {};
    data.forEach(trip => {
        const station = cleanStationName(trip.start_station_name);
        stationCounts[station] = (stationCounts[station] || 0) + 1;
    });
    
    // Sort and get top 15
    const sortedStations = Object.entries(stationCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15);
    
    return {
        names: sortedStations.map(([name]) => name),
        trips: sortedStations.map(([,count]) => count)
    };
}

function cleanStationName(name) {
    const replacements = {
        'at Mass Ave': '@ Mass Ave',
        'at Main St': '@ Main',
        'MIT Stata Center at Vassar St': 'Stata Center',
        'Central Square at Mass Ave': 'Central Square',
        'MIT at Mass Ave': 'MIT Mass Ave'
    };
    
    let cleaned = name;
    for (const [old, new_] of Object.entries(replacements)) {
        cleaned = cleaned.replace(old, new_);
    }
    return cleaned.trim();
} 