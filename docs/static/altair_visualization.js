// Load and render the Altair visualization
async function loadAltairVisualization() {
    try {
        // Get the base URL for the current environment
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? '' 
            : window.location.pathname.replace(/\/+$/, '');
            
        const response = await fetch(`${baseUrl}/static/daily_usage.json`);
        const data = await response.json();
        
        // Create the full Vega-Lite specification
        const spec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            data: {
                values: data.data
            },
            ...data.spec
        };
        
        // Embed the visualization using Vega-Embed
        await vegaEmbed('#daily-usage-chart', spec, {
            actions: false,
            renderer: 'svg',
            theme: 'light'
        });
    } catch (error) {
        console.error('Error loading visualization:', error);
        // Add a visible error message on the page
        const container = document.getElementById('daily-usage-chart');
        if (container) {
            container.innerHTML = `<div class="error-message">Error loading visualization. Please check the console for details.</div>`;
        }
    }
}

// Load visualization when the DOM is ready
document.addEventListener('DOMContentLoaded', loadAltairVisualization); 