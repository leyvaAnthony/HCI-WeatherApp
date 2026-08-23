const state = {
    latitude: 41.8781,
    longitude: -87.6298,
    locationName: "Alsip, IL"
};

const weatherCodes = {
    0: ["☀️", "Sunny"],
    1: ["🌤️", "Mostly Clear"],
    2: ["⛅", "Partly Cloudy"],
    3: ["☁️", "Overcast"],
    45: ["🌫️", "Fog"],
    48: ["🌫️", "Rime Fog"],
    51: ["🌦️", "Light Drizzle"],
    53: ["🌦️", "Drizzle"],
    55: ["🌧️", "Heavy Drizzle"],
    56: ["🌧️", "Freezing Drizzle"],
    57: ["🌧️", "Heavy Freezing Drizzle"],
    61: ["🌦️", "Light Rain"],
    63: ["🌧️", "Rain"],
    65: ["🌧️", "Heavy Rain"],
    66: ["🌧️", "Freezing Rain"],
    67: ["🌧️", "Heavy Freezing Rain"],
    71: ["🌨️", "Light Snow"],
    73: ["🌨️", "Snow"],
    75: ["❄️", "Heavy Snow"],
    77: ["🌨️", "Snow Grains"],
    80: ["🌦️", "Rain Showers"],
    81: ["🌧️", "Rain Showers"],
    82: ["⛈️", "Heavy Rain Showers"],
    85: ["🌨️", "Snow Showers"],
    86: ["❄️", "Heavy Snow Showers"],
    95: ["⛈️", "Thunderstorm"],
    96: ["⛈️", "Thunderstorm + Hail"],
    99: ["⛈️", "Thunderstorm + Hail"]
};

const $ = (id) => document.getElementById(id);

function getWeatherInfo(code) {
    return weatherCodes[code] || ["🌡️", "Unknown"];
}

function formatDay(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString(undefined, { weekday: "short" });
}

function formatHour(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit"
    });
}

async function searchLocation(city) {
    const url =
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}` +
        `&count=1&language=en&format=json`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not search for that location.");

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error("Location not found.");
    }

    const result = data.results[0];

    state.latitude = result.latitude;
    state.longitude = result.longitude;

    const region = result.admin1 ? `, ${result.admin1}` : "";
    state.locationName = `${result.name}${region}`;

    await loadWeather();
}

async function loadWeather() {
    $("status").textContent = "Updating weather...";

    const params = new URLSearchParams({
        latitude: state.latitude,
        longitude: state.longitude,
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
        hourly: "temperature_2m,weather_code,precipitation_probability",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        timezone: "auto",
        forecast_days: "7"
    });

    const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error("Could not load weather data.");
    }

    const data = await response.json();

    const current = data.current;
    const currentInfo = getWeatherInfo(current.weather_code);

    $("location").textContent = state.locationName;
    $("weatherIcon").textContent = currentInfo[0];
    $("temperature").textContent = `${Math.round(current.temperature_2m)}°`;
    $("condition").textContent = currentInfo[1];
    $("feelsLike").textContent = `${Math.round(current.apparent_temperature)}°`;
    $("humidity").textContent = `${Math.round(current.relative_humidity_2m)}%`;
    $("wind").textContent = `${Math.round(current.wind_speed_10m)} mph`;
    $("highTemp").textContent = `H: ${Math.round(data.daily.temperature_2m_max[0])}°`;
    $("lowTemp").textContent = `L: ${Math.round(data.daily.temperature_2m_min[0])}°`;

    const currentHourIndex = data.hourly.time.findIndex(
        (time) => time >= current.time
    );
    const startHour = currentHourIndex >= 0 ? currentHourIndex : 0;

    const hourlyHTML = data.hourly.time
        .slice(startHour, startHour + 12)
        .map((time, index) => {
            const i = startHour + index;
            const info = getWeatherInfo(data.hourly.weather_code[i]);
            return `
                <div class="hour-card">
                    <div class="hour-time">${formatHour(time)}</div>
                    <div class="hour-icon">${info[0]}</div>
                    <div class="hour-temp">${Math.round(data.hourly.temperature_2m[i])}°</div>
                </div>
            `;
        })
        .join("");

    $("hourlyList").innerHTML = hourlyHTML;

    const dailyHTML = data.daily.time
        .map((date, i) => {
            const info = getWeatherInfo(data.daily.weather_code[i]);
            const rain = data.daily.precipitation_probability_max[i];

            return `
                <div class="day-card">
                    <div>
                        <div class="day-name">${i === 0 ? "Today" : formatDay(date)}</div>
                        <div class="detail-label">${rain}% rain chance</div>
                    </div>
                    <div class="day-icon">${info[0]}</div>
                    <div class="day-temps">
                        <span class="day-high">${Math.round(data.daily.temperature_2m_max[i])}°</span>
                        <span class="day-low">${Math.round(data.daily.temperature_2m_min[i])}°</span>
                    </div>
                </div>
            `;
        })
        .join("");

    $("dailyList").innerHTML = dailyHTML;

    const nextFewHours = data.hourly.precipitation_probability.slice(
        startHour,
        startHour + 4
    );

    const maxRainChance = Math.max(...nextFewHours);
    $("rainChance").textContent = `${Math.round(maxRainChance)}%`;

    if (maxRainChance >= 50) {
        $("rainAdvice").textContent = "It is recommended to bring a raincoat or an umbrella!";
    } else {
        $("rainAdvice").textContent = "It is not likely to rain within the next few hours!";
    }
    const dailyRainData = data.daily.precipitation_probability_max;
    const todayRainChance = dailyRainData[0];
    const tomorrowRainChance = dailyRainData[1] || 0;
    const dayAfterRainChance = dailyRainData[2] || 0;

    let carWashMessage = "";
    

    
    const maxRainNext48 = Math.max(todayRainChance, tomorrowRainChance);

    if (maxRainNext48 < 30) {
        carWashMessage = "No rain expected in the next 48 hours, so it is recommended to wash your car!";
    } else {
        carWashMessage = "Rain is expected in the next 48 hours, so it is not recommended to wash your car!";
    }

    
    if (todayRainChance > 50) {
        carWashMessage += " Rain likely today!";
    } else if (tomorrowRainChance > 50) {
        carWashMessage += " Rain expected tomorrow.";
    }

    $("carWashAdvice").textContent = `${carWashMessage}`;

    $("status").textContent = `Updated ${new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    })}`;
}

$("searchButton").addEventListener("click", () => {
    $("locationInput").focus();
    $("locationInput").parentElement.classList.toggle("open");
});

$("searchSubmit").addEventListener("click", async () => {
    const city = $("locationInput").value.trim();
    if (!city) return;

    try {
        await searchLocation(city);
    } catch (error) {
        $("status").textContent = error.message;
    }
});

$("locationInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        $("searchSubmit").click();
    }
});

loadWeather().catch((error) => {
    $("status").textContent = error.message;
});
