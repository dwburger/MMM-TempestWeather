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

No additional npm packages are currently required.

## Installation

Clone or copy the module into the MagicMirror `modules` directory:

    ~/MagicMirror/modules/MMM-TempestWeather

The module directory should contain:

    MMM-TempestWeather/
    ├── MMM-TempestWeather.js
    ├── MMM-TempestWeather.css
    └── README.md

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

### `forecastDays`

Number of forecast days displayed.

Default:

    5

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

## Version

### 1.0

Initial standalone release.

The module was extracted from a working Tempest dashboard previously embedded in MagicMirror using MMM-Widget.

Version 1.0 intentionally keeps the WeatherFlow REST and WebSocket networking in the browser-side module to preserve the behavior of the original implementation.

A future version may move network communication to a MagicMirror `node_helper.js`.

## License

No license has been selected yet.