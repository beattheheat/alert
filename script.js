const fs = require("fs");
const axios = require("axios");
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
const STATE_FILE = "state.json";
const COOLDOWN_MS = 3 * 60 * 60 * 1000;
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
  console.log("🔥 SCHEDULE RUN:", new Date().toISOString());

  const res = await axios.get(
    `https://api.openweathermap.org/data/2.5/weather?q=Pearland,US&appid=${WEATHER_API_KEY}&units=imperial`
  );
  const heatIndex = res.data.main.feels_like;
  const now = Date.now();
  console.log("Heat index:", heatIndex);
  const state = loadState();
  if (heatIndex > 90 && now - state.lastAlert >= COOLDOWN_MS) {
    let heading;
    let body;
    if (heatIndex >= 111) {
      heading = "Extreme Heat Alert";
      body = `DANGEROUS HEAT INDEX of ${Math.round(heatIndex)}°F in Pearland. High risk of heat exhaustion and heat stroke. Avoid unnecessary outdoor activity. Stay indoors and check on vulnerable family, friends, and neighbors.`;
    } else if (heatIndex >= 103) {
      heading = "Severe Heat Alert";
      body = `Heat index has reached ${Math.round(heatIndex)}°F in Pearland. Limit outdoor activity, take frequent breaks in shade or A/C, and drink water often.`;
    } else {
      heading = "Heat Alert";
      body = `Heat index is currently ${Math.round(heatIndex)}°F in Pearland. Stay hydrated and avoid prolonged outdoor activities.`;
    }
    await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["All"],
        headings: { en: heading },
        contents: { en: body }
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
  } else {
    console.log("No alert sent this run:", new Date().toISOString());
  }
}
run().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
