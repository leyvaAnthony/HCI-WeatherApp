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

// =============================================
// 🔍 AUTOCOMPLETE DROPDOWN
// =============================================

const locationInput = document.getElementById('locationInput');
const suggestionsDropdown = document.getElementById('suggestionsDropdown');

locationInput.addEventListener('input', async function() {
    const query = this.value.trim();
    
    if (query.length < 2) {
        suggestionsDropdown.innerHTML = '';
        suggestionsDropdown.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
        );
        const data = await response.json();
        const locations = data.results || [];
        
        suggestionsDropdown.innerHTML = '';
        
        if (locations.length === 0) {
            suggestionsDropdown.style.display = 'none';
            return;
        }
        
        locations.forEach((loc) => {
            const li = document.createElement('li');
            
            let displayName = loc.name;
            if (loc.admin1) displayName += `, ${loc.admin1}`;
            if (loc.country) displayName += `, ${loc.country}`;
            
            li.textContent = displayName;
            li.dataset.lat = loc.latitude;
            li.dataset.lon = loc.longitude;
            li.dataset.displayName = displayName;
            
            li.addEventListener('click', function() {
                locationInput.value = this.dataset.displayName;
                suggestionsDropdown.innerHTML = '';
                suggestionsDropdown.style.display = 'none';
                
                state.latitude = parseFloat(this.dataset.lat);
                state.longitude = parseFloat(this.dataset.lon);
                state.locationName = this.dataset.displayName;
                
                loadWeather().catch((error) => {
                    document.getElementById('status').textContent = error.message;
                });
            });
            
            suggestionsDropdown.appendChild(li);
        });
        
        suggestionsDropdown.style.display = 'block';
        
    } catch (error) {
        console.error('Error fetching locations:', error);
        suggestionsDropdown.style.display = 'none';
    }
});

document.addEventListener('click', function(e) {
    const searchArea = document.querySelector('.search-area');
    if (searchArea && !searchArea.contains(e.target)) {
        suggestionsDropdown.innerHTML = '';
        suggestionsDropdown.style.display = 'none';
    }
});

locationInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const firstItem = suggestionsDropdown.querySelector('li');
        if (firstItem) {
            firstItem.click();
            e.preventDefault();
        }
    }
});

// =============================================
// 🌤️ WEATHER FUNCTIONS
// =============================================

async function searchLocation(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    
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
    const country = result.country ? `, ${result.country}` : "";
    state.locationName = `${result.name}${region}${country}`;
    
    await loadWeather();
}

async function loadWeather() {
    const statusEl = $("status");
    if (statusEl) statusEl.textContent = "Updating weather...";
    
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
    
    // =============================================
    // 📝 SHORT RECOMMENDATIONS
    // =============================================
    
    // 1. RAIN ADVICE
    const rainAdviceEl = document.getElementById('rainAdvice');
    const rainCard = document.querySelector('.rain-card');
    
    if (maxRainChance >= 70) {
        rainAdviceEl.textContent = '☔ Bring umbrella';
        rainAdviceEl.className = 'recommendation-status bad';
        if (rainCard) rainCard.classList.add('warning');
    } else if (maxRainChance >= 40) {
        rainAdviceEl.textContent = '🌂 Might rain';
        rainAdviceEl.className = 'recommendation-status caution';
        if (rainCard) rainCard.classList.remove('warning');
    } else {
        rainAdviceEl.textContent = '✅ No rain coat/umbrella needed';
        rainAdviceEl.className = 'recommendation-status good';
        if (rainCard) rainCard.classList.remove('warning');
    }
    
    // 2. CAR WASH ADVICE
    const dailyRainData = data.daily.precipitation_probability_max;
    const todayRainChance = dailyRainData[0];
    const tomorrowRainChance = dailyRainData[1] || 0;
    const maxRainNext48 = Math.max(todayRainChance, tomorrowRainChance);
    
    const carWashEl = document.getElementById('carWashAdvice');
    const carCard = document.querySelector('.car-card');
    
    if (maxRainNext48 < 30) {
        carWashEl.textContent = '✅ Good to wash';
        carWashEl.className = 'recommendation-status good';
        if (carCard) carCard.classList.remove('warning');
    } else {
        carWashEl.textContent = '⛔ Rain coming';
        carWashEl.className = 'recommendation-status bad';
        if (carCard) carCard.classList.add('warning');
    }
    
    // 3. DOG WALK ADVICE
    const feelsLike = current.apparent_temperature;
    const windSpeed = current.wind_speed_10m;
    const maxRainChanceDog = Math.max(...nextFewHours);
    const currentWeatherCode = current.weather_code;
    const isRaining = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(currentWeatherCode);
    const isSnowing = [71, 73, 75, 77, 85, 86].includes(currentWeatherCode);
    
    const dogWalkEl = document.getElementById('dogWalkAdvice');
    const dogCard = document.querySelector('.dog-card');
    
    if (feelsLike > 85) {
        dogWalkEl.textContent = '🔥 Too hot! Not recommended';
        dogWalkEl.className = 'recommendation-status bad';
        if (dogCard) {
            dogCard.classList.add('warning');
            dogCard.classList.remove('success');
        }
    } else if (feelsLike < 32) {
        dogWalkEl.textContent = '❄️ Too cold! Not recommended';
        dogWalkEl.className = 'recommendation-status bad';
        if (dogCard) {
            dogCard.classList.add('warning');
            dogCard.classList.remove('success');
        }
    } else if (isRaining || isSnowing) {
        dogWalkEl.textContent = '🌧️ Not ideal';
        dogWalkEl.className = 'recommendation-status caution';
        if (dogCard) {
            dogCard.classList.remove('warning', 'success');
        }
    } else if (feelsLike >= 50 && feelsLike <= 75 && maxRainChanceDog < 30) {
        dogWalkEl.textContent = '🐕 Perfect! Go now';
        dogWalkEl.className = 'recommendation-status good';
        if (dogCard) {
            dogCard.classList.add('success');
            dogCard.classList.remove('warning');
        }
    } else {
        dogWalkEl.textContent = '⚠️ Proceed with care';
        dogWalkEl.className = 'recommendation-status caution';
        if (dogCard) {
            dogCard.classList.remove('warning', 'success');
        }
    }
    
    // =============================================
    // ⏰ STATUS UPDATE
    // =============================================
    
    const statusUpdate = $("status");
    if (statusUpdate) {
        statusUpdate.textContent = `Updated ${new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        })}`;
    }
}

// =============================================
// 🔘 EVENT LISTENERS
// =============================================

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

// =============================================
// 🚀 INITIAL LOAD
// =============================================

loadWeather().catch((error) => {
    $("status").textContent = error.message;
});
