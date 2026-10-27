/* ============ 2. DATA ============
   Fake data so the front end works without internet.
   LATER: replace this object with a fetch() call to a weather API
   (e.g. OpenWeatherMap or Open-Meteo) and keep the same shape. */
const CITIES = {
  "Delhi":  { base: 31, swing: 6, rain: 10, wind: 12, sky: "sunny",  cond: "Clear and hot",  days: [32,34,30,29,31] },
  "Mumbai": { base: 29, swing: 3, rain: 70, wind: 22, sky: "rainy",  cond: "Heavy showers",  days: [28,29,28,30,29] },
  "Shimla": { base: 14, swing: 5, rain: 35, wind: 15, sky: "cloudy", cond: "Cloudy and cool", days: [13,12,15,16,14] }
};

/* Build 17 hourly entries (6 AM to 10 PM) from the city's base numbers. */
function makeHours(city) {
  const list = [];
  for (let h = 6; h <= 22; h++) {
    // sine curve: warmest around 3 PM, coolest early morning
    const temp = Math.round(city.base + city.swing * Math.sin(((h - 9) / 24) * 2 * Math.PI));
    // rain chance wobbles a little through the day
    const rain = Math.max(0, Math.min(100, city.rain + Math.round(15 * Math.sin(h))));
    list.push({ hour: h, temp, rain, wind: city.wind });
  }
  return list;
}

/* ============ 3. THE SCORING IDEA ============
   Each activity has an ideal temperature range and how much it hates rain/wind.
   score() returns 0-100 for one hour. Change these numbers to tune the app. */
const ACTIVITIES = {
  "Walk":     { ideal: [16, 28], rainHate: 0.8, windHate: 0.5, golden: false },
  "Run":      { ideal: [10, 22], rainHate: 0.6, windHate: 0.4, golden: false },
  "Picnic":   { ideal: [20, 30], rainHate: 1.2, windHate: 1.0, golden: false },
  "Photos":   { ideal: [10, 32], rainHate: 0.7, windHate: 0.3, golden: true  },
  "Cricket":  { ideal: [18, 32], rainHate: 1.5, windHate: 0.6, golden: false }
};

function score(hourData, act) {
  let s = 100;
  const [lo, hi] = act.ideal;
  if (hourData.temp < lo) s -= (lo - hourData.temp) * 5;   // too cold
  if (hourData.temp > hi) s -= (hourData.temp - hi) * 5;   // too hot
  s -= hourData.rain * act.rainHate;                       // rain penalty
  s -= hourData.wind * act.windHate;                       // wind penalty
  if (hourData.hour < 6 || hourData.hour > 20) s -= 25;    // too dark for outdoor plans
  // photographers love "golden hour" (sunrise/sunset light)
  if (act.golden && (hourData.hour <= 7 || (hourData.hour >= 17 && hourData.hour <= 18))) s += 20;
  return Math.max(0, Math.min(100, Math.round(s)));        // keep between 0 and 100
}

/* Simple outfit advice from temperature and rain. */
function outfitFor(temp, rain) {
  let text = temp >= 30 ? "Light cotton clothes and a water bottle."
           : temp >= 22 ? "T-shirt weather."
           : temp >= 15 ? "Take a light jacket."
           : "Wear a warm jacket.";
  if (rain >= 50) text += " Carry an umbrella.";
  return text;
}

/* ============ 4. STATE ============
   The two things the user can change. Every change calls render(). */
let currentCity = "Delhi";
let currentActivity = "Walk";

/* ============ 5. RENDERING ============
   render() reads the state and rewrites the page. */
function render() {
  const city = CITIES[currentCity];
  const hours = makeHours(city);
  const nowHour = new Date().getHours();
  const nowData = hours.find(h => h.hour === nowHour) || hours[6]; // fallback to midday

  // Sky theme: after 7 PM or before 6 AM it is "night", otherwise the city's sky
  document.body.dataset.sky = (nowHour >= 19 || nowHour < 6) ? "night" : city.sky;

  // Current weather card
  document.getElementById("temp").textContent = nowData.temp + "°";
  document.getElementById("cond").textContent = city.cond;
  document.getElementById("outfit").textContent = outfitFor(nowData.temp, nowData.rain);

  // Score every hour for the chosen activity and find the winner
  const act = ACTIVITIES[currentActivity];
  const scored = hours.map(h => ({ ...h, score: score(h, act) }));
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));

  document.getElementById("verdict").textContent =
    best.score < 35 ? "Not a great day for " + currentActivity.toLowerCase() + "."
                    : "Best time: " + formatHour(best.hour) + " (" + best.score + "/100)";

  // Bars: height from score, color from how good it is
  document.getElementById("bars").innerHTML = scored.map(h => {
    const color = h.score >= 70 ? "var(--good)" : h.score >= 40 ? "var(--ok)" : "var(--bad)";
    const isBest = h === best && best.score >= 35 ? " best" : "";
    return `<div class="bar${isBest}" style="height:${Math.max(h.score, 8)}%;background:${color}" title="${formatHour(h.hour)}: ${h.temp}°, ${h.rain}% rain">${h.score}</div>`;
  }).join("");
  document.getElementById("hours").innerHTML = scored.map(h => `<span>${formatHour(h.hour, true)}</span>`).join("");

  // 5-day strip
  const names = ["Today", "Tue", "Wed", "Thu", "Fri"];
  document.getElementById("days").innerHTML = city.days
    .map((t, i) => `<div class="day">${names[i]}<b>${t}°</b></div>`).join("");

  // Highlight the active activity chip
  document.querySelectorAll(".chip").forEach(c =>
    c.classList.toggle("active", c.textContent === currentActivity));
}

/* 14 -> "2 PM", short=true -> "2p" */
function formatHour(h, short) {
  const hr = h % 12 === 0 ? 12 : h % 12;
  const suffix = h >= 12 ? "PM" : "AM";
  return short ? hr + suffix[0].toLowerCase() : hr + " " + suffix;
}

/* ============ 6. SET UP (runs once) ============ */
const citySelect = document.getElementById("citySelect");
Object.keys(CITIES).forEach(name => citySelect.add(new Option(name, name)));
citySelect.addEventListener("change", e => { currentCity = e.target.value; render(); });

const chipBox = document.getElementById("chips");
Object.keys(ACTIVITIES).forEach(name => {
  const b = document.createElement("button");
  b.className = "chip";
  b.textContent = name;
  b.addEventListener("click", () => { currentActivity = name; render(); });
  chipBox.appendChild(b);
});

render(); // first draw
