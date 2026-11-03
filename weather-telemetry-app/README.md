# 🌤️ AeroMetrics – Weather Forecast App

AeroMetrics is a weather app I built using HTML, CSS, and JavaScript. It allows users to search for cities around the world and check their current weather conditions and a 5-day forecast.

I wanted to make the app easy to use, responsive, and visually interesting while practicing working with real weather APIs.

## 🌍 Features

- Search for cities: Search for cities from different countries around the world.
- City suggestions: Get suggestions while typing in the search bar.
- Same city names: Choose the correct location when multiple cities have the same name, such as Paris in France or Paris in the USA.
- Current weather: View temperature, feels-like temperature, humidity, wind speed, and atmospheric pressure.
- 5-day forecast: Check upcoming weather conditions and temperatures.
- Weather-based backgrounds: The background changes depending on the current weather.
- Day and night themes: The app displays different themes depending on the time of day.
- Weather icons: Icons change based on the weather conditions.
- Loading animation: Shows a loading animation while fetching weather data.
- Error handling: Displays a message when a city cannot be found or a request fails.
- Temperature conversion: Switch between Celsius and Fahrenheit.
- Wind speed conversion: Switch between m/s and mph.
- Responsive design: Works on desktop, tablet, and mobile screens.

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Fetch API
- Async/Await
- REST APIs
- CSS Flexbox
- Local Storage

## 🌐 APIs

The app uses external APIs to get location and weather information.

Open-Meteo
- Used for searching cities and getting weather information.
- Does not require an API key for the services used in this project.

OpenWeatherMap (Optional)
- The app also supports OpenWeatherMap.
- Users can add their own API key through the settings section.

## 🚀 How to Run the Project

1. Clone this repository or download the project.
2. Open the project folder in VS Code.
3. Open index.html in your browser.

You can also run it using a local development server.

`bash
python -m http.server 3000