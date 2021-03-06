// ---------------------------- INITIAL CONFIGURATION ----------------------------
// Colours for maps (from colorbrewer2.org)
const colorBrewer = ['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#08519c','#08306b'];

const width = 960;
const height = 600;

// For date selection
const today = new Date();
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);

let fromDate = adjustDate(yesterday.getDate());
let fromMonth = adjustDate(yesterday.getMonth() + 1);
let fromYear = yesterday.getFullYear();
let toDate = adjustDate(today.getDate());
let toMonth = adjustDate(today.getMonth() + 1);
let toYear = today.getFullYear();
let time = adjustDate(today.getHours()) + ":" + adjustDate(today.getMinutes());

function adjustDate(number) {
    if (number < 10) {
        number = "0" + number;
    };
    return number;
};

let carbonURL = "https://api.carbonintensity.org.uk/regional/intensity/" + fromYear + "-" + fromMonth + "-" + fromDate + "T" + time + "Z/" + toYear + "-" + toMonth + "-" + toDate + "T" + time + "Z";

let carbonArrayIndex = 47; // Sets initial index at latest data from API

// Mapping and carbon use datasets
const datasets = [
    "./components/uk_regions_map.json",
    carbonURL
];
let promises = [];
datasets.forEach(url => promises.push(d3.json(url))); // Load each json into promises array

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
    .scale(3100)
    .translate([width / 2, height / 2]);
const path = d3.geoPath()
    .projection(projection);

// Select legend SVG area
const legend = d3.select("#legend");

// Select detailed data area
const dataDetail = d3.select("#dataDetail");

// Select time and date display area
const timeDisplay = document.getElementById("timeDisplay");

// Select date display area
const dateDisplay = d3.select("#dateDisplay");

// Select slider and set up event listener
const slider = document.getElementById("slider");
slider.addEventListener("change", () => {

    setInterval(() => {
        let displayValue = "";
        if (slider.value === "24") {
            displayValue = "Current time";
        } else if (slider.value === "23") {
            displayValue = "-1 hour";
        } else {
            displayValue = "-" + (24-slider.value) + " hours";
        };
        timeDisplay.innerHTML = displayValue;
    }, 100);

    carbonArrayIndex = (slider.value * 2) - 1;
    
    // Call plotData function to update
    plotData();
});


// ---------------------------- LOAD DATASETS AND DRAW MAP ----------------------------
// Function to create correct shortname for comparison
function correctShortname(name) {
    if (name === "North West" || name === "North East" || name === "South West" || name === "South East") {
        return name + " England";
    } else if (name === "Yorkshire and The Humber") {
        return "Yorkshire";
    } else if (name === "East of England") {
        return "East England";
    } else {
        return name;
    };
};


// Function to return date and time formatted DD/MM/YYYY TT:TT
function dateAndTime(input) {
    const master = input.split("T");
    const dateArr = master[0].split("-");
    const timeArr = master[1].split("Z");
    return dateArr[2] + "/" + dateArr[1] + "/" + dateArr[0] + " " + timeArr[0];
};


// Function to plot data (to allow updates of DOM via the slider)
function plotData() {
    Promise.all(promises).then(value => { // Once all promises are loaded...
        // Create scale for data
        const carbonDataset = value[1].data[carbonArrayIndex].regions;
        const carbonScaleMin = d3.min(carbonDataset, d => d.intensity.forecast);
        const carbonScaleMax = d3.max(carbonDataset, d => d.intensity.forecast);
        const carbonScale = d3.scaleLinear()
                .domain([carbonScaleMin,carbonScaleMax])
                .range([0, 9]); // Fits with index of colour in array
        map.append("g") // Append regions
            .selectAll("path")
            .data(topojson.feature(value[0], value[0].objects.uk_regions_map).features) // Bind topoJSON data elements
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "regions")
            .attr("id", d => d.properties.name)
            .style("animation", (d,i) => "fadeIn 0.2s linear " + (0.5 + (i / 10)) + "s 1 both")
            .style("fill", mapD => {
                // Format shortname correctly
                let comparison = correctShortname(mapD.properties.name);
                
                const match = carbonDataset.filter(carbonD => carbonD.shortname === comparison); // Filter dataset to match shortname
                if (match.length > 0) {
                    const roundedIndex = Math.round(carbonScale(match[0].intensity.forecast));
                    if (roundedIndex > 8) { // Removes round-up to 9
                        return colorBrewer[roundedIndex - 1];
                    } else {
                        return colorBrewer[roundedIndex];
                    };
                } else {
                    console.log("Couldn't find data for " + comparison);
                };
            })
            // Shows tooltip
            .on("mouseover", mapD => {
                // Shows tooltip here
                tooltipBackground.transition()
                    .duration(200)
                    .style("opacity", 0.9)
                    .style("left", (d3.event.pageX + 50) + "px")
                    .style("top", (d3.event.pageY - 250) + "px");
                tooltipText.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltipText.html(function() {
                    let comparison = correctShortname(mapD.properties.name);
                    const match = carbonDataset.filter(carbonD => carbonD.shortname === comparison); // Filter dataset to match shortname
                    return "<span>" + mapD.properties.name + ": </span><br /><span>" + match[0].intensity.forecast + "gCO<sub>2</sub>/kWh</span><br />";
                });

                dataDetail.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                dataDetail.html(() => {
                    // Add divs for title and data (so title can be centred)
                    let generationMixDataset = carbonDataset.filter(carbonD => carbonD.shortname === correctShortname(mapD.properties.name))[0].generationmix;
                    let returnString = "<div class='dataDetailTitle'><h2>" + mapD.properties.name + ":<br/>" + timeDisplay.innerHTML + "</h2></div>";
                    for (let i = 1; i < generationMixDataset.length; i++) {
                        returnString = returnString + "<p class='dataDetailContent'>" + generationMixDataset[i].fuel + ": " + generationMixDataset[i].perc + "%</p>"
                    };
                    return returnString;
                })
            })

            // Hides tooltip and data
            .on("mouseout", d => {
                tooltipBackground.transition()
                    .duration(200)
                    .style("opacity", 0);
                tooltipText.transition()
                    .duration(200)
                    .style("opacity", 0);

                dataDetail.transition()
                    .duration(200)
                    .style("opacity", 0);
            });
    
        // Display date range
        dateDisplay.html(function() {
            let from = dateAndTime(value[1].data[carbonArrayIndex].from);
            let to = dateAndTime(value[1].data[carbonArrayIndex].to);
            return from + " - " + to;
        });
        
    
        // Create numbers for legend
        let divideTotal = (carbonScaleMax - carbonScaleMin) / 8;
        let legendNumbers = [carbonScaleMin];
        for (let i = 1; i < colorBrewer.length - 1; i++) {
            let tempNumber = carbonScaleMin + (divideTotal * i); // Create next array item and check if whole number, if not, round to 2 decimals
            if (tempNumber === Math.round(tempNumber)) {
                legendNumbers.push(tempNumber);
            } else {
                legendNumbers.push(tempNumber.toFixed(2));
            };
        };
        legendNumbers.push(carbonScaleMax);
    
        // Create legend squares
        legend.selectAll("rect")
            .data(colorBrewer)
            .enter()
            .append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("class", "legendItem")
            .attr("x", 32)
            .attr("y", (d, i) => i * 15)
            .style("fill", d => d)
            .style("animation", (d,i) => "fadeIn 0.5s linear " + (1.5 + (i / 10)) + "s 1 both");
        // Create legend text
        legend.selectAll("text")
            .data(legendNumbers)
            .enter()
            .append("text")
            .attr("class", "legendText")
            .attr("x", 0)
            .attr("y", (d,i) => 12 + (i * 15))
            .text(d => d)
            .style("animation", (d,i) => "fadeIn 0.5s linear " + (1.5 + (i / 10)) + "s 1 both");
    });
};


// Call plotData function
plotData();