// D3 Violin Plot Implementation
function createD3ViolinPlot(data, container) {
    // Set the dimensions and margins of the graph
    const margin = {top: 50, right: 150, bottom: 200, left: 60};
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Define time periods
    const timePeriods = [
        { id: "early_morning", name: "Early Morning", start: 5, end: 8, description: "Early commute hours" },
        { id: "morning_rush", name: "Morning Rush", start: 8, end: 10, description: "Peak morning commute" },
        { id: "midday", name: "Midday", start: 10, end: 15, description: "Lunch and afternoon hours" },
        { id: "evening_rush", name: "Evening Rush", start: 15, end: 19, description: "Peak evening commute" },
        { id: "evening", name: "Evening", start: 19, end: 22, description: "Post-work leisure" },
        { id: "night", name: "Night", start: 22, end: 5, description: "Late night/early morning" }
    ];

    // Clear any existing SVG and controls
    d3.select(container).selectAll("*").remove();
    
    // Create main container with flex layout
    const mainContainer = d3.select(container)
        .append("div")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("gap", "20px");

    // Create control container
    const controlContainer = mainContainer.append("div")
        .attr("class", "plot-controls")
        .style("display", "flex")
        .style("gap", "20px")
        .style("align-items", "center");

    // Create user type filter
    const userTypeContainer = controlContainer.append("div");
    userTypeContainer.append("label")
        .text("User Type: ")
        .style("font-weight", "bold");

    const userSelect = userTypeContainer.append("select")
        .attr("id", "userType")
        .style("margin-left", "10px");

    userSelect.selectAll("option")
        .data([
            {value: "both", text: "Both Types"},
            {value: "member", text: "Members Only"},
            {value: "casual", text: "Casual Only"}
        ])
        .enter()
        .append("option")
        .attr("value", d => d.value)
        .text(d => d.text);

    // Create time period selector
    const timePeriodContainer = controlContainer.append("div")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("gap", "10px");

    timePeriodContainer.append("label")
        .text("Select Time Periods to Compare:")
        .style("font-weight", "bold");

    const checkboxContainer = timePeriodContainer.append("div")
        .style("display", "grid")
        .style("grid-template-columns", "repeat(3, 1fr)")
        .style("gap", "5px");

    timePeriods.forEach(period => {
        const label = checkboxContainer.append("label")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "5px");

        label.append("input")
            .attr("type", "checkbox")
            .attr("value", period.id)
            .attr("checked", true);

        label.append("span")
            .text(period.name);
    });

    // Create the SVG container
    const svg = mainContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    function updatePlot(userType = "both") {
        // Clear existing plot
        svg.selectAll("*").remove();

        // Get selected time periods
        const selectedPeriods = Array.from(checkboxContainer.selectAll("input:checked").nodes())
            .map(node => timePeriods.find(p => p.id === node.value));

        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .text("Trip Duration Distribution by Time Period");

        // Create scales
        const x = d3.scaleBand()
            .domain(selectedPeriods.map(d => d.name))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, 60])
            .range([height, 0]);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Duration (minutes)");

        // Function to create violin plot for a group
        function createViolin(periodData, period, type, color, xOffset = 0) {
            const durations = periodData.map(d => d.duration).filter(d => d <= 60);
            if (durations.length < 10) return null; // Skip periods with too few data points

            // Compute KDE
            const kde = kernelDensityEstimator(kernelEpanechnikov(5), y.ticks(50));
            const density = kde(durations);
            const maxDensity = d3.max(density, d => d[1]);
            
            // Scale density to desired width
            const violinWidth = x.bandwidth() / (userType === "both" ? 2.5 : 1.2);
            const xScale = d3.scaleLinear()
                .range([0, violinWidth])
                .domain([0, maxDensity]);

            // Create violin shape
            const area = d3.area()
                .x0(d => -xScale(d[1]))
                .x1(d => xScale(d[1]))
                .y(d => y(d[0]))
                .curve(d3.curveCatmullRom);

            // Create gradient
            const gradientId = `gradient-${period.id}-${type}`;
            const gradient = svg.append("defs")
                .append("linearGradient")
                .attr("id", gradientId)
                .attr("x1", "0%")
                .attr("x2", "100%");

            gradient.append("stop")
                .attr("offset", "0%")
                .attr("style", `stop-color: ${color}; stop-opacity: 0.8`);
            gradient.append("stop")
                .attr("offset", "100%")
                .attr("style", `stop-color: ${color}; stop-opacity: 0.3`);

            // Draw violin
            const violinG = svg.append("g")
                .attr("transform", `translate(${x(period.name) + x.bandwidth()/2 + xOffset},0)`);

            violinG.append("path")
                .datum(density)
                .attr("class", "violin")
                .attr("d", area)
                .style("fill", `url(#${gradientId})`)
                .style("stroke", color)
                .style("stroke-width", 1);

            // Add median line
            const median = d3.median(durations);
            violinG.append("line")
                .attr("x1", -violinWidth)
                .attr("x2", violinWidth)
                .attr("y1", y(median))
                .attr("y2", y(median))
                .attr("stroke", "white")
                .attr("stroke-width", 2);

            // Add count annotation
            svg.append("text")
                .attr("x", x(period.name) + x.bandwidth()/2 + xOffset)
                .attr("y", height + 40)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .text(`n=${durations.length}`);

            return {
                period: period.name,
                type: type,
                count: durations.length,
                median: median,
                mean: d3.mean(durations)
            };
        }

        // Process data for selected periods
        const stats = [];
        selectedPeriods.forEach(period => {
            const periodData = data.filter(d => {
                const hour = d.hour;
                if (period.start < period.end) {
                    return hour >= period.start && hour < period.end;
                } else {
                    return hour >= period.start || hour < period.end;
                }
            });

            if (userType === "both") {
                const memberData = periodData.filter(d => d.member_casual === 'member');
                const casualData = periodData.filter(d => d.member_casual === 'casual');
                const memberStats = createViolin(memberData, period, 'Member', '#4e79a7', -x.bandwidth()/4);
                const casualStats = createViolin(casualData, period, 'Casual', '#f28e2c', x.bandwidth()/4);
                if (memberStats) stats.push(memberStats);
                if (casualStats) stats.push(casualStats);
            } else {
                const filteredData = periodData.filter(d => 
                    userType === "member" ? d.member_casual === 'member' : d.member_casual === 'casual'
                );
                const periodStats = createViolin(filteredData, period, 
                    userType === "member" ? 'Member' : 'Casual',
                    userType === "member" ? '#4e79a7' : '#f28e2c'
                );
                if (periodStats) stats.push(periodStats);
            }
        });

        // Add legend if showing both types
        if (userType === "both") {
            const legend = svg.append("g")
                .attr("transform", `translate(${width + 10}, 0)`);

            const legendItems = [
                { label: "Member", color: "#4e79a7" },
                { label: "Casual", color: "#f28e2c" }
            ];

            legendItems.forEach((item, i) => {
                const g = legend.append("g")
                    .attr("transform", `translate(0,${i * 20})`);

                g.append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", 15)
                    .attr("height", 15)
                    .attr("fill", item.color)
                    .style("opacity", 0.6);

                g.append("text")
                    .attr("x", 25)
                    .attr("y", 12)
                    .text(item.label)
                    .style("font-size", "12px");
            });
        }
    }

    // Add event listeners
    userSelect.on("change", function() {
        updatePlot(this.value);
    });

    checkboxContainer.selectAll("input").on("change", function() {
        updatePlot(userSelect.property("value"));
    });

    // Initial plot
    updatePlot("both");
}

// Kernel density estimation functions
function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

function kernelEpanechnikov(k) {
    return function(v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
} 