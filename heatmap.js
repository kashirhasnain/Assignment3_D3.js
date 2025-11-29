let fullData = [];
let currentXScale = 10;
let currentYScale = 11;
let currentMonth = "All";

console.log("Script loaded");

// City code to name mapping
const cityMapping = {
  'E10000016': 'Barking and Dagenham',
  'E10000030': 'Waltham Forest',
  'E10000012': 'Croydon',
  'E08000025': 'Redcar and Cleveland',
  'E10000014': 'Enfield',
  'E10000017': 'Hackney',
  'E10000019': 'Lambeth',
  'E10000032': 'Wandsworth',
  'E10000015': 'Greenwich',
  'E10000020': 'Lewisham',
  'E08000035': 'Stockton-on-Tees',
  'E10000024': 'Sutton',
  'E10000008': 'Bromley',
  'E10000007': 'Hounslow',
  'E10000028': 'Tower Hamlets',
  'E10000011': 'Haringey',
  'E10000031': 'Waltham Forest',
  'E09000001': 'Barnet',
  'E09000002': 'Bexley',
  'E09000003': 'Brent',
  'E09000004': 'Bromley',
  'E09000005': 'Ealing',
  'E09000006': 'Enfield',
  'E09000007': 'Greenwich',
  'E09000008': 'Hackney',
  'E09000009': 'Hammersmith and Fulham',
  'E09000010': 'Haringey',
  'E09000011': 'Harrow',
  'E09000012': 'Havering',
  'E09000013': 'Hillingdon',
  'E09000014': 'Hounslow',
  'E09000015': 'Islington',
  'E09000016': 'Kensington and Chelsea',
  'E09000017': 'Kingston upon Thames',
  'E09000018': 'Lambeth',
  'E09000019': 'Lewisham',
  'E09000020': 'Merton',
  'E09000021': 'Newham',
  'E09000022': 'Redbridge',
  'E09000023': 'Richmond upon Thames',
  'E09000024': 'Southwark',
  'E09000025': 'Sutton',
  'E09000026': 'Sutton',
  'E09000027': 'Tower Hamlets',
  'E09000028': 'Waltham Forest',
  'E09000029': 'Wandsworth',
  'E09000030': 'Westminster',
  'E09000031': 'Waltham Forest',
  'E09000032': 'Westminster'
};

// Add sliders to page dynamically
const controlsContainer = document.createElement("div");
controlsContainer.style.cssText = "background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);";

// Month filter dropdown
const monthFilterGroup = document.createElement("div");
monthFilterGroup.style.marginBottom = "20px";
monthFilterGroup.innerHTML = `
  <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #333;">Filter by Month:</label>
  <select id="monthFilter" style="padding: 10px; font-size: 14px; border-radius: 4px; border: 1px solid #ddd; cursor: pointer;">
    <option value="All">All Months</option>
  </select>
`;
controlsContainer.appendChild(monthFilterGroup);

// Insert controls before heatmap
const heatmapDiv = document.getElementById("heatmap");
if (heatmapDiv && heatmapDiv.parentNode) {
  heatmapDiv.parentNode.insertBefore(controlsContainer, heatmapDiv);
}

/* Load the dataset */
d3.csv("./Data/collisions_new.csv").then(rawData => {
  
  console.log("CSV loaded:", rawData.length, "rows");
  
  /* Parse and format data */
  fullData = rawData.map(d => {
    let hour = 0;
    let month = "Unknown";
    
    // Parse hour from 'time' column (format: HH:MM)
    if (d.time && d.time.includes(":")) {
      hour = parseInt(d.time.split(":")[0]) || 0;
    } else if (d.hour) {
      hour = parseInt(d.hour) || 0;
    }
    
    // Parse month from 'date' column (format: DD/MM/YYYY or similar)
    if (d.date) {
      const parts = d.date.split("/");
      if (parts.length >= 2) {
        const monthNum = parseInt(parts[1]);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        if (monthNum >= 1 && monthNum <= 12) {
          month = monthNames[monthNum - 1];
        }
      }
    }
    
    let cityName = d.local_authority_highway || d.City || "";
    
    // Map city code to city name if it exists in mapping
    if (cityMapping[cityName]) {
      cityName = cityMapping[cityName];
    }
    
    return {
      city: cityName,
      hour: hour,
      severity: d.collision_severity || "Unknown",
      casualties: parseInt(d.number_of_casualties) || 0,
      vehicles: parseInt(d.number_of_vehicles) || 0,
      month: month,
      date: d.date || ""
    };
  }).filter(d => d.city && d.city.length > 0);

  console.log("Processed data:", fullData.length, "rows");
  console.log("Sample row:", fullData[0]);
  
  // Check what city names look like
  const uniqueCities = [...new Set(fullData.map(d => d.city))];
  console.log("Unique cities in data:", uniqueCities.slice(0, 20));
  
  // Get unique months
  const monthSet = new Set(fullData.map(d => d.month).filter(m => m !== "Unknown"));
  const monthNumbers = Array.from(monthSet).map(m => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const shortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const index = shortNames.indexOf(m);
    return { short: m, full: monthNames[index], order: index };
  }).sort((a, b) => a.order - b.order).map(m => m.full);
  
  const months = ["All", ...monthNumbers];
  
  // Populate month filter dropdown
  const monthSelect = document.getElementById("monthFilter");
  months.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    monthSelect.appendChild(option);
  });
  
  // Month filter change event
  monthSelect.addEventListener("change", function(e) {
    currentMonth = e.target.value;
    console.log("Changed to month:", currentMonth);
    d3.select("#heatmap").html("");
    renderHeatmap();
  });
  
  function renderHeatmap() {
    // Filter data by month
    let filteredData = fullData;
    if (currentMonth !== "All") {
      // Convert full month name back to short name for comparison
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const shortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = monthNames.indexOf(currentMonth);
      const shortMonth = shortNames[monthIndex];
      
      filteredData = fullData.filter(d => d.month === shortMonth);
    }
    
    console.log("Filtered data for month '" + currentMonth + "':", filteredData.length, "rows");
    
    // Get top 20 cities
    const cityCounts = {};
    filteredData.forEach(d => {
      if (d.city) {
        cityCounts[d.city] = (cityCounts[d.city] || 0) + 1;
      }
    });
    
    // Get top 10 cities (with City of London always included if it exists)
    let topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0]);
    
    // Check if City of London exists in data
    const cityOfLondonIndex = topCities.findIndex(city => 
      city.toLowerCase().includes("city of london") || city === "City of London"
    );
    
    // Always include City of London if it exists, then take top 10
    let finalCities = [];
    if (cityOfLondonIndex !== -1) {
      finalCities.push(topCities[cityOfLondonIndex]);
      topCities = topCities.filter((_, i) => i !== cityOfLondonIndex);
      finalCities = finalCities.concat(topCities.slice(0, 9));
    } else {
      finalCities = topCities.slice(0, 10);
    }
    
    topCities = finalCities;
    
    console.log("Top 20 cities:", topCities);
    
    createHeatmap(filteredData, topCities);
  }
  
  // Initial render
  renderHeatmap();

}).catch(error => {
  console.error("Error loading CSV:", error);
  d3.select("#heatmap").append("p").text("Error: " + error.message).style("color", "red");
});

function createHeatmap(data, cities) {
  const allHours = [7, 8, 9, 17, 18, 19]; // Peak hours only
  
  /* Aggregate by city and hour */
  const aggregated = {};
  data.forEach(d => {
    if (cities.includes(d.city)) {
      const key = `${d.city}-${d.hour}`;
      if (!aggregated[key]) {
        aggregated[key] = { count: 0, severities: {} };
      }
      aggregated[key].count += 1;
      aggregated[key].severities[d.severity] = (aggregated[key].severities[d.severity] || 0) + 1;
    }
  });

  console.log("Aggregated entries:", Object.keys(aggregated).length);

  /* Build matrix */
  const matrix = [];
  cities.forEach(city => {
    allHours.forEach(hour => {
      const key = `${city}-${hour}`;
      matrix.push({
        city: city,
        hour: hour,
        count: aggregated[key]?.count || 0,
        severities: aggregated[key]?.severities || {}
      });
    });
  });

  const maxCount = d3.max(matrix, d => d.count) || 1;
  console.log("Max collisions:", maxCount);

  /* SVG dimensions */
  const cellSize = 80;
  const width = window.innerWidth - 40;
  const height = 100 + cities.length * cellSize;
  const margins = { top: 60, right: 150, bottom: 80, left: 250 };

  const svg = d3.select("#heatmap")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("border", "1px solid #ccc")
    .style("background", "white")
    .style("display", "block")
    .style("margin-top", "20px");

  /* Color scale */
  const colorScale = d3.scaleLinear()
    .domain([0, maxCount])
    .range(["#fef3c7", "#dc2626"]);

  /* Scales */
  const xScale = d3.scaleBand()
    .domain(allHours)
    .range([margins.left, margins.left + allHours.length * cellSize])
    .padding(0.05);

  const yScale = d3.scaleBand()
    .domain(cities)
    .range([margins.top, margins.top + cities.length * cellSize])
    .padding(0.05);

  /* Title */
  svg.append("text")
    .attr("x", width / 3)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .text("View Collisions by City and Peak Hours");

  /* Draw cells */
  svg.selectAll(".cell")
    .data(matrix)
    .join("rect")
    .attr("class", "cell")
    .attr("x", d => xScale(d.hour))
    .attr("y", d => yScale(d.city))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", d => colorScale(d.count))
    .attr("stroke", "#ddd")
    .attr("stroke-width", 0.5)
    .append("title")
    .text(d => {
      let tip = `${d.city}\nHour: ${d.hour}:00\nCollisions: ${d.count}`;
      for (let sev in d.severities) {
        tip += `\n${sev}: ${d.severities[sev]}`;
      }
      return tip;
    });

  /* Add numbers in cells */
  svg.selectAll(".value")
    .data(matrix.filter(d => d.count > 0))
    .join("text")
    .attr("class", "value")
    .attr("x", d => xScale(d.hour) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.city) + yScale.bandwidth() / 2 + 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("font-weight", "bold")
    .attr("fill", d => d.count > maxCount * 0.5 ? "white" : "#000")
    .text(d => d.count);

  /* Hour labels (X-axis) */
  svg.selectAll(".hour-label")
    .data(allHours)
    .join("text")
    .attr("class", "hour-label")
    .attr("x", d => xScale(d) + xScale.bandwidth() / 2)
    .attr("y", margins.top - 15)
    .attr("text-anchor", "middle")
    .attr("font-size", currentXScale + "px")
    .attr("font-weight", "bold")
    .text(d => `${d}:00`);

  /* City labels (Y-axis) */
  svg.selectAll(".city-label")
    .data(cities)
    .join("text")
    .attr("class", "city-label")
    .attr("x", margins.left - 10)
    .attr("y", d => yScale(d) + yScale.bandwidth() / 2 + 4)
    .attr("text-anchor", "end")
    .attr("font-size", currentYScale + "px")
    .text(d => d);

  /* Axis labels */
  svg.append("text")
    .attr("x", width / 3)
    .attr("y", height - 20)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Hour of Day");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height / 2))
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("City");

  /* Legend */
  const legendX = width - 130;
  
  svg.append("text")
    .attr("x", legendX)
    .attr("y", margins.top)
    .attr("font-size", "11px")
    .attr("font-weight", "bold")
    .text("Collisions:");

  const legendSteps = 5;
  const legendData = d3.range(legendSteps).map(i => (i / (legendSteps - 1)) * maxCount);

  svg.selectAll(".legend-rect")
    .data(legendData)
    .join("rect")
    .attr("class", "legend-rect")
    .attr("x", (d, i) => legendX + (i * 18))
    .attr("y", margins.top + 15)
    .attr("width", 16)
    .attr("height", 12)
    .attr("fill", d => colorScale(d))
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5);

  svg.append("text")
    .attr("x", legendX)
    .attr("y", margins.top + 35)
    .attr("font-size", "9px")
    .text("Low");

  svg.append("text")
    .attr("x", legendX + 80)
    .attr("y", margins.top + 35)
    .attr("font-size", "9px")
    .text("High");

  console.log("Heatmap rendered successfully");
}