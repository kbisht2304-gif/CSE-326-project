/* ============ results.js (used by BOTH pages) ============
   1. Shortcut        2. Weather codes     3. Getting the weather (fetch + cache)
   4. Hour scoring    5. Draw the page     6. Results page    7. Home page    8. Start */

/* ============ 1. SHORTCUT ============ */
const $ = id => document.getElementById(id);   // $("temp") is shorter than document.getElementById("temp")

/* ============ 1b. TEMPERATURE UNIT (C, F or K) ============
   The weather service always sends Celsius. We keep every number in Celsius inside the program
   and only convert when we SHOW a temperature. The choice is saved in localStorage. */
function getUnit() {
  try { return localStorage.getItem("unit") || "C"; }
  catch (error) { return "C"; }
}
function saveUnit(unit) {
  try { localStorage.setItem("unit", unit); }
  catch (error) { /* ignore */ }
}

/* formatTemp(21)        -> "21°C"  or "70°F"  or "294 K"
   formatTemp(21, true)  -> "21°"   or "70°"   or "294"   (short version for small spaces) */
function formatTemp(celsius, short) {
  const unit = getUnit();
  let value = celsius;
  if (unit === "F") { value = celsius * 9 / 5 + 32; }
  if (unit === "K") { value = celsius + 273.15; }
  value = Math.round(value);
  if (unit === "K") { return short ? String(value) : value + " K"; }
  return short ? value + "°" : value + "°" + unit;
}

/* Connects the <select id="unitSelect"> drop-down. onChange runs after the user picks a unit. */
function setupUnitSelect(onChange) {
  const select = $("unitSelect");
  select.value = getUnit();
  select.addEventListener("change", function () {
    saveUnit(select.value);
    if (onChange) { onChange(); }
  });
}

/* ============ 2. TURN A WEATHER CODE INTO TEXT + EMOJI ============
   The weather service sends a number (0 = clear, 61 = rain ...). */
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

/* ============ 3. GETTING THE WEATHER ============
   Open-Meteo is a free weather service (no key needed).
   fetch() asks the internet. .then() means "when the answer arrives, run this function"
   (that is a callback). .catch() runs if something goes wrong. */
const CACHE_MINUTES = 10;

/* Fix what the user typed: "  nEW   yORK " -> "New York" */
function cleanName(text) {
  return text.trim().replace(/\s+/g, " ");          // remove extra spaces
}
function capitalizeWords(text) {
  const words = text.toLowerCase().split(" ");
  const result = [];
  for (let i = 0; i < words.length; i++) {
    result.push(words[i].charAt(0).toUpperCase() + words[i].slice(1));   // capital first letter
  }
  return result.join(" ");
}

/* Cache = saved answers in localStorage, so searching the same place again is instant */
function cacheKey(name) { return "weather:" + cleanName(name).toLowerCase(); }

function readCache(name) {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey(name)));
    if (saved && Date.now() - saved.time < CACHE_MINUTES * 60000) return saved.result;
  } catch (error) { /* nothing saved, ignore */ }
  return null;
}
function writeCache(name, result) {
  try { localStorage.setItem(cacheKey(name), JSON.stringify({ time: Date.now(), result: result })); }
  catch (error) { /* ignore */ }
}

/* Remove old saved answers so localStorage never fills up */
function cleanCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("weather:")) {
        const saved = JSON.parse(localStorage.getItem(key));
        if (!saved || Date.now() - saved.time >= CACHE_MINUTES * 60000) { localStorage.removeItem(key); }
      }
    }
  } catch (error) { /* ignore */ }
}

/* A place never moves, so we remember where it is FOREVER. Next time we skip step A completely. */
function readPlace(name) {
  try { return JSON.parse(localStorage.getItem("place:" + cleanName(name).toLowerCase())); }
  catch (error) { return null; }
}
function writePlace(name, place) {
  try { localStorage.setItem("place:" + cleanName(name).toLowerCase(), JSON.stringify(place)); }
  catch (error) { /* ignore */ }
}

/* Popular places we already know. No lookup needed, so these load with ONE internet request, not two. */
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

/* getJSON: asks the internet and handles EVERY way it can go wrong.
   - timeout: no answer after 8 seconds -> stop waiting (no more endless "buffering")
   - retry:   if it failed because of the connection or the server, try ONE more time automatically
   onError gets a short text such as "network", "timeout", "HTTP 429" so we can tell the user the real problem. */
function getJSON(url, onSuccess, onError, triesLeft) {
  if (triesLeft === undefined) { triesLeft = 2; }
  let finished = false;                     // becomes true when this try is over (answer, error or timeout)
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
    catch (error) { onError("code: " + error.message); }   // a bug in OUR code is not an internet problem
  }

  timer = setTimeout(function () { fail("timeout"); }, 8000);

  fetch(url).then(
    function (response) {
      if (!response.ok) { fail("HTTP " + response.status); return; }   // for example 429 = too many requests
      response.json().then(
        function (data) {
          if (data.error) { fail("API: " + data.reason); return; }
          succeed(data);
        },
        function () { fail("bad answer"); }
      );
    },
    function () { fail("network"); }       // fetch itself failed: no connection, blocked, or DNS problem
  );
}

/* Step A: place name -> latitude/longitude. Tries the names in the list one by one. */
function findPlace(names, index, callback, onError) {
  if (index >= names.length) { callback(null); return; }          // nothing found
  const url = "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + names[index].replace(/ /g, "%20");
  getJSON(url, function (geo) {
    if (geo.results) { callback(geo.results[0]); }
    else { findPlace(names, index + 1, callback, onError); }      // try the next spelling
  }, onError);
}

/* Step B: latitude/longitude -> weather */
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

/* Weather for a typed place name */
function getWeather(name, callback, onError) {
  const cached = readCache(name);
  if (cached) { callback(cached); return; }                       // instant!

  // A popular place from our own list? Then no lookup is needed at all.
  const preset = KNOWN_PLACES[cleanName(name).toLowerCase()];
  if (preset) { loadAndSave(name, preset, callback, onError); return; }

  // Already know where this place is? Skip the first trip to the internet.
  const knownPlace = readPlace(name);
  if (knownPlace) { loadAndSave(name, knownPlace, callback, onError); return; }

  const clean = cleanName(name);
  const capital = capitalizeWords(clean);
  const names = [capital];
  if (clean !== capital) { names.push(clean); }                   // second try: exactly as typed

  findPlace(names, 0, function (place) {
    if (!place) { onError("notfound"); return; }
    writePlace(name, place);
    loadAndSave(name, place, callback, onError);
  }, onError);
}

/* Get the forecast, save it for 10 minutes, then hand it back */
function loadAndSave(name, place, callback, onError) {
  loadForecast(place, function (result) {
    writeCache(name, result);
    callback(result);
  }, onError);
}

/* Weather for the device's location (Geolocation API gives latitude and longitude) */
function getWeatherByCoords(lat, lon, callback, onError) {
  loadForecast({ name: "Your location", latitude: lat, longitude: lon }, callback, onError);
}

/* Keep only today's hours between 6 AM and 10 PM (in that place's own time). */
function todaysHours(data) {
  const today = data.current.time.slice(0, 10);   // e.g. "2026-10-27"
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

/* ============ 4. THE UNIQUE FEATURE: SCORE EACH HOUR ============
   Every activity has an ideal temperature range and how much it hates rain/wind.
   score() gives 0-100 for one hour. Change these numbers to tune the app. */
const ACTIVITIES = {
  "Walk":    { ideal: [16, 28], rainHate: 0.8, windHate: 0.5, golden: false },
  "Run":     { ideal: [10, 22], rainHate: 0.6, windHate: 0.4, golden: false },
  "Picnic":  { ideal: [20, 30], rainHate: 1.2, windHate: 1.0, golden: false },
  "Photos":  { ideal: [10, 32], rainHate: 0.7, windHate: 0.3, golden: true },
  "Sports": { ideal: [18, 32], rainHate: 1.5, windHate: 0.6, golden: false }
};

function score(h, act) {
  let s = 100;
  if (h.temp < act.ideal[0]) s -= (act.ideal[0] - h.temp) * 5;   // too cold
  if (h.temp > act.ideal[1]) s -= (h.temp - act.ideal[1]) * 5;   // too hot
  s -= h.rain * act.rainHate;                                    // rain penalty
  s -= h.wind * act.windHate;                                    // wind penalty
  if (h.hour < 6 || h.hour > 20) s -= 25;                        // too dark
  if (act.golden && (h.hour <= 7 || (h.hour >= 17 && h.hour <= 18))) s += 20;  // golden light
  return Math.max(0, Math.min(100, Math.round(s)));
}

function outfitFor(temp, rain) {
  let text = temp >= 30 ? "Light cotton clothes and a water bottle."
           : temp >= 22 ? "T-shirt weather."
           : temp >= 15 ? "Take a light jacket."
           : temp >= 5  ? "Wear a warm jacket."
           :              "Very cold: coat, hat and gloves.";
  if (rain >= 50) text += " Carry an umbrella.";
  return text;
}

function formatHour(h, short) {            // 14 -> "2 PM"  (short: "2p")
  const hr = h % 12 === 0 ? 12 : h % 12;
  const suffix = h >= 12 ? "PM" : "AM";
  return short ? hr + suffix[0].toLowerCase() : hr + " " + suffix;
}

/* ============ 5. DRAW THE PAGE ============ */
let hours = [];                                // today's hourly data
let scored = [];                               // the same hours, with scores added
let currentActivity = "Walk";
let currentResult = null;                      // the last weather we received

function showWeather(place, data) {
  const now = data.current;
  const info = describe(now.weather_code);
  const localHour = Number(now.time.slice(11, 13));

  // Page theme. The FIRST rule that matches wins:
  // 1. NIGHT  - it is dark AND the weather is calm (code 0 = clear, 1 = mainly clear)
  // 2. WINTER - cold (10°C or below) or snowing
  // 3. otherwise the theme that matches the weather (sunny / cloudy / rainy)
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
  $("details").textContent = "Feels like " + formatTemp(now.apparent_temperature) + " · Humidity " +
    now.relative_humidity_2m + "% · Wind " + Math.round(now.wind_speed_10m) + " km/h";

  const nowHourData = hours.find(h => h.hour === localHour);
  $("outfit").textContent = outfitFor(now.temperature_2m, nowHourData ? nowHourData.rain : 0);

  // 5-day strip
  $("days").innerHTML = data.daily.time.map((date, i) => {
    const day = i === 0 ? "Today" : new Date(date + "T12:00:00").toLocaleDateString("en", { weekday: "short" });
    return `<div>${day}<br>${describe(data.daily.weather_code[i]).icon}
            <b>${formatTemp(data.daily.temperature_2m_max[i], true)}</b>${formatTemp(data.daily.temperature_2m_min[i], true)}</div>`;
  }).join("");
}

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
    return `<div class="bar${isBest}" data-i="${i}" style="height:${Math.max(h.score, 8)}%;background:${color}">${h.score}</div>`;
  }).join("");
  $("hours").innerHTML = scored.map(h => `<span>${formatHour(h.hour, true)}</span>`).join("");
  $("picked").textContent = "Tap a bar to see that hour.";

  document.querySelectorAll("#chips .chip").forEach(c => c.classList.toggle("active", c.textContent === currentActivity));
}

/* ============ 6. RESULTS PAGE ============ */
function setupResultsPage() {
  // Changing the unit redraws the numbers (no new internet request needed)
  setupUnitSelect(function () {
    if (currentResult) {
      showWeather(currentResult.place, currentResult.data);
      drawPlanner();
    }
  });

  // "Try again" form on the error page
  $("retryForm").addEventListener("submit", function (event) {
    event.preventDefault();
    goToCity($("retryInput").value);
  });

  Object.keys(ACTIVITIES).forEach(name => {            // make one button per activity
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = name;
    b.addEventListener("click", () => { currentActivity = name; drawPlanner(); });
    $("chips").appendChild(b);
  });

  $("bars").addEventListener("click", e => {           // tap a bar -> show that hour's details
    const bar = e.target.closest(".bar");
    if (!bar) return;
    const h = scored[bar.dataset.i];
    $("picked").textContent = formatHour(h.hour) + ": " + formatTemp(h.temp) + ", " + h.rain + "% rain, wind " + h.wind + " km/h";
  });

  // Read what the home page saved in sessionStorage, then load the weather
  const lat = sessionStorage.getItem("lat");
  const lon = sessionStorage.getItem("lon");
  const city = sessionStorage.getItem("city");

  if (lat && lon) { getWeatherByCoords(lat, lon, showEverything, showError); }
  else if (city)  { $("loadingText").textContent = "Looking up " + city + "..."; getWeather(city, showEverything, showError); }
  else { $("message").textContent = "No place was given. Go back and search for a place."; }
}

function showEverything(result) {
  currentResult = result;
  hours = todaysHours(result.data);
  showWeather(result.place, result.data);
  drawPlanner();
  $("message").hidden = true;      // hide "Loading..."
  $("app").hidden = false;         // show the weather
}

/* ERROR PAGE: shown when something goes wrong. reason is a short text from getJSON / getWeather:
   "notfound", "network", "timeout", "HTTP 429", "API: ...", "code: ..." */
function showError(reason) {
  document.body.dataset.sky = "error";
  document.title = "Oops - Best Hour";
  $("message").hidden = true;
  $("app").hidden = true;
  $("errorBox").hidden = false;
  $("errorDetail").textContent = "";

  const typed = sessionStorage.getItem("city") || "";
  $("retryInput").value = reason === "notfound" ? "" : typed;     // for other problems keep the place, so one click retries

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

/* ============ 7. HOME PAGE ============ */
/* Save the place for the next page, then open it (sessionStorage lasts while the tab is open) */
function goToCity(name) {
  sessionStorage.setItem("city", name);
  sessionStorage.removeItem("lat");
  sessionStorage.removeItem("lon");
  window.location.href = "results.html";
}

/* Geolocation API: getCurrentPosition(successFunction, errorFunction) */
function useMyLocation() {
  const msg = $("locationMsg");
  if (!navigator.geolocation) { msg.textContent = "Your browser does not support location."; return; }
  msg.textContent = "Finding your location...";
  navigator.geolocation.getCurrentPosition(
    function (position) {                                   // success
      sessionStorage.setItem("lat", position.coords.latitude);
      sessionStorage.setItem("lon", position.coords.longitude);
      sessionStorage.removeItem("city");
      window.location.href = "results.html";
    },
    function () {                                           // error (for example: permission denied)
      msg.textContent = "Could not get your location. Please type a place instead.";
    }
  );
}

function setupHomePage() {
  setupUnitSelect();   // remember the unit for the results page
  const input = document.querySelector("input[name=city]");

  $("searchForm").addEventListener("submit", function (event) {
    event.preventDefault();                                 // stop the normal form sending
    goToCity(input.value);
  });


  document.querySelectorAll("nav .chip").forEach(chip => {
    chip.addEventListener("click", event => {
      event.preventDefault();
      goToCity(chip.textContent);
    });
  });

  $("locationBtn").addEventListener("click", useMyLocation);
}

/* ============ 8. WHICH PAGE ARE WE ON? ============
   Both pages load this same file. <body class="home"> is the home page. */
cleanCache();   // remove old saved answers

if (document.body.classList.contains("home")) {
  setupHomePage();
} else {
  setupResultsPage();
}