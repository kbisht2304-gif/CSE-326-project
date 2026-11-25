# Best Hour ☀️

**A weather web app that tells you not just the weather, but the best hour for your plan.**

Course project for **CSE326: Internet Programming** · Team **Arc Track**



---

## About the project

There are thousands of weather apps, and most of them only show numbers. Best Hour goes one step further: you search a place, pick an activity (walk, run, picnic, photos or cricket), and the app scores every hour of the day from 0 to 100 so you can see the best time to go out.

The project is built only with **HTML, CSS and JavaScript**, with no frameworks or libraries.

## Features

- Search any city, state or country, in any mix of capital and small letters
- Quick links for popular places and a **Use my location** button (Geolocation API)
- Current weather: temperature, feels-like, humidity, wind and a simple "what to wear" tip
- **Best Hour planner:** pick an activity and see a score for every hour, with the best hour highlighted
- 5-day forecast
- Temperature in **°C, °F or K**, remembered for next time
- Page colours and background change with the weather: sunny, cloudy, rainy, winter and night
- Friendly error page when a place is not found or the weather service is not answering
- Recently loaded weather is saved in the browser, so repeat searches are instant
- Responsive layout for phones and computers

## Technologies used

| Area | What we used |
|---|---|
| HTML5 | Semantic tags (`header`, `nav`, `main`, `section`, `footer`), forms, `select`, `video` |
| CSS3 | Variables, Flexbox, Grid, media queries, transitions, keyframe animations, pseudo-classes and pseudo-elements |
| JavaScript | DOM manipulation, events, callbacks, higher-order functions, `fetch` and JSON, `localStorage`, `sessionStorage`, Geolocation API |
| Weather data | [Open-Meteo](https://open-meteo.com/) free weather and geocoding API |
| Hosting | GitHub Pages |

## How the Best Hour score works

Every activity has an ideal temperature range and a dislike for rain and wind. For each hour the app starts at 100 and subtracts points for being too hot or too cold, for chance of rain, for wind and for darkness. Photography gets a bonus near sunrise and sunset. The hour with the highest score is shown as the best time.

## Project structure

```
├── index.html        Home page (search)
├── results.html      Weather page
├── style.css         All the styling
├── results.js        All the JavaScript (used by both pages)
├── images/           Home page video
└── *.gif             Animated backgrounds for each kind of weather
```

## How to run

1. Download or clone this repository.
2. Open `index.html` in a web browser, or visit the live demo link above.
3. An internet connection is needed to get live weather.

## Known limitation

The free weather service limits how many requests one network can send. If it is busy, the app shows older saved weather for places searched before, or a message asking you to try again in a moment.

## Team Arc Track

| Name | Contribution |
|---|---|
| Kartik Bisht | Front end (HTML, CSS), GitHub repository, deployment and README |
| Bhartendu Sharma| Weather data and networking, caching, location |
| Jatin Kumar | Best Hour planner and scoring, units, error messages |

## Credits

Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed under CC BY 4.0.
