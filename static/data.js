// Basic station data with name, coordinates, and trips
const stations = [
  {
    "name": "MIT @ Mass Ave / Amherst St",
    "lat": 42.3601,
    "lng": -71.0912,
    "trips": 188,
    "university": "mit"
  },
  {
    "name": "Central Square @ Mass Ave / Essex St",
    "lat": 42.3651,
    "lng": -71.1031,
    "trips": 158,
    "university": "none"
  },
  {
    "name": "Vassar St",
    "lat": 42.3590,
    "lng": -71.0920,
    "trips": 139,
    "university": "mit"
  },
  {
    "name": "MIT Stata Center @ Vassar / Main St",
      "lat": 42.3625,
      "lng": -71.0882,
    "trips": 120,
    "university": "mit"
  },
  {
    "name": "MIT Pacific",
    "lat": 42.3580,
    "lng": -71.0860,
    "trips": 115,
    "university": "mit"
    },
    {
      "name": "Boylston St at Fairfield St",
      "lat": 42.3488,
      "lng": -71.0825,
    "trips": 97,
    "university": "none"
  },
  {
    "name": "Harvard Square at Mass Ave / Dunster",
    "lat": 42.3730,
    "lng": -71.1170,
    "trips": 92,
    "university": "harvard"
    },
    {
      "name": "Forsyth St at Huntington Ave",
      "lat": 42.3392,
      "lng": -71.0905,
    "trips": 95,
    "university": "neu"
  },
  {
    "name": "BU Central - 725 Comm. Ave.",
    "lat": 42.3504,
    "lng": -71.1083,
    "trips": 85,
    "university": "bu"
  }
];

// Create visualization data object
const tripData = {
  // Add station data for the map
  d3_station_data: stations,
  
  // Add heatmap data for the hourly visualization
  heatmap: {
    data: [{
      x: Array.from({length: 24}, (_, i) => i), // Hours 0-23
      y: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      z: [
        [11, 3, 2, 2, 4, 14, 23, 83, 129, 77, 57, 55, 66, 63, 57, 85, 126, 158, 115, 67, 55, 37, 22, 8],
        [2, 2, 2, 2, 4, 11, 43, 112, 168, 127, 52, 63, 56, 58, 72, 98, 120, 192, 131, 66, 57, 41, 18, 11],
        [27, 9, 2, 3, 2, 11, 37, 104, 167, 103, 68, 69, 70, 68, 83, 118, 121, 216, 135, 74, 53, 54, 28, 10],
        [5, 3, 2, 1, 2, 13, 41, 110, 179, 137, 74, 61, 84, 70, 77, 131, 178, 208, 162, 82, 81, 52, 49, 20],
        [21, 2, 0, 5, 2, 16, 43, 97, 174, 139, 84, 64, 104, 76, 78, 108, 167, 166, 115, 108, 65, 71, 31, 29],
        [19, 17, 7, 3, 4, 6, 17, 18, 29, 51, 70, 72, 81, 75, 83, 61, 54, 56, 45, 28, 36, 26, 24, 25],
        [17, 18, 14, 3, 2, 2, 12, 23, 25, 56, 64, 85, 87, 85, 95, 94, 87, 79, 51, 42, 31, 32, 24, 13]
      ],
      type: "heatmap",
      colorscale: [
        [0, "rgb(255,255,204)"],
        [0.125, "rgb(255,237,160)"],
        [0.25, "rgb(254,217,118)"],
        [0.375, "rgb(254,178,76)"],
        [0.5, "rgb(253,141,60)"],
        [0.625, "rgb(252,78,42)"],
        [0.75, "rgb(227,26,28)"],
        [0.875, "rgb(189,0,38)"],
        [1, "rgb(128,0,38)"]

      ]
    }],
    layout: {
      title: "Trip Distribution by Day and Hour"
    }
  },
  
  // Hourly trip data for line chart
  hourly_trips: {
    datasets: {
      "data-2cc1a286a2e98dc40808ba9896b7f02c": Array.from({length: 24}, (_, i) => ({
        hour: i,
        trips: Math.floor(Math.random() * 800) + 200 // Random data for trips
      }))
    }

  }
};