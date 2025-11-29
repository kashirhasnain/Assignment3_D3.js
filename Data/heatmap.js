/* Parse time format for collision data */
const parseTime = d3.timeParse("%H:%M");

/* Load the dataset and format variables */
d3.csv("./Data/collisions_2024_transformed_data.csv", d => {
  return {
    city: d.local_authority_highway,
    hour: +d.time.split(":")[0],
    severity: d.collision_severity,
    casualties: +d.number_of_casualties,
    vehicles: +d.number_of_vehicles,
    longitude: +d.longitude,
    latitude: +d.latitude
  }
}).then(data => {
  
  console.log(data);

  /* Target cities for analysis */
  const targetCities = [
    "Wandsworth", "Enfield", "Croydon", "Redcar and Cleveland",
    "Lambeth", "Hartlepool", "Hackney", "Newham"
  ];

  /* Peak hours definition */
  const peakHours = [7, 8, 9, 17, 18, 19];

  /* Filter data for target cities and peak hours */
  let heatmapData = data.filter(d => 
    targetCities.includes(d.city) && peakHours.includes(d.hour)
  );

  console.log(heatmapData);

  /* Aggregate data by city and hour */
  const aggregated = {};
  heatmapData.forEach(d => {
    const key = `${d.city}-${d.hour}`;
    aggregated[key] = (aggregated[key] || 0) + 1;
  });

  /* Create matrix for heatmap */
  const matrix = [];
  targetCities.forEach(city => {
    peakHours.forEach(hour => {
      matrix.push({
        city: city,
        hour: hour,
        collisions: aggregated[`${city}-${hour}`] || 0
      });
    });
  });

  console.log(matrix);

  /* Get min and max collisions for color scale */
  const maxCollisions = d3.max(matrix, d => d.collisions);
  console.log("Max collisions:", maxCollisions);

  /* Create the heatmap */
  createHeatmap(matrix, targetCities, peakHours, maxCollisions);

}).catch(error => console.error("Error loading data:", error));

const createHeatmap = (data, cities, hours, maxCollisions) => {
  
  /* Set dimensions and margins */
  const width = 1000, height = 500;
  const margins = { top: 60, right: 30, bottom: 100, left: 180 };
  const cellSize = 25;

  /* Create SVG container */
  const svg = d3.select("#heatmap")
    .append("svg")
    .attr("viewBox", [0, 0, width, height]);

  /* Define scales */
  const colorScale = d3.scaleLinear()
    .domain([0, maxCollisions])
    .range(["#f0f9ff", "#dc2626"]);

  const xScale = d3.scaleBand()
    .domain(hours)
    .range([margins.left, margins.left + hours.length * cellSize])
    .padding(0);

  const yScale = d3.scaleBand()
    .domain(cities)
    .range([margins.top, margins.top + cities.length * cellSize])
    .padding(0);

  /* Add title */
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .text("Collisions by City during Peak Hours (7-9 AM & 5-7 PM)");

  /* Create cells */
  let cells = svg.append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
      .attr("x", d => xScale(d.hour))
      .attr("y", d => yScale(d.city))
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("fill", d => colorScale(d.collisions))
      .attr("stroke", "white")
      .attr("stroke-width", 1);

  /* Add tooltip on hover */
  cells.append("title")
    .text(d => `${d.city}\n${d.hour}:00\nCollisions: ${d.collisions}`);

  /* Add cell values */
  svg.append("g")
    .selectAll("text")
    .data(data.filter(d => d.collisions > 0))
    .join("text")
      .attr("x", d => xScale(d.hour) + cellSize / 2)
      .attr("y", d => yScale(d.city) + cellSize / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", d => d.collisions > maxCollisions * 0.5 ? "white" : "#333")
      .text(d => d.collisions);

  /* X-axis labels (hours) */
  svg.append("g")
    .selectAll("text")
    .data(hours)
    .join("text")
      .attr("x", d => xScale(d) + cellSize / 2)
      .attr("y", margins.top - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text(d => `${d}:00`);

  /* Y-axis labels (cities) */
  svg.append("g")
    .selectAll("text")
    .data(cities)
    .join("text")
      .attr("x", margins.left - 10)
      .attr("y", d => yScale(d) + cellSize / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "11px")
      .text(d => d);

  /* Add axis labels */
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Hour of Day");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height / 2))
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("City");

  /* Create legend */
  const legendSteps = 5;
  const legendData = d3.range(legendSteps).map(i => (i / (legendSteps - 1)) * maxCollisions);

  svg.append("g")
    .selectAll("rect")
    .data(legendData)
    .join("rect")
      .attr("x", width - 150 + (d => d * 20))
      .attr("y", 10)
      .attr("width", 20)
      .attr("height", 15)
      .attr("fill", d => colorScale(d));

  svg.append("text")
    .attr("x", width - 160)
    .attr("y", 35)
    .attr("font-size", "10px")
    .text("Low");

  svg.append("text")
    .attr("x", width - 30)
    .attr("y", 35)
    .attr("font-size", "10px")
    .text("High");
}