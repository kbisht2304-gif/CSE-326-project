// Find an element by its ID.
const $ = id => document.getElementById(id);

function getUnit() {
  try { return localStorage.getItem("unit") || "C"; }
  catch (error) { return "C"; }
}
function saveUnit(unit) {
  try { localStorage.setItem("unit", unit); }
  catch (error) {  }
}

function formatTemp(celsius, short) {
  // Read the chosen temperature unit.
  const unit = getUnit();
  let value = celsius;
  if (unit === "F") { value = celsius * 9 / 5 + 32; }
  if (unit === "K") { value = celsius + 273.15; }
  value = Math.round(value);
  if (unit === "K") { return short ? String(value) : value + " K"; }
  return short ? value + "°" : value + "°" + unit;
}

function setupUnitSelect(onChange) {
  const select = $("unitSelect");
  select.value = getUnit();
  select.addEventListener("change", function () {
    saveUnit(select.value);
    if (onChange) { onChange(); }
  });
}

function describe(code) {
  if (code === 0)  return { text: "Clear sky",      icon: "☀️", sky: "sunny" };
  if (code <= 2)   return { text: "Partly cloudy",  icon: "⛅", sky: "sunny" };
  if (code === 3)  return { text: "Overcast",       icon: "☁️", sky: "cloudy" };
  if (code <= 48)  return { text: "Foggy",          icon: "🌫️", sky: "cloudy" };
  if (code <= 57)  return { text: "Drizzle",        icon: "🌦️", sky: "rainy" };
  if (code <= 67)  return { text: "Rain",           icon: "🌧️", sky: "rainy" };
  if (code <= 77)  return { text: "Snow",           icon: "❄️", sky: "winter" };
  if (code <= 82)  return { text: "Rain showers",   icon: "🌧️", sky: "rainy" };
  if (code <= 86)  return { text: "Snow showers",   icon: "❄️", sky: "winter" };
  return             { text: "Thunderstorm",    icon: "⛈️", sky: "rainy" };
}

// Keep weather results for ten minutes.
const CACHE_MINUTES = 10;

function cleanName(text) {
  return text.trim().replace(/\s+/g, " ");
}
function capitalizeWords(text) {
  const words = text.toLowerCase().split(" ");
  const result = [];
  for (let i = 0; i < words.length; i++) {
    result.push(words[i].charAt(0).toUpperCase() + words[i].slice(1));
  }
  return result.join(" ");
}

function cacheKey(name) { return "weather:" + cleanName(name).toLowerCase(); }

function readCache(name) {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey(name)));
    if (saved && Date.now() - saved.time < CACHE_MINUTES * 60000) return saved.result;
  } catch (error) {  }
  return null;
}
function writeCache(name, result) {
  try { localStorage.setItem(cacheKey(name), JSON.stringify({ time: Date.now(), result: result })); }
  catch (error) {  }
}

function cleanCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("weather:")) {
        const saved = JSON.parse(localStorage.getItem(key));
        if (!saved || Date.now() - saved.time >= CACHE_MINUTES * 60000) { localStorage.removeItem(key); }
      }
    }
  } catch (error) {  }
}

function readPlace(name) {
  try { return JSON.parse(localStorage.getItem("place:" + cleanName(name).toLowerCase())); }
  catch (error) { return null; }
}
function writePlace(name, place) {
  try { localStorage.setItem("place:" + cleanName(name).toLowerCase(), JSON.stringify(place)); }
  catch (error) {  }
}

// Coordinates for places people often search for.
const KNOWN_PLACES = {
  "delhi":     { name: "Delhi",     admin1: "Delhi",          country: "India",          latitude: 28.6519,  longitude: 77.2315 },
  "mumbai":    { name: "Mumbai",    admin1: "Maharashtra",    country: "India",          latitude: 19.0728,  longitude: 72.8826 },
  "bengaluru": { name: "Bengaluru", admin1: "Karnataka",      country: "India",          latitude: 12.9719,  longitude: 77.5937 },
  "kolkata":   { name: "Kolkata",   admin1: "West Bengal",    country: "India",          latitude: 22.5626,  longitude: 88.3630 },
  "chennai":   { name: "Chennai",   admin1: "Tamil Nadu",     country: "India",          latitude: 13.0878,  longitude: 80.2785 },
  "hyderabad": { name: "Hyderabad", admin1: "Telangana",      country: "India",          latitude: 17.3840,  longitude: 78.4564 },
  "punjab":    { name: "Punjab",    admin1: "",               country: "India",          latitude: 30.95,    longitude: 75.5 },
  "tokyo":     { name: "Tokyo",     admin1: "Tokyo",          country: "Japan",          latitude: 35.6895,  longitude: 139.6917 },
  "london":    { name: "London",    admin1: "England",        country: "United Kingdom", latitude: 51.5085,  longitude: -0.1257 },
  "paris":     { name: "Paris",     admin1: "Île-de-France",  country: "France",         latitude: 48.8534,  longitude: 2.3488 },
  "new york":  { name: "New York",  admin1: "New York",       country: "United States",  latitude: 40.7143,  longitude: -74.0060 },
  "dubai":     { name: "Dubai",     admin1: "Dubai",          country: "United Arab Emirates", latitude: 25.0772, longitude: 55.3093 },
  "sydney":    { name: "Sydney",    admin1: "New South Wales", country: "Australia",     latitude: -33.8679, longitude: 151.2073 },
  "singapore": { name: "Singapore", admin1: "",               country: "Singapore",      latitude: 1.2897,   longitude: 103.8501 },
  "brazil":    { name: "Brazil",    admin1: "",               country: "Brazil",         latitude: -10,      longitude: -55 },
  "reykjavik": { name: "Reykjavik", admin1: "Capital Region", country: "Iceland",        latitude: 64.1355,  longitude: -21.8954 }
};

function getJSON(url, onSuccess, onError, triesLeft) {
  if (triesLeft === undefined) { triesLeft = 2; }
  let finished = false;
  let timer = null;

  function fail(reason) {
    if (finished) { return; }
    finished = true;
    clearTimeout(timer);
    const canRetry = reason === "network" || reason === "timeout" || reason.indexOf("HTTP 5") === 0;
    if (canRetry && triesLeft > 1) { getJSON(url, onSuccess, onError, triesLeft - 1); }
    else { onError(reason); }
  }
  function succeed(data) {
    if (finished) { return; }
    finished = true;
    clearTimeout(timer);
    try { onSuccess(data); }
    catch (error) { onError("code: " + error.message); }
  }

  timer = setTimeout(function () { fail("timeout"); }, 8000);

  fetch(url).then(
    function (response) {
      if (!response.ok) { fail("HTTP " + response.status); return; }
      response.json().then(
        function (data) {
          if (data.error) { fail("API: " + data.reason); return; }
          succeed(data);
        },
        function () { fail("bad answer"); }
      );
    },
    function () { fail("network"); }
  );
}

function findPlace(names, index, callback, onError) {
  if (index >= names.length) { callback(null); return; }
  const url = "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + names[index].replace(/ /g, "%20");
  getJSON(url, function (geo) {
    if (geo.results) { callback(geo.results[0]); }
    else { findPlace(names, index + 1, callback, onError); }
  }, onError);
}

function loadForecast(place, callback, onError) {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + place.latitude +
    "&longitude=" + place.longitude +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day" +
    "&hourly=temperature_2m,precipitation_probability,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&forecast_days=5&timezone=auto";
  getJSON(url, function (data) {
    if (!data.current || !data.hourly || !data.daily) { onError("API: incomplete answer"); return; }
    callback({ place: place, data: data });
  }, onError);
}

function getWeather(name, callback, onError) {
  // Reuse a recent result when one is available.
  const cached = readCache(name);
  if (cached) { callback(cached); return; }

  // Use saved coordinates for common places.
  const preset = KNOWN_PLACES[cleanName(name).toLowerCase()];
  if (preset) { loadAndSave(name, preset, callback, onError); return; }

  const knownPlace = readPlace(name);
  if (knownPlace) { loadAndSave(name, knownPlace, callback, onError); return; }

  const clean = cleanName(name);
  const capital = capitalizeWords(clean);
  const names = [capital];
  if (clean !== capital) { names.push(clean); }

  findPlace(names, 0, function (place) {
    if (!place) { onError("notfound"); return; }
    writePlace(name, place);
    loadAndSave(name, place, callback, onError);
  }, onError);
}

function loadAndSave(name, place, callback, onError) {
  loadForecast(place, function (result) {
    writeCache(name, result);
    callback(result);
  }, onError);
}

function getWeatherByCoords(lat, lon, callback, onError) {
  loadForecast({ name: "Your location", latitude: lat, longitude: lon }, callback, onError);
}

function todaysHours(data) {
  // Get the date where the forecast was made.
  const today = data.current.time.slice(0, 10);
  const list = [];
  data.hourly.time.forEach((t, i) => {
    const hour = Number(t.slice(11, 13));
    if (t.startsWith(today) && hour >= 6 && hour <= 22) {
      list.push({
        hour: hour,
        temp: Math.round(data.hourly.temperature_2m[i]),
        rain: data.hourly.precipitation_probability[i] || 0,
        wind: Math.round(data.hourly.wind_speed_10m[i])
      });
    }
  });
  return list;
}

// These values decide what weather suits each activity.
const ACTIVITIES = {
  "Walk":    { ideal: [16, 28], rainHate: 0.8, windHate: 0.5, golden: false },
  "Run":     { ideal: [10, 22], rainHate: 0.6, windHate: 0.4, golden: false },
  "Picnic":  { ideal: [20, 30], rainHate: 1.2, windHate: 1.0, golden: false },
  "Photos":  { ideal: [10, 32], rainHate: 0.7, windHate: 0.3, golden: true },
  "Sports": { ideal: [18, 32], rainHate: 1.5, windHate: 0.6, golden: false }
};

// Give this hour a score from zero to one hundred.
function score(hourData, activity) {
  let points = 100;

  if (hourData.temp < activity.ideal[0]) {
    points -= (activity.ideal[0] - hourData.temp) * 5;
  }
  if (hourData.temp > activity.ideal[1]) {
    points -= (hourData.temp - activity.ideal[1]) * 5;
  }

  points -= hourData.rain * activity.rainHate;
  points -= hourData.wind * activity.windHate;
  if (hourData.hour < 6 || hourData.hour > 20) points -= 25;
  if (activity.golden && (hourData.hour <= 7 || (hourData.hour >= 17 && hourData.hour <= 18))) points += 20;

  return Math.max(0, Math.min(100, Math.round(points)));
}

function outfitFor(temp, rain) {
  let advice;
  if (temp >= 30) advice = "Light cotton clothes and a water bottle.";
  else if (temp >= 22) advice = "T-shirt weather.";
  else if (temp >= 15) advice = "Take a light jacket.";
  else if (temp >= 5) advice = "Wear a warm jacket.";
  else advice = "Very cold: coat, hat and gloves.";

  if (rain >= 50) advice += " Carry an umbrella.";
  return advice;
}

function formatHour(h, short) {
  const hr = h % 12 === 0 ? 12 : h % 12;
  const suffix = h >= 12 ? "PM" : "AM";
  return short ? hr + suffix[0].toLowerCase() : hr + " " + suffix;
}

let hours = [];
let scored = [];
let currentActivity = "Walk";
let currentResult = null;

// Put the current weather on the page.
function showWeather(place, data) {
  const now = data.current;
  const info = describe(now.weather_code);
  const localHour = Number(now.time.slice(11, 13));
  const isNight = now.is_day === 0;
  const isCalm = now.weather_code <= 1;
  const isCold = now.temperature_2m <= 10;
  let sky = info.sky;
  if (isNight && isCalm) { sky = "night"; info.icon = "🌙"; info.text = "Clear night"; }
  else if (isCold || info.sky === "winter") { sky = "winter"; }
  document.body.dataset.sky = sky;
  const where = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  document.title = "Weather in " + place.name;
  $("placeName").textContent = where;
  $("icon").textContent = info.icon;
  $("temp").textContent = formatTemp(now.temperature_2m);
  $("cond").textContent = info.text;
  const today = now.time.slice(0, 10);
  const rainChance = data.hourly.time.reduce((highest, time, i) => {
    if (time.startsWith(today) && time >= now.time) {
      return Math.max(highest, data.hourly.precipitation_probability[i] || 0);
    }
    return highest;
  }, 0);
  const todayRange = formatTemp(data.daily.temperature_2m_min[0], true) + "–" +
    formatTemp(data.daily.temperature_2m_max[0], true);

  $("details").textContent = "Feels like " + formatTemp(now.apparent_temperature) + " · Humidity " +
    now.relative_humidity_2m + "% · Wind " + Math.round(now.wind_speed_10m) + " km/h" +
    " · Today " + todayRange + " · Rain chance up to " + rainChance + "%";

  const nowHourData = hours.find(h => h.hour === localHour);
  $("outfit").textContent = outfitFor(now.temperature_2m, nowHourData ? nowHourData.rain : 0);

  $("days").innerHTML = data.daily.time.map((date, i) => {
    const day = i === 0 ? "Today" : new Date(date + "T12:00:00").toLocaleDateString("en", { weekday: "short" });
    return `<div>${day}<br>${describe(data.daily.weather_code[i]).icon}
            <b>${formatTemp(data.daily.temperature_2m_max[i], true)}</b>${formatTemp(data.daily.temperature_2m_min[i], true)}</div>`;
  }).join("");
}

// Draw the activity scores for each hour.
function drawPlanner() {
  const act = ACTIVITIES[currentActivity];
  scored = hours.map(h => ({ hour: h.hour, temp: h.temp, rain: h.rain, wind: h.wind, score: score(h, act) }));
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
  const hasBest = best.score >= 35;

  $("verdict").textContent = hasBest
    ? "Best time for " + currentActivity.toLowerCase() + ": " + formatHour(best.hour) + " (" + best.score + "/100)"
    : "Not a great day for " + currentActivity.toLowerCase() + ".";

  $("bars").innerHTML = scored.map((h, i) => {
    const color = h.score >= 70 ? "var(--good)" : h.score >= 40 ? "var(--ok)" : "var(--bad)";
    const isBest = hasBest && h === best ? " best" : "";
    return `<div class="bar${isBest}" data-i="${i}" role="button" tabindex="0" aria-label="${formatHour(h.hour)}: ${h.score} out of 100 points" style="height:${Math.max(h.score, 8)}%;background:${color}">${h.score}</div>`;
  }).join("");
  $("hours").innerHTML = scored.map(h => `<span>${formatHour(h.hour, true)}</span>`).join("");
  $("picked").textContent = "Select a bar to see the forecast for that hour.";
  $("picked").setAttribute("aria-live", "polite");

  document.querySelectorAll("#chips .chip").forEach(c => {
    const selected = c.textContent === currentActivity;
    c.classList.toggle("active", selected);
    c.setAttribute("aria-pressed", selected);
  });
}

function setupResultsPage() {

  setupUnitSelect(function () {
    if (currentResult) {
      showWeather(currentResult.place, currentResult.data);
      drawPlanner();
    }
  });

  $("retryForm").addEventListener("submit", function (event) {
    event.preventDefault();
    goToCity($("retryInput").value);
  });

  Object.keys(ACTIVITIES).forEach(name => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = name;
    b.addEventListener("click", () => { currentActivity = name; drawPlanner(); });
    $("chips").appendChild(b);
  });

  function showHourDetails(bar) {
    const hourData = scored[bar.dataset.i];
    $("picked").textContent = formatHour(hourData.hour) + ": " + formatTemp(hourData.temp) +
      ", " + hourData.rain + "% rain, wind " + hourData.wind + " km/h";
  }

  $("bars").addEventListener("click", event => {
    const bar = event.target.closest(".bar");
    if (bar) showHourDetails(bar);
  });
  $("bars").addEventListener("keydown", event => {
    const bar = event.target.closest(".bar");
    if (bar && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      showHourDetails(bar);
    }
  });

  const lat = sessionStorage.getItem("lat");
  const lon = sessionStorage.getItem("lon");
  const city = sessionStorage.getItem("city");

  if (lat && lon) { getWeatherByCoords(lat, lon, showEverything, showError); }
  else if (city)  { $("loadingText").textContent = "Looking up " + city + "..."; getWeather(city, showEverything, showError); }
  else { $("message").textContent = "No place was given. Go back and search for a place."; }
}

// Show the weather and activity planner.
function showEverything(result) {
  currentResult = result;
  hours = todaysHours(result.data);
  showWeather(result.place, result.data);
  drawPlanner();
  $("message").hidden = true;
  $("app").hidden = false;
}

function showError(reason) {
  document.body.dataset.sky = "error";
  document.title = "Oops - Best Hour";
  $("message").hidden = true;
  $("app").hidden = true;
  $("errorBox").hidden = false;
  $("errorDetail").textContent = "";

  const typed = sessionStorage.getItem("city") || "";
  $("retryInput").value = reason === "notfound" ? "" : typed;

  if (reason === "notfound") {
    $("errorTitle").textContent = "Sorry, we couldn't find that place";
    $("errorText").textContent = "We found nothing for \"" + typed + "\". Check the spelling or try a bigger city nearby.";
  } else if (reason === "network" || reason === "timeout") {
    $("errorTitle").textContent = "The weather service is not answering";
    $("errorText").textContent = "Your Wi-Fi may be fine, but the request did not get through. Wait a moment and press Try again.";
    $("errorDetail").textContent = "Technical detail: " + reason;
  } else if (reason === "HTTP 429") {
    $("errorTitle").textContent = "The weather service is busy";
    $("errorText").textContent = "Too many requests came from this network. Wait a minute, then press Try again.";
    $("errorDetail").textContent = "Technical detail: " + reason;
  } else {
    $("errorTitle").textContent = "Something went wrong";
    $("errorText").textContent = "We got an answer we could not use. Press Try again.";
    $("errorDetail").textContent = "Technical detail: " + reason;
  }
}

// Save the searched place and open its results.
function goToCity(name) {
  sessionStorage.setItem("city", name);
  sessionStorage.removeItem("lat");
  sessionStorage.removeItem("lon");
 window.location.href = "results.html";
}

function useMyLocation() {
  const msg = $("locationMsg");
  if (!navigator.geolocation) { msg.textContent = "Your browser does not support location."; return; }
  msg.textContent = "Finding your location...";
  navigator.geolocation.getCurrentPosition(
    function (position) {
      sessionStorage.setItem("lat", position.coords.latitude);
      sessionStorage.setItem("lon", position.coords.longitude);
      sessionStorage.removeItem("city");
      window.location.href = "results.html";
    },
    function () {
      msg.textContent = "Could not get your location. Please type a place instead.";
    }
  );
}

function setupHomePage() {
  setupUnitSelect();
  const input = document.querySelector("input[name=city]");

  $("searchForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const city = input.value.trim();
    if (!city) { input.focus(); return; }
    goToCity(city);
  });

  document.querySelectorAll("nav .chip").forEach(chip => {
    chip.addEventListener("click", event => {
      event.preventDefault();
      goToCity(chip.textContent);
    });
  });

  $("locationBtn").addEventListener("click", useMyLocation);
}

cleanCache();

if (document.body.classList.contains("home")) {
  setupHomePage();
} else {
  setupResultsPage();
}
