const fs = require("fs");
const axios = require("axios");

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

const STATE_FILE = "state.json";
const COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { lastAlert: 0 };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

async function run() {
  const res = await axios.get(
    `https://api.openweathermap.org/data/2.5/weather?q=Pearland,US&appid=${WEATHER_API_KEY}&units=imperial`
  );

  const heatIndex = res.data.main.feels_like;
  const now = Date.now();

  console.log("Heat index:", heatIndex);

  const state = loadState();

  if (heatIndex > 85 && now - state.lastAlert >= COOLDOWN_MS) {
    await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["All"],
        headings: { en: "Heat Alert" },
        contents: { en: `Heat index is currently ${Math.round(heatIndex)}°F in Pearland. Stay hydrated and avoid prolonged outdoor activities.` }
      },
      {
        headers: {
          Authorization: `Basic ${ONESIGNAL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Notification sent");

    state.lastAlert = now;
    saveState(state);
  }
}

run();
