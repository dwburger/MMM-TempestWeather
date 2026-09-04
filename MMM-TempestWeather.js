/* MagicMirror²
 * Module: MMM-TempestWeather
 *
 * Tempest WeatherFlow dashboard
 *
 * Version 1.1
 * WeatherFlow communications are handled by node_helper.js.
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
            self.sendSocketNotification(
                "TEMPEST_INIT",
                self.config
            );
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
        temp.innerHTML =
            this.current.temperature || "&nbsp;";
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
        value.className =
            "tempestValue tempestWind";
        value.textContent =
            this.current.windSpeed;
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
        value.className =
            "tempestValue tempestWind";
        value.textContent =
            this.current.windDirection;
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
        value.textContent =
            this.current.humidity;
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
        value.innerHTML =
            this.current.barometerHtml;
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
        value.textContent =
            this.current.precipChance;
        row.appendChild(value);

        tbody.appendChild(row);

        /*
         * Conditions / precipitation today
         */

        row = document.createElement("tr");

        var conditions =
            document.createElement("td");
        conditions.className =
            "tempestConditions";
        conditions.textContent =
            this.current.conditions;
        row.appendChild(conditions);

        title = document.createElement("td");
        title.className = "tempestTitle";
        title.innerHTML = "Today:&nbsp;";
        row.appendChild(title);

        value = document.createElement("td");
        value.className = "tempestValue";
        value.textContent =
            this.current.precipAccum;
        row.appendChild(value);

        tbody.appendChild(row);

        table.appendChild(tbody);
        wrapper.appendChild(table);

        /*
         * Five-day forecast
         */

        var forecastWrap =
            document.createElement("div");
        forecastWrap.className =
            "tempestForecastWrap";

        var forecastRow =
            document.createElement("div");
        forecastRow.className =
            "tempestForecast";

        var precipRow =
            document.createElement("div");
        precipRow.className =
            "tempestForecastPrecip";

        for (
            var i = 0;
            i < this.forecast.length;
            i++
        ) {
            var day = this.forecast[i];

            var dayCell =
                document.createElement("div");
            dayCell.className =
                "tempestForecastDay";

            var dow =
                document.createElement("div");
            dow.className =
                "tempestForecastDow";
            dow.textContent =
                day.dayOfWeek;
            dayCell.appendChild(dow);

            var icon =
                document.createElement("div");
            icon.className =
                "tempestForecastIcon";
            icon.innerHTML =
                this.iconSVG(day.icon);
            dayCell.appendChild(icon);

            var temps =
                document.createElement("div");
            temps.className =
                "tempestForecastTemps";

            var high =
                document.createElement("span");
            high.className =
                "tempestForecastHigh";
            high.innerHTML =
                day.high + "&deg;";
            temps.appendChild(high);

            var low =
                document.createElement("span");
            low.className =
                "tempestForecastLow";
            low.innerHTML =
                "/" + day.low + "&deg;";
            temps.appendChild(low);

            dayCell.appendChild(temps);
            forecastRow.appendChild(dayCell);

            var precipCell =
                document.createElement("div");
            precipCell.className =
                "tempestPrecipCell";
            precipCell.textContent =
                day.precipitationProbability;
            precipRow.appendChild(
                precipCell
            );
        }

        forecastWrap.appendChild(
            forecastRow
        );

        forecastWrap.appendChild(
            precipRow
        );

        wrapper.appendChild(
            forecastWrap
        );

        /*
         * Last updated
         */

        var lastUpdated =
            document.createElement("div");

        lastUpdated.className =
            "tempestLastUpdated";

        lastUpdated.textContent =
            this.current.lastUpdated;

        wrapper.appendChild(
            lastUpdated
        );

        return wrapper;
    },

    /*
     * Messages from node_helper.js
     */

    socketNotificationReceived: function (
        notification,
        payload
    ) {
        if (
            notification ===
            "TEMPEST_STATUS"
        ) {
            this.current.lastUpdated =
                payload ||
                "Waiting for Tempest...";

            this.updateDom(0);
            return;
        }

        if (
            notification ===
            "TEMPEST_OBSERVATION"
        ) {
            this.processObservation(
                payload
            );

            return;
        }

        if (
            notification ===
            "TEMPEST_FORECAST"
        ) {
            this.processForecast(
                payload
            );
        }
    },

    /*
     * Real-time observation from helper
     */

    processObservation: function (
        observation
    ) {
        if (!observation) {
            return;
        }

        if (
            this.validNumber(
                observation.temperatureF,
                -76,
                158
            )
        ) {
            this.current.temperature =
                Math.round(
                    Number(
                        observation.temperatureF
                    )
                ) +
                "&deg;";
        }

        if (
            this.validNumber(
                observation.windSpeedMps,
                0,
                100
            )
        ) {
            var windSpeedMph =
                Math.round(
                    Number(
                        observation.windSpeedMps
                    ) *
                    2.236936
                );

            this.current.windSpeed =
                windSpeedMph +
                " MPH";
        }

        if (
            this.validNumber(
                observation.relativeHumidity,
                0,
                100
            )
        ) {
            this.current.humidity =
                Math.round(
                    Number(
                        observation.relativeHumidity
                    )
                ) +
                "%";
        }

        this.current.lastUpdated =
            "Updated " +
            new Date().toLocaleTimeString(
                [],
                {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                }
            );

        this.updateDom(0);
    },

    /*
     * Number validation
     */

    validNumber: function (
        value,
        minimum,
        maximum
    ) {
        var number = Number(value);

        return (
            Number.isFinite(number) &&
            number >= minimum &&
            number <= maximum
        );
    },

    /*
     * Weather icons
     */

    meteoconsFileFromTempest: function (
        iconName
    ) {
        if (!iconName) {
            return "not-available";
        }

        var icon =
            String(iconName).toLowerCase();

        if (
            icon.indexOf("thunder") >= 0
        ) {
            return "thunderstorms";
        }

        if (
            icon.indexOf("sleet") >= 0
        ) {
            return "sleet";
        }

        if (
            icon.indexOf("hail") >= 0
        ) {
            return "hail";
        }

        if (
            icon.indexOf("snow") >= 0 ||
            icon.indexOf("wintry") >= 0
        ) {
            return "snow";
        }

        if (
            icon.indexOf("drizzle") >= 0
        ) {
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

        if (
            icon.indexOf("haze") >= 0
        ) {
            return "haze";
        }

        if (
            icon.indexOf("smoke") >= 0
        ) {
            return "smoke";
        }

        if (
            icon.indexOf("wind") >= 0
        ) {
            return "wind";
        }

        if (
            icon.indexOf("overcast") >= 0
        ) {
            return "overcast";
        }

        if (
            icon.indexOf("cloud") >= 0 &&
            icon.indexOf("partly") < 0
        ) {
            return "cloudy";
        }

        if (
            icon.indexOf("partly") >= 0
        ) {
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
            this.meteoconsFileFromTempest(
                iconName
            );

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

    baroArrowHtml: function (
        trend
    ) {
        var normalizedTrend =
            String(
                trend || "unknown"
            ).toLowerCase();

        if (
            normalizedTrend ===
            "rising"
        ) {
            return (
                '<span class="tempestBaroUp">↑</span>'
            );
        }

        if (
            normalizedTrend ===
            "falling"
        ) {
            return (
                '<span class="tempestBaroDown">↓</span>'
            );
        }

        if (
            normalizedTrend ===
            "steady"
        ) {
            return (
                '<span class="tempestBaroFlat">→</span>'
            );
        }

        return (
            '<span class="tempestBaroUnknown">•</span>'
        );
    },

    getPressureMb: function (
        currentConditions
    ) {
        if (!currentConditions) {
            return null;
        }

        var possibleValues = [
            currentConditions
                .sea_level_pressure_mb,

            currentConditions
                .station_pressure_mb,

            currentConditions
                .pressure_mb,

            currentConditions
                .sea_level_pressure,

            currentConditions
                .station_pressure,

            currentConditions
                .pressure
        ];

        for (
            var i = 0;
            i < possibleValues.length;
            i++
        ) {
            var value =
                Number(
                    possibleValues[i]
                );

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
     * Better Forecast processing
     *
     * The REST request itself now occurs
     * in node_helper.js.
     */

    processForecast: function (data) {
        if (
            !data ||
            !data.forecast ||
            !Array.isArray(
                data.forecast.daily
            ) ||
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
            today.conditions ||
            "Unavailable";

        this.current.precipChance =
            this.validNumber(
                today.precip_probability,
                0,
                100
            )
                ? Math.round(
                    Number(
                        today
                            .precip_probability
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
                ? precipitationValue
                    .toFixed(2) +
                  '"'
                : "—";

        var pressureTrend =
            currentConditions
                .pressure_trend ||
            "unknown";

        var barometerHtml =
            this.baroArrowHtml(
                pressureTrend
            );

        var pressureMb =
            this.getPressureMb(
                currentConditions
            );

        if (
            Number.isFinite(
                pressureMb
            )
        ) {
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

        var numberOfDays =
            Math.min(
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
                Number(
                    day.day_start_local
                );

            var dayOfWeek =
                Number.isFinite(
                    dayStart
                )
                    ? new Date(
                        dayStart * 1000
                    ).toLocaleDateString(
                        "en-US",
                        {
                            weekday:
                                "short"
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
                            day
                                .precip_probability
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

    /*
     * MagicMirror lifecycle
     */

    suspend: function () {
        this.sendSocketNotification(
            "TEMPEST_STOP"
        );
    },

    resume: function () {
        this.current.lastUpdated =
            "Waiting for Tempest...";

        this.updateDom(0);

        this.sendSocketNotification(
            "TEMPEST_INIT",
            this.config
        );
    }

});