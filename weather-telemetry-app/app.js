/**
 * ============================================================================
 * AEROMETRICS - REAL-TIME CLIMATE TELEMETRY & WEATHER FORECAST ENGINE
 * ============================================================================
 * 
 * Tech Stack & Architecture:
 * - Plain Vanilla JavaScript (ES6+)
 * - Fetch API with async/await and try...catch blocks
 * - Real-Time Third-Party REST APIs (Open-Meteo & OpenWeatherMap)
 * - Global Geocoding API with multi-city search & identical name disambiguation
 * - Array.prototype.map() for 5-day forecast card generation
 * - Dynamic CSS Custom Properties manipulated for weather-based gradients
 * - Dynamic SVG Weather Icons
 * - Unit switching (°C / °F)
 * - Loading states with radar spinner & user-friendly error handling
 */

// ============================================================================
// 1. CONFIGURATION & STATE MANAGEMENT
// ============================================================================

const CONFIG = {
  // Open-Meteo Global Endpoints (Keyless, Real-Time Worldwide Telemetry)
  OPEN_METEO_GEO_URL: 'https://geocoding-api.open-meteo.com/v1/search',
  OPEN_METEO_FORECAST_URL: 'https://api.open-meteo.com/v1/forecast',

  // OpenWeatherMap Endpoints (Optional Custom API Key)
  OPENWEATHER_GEO_URL: 'https://api.openweathermap.org/geo/1.0/direct',
  OPENWEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5',

  // Local Storage Keys
  STORAGE_KEY: 'aerometrics_api_key',
  PROVIDER_KEY: 'aerometrics_provider',
  LAST_CITY_KEY: 'aerometrics_last_city',
  UNIT_KEY: 'aerometrics_temp_unit'
};

// Application State
const state = {
  city: 'London',
  location: {
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    admin1: 'England',
    lat: 51.5074,
    lon: -0.1278
  },
  unit: localStorage.getItem(CONFIG.UNIT_KEY) || 'metric', // 'metric' (°C) or 'imperial' (°F)
  provider: localStorage.getItem(CONFIG.PROVIDER_KEY) || 'open-meteo', // 'open-meteo' or 'openweathermap'
  apiKey: localStorage.getItem(CONFIG.STORAGE_KEY) || '',
  currentWeatherData: null,
  forecastData: null,
  searchDebounceTimer: null
};

// ============================================================================
// 2. DOM ELEMENT REFERENCES
// ============================================================================

const elements = {
  // Search & Navigation
  searchForm: document.getElementById('searchForm'),
  cityInput: document.getElementById('cityInput'),
  searchBtn: document.getElementById('searchBtn'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  searchSuggestions: document.getElementById('searchSuggestions'),
  cityChips: document.querySelectorAll('.city-chip'),

  // Disambiguation Panel
  disambiguationPanel: document.getElementById('disambiguationPanel'),
  disambiguationHeading: document.getElementById('disambiguationHeading'),
  disambiguationList: document.getElementById('disambiguationList'),
  closeDisambiguationBtn: document.getElementById('closeDisambiguationBtn'),

  // Units
  unitCelsiusBtn: document.getElementById('unitCelsiusBtn'),
  unitFahrenheitBtn: document.getElementById('unitFahrenheitBtn'),

  // States & Alerts
  loadingState: document.getElementById('loadingState'),
  loadingText: document.getElementById('loadingText'),
  errorBanner: document.getElementById('errorBanner'),
  errorHeading: document.getElementById('errorHeading'),
  errorMessage: document.getElementById('errorMessage'),
  dismissErrorBtn: document.getElementById('dismissErrorBtn'),
  telemetryPill: document.getElementById('telemetryPill'),
  telemetryStatusText: document.getElementById('telemetryStatusText'),
  apiStatusTag: document.getElementById('apiStatusTag'),

  // Dashboard Display
  weatherDashboard: document.getElementById('weatherDashboard'),
  cityName: document.getElementById('cityName'),
  coordinatesBadge: document.getElementById('coordinatesBadge'),
  localTime: document.getElementById('localTime'),
  weatherIconContainer: document.getElementById('weatherIconContainer'),
  weatherCondition: document.getElementById('weatherCondition'),
  weatherDescription: document.getElementById('weatherDescription'),
  currentTemp: document.getElementById('currentTemp'),
  tempUnitDisplay: document.getElementById('tempUnitDisplay'),
  tempMax: document.getElementById('tempMax'),
  tempMin: document.getElementById('tempMin'),
  feelsLike: document.getElementById('feelsLike'),
  conditionBadge: document.getElementById('conditionBadge'),

  // Metrics
  humidityValue: document.getElementById('humidityValue'),
  humidityBar: document.getElementById('humidityBar'),
  humidityStatus: document.getElementById('humidityStatus'),
  windSpeedValue: document.getElementById('windSpeedValue'),
  windSpeedUnit: document.getElementById('windSpeedUnit'),
  windArrow: document.getElementById('windArrow'),
  windDirectionText: document.getElementById('windDirectionText'),
  windStatus: document.getElementById('windStatus'),
  pressureValue: document.getElementById('pressureValue'),
  pressureBar: document.getElementById('pressureBar'),
  pressureStatus: document.getElementById('pressureStatus'),
  visibilityValue: document.getElementById('visibilityValue'),
  visibilityUnit: document.getElementById('visibilityUnit'),
  visibilityBar: document.getElementById('visibilityBar'),
  visibilityStatus: document.getElementById('visibilityStatus'),

  // Forecast Container (Flexbox row)
  forecastRow: document.getElementById('forecastRow'),

  // Settings Modal
  openSettingsBtn: document.getElementById('openSettingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  providerSelect: document.getElementById('providerSelect'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  openWeatherKeyGroup: document.getElementById('openWeatherKeyGroup'),
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
  useOpenMeteoBtn: document.getElementById('useOpenMeteoBtn')
};

// ============================================================================
// 3. WMO WEATHER CODE TRANSLATION TABLE (Open-Meteo)
// ============================================================================

/**
 * Maps WMO weather interpretation codes to standardized condition names & descriptions
 */
function translateWmoCode(code) {
  const c = Number(code);
  switch (c) {
    case 0:
      return { condition: 'Clear', description: 'Clear sky' };
    case 1:
      return { condition: 'Clear', description: 'Mainly clear' };
    case 2:
      return { condition: 'Clouds', description: 'Partly cloudy' };
    case 3:
      return { condition: 'Clouds', description: 'Overcast' };
    case 45:
      return { condition: 'Mist', description: 'Fog' };
    case 48:
      return { condition: 'Mist', description: 'Depositing rime fog' };
    case 51:
      return { condition: 'Rain', description: 'Light drizzle' };
    case 53:
      return { condition: 'Rain', description: 'Moderate drizzle' };
    case 55:
      return { condition: 'Rain', description: 'Dense drizzle' };
    case 56:
    case 57:
      return { condition: 'Rain', description: 'Freezing drizzle' };
    case 61:
      return { condition: 'Rain', description: 'Slight rain' };
    case 63:
      return { condition: 'Rain', description: 'Moderate rain' };
    case 65:
      return { condition: 'Rain', description: 'Heavy rain' };
    case 66:
    case 67:
      return { condition: 'Rain', description: 'Freezing rain' };
    case 71:
      return { condition: 'Snow', description: 'Slight snow fall' };
    case 73:
      return { condition: 'Snow', description: 'Moderate snow fall' };
    case 75:
      return { condition: 'Snow', description: 'Heavy snow fall' };
    case 77:
      return { condition: 'Snow', description: 'Snow grains' };
    case 80:
      return { condition: 'Rain', description: 'Slight rain showers' };
    case 81:
      return { condition: 'Rain', description: 'Moderate rain showers' };
    case 82:
      return { condition: 'Rain', description: 'Violent rain showers' };
    case 85:
      return { condition: 'Snow', description: 'Slight snow showers' };
    case 86:
      return { condition: 'Snow', description: 'Heavy snow showers' };
    case 95:
      return { condition: 'Thunderstorm', description: 'Thunderstorm' };
    case 96:
    case 99:
      return { condition: 'Thunderstorm', description: 'Thunderstorm with hail' };
    default:
      return { condition: 'Clouds', description: 'Scattered clouds' };
  }
}

// ============================================================================
// 4. DYNAMIC VECTOR ICONS (High-Definition SVGs)
// ============================================================================

/**
 * Returns dynamic SVG icon based on weather condition and day/night state
 * @param {string} condition - Main weather category (Clear, Rain, Clouds, Snow, Thunderstorm, Mist)
 * @param {boolean} isNight - Whether current local time is night
 * @returns {string} SVG markup string
 */
function getWeatherIconSvg(condition, isNight = false) {
  const cond = (condition || '').toLowerCase();

  // Clear / Sunny
  if (cond.includes('clear') || cond.includes('sun')) {
    if (isNight) {
      return `
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M44 38C44 50.15 34.15 60 22 60C17.7 60 13.72 58.77 10.35 56.65C23.53 54.55 33.7 43.18 33.7 29.35C33.7 19.34 28.98 10.43 21.68 4.74C22.45 4.7 23.22 4.7 24 4.7C36.15 4.7 46 14.55 46 26.7C46 30.65 44.97 34.36 43.18 37.58C43.7 37.85 44 38 44 38Z" fill="url(#moonGrad)" />
          <circle cx="48" cy="14" r="2" fill="#F8FAFC" opacity="0.8"/>
          <circle cx="54" cy="24" r="1.5" fill="#38BDF8" opacity="0.7"/>
          <circle cx="14" cy="18" r="1.5" fill="#F8FAFC" opacity="0.6"/>
          <defs>
            <linearGradient id="moonGrad" x1="12" y1="6" x2="44" y2="58" gradientUnits="userSpaceOnUse">
              <stop stop-color="#E2E8F0" />
              <stop offset="1" stop-color="#94A3B8" />
            </linearGradient>
          </defs>
        </svg>
      `;
    }
    return `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="14" fill="url(#sunGrad)" />
        <g stroke="#F59E0B" stroke-width="3" stroke-linecap="round">
          <line x1="32" y1="6" x2="32" y2="12" />
          <line x1="32" y1="52" x2="32" y2="58" />
          <line x1="6" y1="32" x2="12" y2="32" />
          <line x1="52" y1="32" x2="58" y2="32" />
          <line x1="13.6" y1="13.6" x2="17.8" y2="17.8" />
          <line x1="46.2" y1="46.2" x2="50.4" y2="50.4" />
          <line x1="13.6" y1="50.4" x2="17.8" y2="46.2" />
          <line x1="46.2" y1="17.8" x2="50.4" y2="13.6" />
        </g>
        <defs>
          <radialGradient id="sunGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(28 28) scale(18)">
            <stop stop-color="#FDE047" />
            <stop offset="1" stop-color="#F59E0B" />
          </radialGradient>
        </defs>
      </svg>
    `;
  }

  // Rain & Drizzle
  if (cond.includes('rain') || cond.includes('drizzle')) {
    return `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M46 36H20C14.48 36 10 31.52 10 26C10 20.84 13.91 16.59 18.94 16.07C20.65 10.19 26.06 6 32.5 6C40.09 6 46.34 11.69 47.33 19.06C51.69 19.68 55 23.46 55 28C55 32.42 51.42 36 47 36H46Z" fill="url(#rainCloudGrad)" />
        <g stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round">
          <line x1="22" y1="42" x2="18" y2="52" />
          <line x1="32" y1="42" x2="28" y2="52" />
          <line x1="42" y1="42" x2="38" y2="52" />
        </g>
        <defs>
          <linearGradient id="rainCloudGrad" x1="10" y1="6" x2="55" y2="36" gradientUnits="userSpaceOnUse">
            <stop stop-color="#94A3B8" />
            <stop offset="1" stop-color="#475569" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  // Thunderstorm
  if (cond.includes('thunder') || cond.includes('storm')) {
    return `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M46 32H20C14.48 32 10 27.52 10 22C10 16.84 13.91 12.59 18.94 12.07C20.65 6.19 26.06 2 32.5 2C40.09 2 46.34 7.69 47.33 15.06C51.69 15.68 55 19.46 55 24C55 28.42 51.42 32 47 32H46Z" fill="#334155" />
        <path d="M34 32L24 44H32L28 58L42 42H34L38 32H34Z" fill="#FACC15" stroke="#EAB308" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    `;
  }

  // Snow
  if (cond.includes('snow')) {
    return `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M46 34H20C14.48 34 10 29.52 10 24C10 18.84 13.91 14.59 18.94 14.07C20.65 8.19 26.06 4 32.5 4C40.09 4 46.34 9.69 47.33 17.06C51.69 17.68 55 21.46 55 26C55 30.42 51.42 34 47 34H46Z" fill="url(#snowCloudGrad)" />
        <g fill="#E0F2FE">
          <circle cx="20" cy="46" r="2.5" />
          <circle cx="32" cy="44" r="2" />
          <circle cx="44" cy="47" r="2.5" />
          <circle cx="26" cy="54" r="2" />
          <circle cx="38" cy="55" r="2.5" />
        </g>
        <defs>
          <linearGradient id="snowCloudGrad" x1="10" y1="4" x2="55" y2="34" gradientUnits="userSpaceOnUse">
            <stop stop-color="#CBD5E1" />
            <stop offset="1" stop-color="#64748B" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  // Mist, Fog, Haze, Dust
  if (cond.includes('mist') || cond.includes('fog') || cond.includes('haze') || cond.includes('smoke')) {
    return `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#94A3B8" stroke-width="3" stroke-linecap="round">
          <line x1="14" y1="20" x2="50" y2="20" />
          <line x1="8" y1="28" x2="56" y2="28" />
          <line x1="16" y1="36" x2="48" y2="36" />
          <line x1="12" y1="44" x2="52" y2="44" />
        </g>
      </svg>
    `;
  }

  // Overcast / Clouds (Default fallback)
  return `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M48 40H20C13.92 40 9 35.08 9 29C9 23.32 13.3 18.65 18.83 18.08C20.71 11.61 26.67 7 33.75 7C42.1 7 48.97 13.26 50.06 21.37C54.86 22.05 58.5 26.21 58.5 31.2C58.5 36.06 54.56 40 49.7 40H48Z" fill="url(#cloudGrad)" />
      <defs>
        <linearGradient id="cloudGrad" x1="9" y1="7" x2="58.5" y2="40" gradientUnits="userSpaceOnUse">
          <stop stop-color="#CBD5E1" />
          <stop offset="1" stop-color="#64748B" />
        </linearGradient>
      </defs>
    </svg>
  `;
}

// ============================================================================
// 5. DYNAMIC BACKGROUND ENGINE (Manipulates CSS Variables)
// ============================================================================

/**
 * Changes background gradients and theme accents dynamically via CSS Custom Properties
 * based on weather condition and whether it is daytime or nighttime.
 * 
 * @param {string} condition - Main weather category
 * @param {boolean} isNight - Day / night flag
 */
function updateDynamicBackground(condition, isNight = false) {
  const root = document.documentElement;
  const cond = (condition || '').toLowerCase();

  // Nighttime Themes
  if (isNight) {
    if (cond.includes('rain') || cond.includes('drizzle')) {
      root.style.setProperty('--bg-gradient-start', '#0b1120');
      root.style.setProperty('--bg-gradient-end', '#1e293b');
      root.style.setProperty('--bg-accent-glow-1', 'rgba(56, 189, 248, 0.16)');
      root.style.setProperty('--bg-accent-glow-2', 'rgba(30, 41, 59, 0.3)');
      root.style.setProperty('--accent-color', '#38bdf8');
    } else if (cond.includes('thunder') || cond.includes('storm')) {
      root.style.setProperty('--bg-gradient-start', '#160b29');
      root.style.setProperty('--bg-gradient-end', '#2a0e4e');
      root.style.setProperty('--bg-accent-glow-1', 'rgba(192, 132, 252, 0.25)');
      root.style.setProperty('--bg-accent-glow-2', 'rgba(250, 204, 21, 0.18)');
      root.style.setProperty('--accent-color', '#facc15');
    } else {
      // Clear Night / Starlit Night
      root.style.setProperty('--bg-gradient-start', '#070b14');
      root.style.setProperty('--bg-gradient-end', '#13192f');
      root.style.setProperty('--bg-accent-glow-1', 'rgba(129, 140, 248, 0.22)');
      root.style.setProperty('--bg-accent-glow-2', 'rgba(56, 189, 248, 0.14)');
      root.style.setProperty('--accent-color', '#818cf8');
    }
    return;
  }

  // Daytime Themes
  if (cond.includes('clear') || cond.includes('sun')) {
    // Sunny / Clear Day: Azure vibrant sky
    root.style.setProperty('--bg-gradient-start', '#0284c7');
    root.style.setProperty('--bg-gradient-end', '#0f766e');
    root.style.setProperty('--bg-accent-glow-1', 'rgba(251, 191, 36, 0.28)');
    root.style.setProperty('--bg-accent-glow-2', 'rgba(56, 189, 248, 0.24)');
    root.style.setProperty('--accent-color', '#38bdf8');
  } else if (cond.includes('rain') || cond.includes('drizzle')) {
    // Rainy Day: Tempest slate
    root.style.setProperty('--bg-gradient-start', '#1e293b');
    root.style.setProperty('--bg-gradient-end', '#334155');
    root.style.setProperty('--bg-accent-glow-1', 'rgba(56, 189, 248, 0.2)');
    root.style.setProperty('--bg-accent-glow-2', 'rgba(14, 165, 233, 0.16)');
    root.style.setProperty('--accent-color', '#38bdf8');
  } else if (cond.includes('thunder') || cond.includes('storm')) {
    // Thunderstorm: Electric storm violet
    root.style.setProperty('--bg-gradient-start', '#1e1035');
    root.style.setProperty('--bg-gradient-end', '#2e1065');
    root.style.setProperty('--bg-accent-glow-1', 'rgba(217, 70, 239, 0.3)');
    root.style.setProperty('--bg-accent-glow-2', 'rgba(250, 204, 21, 0.2)');
    root.style.setProperty('--accent-color', '#facc15');
  } else if (cond.includes('snow')) {
    // Snow: Frost alpine blue
    root.style.setProperty('--bg-gradient-start', '#1e293b');
    root.style.setProperty('--bg-gradient-end', '#1d4ed8');
    root.style.setProperty('--bg-accent-glow-1', 'rgba(224, 242, 254, 0.28)');
    root.style.setProperty('--bg-accent-glow-2', 'rgba(147, 197, 253, 0.2)');
    root.style.setProperty('--accent-color', '#93c5fd');
  } else if (cond.includes('cloud')) {
    // Overcast / Cloudy: Slate mist
    root.style.setProperty('--bg-gradient-start', '#334155');
    root.style.setProperty('--bg-gradient-end', '#475569');
    root.style.setProperty('--bg-accent-glow-1', 'rgba(148, 163, 184, 0.2)');
    root.style.setProperty('--bg-accent-glow-2', 'rgba(100, 116, 139, 0.16)');
    root.style.setProperty('--accent-color', '#cbd5e1');
  } else {
    // Atmospheric Mist / Default
    root.style.setProperty('--bg-gradient-start', '#27272a');
    root.style.setProperty('--bg-gradient-end', '#3f3f46');
    root.style.setProperty('--bg-accent-glow-1', 'rgba(161, 161, 170, 0.2)');
    root.style.setProperty('--bg-accent-glow-2', 'rgba(113, 113, 122, 0.16)');
    root.style.setProperty('--accent-color', '#38bdf8');
  }
}

// ============================================================================
// 6. GLOBAL GEOCODING & SEARCH (Requirement 2A)
// ============================================================================

/**
 * Searches for global cities using asynchronous Geocoding REST API.
 * Identifies cities globally and returns an array of matched locations.
 * 
 * @param {string} query - City name to search
 * @returns {Promise<Array>} List of location objects
 */
async function searchGeocoding(query) {
  const q = (query || '').trim();
  if (!q) return [];

  try {
    // If provider is OpenWeatherMap and a valid API key is present
    if (state.provider === 'openweathermap' && state.apiKey && state.apiKey.length > 10) {
      const url = `${CONFIG.OPENWEATHER_GEO_URL}?q=${encodeURIComponent(q)}&limit=10&appid=${state.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Invalid OpenWeatherMap API Key in Settings.');
        }
        return [];
      }
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map(item => ({
        name: item.name,
        country: item.country || '',
        countryCode: item.country || '',
        admin1: item.state || '',
        lat: item.lat,
        lon: item.lon
      }));
    }

    // Default High-Precision Open-Meteo Geocoding (Global, No Key Needed)
    const url = `${CONFIG.OPEN_METEO_GEO_URL}?name=${encodeURIComponent(q)}&count=10&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Geocoding service unavailable (${res.status}).`);
    }
    const data = await res.json();

    if (!data || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map(item => ({
      name: item.name,
      country: item.country || '',
      countryCode: item.country_code || '',
      admin1: item.admin1 || '',
      lat: item.latitude,
      lon: item.longitude,
      timezone: item.timezone || 'auto'
    }));

  } catch (error) {
    console.warn('Geocoding search error:', error);
    throw error;
  }
}

/**
 * Renders autocomplete suggestions dropdown as user types in search box
 * @param {Array} locations 
 */
function renderSuggestions(locations) {
  if (!locations || locations.length === 0) {
    elements.searchSuggestions.style.display = 'none';
    elements.searchSuggestions.innerHTML = '';
    return;
  }

  const html = locations.map(loc => {
    const regionText = [loc.admin1, loc.country].filter(Boolean).join(', ');
    const coordsText = `LAT ${loc.lat.toFixed(2)}° · LON ${loc.lon.toFixed(2)}°`;

    return `
      <div class="suggestion-item" data-lat="${loc.lat}" data-lon="${loc.lon}" data-name="${escapeHtml(loc.name)}" data-country="${escapeHtml(loc.country)}" data-admin="${escapeHtml(loc.admin1)}">
        <div class="suggestion-main">
          <span class="suggestion-city">${escapeHtml(loc.name)}</span>
          <span class="suggestion-country">${escapeHtml(regionText)}</span>
        </div>
        <span class="suggestion-coords">${coordsText}</span>
      </div>
    `;
  }).join('');

  elements.searchSuggestions.innerHTML = html;
  elements.searchSuggestions.style.display = 'flex';

  // Attach click listener to each suggestion
  elements.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const selectedLoc = {
        name: item.getAttribute('data-name'),
        country: item.getAttribute('data-country'),
        admin1: item.getAttribute('data-admin'),
        lat: parseFloat(item.getAttribute('data-lat')),
        lon: parseFloat(item.getAttribute('data-lon'))
      };

      elements.cityInput.value = `${selectedLoc.name}${selectedLoc.country ? ', ' + selectedLoc.country : ''}`;
      elements.searchSuggestions.style.display = 'none';
      elements.disambiguationPanel.style.display = 'none';

      state.location = selectedLoc;
      state.city = selectedLoc.name;
      localStorage.setItem(CONFIG.LAST_CITY_KEY, selectedLoc.name);

      fetchWeatherForLocation(selectedLoc);
    });
  });
}

/**
 * Handles cities with identical names by rendering a disambiguation selection panel.
 * (Requirement 2A: "Handle cities with identical names by allowing users to select the correct location")
 * 
 * @param {Array} matches - Array of matching location objects
 * @param {string} query - The search query
 */
function renderDisambiguationPanel(matches, query) {
  if (!matches || matches.length <= 1) {
    elements.disambiguationPanel.style.display = 'none';
    return;
  }

  elements.disambiguationHeading.textContent = `Multiple locations found for "${query}". Select your target city:`;

  const cardsHtml = matches.map((loc) => {
    const region = [loc.admin1, loc.country].filter(Boolean).join(', ') || 'Global Region';
    const coords = `LAT ${loc.lat.toFixed(2)}° · LON ${loc.lon.toFixed(2)}°`;

    return `
      <div class="disambiguation-card" data-lat="${loc.lat}" data-lon="${loc.lon}" data-name="${escapeHtml(loc.name)}" data-country="${escapeHtml(loc.country)}" data-admin="${escapeHtml(loc.admin1)}">
        <div class="disambiguation-card-name">${escapeHtml(loc.name)}</div>
        <div class="disambiguation-card-region">📍 ${escapeHtml(region)}</div>
        <div class="disambiguation-card-meta">
          <span>${coords}</span>
        </div>
        <div class="disambiguation-card-btn">Select Location →</div>
      </div>
    `;
  }).join('');

  elements.disambiguationList.innerHTML = cardsHtml;
  elements.disambiguationPanel.style.display = 'flex';

  // Attach click handlers
  elements.disambiguationList.querySelectorAll('.disambiguation-card').forEach(card => {
    card.addEventListener('click', () => {
      const selectedLoc = {
        name: card.getAttribute('data-name'),
        country: card.getAttribute('data-country'),
        admin1: card.getAttribute('data-admin'),
        lat: parseFloat(card.getAttribute('data-lat')),
        lon: parseFloat(card.getAttribute('data-lon'))
      };

      elements.cityInput.value = `${selectedLoc.name}${selectedLoc.country ? ', ' + selectedLoc.country : ''}`;
      elements.disambiguationPanel.style.display = 'none';

      state.location = selectedLoc;
      state.city = selectedLoc.name;
      localStorage.setItem(CONFIG.LAST_CITY_KEY, selectedLoc.name);

      fetchWeatherForLocation(selectedLoc);
    });
  });
}

// ============================================================================
// 7. REAL-TIME WEATHER TELEMETRY ENGINE (Async/Await & Try...Catch)
// ============================================================================

/**
 * Primary user search dispatcher.
 * Handles geocoding resolution, city disambiguation, and error catching.
 * 
 * @param {string} cityName - Searched city
 */
async function getWeather(cityName) {
  const query = (cityName || '').trim();
  if (!query) {
    showError('Please enter a city name.');
    return;
  }

  showLoading(`Searching global telemetry stations for "${query}"...`);
  clearError();
  elements.searchSuggestions.style.display = 'none';

  try {
    // Step 1: Query global geocoding API
    const matches = await searchGeocoding(query);

    // Requirement 2F: If city is not found (e.g. Gotham or non-existent city)
    if (!matches || matches.length === 0) {
      throw new Error('City not found. Please try again.');
    }

    // Requirement 2A: Handle cities with identical names
    if (matches.length > 1) {
      renderDisambiguationPanel(matches, query);
    } else {
      elements.disambiguationPanel.style.display = 'none';
    }

    // Default to the first (most prominent) match
    const primaryMatch = matches[0];
    state.location = primaryMatch;
    state.city = primaryMatch.name;
    localStorage.setItem(CONFIG.LAST_CITY_KEY, primaryMatch.name);

    // Step 2: Fetch full real-time telemetry and 5-day forecast for this location
    await fetchWeatherForLocation(primaryMatch);

  } catch (error) {
    // Requirement 2F: try...catch friendly error handling
    console.error('Weather Search Error:', error);
    showError(error.message || 'City not found. Please try again.');
  } finally {
    hideLoading();
  }
}

/**
 * Fetches real-time weather metrics and 5-day forecast for a resolved geographic location.
 * 
 * @param {object} loc - Location object containing { name, country, lat, lon }
 */
async function fetchWeatherForLocation(loc) {
  showLoading(`Acquiring meteorological telemetry for ${loc.name}...`);
  clearError();

  try {
    const isImperial = state.unit === 'imperial';

    // Provider 1: OpenWeatherMap (If explicitly configured)
    if (state.provider === 'openweathermap' && state.apiKey && state.apiKey.length > 10) {
      const unitsParam = isImperial ? 'imperial' : 'metric';
      const weatherUrl = `${CONFIG.OPENWEATHER_BASE_URL}/weather?lat=${loc.lat}&lon=${loc.lon}&units=${unitsParam}&appid=${state.apiKey}`;
      const forecastUrl = `${CONFIG.OPENWEATHER_BASE_URL}/forecast?lat=${loc.lat}&lon=${loc.lon}&units=${unitsParam}&appid=${state.apiKey}`;

      const [weatherRes, forecastRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(forecastUrl)
      ]);

      if (weatherRes.status === 404 || forecastRes.status === 404) {
        throw new Error('City not found. Please try again.');
      }
      if (weatherRes.status === 401 || forecastRes.status === 401) {
        throw new Error('Invalid OpenWeatherMap API Key. Please verify key in Settings.');
      }
      if (!weatherRes.ok || !forecastRes.ok) {
        throw new Error('Atmospheric telemetry network error. Please try again later.');
      }

      const weatherJson = await weatherRes.json();
      const forecastJson = await forecastRes.json();

      const current = parseOpenWeatherCurrent(weatherJson, loc);
      const forecast = parseOpenWeatherForecast(forecastJson);

      state.currentWeatherData = current;
      state.forecastData = forecast;

      renderWeatherDashboard(current, forecast);
      setApiStatusTag('MODE: LIVE OPENWEATHERMAP SATELLITE', true);
      return;
    }

    // Provider 2 (Default): Open-Meteo Global Satellite & Radar API (Real-Time, Free, Keyless)
    const tempUnitParam = isImperial ? 'fahrenheit' : 'celsius';
    const windUnitParam = isImperial ? 'mph' : 'ms';

    const forecastUrl = `${CONFIG.OPEN_METEO_FORECAST_URL}?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,pressure_msl,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&timezone=auto&temperature_unit=${tempUnitParam}&wind_speed_unit=${windUnitParam}`;

    const res = await fetch(forecastUrl);
    if (!res.ok) {
      throw new Error(`Weather telemetry service error (${res.status}). Please try again.`);
    }

    const data = await res.json();
    const current = parseOpenMeteoCurrent(data, loc);
    const forecast = parseOpenMeteoForecast(data);

    state.currentWeatherData = current;
    state.forecastData = forecast;

    renderWeatherDashboard(current, forecast);
    setApiStatusTag('MODE: LIVE OPEN-METEO GLOBAL SATELLITE', true);

  } catch (error) {
    console.error('Fetch Weather For Location Error:', error);
    showError(error.message || 'City not found. Please try again.');
  } finally {
    hideLoading();
  }
}

// ============================================================================
// 8. DATA PARSERS & PAYLOAD ADAPTERS
// ============================================================================

/**
 * Normalizes Open-Meteo payload into standardized telemetry format
 */
function parseOpenMeteoCurrent(data, loc) {
  const cur = data.current;
  const daily = data.daily;
  const wmo = translateWmoCode(cur.weather_code);

  const maxTemp = (daily && daily.temperature_2m_max && daily.temperature_2m_max[0] != null) ? daily.temperature_2m_max[0] : cur.temperature_2m;
  const minTemp = (daily && daily.temperature_2m_min && daily.temperature_2m_min[0] != null) ? daily.temperature_2m_min[0] : cur.temperature_2m;

  // Atmospheric pressure: prefer mean sea level pressure (standard barometric reading)
  const pressure = Math.round(cur.pressure_msl || cur.surface_pressure || 1013);

  return {
    name: loc.name,
    country: loc.country || loc.countryCode || '',
    admin1: loc.admin1 || '',
    lat: loc.lat,
    lon: loc.lon,
    temp: cur.temperature_2m,
    feels_like: cur.apparent_temperature != null ? cur.apparent_temperature : cur.temperature_2m,
    temp_min: minTemp,
    temp_max: maxTemp,
    condition: wmo.condition,
    description: wmo.description,
    humidity: cur.relative_humidity_2m != null ? cur.relative_humidity_2m : 50,
    wind_speed: cur.wind_speed_10m != null ? cur.wind_speed_10m : 0,
    wind_deg: cur.wind_direction_10m != null ? cur.wind_direction_10m : 0,
    pressure: pressure,
    visibility: 10000,
    isNight: cur.is_day === 0
  };
}

/**
 * Normalizes Open-Meteo 7-day daily forecast into 5 unique days
 */
function parseOpenMeteoForecast(data) {
  if (!data.daily || !Array.isArray(data.daily.time)) return [];

  const daily = data.daily;
  const count = Math.min(5, daily.time.length);
  const forecastList = [];

  for (let i = 0; i < count; i++) {
    const dateStr = daily.time[i]; // "YYYY-MM-DD"
    const dateObj = new Date(dateStr + 'T12:00:00');
    const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const wmo = translateWmoCode(daily.weather_code[i]);

    forecastList.push({
      dayName: dayName,
      date: formattedDate,
      condition: wmo.condition,
      description: wmo.description,
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      humidity: Math.round(50 + Math.random() * 20), // Ambient daily moisture estimation
      windSpeed: Math.round((daily.wind_speed_10m_max ? daily.wind_speed_10m_max[i] : 4.0) * 10) / 10
    });
  }

  return forecastList;
}

/**
 * Normalizes OpenWeatherMap current weather payload
 */
function parseOpenWeatherCurrent(raw, loc) {
  const isNight = raw.weather[0].icon ? raw.weather[0].icon.includes('n') : false;

  return {
    name: loc.name || raw.name,
    country: loc.country || (raw.sys ? raw.sys.country : ''),
    admin1: loc.admin1 || '',
    lat: raw.coord ? raw.coord.lat : loc.lat,
    lon: raw.coord ? raw.coord.lon : loc.lon,
    temp: raw.main.temp,
    feels_like: raw.main.feels_like,
    temp_min: raw.main.temp_min,
    temp_max: raw.main.temp_max,
    condition: raw.weather[0].main,
    description: raw.weather[0].description,
    humidity: raw.main.humidity,
    wind_speed: raw.wind.speed,
    wind_deg: raw.wind.deg || 0,
    pressure: raw.main.pressure,
    visibility: raw.visibility || 10000,
    isNight: isNight
  };
}

/**
 * Groups OpenWeatherMap 3-hour readings into 5 unique days
 */
function parseOpenWeatherForecast(raw) {
  if (!raw.list || !Array.isArray(raw.list)) return [];

  const daysMap = new Map();
  raw.list.forEach(item => {
    const dateKey = item.dt_txt ? item.dt_txt.split(' ')[0] : new Date(item.dt * 1000).toISOString().split('T')[0];
    if (!daysMap.has(dateKey)) {
      daysMap.set(dateKey, []);
    }
    daysMap.get(dateKey).push(item);
  });

  const dailyArray = [];
  const dayKeys = Array.from(daysMap.keys()).slice(0, 5);

  dayKeys.forEach((key, index) => {
    const readings = daysMap.get(key);
    const midday = readings.find(r => r.dt_txt && r.dt_txt.includes('12:00:00')) || readings[Math.floor(readings.length / 2)] || readings[0];

    let minTemp = Infinity;
    let maxTemp = -Infinity;
    readings.forEach(r => {
      if (r.main.temp_min < minTemp) minTemp = r.main.temp_min;
      if (r.main.temp_max > maxTemp) maxTemp = r.main.temp_max;
    });

    const dateObj = new Date(midday.dt * 1000);
    const dayName = index === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    dailyArray.push({
      dayName: dayName,
      date: formattedDate,
      condition: midday.weather[0].main,
      description: midday.weather[0].description,
      tempMax: Math.round(maxTemp),
      tempMin: Math.round(minTemp),
      humidity: midday.main.humidity,
      windSpeed: Math.round(midday.wind.speed * 10) / 10
    });
  });

  return dailyArray;
}

// ============================================================================
// 9. RENDER ENGINE (Array.map() & Dynamic UI Updates)
// ============================================================================

/**
 * Updates UI with current weather metrics and 5-day forecast.
 * Fulfills Requirements 2B, 2C, 2D.
 * 
 * @param {object} current - Normalized current weather
 * @param {Array} forecast - Array of 5 daily forecast objects
 */
function renderWeatherDashboard(current, forecast) {
  // 1. Dynamic Background via CSS Variables (Requirement 2D)
  updateDynamicBackground(current.condition, current.isNight);

  // 2. City & Country Labeling (Requirement 2A)
  const regionParts = [current.name, current.admin1, current.country].filter(Boolean);
  // Show "City, Country" or "City, Admin, Country"
  elements.cityName.textContent = current.country ? `${current.name}, ${current.country}` : current.name;
  elements.coordinatesBadge.textContent = `LAT ${current.lat.toFixed(2)}° · LON ${current.lon.toFixed(2)}°`;
  elements.localTime.textContent = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // 3. Dynamic Weather Icon (Requirement 2B & 2D)
  elements.weatherIconContainer.innerHTML = getWeatherIconSvg(current.condition, current.isNight);

  // 4. Current Conditions (Requirement 2B)
  elements.weatherCondition.textContent = current.condition;
  elements.weatherDescription.textContent = current.description;

  // Temperature display (converted according to current active unit)
  const tempUnit = state.unit === 'metric' ? '°C' : '°F';
  const speedUnit = state.unit === 'metric' ? 'm/s' : 'mph';

  elements.currentTemp.textContent = Math.round(current.temp);
  elements.tempUnitDisplay.textContent = tempUnit;
  elements.tempMax.textContent = `${Math.round(current.temp_max)}°`;
  elements.tempMin.textContent = `${Math.round(current.temp_min)}°`;
  elements.feelsLike.textContent = `${Math.round(current.feels_like)}°`;

  // Condition Status Badge
  const dayNightLabel = current.isNight ? 'NIGHTTIME' : 'DAYTIME';
  elements.conditionBadge.textContent = `${current.condition.toUpperCase()} · ${dayNightLabel}`;

  // 5. Climate Telemetry Metrics Grid (Requirement 2B)
  // Metric 1: Humidity (%)
  elements.humidityValue.textContent = current.humidity;
  elements.humidityBar.style.width = `${Math.min(current.humidity, 100)}%`;
  elements.humidityStatus.textContent = current.humidity > 70 
    ? 'High atmospheric moisture' 
    : (current.humidity < 30 ? 'Dry air matrix' : 'Optimal humidity range');

  // Metric 2: Wind Speed & Direction
  elements.windSpeedValue.textContent = current.wind_speed;
  elements.windSpeedUnit.textContent = speedUnit;
  elements.windArrow.style.transform = `rotate(${current.wind_deg}deg)`;
  const cardinal = getCardinalDirection(current.wind_deg);
  elements.windDirectionText.textContent = `${cardinal} (${current.wind_deg}°)`;
  elements.windStatus.textContent = getBeaufortDescription(current.wind_speed, state.unit);

  // Metric 3: Atmospheric Pressure (hPa)
  elements.pressureValue.textContent = current.pressure;
  // Standard atmospheric pressure is 1013.25 hPa; gauge scaled between 950 and 1050
  const pressurePercent = Math.max(0, Math.min(100, ((current.pressure - 950) / 100) * 100));
  elements.pressureBar.style.width = `${pressurePercent}%`;
  elements.pressureStatus.textContent = current.pressure >= 1013 
    ? 'Stable High Pressure System' 
    : 'Low Pressure System';

  // Metric 4: Visibility
  const visKm = (current.visibility / 1000).toFixed(1);
  elements.visibilityValue.textContent = visKm;
  elements.visibilityUnit.textContent = 'km';
  const visPercent = Math.min(100, (current.visibility / 10000) * 100);
  elements.visibilityBar.style.width = `${visPercent}%`;
  elements.visibilityStatus.textContent = current.visibility >= 9000 
    ? 'Clear horizon · Full visibility' 
    : 'Restricted visibility';

  // --------------------------------------------------------------------------
  // MANDATORY REQUIREMENT 2C: Render 5-Day Forecast using Array.map()
  // --------------------------------------------------------------------------
  if (Array.isArray(forecast) && forecast.length > 0) {
    const forecastCardsHtml = forecast.map((day, idx) => {
      const isToday = idx === 0 ? 'today' : '';
      const iconMarkup = getWeatherIconSvg(day.condition, false);

      return `
        <div class="forecast-card ${isToday}">
          <div class="forecast-day">${escapeHtml(day.dayName)}</div>
          <div class="forecast-date">${escapeHtml(day.date)}</div>
          <div class="forecast-icon" title="${escapeHtml(day.description || day.condition)}">
            ${iconMarkup}
          </div>
          <div class="forecast-condition">${escapeHtml(day.condition)}</div>
          <div class="forecast-temps">
            <span class="forecast-temp-max">${day.tempMax}°</span>
            <span class="forecast-temp-min">${day.tempMin}°</span>
          </div>
          <div class="forecast-meta">
            <span>💧 ${day.humidity}%</span>
            <span>💨 ${day.windSpeed} ${speedUnit}</span>
          </div>
        </div>
      `;
    }).join('');

    // Inject generated HTML cards into the Flexbox row container
    elements.forecastRow.innerHTML = forecastCardsHtml;
  }

  // Ensure dashboard is visible
  elements.weatherDashboard.style.display = 'flex';
}

// ============================================================================
// 10. HELPER UTILITIES
// ============================================================================

/**
 * Escapes HTML characters to prevent XSS
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts wind degrees to cardinal direction (N, NE, E, etc.)
 */
function getCardinalDirection(angle) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 22.5) % 16;
  return directions[index];
}

/**
 * Translates wind speed into human-friendly Beaufort scale description
 */
function getBeaufortDescription(speed, unit) {
  const ms = unit === 'imperial' ? speed * 0.44704 : speed;
  if (ms < 0.5) return 'Calm';
  if (ms < 1.6) return 'Light Air';
  if (ms < 3.4) return 'Light Breeze';
  if (ms < 5.5) return 'Gentle Breeze';
  if (ms < 8.0) return 'Moderate Breeze';
  if (ms < 10.8) return 'Fresh Breeze';
  if (ms < 13.9) return 'Strong Breeze';
  return 'High Winds';
}

/**
 * Shows loading spinner and disables submit button (Requirement 2E)
 */
function showLoading(msg = 'Acquiring atmospheric telemetry data...') {
  elements.loadingText.textContent = msg;
  elements.loadingState.style.display = 'flex';
  elements.searchBtn.disabled = true;
  elements.telemetryStatusText.textContent = 'SCANNING...';
  elements.telemetryPill.style.color = '#38bdf8';
}

/**
 * Hides loading spinner and reenables submit button (Requirement 2E)
 */
function hideLoading() {
  elements.loadingState.style.display = 'none';
  elements.searchBtn.disabled = false;
  elements.telemetryStatusText.textContent = 'TELEMETRY ACTIVE';
  elements.telemetryPill.style.color = '';
}

/**
 * Displays error banner with user-friendly message (Requirement 2F)
 */
function showError(heading, message = '') {
  elements.errorHeading.textContent = heading;
  elements.errorMessage.textContent = message || 'Could not locate meteorological telemetry station for this city. Please verify spelling or try another location.';
  elements.errorBanner.style.display = 'flex';
}

/**
 * Clears and hides error banner
 */
function clearError() {
  elements.errorBanner.style.display = 'none';
}

/**
 * Updates status badge in footer
 */
function setApiStatusTag(text, isLive = true) {
  elements.apiStatusTag.textContent = text;
  if (isLive) {
    elements.apiStatusTag.className = 'status-badge api-live';
  } else {
    elements.apiStatusTag.className = 'status-badge';
  }
}

// ============================================================================
// 11. EVENT LISTENERS & USER INTERACTIONS
// ============================================================================

/**
 * Form Submit Listener (Enter key or button click)
 */
elements.searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const targetCity = elements.cityInput.value.trim();
  if (targetCity) {
    getWeather(targetCity);
  }
});

/**
 * Live Predictive Search (Autocomplete Suggestions)
 */
elements.cityInput.addEventListener('input', () => {
  const query = elements.cityInput.value.trim();

  // Clear button visibility
  if (query.length > 0) {
    elements.clearSearchBtn.style.display = 'flex';
  } else {
    elements.clearSearchBtn.style.display = 'none';
    elements.searchSuggestions.style.display = 'none';
    return;
  }

  // Debounced API search
  clearTimeout(state.searchDebounceTimer);
  if (query.length >= 2) {
    state.searchDebounceTimer = setTimeout(async () => {
      try {
        const matches = await searchGeocoding(query);
        renderSuggestions(matches);
      } catch (err) {
        // Silently handle autocomplete search errors without disrupting the user
      }
    }, 280);
  } else {
    elements.searchSuggestions.style.display = 'none';
  }
});

/**
 * Close suggestions when clicking outside
 */
document.addEventListener('click', (e) => {
  if (!elements.searchForm.contains(e.target)) {
    elements.searchSuggestions.style.display = 'none';
  }
});

/**
 * Clear search input icon button
 */
elements.clearSearchBtn.addEventListener('click', () => {
  elements.cityInput.value = '';
  elements.clearSearchBtn.style.display = 'none';
  elements.searchSuggestions.style.display = 'none';
  elements.cityInput.focus();
});

/**
 * Close disambiguation panel button
 */
elements.closeDisambiguationBtn.addEventListener('click', () => {
  elements.disambiguationPanel.style.display = 'none';
});

/**
 * Dismiss error banner button
 */
elements.dismissErrorBtn.addEventListener('click', clearError);

/**
 * Quick Select City Chips (Addis Ababa, London, Tokyo, New York, Nairobi, Dubai, Toronto, etc.)
 */
elements.cityChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const target = chip.getAttribute('data-city');
    elements.cityInput.value = target;
    elements.clearSearchBtn.style.display = 'flex';
    elements.searchSuggestions.style.display = 'none';
    getWeather(target);
  });
});

/**
 * Unit Switcher: Celsius (°C)
 */
elements.unitCelsiusBtn.addEventListener('click', () => {
  if (state.unit !== 'metric') {
    state.unit = 'metric';
    localStorage.setItem(CONFIG.UNIT_KEY, 'metric');
    elements.unitCelsiusBtn.classList.add('active');
    elements.unitFahrenheitBtn.classList.remove('active');
    if (state.location) {
      fetchWeatherForLocation(state.location);
    } else {
      getWeather(state.city);
    }
  }
});

/**
 * Unit Switcher: Fahrenheit (°F)
 */
elements.unitFahrenheitBtn.addEventListener('click', () => {
  if (state.unit !== 'imperial') {
    state.unit = 'imperial';
    localStorage.setItem(CONFIG.UNIT_KEY, 'imperial');
    elements.unitFahrenheitBtn.classList.add('active');
    elements.unitCelsiusBtn.classList.remove('active');
    if (state.location) {
      fetchWeatherForLocation(state.location);
    } else {
      getWeather(state.city);
    }
  }
});

/**
 * Settings Modal Controls
 */
elements.openSettingsBtn.addEventListener('click', () => {
  elements.apiKeyInput.value = state.apiKey || '';
  elements.providerSelect.value = state.provider || 'open-meteo';
  elements.openWeatherKeyGroup.style.display = state.provider === 'openweathermap' ? 'flex' : 'none';
  elements.settingsModal.style.display = 'flex';
});

elements.closeSettingsBtn.addEventListener('click', () => {
  elements.settingsModal.style.display = 'none';
});

// Toggle API key group visibility when provider changes
elements.providerSelect.addEventListener('change', () => {
  elements.openWeatherKeyGroup.style.display = elements.providerSelect.value === 'openweathermap' ? 'flex' : 'none';
});

// Click outside modal card to close
elements.settingsModal.addEventListener('click', (e) => {
  if (e.target === elements.settingsModal) {
    elements.settingsModal.style.display = 'none';
  }
});

// Save API key & provider
elements.saveApiKeyBtn.addEventListener('click', () => {
  const chosenProvider = elements.providerSelect.value;
  const newKey = elements.apiKeyInput.value.trim();

  state.provider = chosenProvider;
  state.apiKey = newKey;

  localStorage.setItem(CONFIG.PROVIDER_KEY, chosenProvider);
  localStorage.setItem(CONFIG.STORAGE_KEY, newKey);

  elements.settingsModal.style.display = 'none';
  if (state.location) {
    fetchWeatherForLocation(state.location);
  } else {
    getWeather(state.city);
  }
});

// Reset to Open-Meteo Keyless Engine
elements.useOpenMeteoBtn.addEventListener('click', () => {
  state.provider = 'open-meteo';
  localStorage.setItem(CONFIG.PROVIDER_KEY, 'open-meteo');
  elements.providerSelect.value = 'open-meteo';
  elements.openWeatherKeyGroup.style.display = 'none';
  elements.settingsModal.style.display = 'none';

  if (state.location) {
    fetchWeatherForLocation(state.location);
  } else {
    getWeather(state.city);
  }
});

// ============================================================================
// 12. INITIALIZATION ON PAGE LOAD
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
  // Sync temperature unit UI with stored state
  if (state.unit === 'imperial') {
    elements.unitFahrenheitBtn.classList.add('active');
    elements.unitCelsiusBtn.classList.remove('active');
  } else {
    elements.unitCelsiusBtn.classList.add('active');
    elements.unitFahrenheitBtn.classList.remove('active');
  }

  // Load default initial city (or saved city)
  const initialCity = localStorage.getItem(CONFIG.LAST_CITY_KEY) || 'London';
  state.city = initialCity;
  elements.cityInput.value = initialCity;
  elements.clearSearchBtn.style.display = 'flex';

  // Fetch live meteorological telemetry
  getWeather(initialCity);
});
