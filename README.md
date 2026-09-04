# MMM-TempestWeather

A MagicMirror² module for displaying current weather conditions and a five-day forecast from a WeatherFlow Tempest weather station.

## Features

- Real-time temperature from the Tempest WebSocket feed
- Wind speed and direction
- Relative humidity
- Barometric pressure and pressure trend
- Daily precipitation probability
- Daily precipitation accumulation
- Current weather conditions
- Five-day forecast
- Weather icons
- Automatic WebSocket reconnection
- Connection watchdog for stale observations
- Automatic forecast updates

## Requirements

- MagicMirror²
- WeatherFlow Tempest weather station
- WeatherFlow personal access token
- Tempest device ID
- Tempest station ID
- Internet connection
- A Node.js version that provides built-in `fetch` and `WebSocket`

No additional npm packages are currently required.

## Installation

Clone or copy the module into the MagicMirror `modules` directory:

    ~/MagicMirror/modules/MMM-TempestWeather

The module directory should contain:

    MMM-TempestWeather/
    ├── MMM-TempestWeather.js
    ├── MMM-TempestWeather.css
    ├── node_helper.js
    └── README.md

No `npm install` step is currently required.

## Configuration

Add the following entry to the `modules` array in:

    ~/MagicMirror/config/config.js

Example:

```javascript
{
    module: "MMM-TempestWeather",
    position: "top_right",
    config: {
        token: "YOUR_WEATHERFLOW_TOKEN",
        deviceId: "YOUR_TEMPEST_DEVICE_ID",
        stationId: "YOUR_TEMPEST_STATION_ID"
    }
},
```

Do not place your actual WeatherFlow token in a public Git repository.

## Configuration Options

### `token`

Your WeatherFlow personal access token.

Required.

### `deviceId`

The device ID of your Tempest weather station.

Required.

### `stationId`

The station ID used for WeatherFlow forecast data.

Required.

### `updateInterval`

How often forecast data is refreshed.

Default:

    60000

This is 60 seconds.

### `observationTimeout`

How long the module will wait without receiving a Tempest observation before treating the WebSocket connection as stale.

Default:

    180000

This is 3 minutes.

### `initialConnectionTimeout`

How long the module will wait for the first Tempest observation after establishing a connection before reconnecting.

Default:

    180000

This is 3 minutes.

### `watchdogInterval`

How often the node helper checks the health of the Tempest WebSocket connection.

Default:

    60000

This is 60 seconds.

### `maxReconnectDelay`

Maximum delay between WebSocket reconnection attempts.

Default:

    60000

This is 60 seconds.

### `forecastDays`

Number of forecast days displayed.

Default:

    5

## Architecture

MMM-TempestWeather uses the standard MagicMirror frontend/node-helper architecture.

### `MMM-TempestWeather.js`

The browser-side module is responsible for:

- Building the dashboard display
- Receiving weather data from `node_helper.js`
- Formatting current observations
- Processing forecast data for display
- Selecting weather icons
- Updating the MagicMirror DOM

### `node_helper.js`

The Node.js helper is responsible for:

- Connecting to the WeatherFlow WebSocket service
- Receiving real-time Tempest observations
- Requesting WeatherFlow Better Forecast data
- Managing forecast update intervals
- Detecting stale WebSocket observations
- Automatically reconnecting the WebSocket
- Applying exponential reconnect delays
- Preventing overlapping forecast requests
- Timing out stalled forecast requests

The frontend and node helper communicate using MagicMirror socket notifications.

## Data Sources

MMM-TempestWeather uses two WeatherFlow data sources:

- The WeatherFlow WebSocket service for real-time Tempest observations.
- The WeatherFlow Better Forecast REST service for forecast and current-condition information.

Weather icons are provided by the Meteocons weather icon set.

## Reliability

The module includes:

- WebSocket reconnection
- Exponential reconnect delay
- Observation timeout detection
- Initial connection timeout detection
- Connection watchdog
- Forecast request timeout
- Protection against overlapping forecast requests
- Basic validation of incoming weather observations

## Styling

The appearance of the module is controlled by:

    MMM-TempestWeather.css

The default layout is designed for a 400 × 350 pixel weather panel.

## Version History

### 1.1

Moved WeatherFlow network communication from the browser-side MagicMirror module into `node_helper.js`.

Version 1.1:

- Moves the WeatherFlow WebSocket connection to `node_helper.js`
- Moves Better Forecast REST requests to `node_helper.js`
- Keeps display rendering and forecast formatting in the frontend module
- Uses MagicMirror socket notifications for communication between the frontend and node helper
- Preserves the appearance and behavior of Version 1.0
- Requires no additional npm packages on supported Node.js versions

### 1.0

Initial standalone release.

The module was extracted from a working Tempest dashboard previously embedded in MagicMirror using MMM-Widget.

Version 1.0 kept the WeatherFlow REST and WebSocket networking in the browser-side module to preserve the behavior of the original implementation during extraction.

## License

No license has been selected yet.