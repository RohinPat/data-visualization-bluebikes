export function createMembershipComparisonChart(data, containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const membershipData = processMembershipData(data);
        
        const layout = {
            title: 'Member vs Casual Usage Throughout the Week',
            height: 500,
            margin: { t: 50, r: 30, b: 50, l: 60 },
            xaxis: {
                title: 'Day of Week',
                ticktext: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                tickvals: [0, 1, 2, 3, 4, 5, 6]
            },
            yaxis: {
                title: 'Number of Trips',
                tickformat: ',d'
            },
            legend: {
                x: 1,
                xanchor: 'right',
                y: 1
            },
            font: {
                family: 'Arial, sans-serif'
            }
        };

        Plotly.newPlot(containerId, [
            {
                name: 'Member',
                x: membershipData.days,
                y: membershipData.memberCounts,
                type: 'scatter',
                mode: 'lines+markers',
                line: {
                    color: '#1f77b4',
                    width: 3
                },
                marker: {
                    size: 8
                }
            },
            {
                name: 'Casual',
                x: membershipData.days,
                y: membershipData.casualCounts,
                type: 'scatter',
                mode: 'lines+markers',
                line: {
                    color: '#ff7f0e',
                    width: 3
                },
                marker: {
                    size: 8
                }
            }
        ], layout, {
            responsive: true
        });
    } catch (error) {
        console.error('Error creating membership comparison chart:', error);
    }
}

function processMembershipData(data) {
    const memberCounts = new Array(7).fill(0);
    const casualCounts = new Array(7).fill(0);
    
    data.forEach(trip => {
        const date = new Date(trip.started_at);
        const dayOfWeek = date.getDay();
        // Adjust to make Monday = 0, Sunday = 6
        const adjustedDay = (dayOfWeek + 6) % 7;
        
        if (trip.member_casual === 'member') {
            memberCounts[adjustedDay]++;
        } else {
            casualCounts[adjustedDay]++;
        }
    });

    return {
        days: Array.from({length: 7}, (_, i) => i),
        memberCounts,
        casualCounts
    };
} 