/* MagicMirror²
 * Module: MMM-TempestWeather
 *
 * Node helper for WeatherFlow communications.
 *
 * Version 1.2
 */

const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    start: function () {
        console.log(
            "MMM-TempestWeather node_helper started."
        );

        this.config = null;

        this.socket = null;
        this.socketReconnectTimer = null;
        this.websocketWatchdogTimer = null;
        this.forecastUpdateTimer = null;

        this.lastObservationTime = 0;
        this.connectionStartedTime = 0;
        this.reconnectAttempts = 0;
        this.forecastRequestInProgress = false;
    },

    socketNotificationReceived: function (
        notification,
        payload
    ) {
        if (notification === "TEMPEST_INIT") {
            this.initialize(payload);
            return;
        }

        if (notification === "TEMPEST_REFRESH") {
            this.getForecast();
            return;
        }

        if (notification === "TEMPEST_STOP") {
            this.stopAllTimers();
            this.closeTempestSocket();
        }
    },

    initialize: function (config) {
        this.stopAllTimers();
        this.closeTempestSocket();

        this.config = config || {};

        this.lastObservationTime = 0;
        this.connectionStartedTime = 0;
        this.reconnectAttempts = 0;
        this.forecastRequestInProgress = false;

        if (
            !this.config.token ||
            !this.config.deviceId ||
            !this.config.stationId
        ) {
            console.error(
                "MMM-TempestWeather: required configuration is missing."
            );

            this.sendSocketNotification(
                "TEMPEST_STATUS",
                "Tempest configuration missing"
            );

            return;
        }

        this.getForecast();
        this.startForecastTimer();
        this.startTempestConnection();
    },

    /*
     * Number validation
     */

    validNumber: function (
        value,
        minimum,
        maximum
    ) {
        const number = Number(value);

        return (
            Number.isFinite(number) &&
            number >= minimum &&
            number <= maximum
        );
    },

    /*
     * WebSocket connection
     */

    startTempestConnection: function () {
        this.connectTempestSocket();

        if (this.websocketWatchdogTimer) {
            clearInterval(
                this.websocketWatchdogTimer
            );
        }

        const interval =
            this.config.watchdogInterval ||
            60 * 1000;

        this.websocketWatchdogTimer =
            setInterval(() => {
                this.checkTempestConnection();
            }, interval);
    },

    connectTempestSocket: function () {
        this.closeTempestSocket();

        if (
            !this.config ||
            !this.config.token ||
            !this.config.deviceId
        ) {
            console.error(
                "MMM-TempestWeather: token or deviceId is missing."
            );

            this.sendSocketNotification(
                "TEMPEST_STATUS",
                "Tempest configuration missing"
            );

            return;
        }

        if (typeof WebSocket === "undefined") {
            console.error(
                "MMM-TempestWeather: WebSocket is unavailable in Node."
            );

            this.sendSocketNotification(
                "TEMPEST_STATUS",
                "WebSocket unavailable"
            );

            return;
        }

        this.connectionStartedTime =
            Date.now();

        this.sendSocketNotification(
            "TEMPEST_STATUS",
            "Reconnecting..."
        );

        console.log(
            "MMM-TempestWeather: connecting to Tempest WebSocket."
        );

        try {
            this.socket = new WebSocket(
                "wss://ws.weatherflow.com/swd/data" +
                "?token=" +
                encodeURIComponent(
                    this.config.token
                )
            );
        } catch (error) {
            console.error(
                "MMM-TempestWeather: unable to create WebSocket:",
                error
            );

            this.scheduleSocketReconnect();
            return;
        }

        this.socket.onopen = () => {
            console.log(
                "MMM-TempestWeather: Tempest WebSocket connected."
            );

            this.reconnectAttempts = 0;

            try {
                this.socket.send(
                    JSON.stringify({
                        type: "listen_start",
                        device_id: Number(
                            this.config.deviceId
                        ),
                        id: "MMM-TempestWeather"
                    })
                );
            } catch (error) {
                console.error(
                    "MMM-TempestWeather: could not start listener:",
                    error
                );

                try {
                    this.socket.close();
                } catch (closeError) {
                    this.scheduleSocketReconnect();
                }
            }
        };

        this.socket.onmessage = (event) => {
            this.handleSocketMessage(
                event
            );
        };

        this.socket.onerror = () => {
            console.error(
                "MMM-TempestWeather: WebSocket error."
            );

            this.sendSocketNotification(
                "TEMPEST_STATUS",
                "Reconnecting..."
            );

            try {
                this.socket.close();
            } catch (closeError) {
                this.scheduleSocketReconnect();
            }
        };

        this.socket.onclose = (event) => {
            console.warn(
                "MMM-TempestWeather: WebSocket closed. Code:",
                event.code
            );

            this.socket = null;

            this.sendSocketNotification(
                "TEMPEST_STATUS",
                "Reconnecting..."
            );

            this.scheduleSocketReconnect();
        };
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
            console.warn(
                "MMM-TempestWeather: error closing WebSocket:",
                error
            );
        }

        this.socket = null;
    },

    scheduleSocketReconnect: function () {
        if (this.socketReconnectTimer) {
            return;
        }

        this.reconnectAttempts++;

        const maxReconnectDelay =
            this.config.maxReconnectDelay ||
            60 * 1000;

        const delay = Math.min(
            5000 *
                Math.pow(
                    2,
                    this.reconnectAttempts - 1
                ),
            maxReconnectDelay
        );

        console.warn(
            "MMM-TempestWeather: reconnect scheduled in " +
            Math.round(delay / 1000) +
            " seconds."
        );

        this.sendSocketNotification(
            "TEMPEST_STATUS",
            "Waiting for Tempest..."
        );

        this.socketReconnectTimer =
            setTimeout(() => {
                this.socketReconnectTimer = null;
                this.connectTempestSocket();
            }, delay);
    },

    handleSocketMessage: function (
        event
    ) {
        let obj;

        try {
            obj = JSON.parse(
                event.data
            );
        } catch (error) {
            console.warn(
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

        const observation =
            obj.obs[0];

        const temperatureC =
            Number(
                observation[7]
            );

        const windSpeedMps =
            Number(
                observation[2]
            );

        const relativeHumidity =
            Number(
                observation[8]
            );

        if (
            !this.validNumber(
                temperatureC,
                -60,
                70
            )
        ) {
            return;
        }

        const temperatureF =
            Math.round(
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

        this.lastObservationTime =
            Date.now();

        this.connectionStartedTime =
            this.lastObservationTime;

        this.sendSocketNotification(
            "TEMPEST_OBSERVATION",
            {
                temperatureF:
                    temperatureF,

                temperatureC:
                    temperatureC,

                windSpeedMps:
                    this.validNumber(
                        windSpeedMps,
                        0,
                        100
                    )
                        ? windSpeedMps
                        : null,

                relativeHumidity:
                    this.validNumber(
                        relativeHumidity,
                        0,
                        100
                    )
                        ? relativeHumidity
                        : null,

                observationTime:
                    this.lastObservationTime
            }
        );
    },

    checkTempestConnection: function () {
        const now =
            Date.now();

        const observationTimeout =
            this.config.observationTimeout ||
            3 * 60 * 1000;

        const initialConnectionTimeout =
            this.config.initialConnectionTimeout ||
            3 * 60 * 1000;

        if (
            this.lastObservationTime !== 0 &&
            now - this.lastObservationTime >
                observationTimeout
        ) {
            console.warn(
                "MMM-TempestWeather: observation stale; reconnecting."
            );

            this.lastObservationTime = 0;

            this.sendSocketNotification(
                "TEMPEST_STATUS",
                "Waiting for Tempest..."
            );

            this.closeTempestSocket();
            this.scheduleSocketReconnect();

            return;
        }

        if (
            this.lastObservationTime === 0 &&
            this.connectionStartedTime !== 0 &&
            now - this.connectionStartedTime >
                initialConnectionTimeout
        ) {
            console.warn(
                "MMM-TempestWeather: no initial observation; reconnecting."
            );

            this.connectionStartedTime =
                now;

            this.sendSocketNotification(
                "TEMPEST_STATUS",
                "Waiting for Tempest..."
            );

            this.closeTempestSocket();
            this.scheduleSocketReconnect();

            return;
        }

        if (!this.socket) {
            this.sendSocketNotification(
                "TEMPEST_STATUS",
                "Reconnecting..."
            );

            this.scheduleSocketReconnect();
        }
    },

    /*
     * Better Forecast REST request
     */

    startForecastTimer: function () {
        if (this.forecastUpdateTimer) {
            clearInterval(
                this.forecastUpdateTimer
            );
        }

        const interval =
            this.config.updateInterval ||
            60 * 1000;

        this.forecastUpdateTimer =
            setInterval(() => {
                this.getForecast();
            }, interval);
    },

    getForecast: function () {
        if (
            this.forecastRequestInProgress
        ) {
            console.warn(
                "MMM-TempestWeather: skipping overlapping forecast request."
            );

            return;
        }

        if (
            !this.config ||
            !this.config.token ||
            !this.config.stationId
        ) {
            console.error(
                "MMM-TempestWeather: token or stationId is missing."
            );

            return;
        }

        this.forecastRequestInProgress =
            true;

        const controller =
            new AbortController();

        const requestTimeout =
            setTimeout(() => {
                controller.abort();
            }, 15000);

        const url =
            "https://swd.weatherflow.com/swd/rest/better_forecast" +
            "?station_id=" +
            encodeURIComponent(
                this.config.stationId
            ) +
            "&token=" +
            encodeURIComponent(
                this.config.token
            ) +
(
                this.config.units === "metric"
                    ? "&units_temp=c" +
                      "&units_wind=kph" +
                      "&units_precip=mm"
                    : "&units_temp=f" +
                      "&units_wind=mph" +
                      "&units_precip=in"
            );

        fetch(url, {
            signal:
                controller.signal,

            cache:
                "no-store"
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        "WeatherFlow forecast returned HTTP " +
                        response.status
                    );
                }

                return response.json();
            })
            .then((data) => {
                this.sendSocketNotification(
                    "TEMPEST_FORECAST",
                    data
                );
            })
            .catch((error) => {
                if (
                    error &&
                    error.name ===
                        "AbortError"
                ) {
                    console.error(
                        "MMM-TempestWeather: forecast request timed out."
                    );
                } else {
                    console.error(
                        "MMM-TempestWeather: forecast update failed:",
                        error
                    );
                }
            })
            .finally(() => {
                clearTimeout(
                    requestTimeout
                );

                this.forecastRequestInProgress =
                    false;
            });
    },

    /*
     * Cleanup
     */

    stopAllTimers: function () {
        if (
            this.socketReconnectTimer
        ) {
            clearTimeout(
                this.socketReconnectTimer
            );

            this.socketReconnectTimer =
                null;
        }

        if (
            this.websocketWatchdogTimer
        ) {
            clearInterval(
                this.websocketWatchdogTimer
            );

            this.websocketWatchdogTimer =
                null;
        }

        if (
            this.forecastUpdateTimer
        ) {
            clearInterval(
                this.forecastUpdateTimer
            );

            this.forecastUpdateTimer =
                null;
        }
    },

    stop: function () {
        this.stopAllTimers();
        this.closeTempestSocket();
    }

});