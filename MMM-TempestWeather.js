/* MagicMirror²
 * Module: MMM-TempestWeather
 *
 * Tempest WeatherFlow dashboard
 */

Module.register("MMM-TempestWeather", {

    defaults: {
        token: "",
        deviceId: "",
        stationId: "",

        updateInterval: 60 * 1000,
        observationTimeout: 3 * 60 * 1000,
        initialConnectionTimeout: 3 * 60 * 1000,
        watchdogInterval: 60 * 1000,
        maxReconnectDelay: 60 * 1000,

        forecastDays: 5
    },

    start: function () {
        Log.info("Starting module: " + this.name);

        this.socket = null;
        this.socketReconnectTimer = null;
        this.websocketWatchdogTimer = null;
        this.forecastUpdateTimer = null;

        this.lastObservationTime = 0;
        this.connectionStartedTime = 0;
        this.reconnectAttempts = 0;
        this.forecastRequestInProgress = false;

        this.current = {
            temperature: "",
            windSpeed: "",
            windDirection: "",
            humidity: "",
            barometerHtml: "",
            precipChance: "",
            precipAccum: "",
            conditions: "",
            lastUpdated: "Waiting for Tempest..."
        };

        this.forecast = [];

        var self = this;

        setTimeout(function () {
            self.getData();
            self.startForecastTimer();
            self.startTempestConnection();
        }, 1000);
    },

    getStyles: function () {
        return [
            "MMM-TempestWeather.css"
        ];
    },

    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.id = "tempestDashboard";
        wrapper.className = "tempestDashboard";

        var table = document.createElement("table");
        table.className = "tempestCurrent";

        var tbody = document.createElement("tbody");

        /*
         * Temperature / Wind
         */

        var row = document.createElement("tr");

        var temp = document.createElement("td");
        temp.className = "tempestLocalTemp";
        temp.rowSpan = 6;
        temp.innerHTML = this.current.temperature || "&nbsp;";
        row.appendChild(temp);

        tbody.appendChild(row);

        /*
         * Wind speed
         */

        row = document.createElement("tr");

        var title = document.createElement("td");
        title.className = "tempestTitle";
        title.innerHTML = "Wind:&nbsp;";
        row.appendChild(title);

        var value = document.createElement("td");
        value.className = "tempestValue tempestWind";
        value.textContent = this.current.windSpeed;
        row.appendChild(value);

        tbody.appendChild(row);

        /*
         * Wind direction
         */

        row = document.createElement("tr");

        title = document.createElement("td");
        title.className = "tempestTitle";
        title.innerHTML = "From the:&nbsp;";
        row.appendChild(title);

        value = document.createElement("td");
        value.className = "tempestValue tempestWind";
        value.textContent = this.current.windDirection;
        row.appendChild(value);

        tbody.appendChild(row);

        /*
         * Relative humidity
         */

        row = document.createElement("tr");

        title = document.createElement("td");
        title.className = "tempestTitle";
        title.innerHTML = "RH:&nbsp;";
        row.appendChild(title);

        value = document.createElement("td");
        value.className = "tempestValue";
        value.textContent = this.current.humidity;
        row.appendChild(value);

        tbody.appendChild(row);

        /*
         * Barometer
         */

        row = document.createElement("tr");

        title = document.createElement("td");
        title.className = "tempestTitle";
        title.innerHTML = "Baro:&nbsp;";
        row.appendChild(title);

        value = document.createElement("td");
        value.className = "tempestValue";
        value.innerHTML = this.current.barometerHtml;
        row.appendChild(value);

        tbody.appendChild(row);

        /*
         * Precipitation chance
         */

        row = document.createElement("tr");

        title = document.createElement("td");
        title.className = "tempestTitle";
        title.innerHTML = "Chance:&nbsp;";
        row.appendChild(title);

        value = document.createElement("td");
        value.className = "tempestValue";
        value.textContent = this.current.precipChance;
        row.appendChild(value);

        tbody.appendChild(row);

        /*
         * Conditions / precipitation today
         */

        row = document.createElement("tr");

        var conditions = document.createElement("td");
        conditions.className = "tempestConditions";
        conditions.textContent = this.current.conditions;
        row.appendChild(conditions);

        title = document.createElement("td");
        title.className = "tempestTitle";
        title.innerHTML = "Today:&nbsp;";
        row.appendChild(title);

        value = document.createElement("td");
        value.className = "tempestValue";
        value.textContent = this.current.precipAccum;
        row.appendChild(value);

        tbody.appendChild(row);

        table.appendChild(tbody);
        wrapper.appendChild(table);

        /*
         * Five-day forecast
         */

        var forecastWrap = document.createElement("div");
        forecastWrap.className = "tempestForecastWrap";

        var forecastRow = document.createElement("div");
        forecastRow.className = "tempestForecast";

        var precipRow = document.createElement("div");
        precipRow.className = "tempestForecastPrecip";

        for (var i = 0; i < this.forecast.length; i++) {
            var day = this.forecast[i];

            var dayCell = document.createElement("div");
            dayCell.className = "tempestForecastDay";

            var dow = document.createElement("div");
            dow.className = "tempestForecastDow";
            dow.textContent = day.dayOfWeek;
            dayCell.appendChild(dow);

            var icon = document.createElement("div");
            icon.className = "tempestForecastIcon";
            icon.innerHTML = this.iconSVG(day.icon);
            dayCell.appendChild(icon);

            var temps = document.createElement("div");
            temps.className = "tempestForecastTemps";

            var high = document.createElement("span");
            high.className = "tempestForecastHigh";
            high.innerHTML = day.high + "&deg;";
            temps.appendChild(high);

            var low = document.createElement("span");
            low.className = "tempestForecastLow";
            low.innerHTML = "/" + day.low + "&deg;";
            temps.appendChild(low);

            dayCell.appendChild(temps);
            forecastRow.appendChild(dayCell);

            var precipCell = document.createElement("div");
            precipCell.className = "tempestPrecipCell";
            precipCell.textContent = day.precipitationProbability;
            precipRow.appendChild(precipCell);
        }

        forecastWrap.appendChild(forecastRow);
        forecastWrap.appendChild(precipRow);

        wrapper.appendChild(forecastWrap);

        /*
         * Last updated
         */

        var lastUpdated = document.createElement("div");
        lastUpdated.className = "tempestLastUpdated";
        lastUpdated.textContent = this.current.lastUpdated;

        wrapper.appendChild(lastUpdated);

        return wrapper;
    },

    validNumber: function (value, minimum, maximum) {
        var number = Number(value);

        return (
            Number.isFinite(number) &&
            number >= minimum &&
            number <= maximum
        );
    },

    setLastUpdated: function (text) {
        this.current.lastUpdated = text;
        this.updateDom(0);
    },

    /*
     * Tempest WebSocket
     */

    scheduleSocketReconnect: function () {
        var self = this;

        if (this.socketReconnectTimer) {
            return;
        }

        this.reconnectAttempts++;

        var delay = Math.min(
            5000 * Math.pow(2, this.reconnectAttempts - 1),
            this.config.maxReconnectDelay
        );

        Log.warn(
            "MMM-TempestWeather: reconnect scheduled in " +
            Math.round(delay / 1000) +
            " seconds."
        );

        this.current.lastUpdated = "Waiting for Tempest...";
        this.updateDom(0);

        this.socketReconnectTimer = setTimeout(function () {
            self.socketReconnectTimer = null;
            self.connectTempestSocket();
        }, delay);
    },

    closeTempestSocket: function () {
        if (!this.socket) {
            return;
        }

        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;

        try {
            this.socket.close();
        } catch (error) {
            Log.warn(
                "MMM-TempestWeather: error closing WebSocket: " +
                error
            );
        }

        this.socket = null;
    },

    connectTempestSocket: function () {
        var self = this;

        this.closeTempestSocket();

        if (!this.config.token || !this.config.deviceId) {
            Log.error(
                "MMM-TempestWeather: token or deviceId is missing."
            );

            this.current.lastUpdated =
                "Tempest configuration missing";

            this.updateDom(0);
            return;
        }

        this.connectionStartedTime = Date.now();

        this.current.lastUpdated = "Reconnecting...";
        this.updateDom(0);

        Log.info(
            "MMM-TempestWeather: connecting to Tempest WebSocket."
        );

        try {
            this.socket = new WebSocket(
                "wss://ws.weatherflow.com/swd/data" +
                "?token=" +
                encodeURIComponent(this.config.token)
            );
        } catch (error) {
            Log.error(
                "MMM-TempestWeather: unable to create WebSocket: " +
                error
            );

            this.scheduleSocketReconnect();
            return;
        }

        this.socket.onopen = function () {
            Log.info(
                "MMM-TempestWeather: Tempest WebSocket connected."
            );

            self.reconnectAttempts = 0;

            try {
                self.socket.send(
                    JSON.stringify({
                        type: "listen_start",
                        device_id: Number(self.config.deviceId),
                        id: "MMM-TempestWeather"
                    })
                );
            } catch (error) {
                Log.error(
                    "MMM-TempestWeather: could not start listener: " +
                    error
                );

                try {
                    self.socket.close();
                } catch (closeError) {
                    self.scheduleSocketReconnect();
                }
            }
        };

        this.socket.onmessage = function (event) {
            self.handleSocketMessage(event);
        };

        this.socket.onerror = function (error) {
            Log.error(
                "MMM-TempestWeather: WebSocket error."
            );

            self.current.lastUpdated = "Reconnecting...";
            self.updateDom(0);

            try {
                self.socket.close();
            } catch (closeError) {
                self.scheduleSocketReconnect();
            }
        };

        this.socket.onclose = function (event) {
            Log.warn(
                "MMM-TempestWeather: WebSocket closed. Code: " +
                event.code
            );

            self.socket = null;

            self.current.lastUpdated = "Reconnecting...";
            self.updateDom(0);

            self.scheduleSocketReconnect();
        };
    },

    handleSocketMessage: function (event) {
        var obj;

        try {
            obj = JSON.parse(event.data);
        } catch (error) {
            Log.warn(
                "MMM-TempestWeather: invalid WebSocket message."
            );
            return;
        }

        if (
            !obj ||
            !Array.isArray(obj.obs) ||
            !obj.obs[0]
        ) {
            return;
        }

        var observation = obj.obs[0];

        var temperatureC = Number(observation[7]);
        var windSpeedMps = Number(observation[2]);
        var relativeHumidity = Number(observation[8]);

        if (
            !this.validNumber(
                temperatureC,
                -60,
                70
            )
        ) {
            return;
        }

        var temperatureF = Math.round(
            temperatureC * 9 / 5 + 32
        );

        if (
            !this.validNumber(
                temperatureF,
                -76,
                158
            )
        ) {
            return;
        }

        this.lastObservationTime = Date.now();
        this.connectionStartedTime =
            this.lastObservationTime;

        this.current.temperature =
            temperatureF + "&deg;";

        this.current.lastUpdated =
            "Updated " +
            new Date().toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            });

        if (
            this.validNumber(
                windSpeedMps,
                0,
                100
            )
        ) {
            var windSpeedMph = Math.round(
                windSpeedMps * 2.236936
            );

            this.current.windSpeed =
                windSpeedMph + " MPH";
        }

        if (
            this.validNumber(
                relativeHumidity,
                0,
                100
            )
        ) {
            this.current.humidity =
                Math.round(relativeHumidity) + "%";
        }

        this.updateDom(0);
    },

    checkTempestConnection: function () {
        var now = Date.now();

        if (
            this.lastObservationTime !== 0 &&
            now - this.lastObservationTime >
                this.config.observationTimeout
        ) {
            Log.warn(
                "MMM-TempestWeather: observation stale; reconnecting."
            );

            this.current.lastUpdated =
                "Waiting for Tempest...";

            this.lastObservationTime = 0;

            this.updateDom(0);

            this.closeTempestSocket();
            this.scheduleSocketReconnect();

            return;
        }

        if (
            this.lastObservationTime === 0 &&
            this.connectionStartedTime !== 0 &&
            now - this.connectionStartedTime >
                this.config.initialConnectionTimeout
        ) {
            Log.warn(
                "MMM-TempestWeather: no initial observation; reconnecting."
            );

            this.current.lastUpdated =
                "Waiting for Tempest...";

            this.connectionStartedTime = now;

            this.updateDom(0);

            this.closeTempestSocket();
            this.scheduleSocketReconnect();

            return;
        }

        if (
            !this.socket ||
            this.socket.readyState === WebSocket.CLOSED
        ) {
            this.current.lastUpdated =
                "Reconnecting...";

            this.updateDom(0);
            this.scheduleSocketReconnect();
        }
    },

    startTempestConnection: function () {
        var self = this;

        this.connectTempestSocket();

        if (this.websocketWatchdogTimer) {
            clearInterval(
                this.websocketWatchdogTimer
            );
        }

        this.websocketWatchdogTimer =
            setInterval(function () {
                self.checkTempestConnection();
            }, this.config.watchdogInterval);
    },

    /*
     * Forecast timer
     */

    startForecastTimer: function () {
        var self = this;

        if (this.forecastUpdateTimer) {
            clearInterval(
                this.forecastUpdateTimer
            );
        }

        this.forecastUpdateTimer =
            setInterval(function () {
                self.getData();
            }, this.config.updateInterval);
    },

    /*
     * Weather icons
     */

    meteoconsFileFromTempest: function (iconName) {
        if (!iconName) {
            return "not-available";
        }

        var icon =
            String(iconName).toLowerCase();

        if (icon.indexOf("thunder") >= 0) {
            return "thunderstorms";
        }

        if (icon.indexOf("sleet") >= 0) {
            return "sleet";
        }

        if (icon.indexOf("hail") >= 0) {
            return "hail";
        }

        if (
            icon.indexOf("snow") >= 0 ||
            icon.indexOf("wintry") >= 0
        ) {
            return "snow";
        }

        if (icon.indexOf("drizzle") >= 0) {
            return "drizzle";
        }

        if (
            icon.indexOf("rain") >= 0 ||
            icon.indexOf("shower") >= 0
        ) {
            return "rain";
        }

        if (
            icon.indexOf("fog") >= 0 ||
            icon.indexOf("mist") >= 0
        ) {
            return "fog";
        }

        if (icon.indexOf("haze") >= 0) {
            return "haze";
        }

        if (icon.indexOf("smoke") >= 0) {
            return "smoke";
        }

        if (icon.indexOf("wind") >= 0) {
            return "wind";
        }

        if (icon.indexOf("overcast") >= 0) {
            return "overcast";
        }

        if (
            icon.indexOf("cloud") >= 0 &&
            icon.indexOf("partly") < 0
        ) {
            return "cloudy";
        }

        if (icon.indexOf("partly") >= 0) {
            return "partly-cloudy-day";
        }

        if (
            icon.indexOf("clear") >= 0 ||
            icon.indexOf("sun") >= 0
        ) {
            return "clear-day";
        }

        return "not-available";
    },

    iconSVG: function (iconName) {
        var fileName =
            this.meteoconsFileFromTempest(iconName);

        var source =
            "https://cdn.jsdelivr.net/npm/" +
            "@bybas/weather-icons@2.0.0/" +
            "production/fill/all/" +
            fileName +
            ".svg";

        return (
            '<img src="' +
            source +
            '" alt="' +
            fileName +
            '" loading="lazy">'
        );
    },

    /*
     * Barometer
     */

    mbToInHg: function (value) {
        return (
            Number(value) *
            0.0295299830714
        );
    },

    baroArrowHtml: function (trend) {
        var normalizedTrend =
            String(
                trend || "unknown"
            ).toLowerCase();

        if (normalizedTrend === "rising") {
            return (
                '<span class="tempestBaroUp">↑</span>'
            );
        }

        if (normalizedTrend === "falling") {
            return (
                '<span class="tempestBaroDown">↓</span>'
            );
        }

        if (normalizedTrend === "steady") {
            return (
                '<span class="tempestBaroFlat">→</span>'
            );
        }

        return (
            '<span class="tempestBaroUnknown">•</span>'
        );
    },

    getPressureMb: function (currentConditions) {
        if (!currentConditions) {
            return null;
        }

        var possibleValues = [
            currentConditions.sea_level_pressure_mb,
            currentConditions.station_pressure_mb,
            currentConditions.pressure_mb,
            currentConditions.sea_level_pressure,
            currentConditions.station_pressure,
            currentConditions.pressure
        ];

        for (
            var i = 0;
            i < possibleValues.length;
            i++
        ) {
            var value =
                Number(possibleValues[i]);

            if (
                Number.isFinite(value) &&
                value >= 800 &&
                value <= 1100
            ) {
                return value;
            }
        }

        return null;
    },

    /*
     * Better Forecast REST request
     */

    getData: function () {
        var self = this;

        if (this.forecastRequestInProgress) {
            Log.warn(
                "MMM-TempestWeather: skipping overlapping forecast request."
            );
            return;
        }

        if (
            !this.config.token ||
            !this.config.stationId
        ) {
            Log.error(
                "MMM-TempestWeather: token or stationId is missing."
            );

            return;
        }

        this.forecastRequestInProgress = true;

        var controller =
            new AbortController();

        var requestTimeout =
            setTimeout(function () {
                controller.abort();
            }, 15000);

        var url =
            "https://swd.weatherflow.com/swd/rest/better_forecast" +
            "?station_id=" +
            encodeURIComponent(this.config.stationId) +
            "&token=" +
            encodeURIComponent(this.config.token) +
            "&units_temp=f" +
            "&units_wind=mph" +
            "&units_precip=in";

        fetch(url, {
            signal: controller.signal,
            cache: "no-store"
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(
                        "WeatherFlow forecast returned HTTP " +
                        response.status
                    );
                }

                return response.json();
            })
            .then(function (data) {
                self.processForecast(data);
            })
            .catch(function (error) {
                if (
                    error &&
                    error.name === "AbortError"
                ) {
                    Log.error(
                        "MMM-TempestWeather: forecast request timed out."
                    );
                } else {
                    Log.error(
                        "MMM-TempestWeather: forecast update failed: " +
                        error
                    );
                }
            })
            .finally(function () {
                clearTimeout(requestTimeout);
                self.forecastRequestInProgress = false;
            });
    },

    processForecast: function (data) {
        if (
            !data ||
            !data.forecast ||
            !Array.isArray(data.forecast.daily) ||
            data.forecast.daily.length < 1
        ) {
            Log.error(
                "MMM-TempestWeather: forecast response incomplete."
            );

            return;
        }

        var dailyForecast =
            data.forecast.daily;

        var today =
            dailyForecast[0] || {};

        var currentConditions =
            data.current_conditions || {};

        this.current.conditions =
            today.conditions || "Unavailable";

        this.current.precipChance =
            this.validNumber(
                today.precip_probability,
                0,
                100
            )
                ? Math.round(
                    Number(
                        today.precip_probability
                    )
                ) + "%"
                : "—";

        this.current.windDirection =
            currentConditions
                .wind_direction_cardinal ||
            "—";

        var precipitationValue =
            Number(
                currentConditions
                    .precip_accum_local_day
            );

        this.current.precipAccum =
            Number.isFinite(
                precipitationValue
            ) &&
            precipitationValue >= 0 &&
            precipitationValue < 100
                ? precipitationValue.toFixed(2) +
                  '"'
                : "—";

        var pressureTrend =
            currentConditions.pressure_trend ||
            "unknown";

        var barometerHtml =
            this.baroArrowHtml(
                pressureTrend
            );

        var pressureMb =
            this.getPressureMb(
                currentConditions
            );

        if (Number.isFinite(pressureMb)) {
            barometerHtml +=
                '&nbsp;<span class="tempestPressure">' +
                this.mbToInHg(
                    pressureMb
                ).toFixed(2) +
                '"</span>';
        }

        this.current.barometerHtml =
            barometerHtml;

        this.forecast = [];

        var numberOfDays = Math.min(
            this.config.forecastDays,
            dailyForecast.length
        );

        for (
            var i = 0;
            i < numberOfDays;
            i++
        ) {
            var day =
                dailyForecast[i] || {};

            var dayStart =
                Number(day.day_start_local);

            var dayOfWeek =
                Number.isFinite(dayStart)
                    ? new Date(
                        dayStart * 1000
                    ).toLocaleDateString(
                        "en-US",
                        {
                            weekday: "short"
                        }
                    )
                    : "—";

            var high =
                this.validNumber(
                    day.air_temp_high,
                    -100,
                    180
                )
                    ? Math.round(
                        Number(
                            day.air_temp_high
                        )
                    )
                    : "—";

            var low =
                this.validNumber(
                    day.air_temp_low,
                    -100,
                    180
                )
                    ? Math.round(
                        Number(
                            day.air_temp_low
                        )
                    )
                    : "—";

            var precipitationProbability =
                this.validNumber(
                    day.precip_probability,
                    0,
                    100
                )
                    ? Math.round(
                        Number(
                            day.precip_probability
                        )
                    ) + "%"
                    : "—";

            this.forecast.push({
                dayOfWeek:
                    dayOfWeek,

                icon:
                    day.icon,

                high:
                    high,

                low:
                    low,

                precipitationProbability:
                    precipitationProbability
            });
        }

        this.updateDom(0);
    },

    suspend: function () {
        this.closeTempestSocket();

        if (this.socketReconnectTimer) {
            clearTimeout(
                this.socketReconnectTimer
            );

            this.socketReconnectTimer = null;
        }

        if (this.websocketWatchdogTimer) {
            clearInterval(
                this.websocketWatchdogTimer
            );

            this.websocketWatchdogTimer = null;
        }

        if (this.forecastUpdateTimer) {
            clearInterval(
                this.forecastUpdateTimer
            );

            this.forecastUpdateTimer = null;
        }
    },

    resume: function () {
        this.getData();
        this.startForecastTimer();
        this.startTempestConnection();
    }

});
