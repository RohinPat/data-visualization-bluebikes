export function createDurationViolin(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }

    // Process data for violin plot
    const periods = ['Early Night', 'Morning', 'Afternoon', 'Evening', 'Late Night'];
    const userTypes = ['member', 'casual'];
    
    const traces = [];
    
    userTypes.forEach(userType => {
        periods.forEach(period => {
            if (data[period] && data[period][userType]) {
                traces.push({
                    type: 'violin',
                    x: Array(data[period][userType].length).fill(period),
                    y: data[period][userType],
                    name: userType === 'member' ? 'Member' : 'Casual',
                    legendgroup: userType,
                    scalegroup: userType,
                    box: {
                        visible: true
                    },
                    meanline: {
                        visible: true
                    },
                    points: false,
                    side: userType === 'member' ? 'negative' : 'positive',
                    line: {
                        color: userType === 'member' ? '#4C78A8' : '#F58518'
                    },
                    fillcolor: userType === 'member' ? 'rgba(76, 120, 168, 0.5)' : 'rgba(245, 133, 24, 0.5)'
                });
            }
        });
    });

    const layout = {
        title: {
            text: 'Trip Duration Distribution by Time Period and User Type',
            font: {
                size: 20
            }
        },
        xaxis: {
            title: 'Time Period',
            categoryorder: 'array',
            categoryarray: periods
        },
        yaxis: {
            title: 'Trip Duration (minutes)',
            zeroline: false,
            rangemode: 'tozero'
        },
        violinmode: 'overlay',
        showlegend: true,
        legend: {
            title: {
                text: 'User Type'
            }
        },
        height: 600,
        margin: {
            l: 60,
            r: 30,
            b: 60,
            t: 40,
            pad: 4
        }
    };

    Plotly.newPlot(containerId, traces, layout);
} 