const express = require('express');
const app = express();
const PORT = 8080;

// Mock Flight Data
const flights = [
  {
    id: "AA123",
    origin: "JFK",
    destination: "LAX",
    startCoords: { lat: 40.6413, lon: -73.7781 },
    endCoords: { lat: 33.9416, lon: -118.4085 },
    durationMs: 6 * 60 * 60 * 1000 // 6 hours
  }
];

// Reference start time (the moment the server starts is "takeoff")
const startTime = Date.now();

app.get('/api/v1/flight/info', (req, res) => {
  const now = Date.now();
  const flight = flights[0];
  
  // Calculate progress (0.0 to 1.0)
  let progress = (now - startTime) / flight.durationMs;
  if (progress > 1) progress = 1; // Flight landed

  // Simple Linear Interpolation for position
  const currentLat = flight.startCoords.lat + (flight.endCoords.lat - flight.startCoords.lat) * progress;
  const currentLon = flight.startCoords.lon + (flight.endCoords.lon - flight.startCoords.lon) * progress;

  res.json({
    flightId: flight.id,
    tailNumber: "N12345",
    altitude: progress < 1 ? 35000 : 0,
    groundSpeed: progress < 1 ? 520 : 0,
    latitude: currentLat.toFixed(4),
    longitude: currentLon.toFixed(4),
    verticalSpeed: 0,
    departureTime: startTime,
    progress: (progress * 100).toFixed(2) + "%"
  });
});

app.listen(PORT, () => console.log(`Mock Flight API running on port ${PORT}`));