/* ============ 1. READ THE PLACE FROM THE URL ============
   The home page opens results.html?city=Tokyo. This reads the "Tokyo" part. */
const searchText = new URLSearchParams(window.location.search).get("city");

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

/* ============ 3. GET REAL WEATHER FROM THE INTERNET ============
   Open-Meteo is a free weather service (no key needed).
   Step A: turn the place name into latitude/longitude ("geocoding").
   Step B: ask for the weather at that latitude/longitude.
   "async/await" means: wait here until the internet answers. */
async function getWeather(name) {
  const geoUrl = "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + encodeURIComponent(name);
  const geo = await (await fetch(geoUrl)).json();
  if (!geo.results) throw new Error("not found");
  const place = geo.results[0];

  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + place.latitude +
    "&longitude=" + place.longitude +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
    "&hourly=temperature_2m,precipitation_probability,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&forecast_days=5&timezone=auto";
  const data = await (await fetch(url)).json();
  return { place, data };
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
  "Cricket": { ideal: [18, 32], rainHate: 1.5, windHate: 0.6, golden: false }
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

/* ============ 5. SHORTCUTS + STATE ============ */
const $ = id => document.getElementById(id);   // $("temp") is shorter than document.getElementById("temp")
let hours = [];                                // today's hourly data
let scored = [];                               // the same hours, with scores added
let currentActivity = "Walk";

/* ============ 6. DRAW THE PAGE ============ */
function showWeather(place, data) {
  const now = data.current;
  const info = describe(now.weather_code);
  const localHour = Number(now.time.slice(11, 13));

  // Page color: "winter" if it is cold (10°C or below) or snowing, else by weather.
  // Change the 10 below if you want a different "cold" limit.
  const isCold = now.temperature_2m <= 10;
  document.body.dataset.sky = (isCold || info.sky === "winter") ? "winter" : info.sky;

  const where = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  document.title = "Weather in " + place.name;
  $("placeName").textContent = where;
  $("icon").textContent = info.icon;
  $("temp").textContent = Math.round(now.temperature_2m) + "°C";
  $("cond").textContent = info.text;
  $("details").textContent = "Feels like " + Math.round(now.apparent_temperature) + "° · Humidity " +
    now.relative_humidity_2m + "% · Wind " + Math.round(now.wind_speed_10m) + " km/h";

  const nowHourData = hours.find(h => h.hour === localHour);
  $("outfit").textContent = outfitFor(now.temperature_2m, nowHourData ? nowHourData.rain : 0);

  // 5-day strip
  $("days").innerHTML = data.daily.time.map((date, i) => {
    const day = i === 0 ? "Today" : new Date(date + "T12:00:00").toLocaleDateString("en", { weekday: "short" });
    return `<div>${day}<br>${describe(data.daily.weather_code[i]).icon}
            <b>${Math.round(data.daily.temperature_2m_max[i])}°</b>${Math.round(data.daily.temperature_2m_min[i])}°</div>`;
  }).join("");
}

function drawPlanner() {
  const act = ACTIVITIES[currentActivity];
  scored = hours.map(h => ({ ...h, score: score(h, act) }));
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

/* ============ 7. CLICKS ============ */
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
  $("picked").textContent = formatHour(h.hour) + ": " + h.temp + "°C, " + h.rain + "% rain, wind " + h.wind + " km/h";
});

/* ============ 8. START ============ */
async function start() {
  if (!searchText) {
    $("message").textContent = "No place was given. Go back and type a city, state or country.";
    return;
  }
  try {
    const { place, data } = await getWeather(searchText);
    hours = todaysHours(data);
    showWeather(place, data);
    drawPlanner();
    $("message").hidden = true;      // hide "Loading..."
    $("app").hidden = false;         // show the weather
  } catch (error) {
    $("message").textContent = "Could not find weather for \"" + searchText +
      "\". Check the spelling and your internet connection, then try again.";
  }
}
start();