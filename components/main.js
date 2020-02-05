// ---------------------------- INITIAL CONFIGURATION ----------------------------
// Colours for maps (from colorbrewer2.org)
const colorBrewer = ['#f7fcf0','#e0f3db','#ccebc5','#a8ddb5','#7bccc4','#4eb3d3','#2b8cbe','#08589e'];

// Worked out by subtracting min from max, then dividing by 8 (colorBrewer.length). Equals 9.
const legendNumbers = ["3%", "12%", "21%", "30%", "39%", "48%", "57%", "66%"];

const width = 960;
const height = 600;


// ---------------------------- PRE API CALLS ----------------------------
// Create tooltip to display on mouseover
const tooltipBackground = d3.select("#root")
    .append("div")
    .attr("id", "tooltipBackground")
    .attr("class", "tooltip")
    .style("opacity", 0);
const tooltipText = tooltipBackground.append("p")
    .attr("id", "tooltipText")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Select map SVG area and set up path for map
const map = d3.select("#map");
const projection = d3.geoAlbers()
    .center([0, 55.4])
    .rotate([4.4, 0])
    .parallels([50, 60])
    .scale(3000)
    .translate([width / 2, height / 2]);
const path = d3.geoPath()
    .projection(projection);

// Select legend SVG area
const legend = d3.select("#legend");

// Create legend
legend.selectAll("rect")
    .data(colorBrewer)
    .enter()
    .append("rect")
    .attr("width", 15)
    .attr("height", 15)
    .attr("class", "legendItem")
    .attr("x", 30)
    .attr("y", (d, i) => i * 15)
    .style("fill", d => d)
    .style("animation", (d,i) => "fadeIn 0.5s linear " + (1.5 + (i / 10)) + "s 1 both");

legend.selectAll("text")
    .data(legendNumbers)
    .enter()
    .append("text")
    .attr("class", "legendText")
    .attr("x", 0)
    .attr("y", (d,i) => 12 + (i * 15))
    .text(d => d)
    .style("animation", (d,i) => "fadeIn 0.5s linear " + (1.5 + (i / 10)) + "s 1 both");


// ---------------------------- LOAD DATASETS AND DRAW MAP ----------------------------
// Carbon dataset
//const carbon = fetch('https://api.carbonintensity.org.uk/regional')
//    .then(data => data.json);



// Mapping and carbon use datasets
const datasets = [
    "./components/uk_regions_map.json",
];
let promises = [];
datasets.forEach(url => promises.push(d3.json(url))); // Load each json into promises array


Promise.all(promises).then(value => { // Once all promises are loaded...

    map.append("g") // Append regions
        .selectAll("path")
        .data(topojson.feature(value[0], value[0].objects.uk_regions_map).features) // Bind topoJSON data elements
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "regions")
        .attr("id", d => d.properties.name);
/*
        .attr("education", mapD => {
            let result = value[1].filter(eduD => eduD.fips == mapD.id); // Filter through education JSON and find matching fips
            if (result) { // If there is a match (and a value for result) return the education data, else zero (and log error)
                return result[0].bachelorsOrHigher;
            } else {
                console.log("Couldn't find data for " + d.id + ".");
                return 0;
            };
*/
});