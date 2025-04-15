// Load and render the Altair visualization
async function loadAltairVisualization() {
    try {
        const response = await fetch('static/daily_usage.json');
        const data = await response.json();
        
        // Embed the visualization using Vega-Embed
        vegaEmbed('#daily-usage-chart', data.spec, {
            actions: false,
            renderer: 'svg'
        }).catch(console.error);
    } catch (error) {
        console.error('Error loading visualization:', error);
    }
}

// Load visualization when the DOM is ready
document.addEventListener('DOMContentLoaded', loadAltairVisualization); 