const axios = require("axios");
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

function formatCentralTime(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit"
  });
}

function isTodayInCentral(unixSeconds) {
  const target = new Date(unixSeconds * 1000).toLocaleDateString("en-US", { timeZone: "America/Chicago" });
  const today = new Date().toLocaleDateString("en-US", { timeZone: "America/Chicago" });
  return target === today;
}

async function run() {
  console.log("DAILY FORECAST RUN:", new Date().toISOString());

  const res = await axios.get(
    `https://api.openweathermap.org/data/2.5/forecast?q=Pearland,US&appid=${WEATHER_API_KEY}&units=imperial`
  );

  const todaysEntries = res.data.list.filter(entry => isTodayInCentral(entry.dt));

  if (todaysEntries.length === 0) {
    console.log("No forecast entries found for today, skipping notification");
    return;
  }

  const peak = todaysEntries.reduce((max, entry) =>
    entry.main.feels_like > max.main.feels_like ? entry : max
  );

  const peakHeatIndex = Math.round(peak.main.feels_like);
  const peakTime = formatCentralTime(peak.dt);

  const HIGH_THRESHOLD = 90;
  const highEntries = todaysEntries.filter(entry => entry.main.feels_like > HIGH_THRESHOLD);

  let message = `Good morning! Today's heat index will peak at ${peakHeatIndex}°F in Pearland, expected around ${peakTime}.`;

  if (highEntries.length > 0) {
    const startTime = formatCentralTime(highEntries[0].dt);
    const endTime = formatCentralTime(highEntries[highEntries.length - 1].dt);
    message += ` Heat index is expected to exceed ${HIGH_THRESHOLD}°F between ${startTime} and ${endTime}. Exercise elevated caution when outdoors during this time.`;
  }

  console.log(`Today's peak heat index: ${peakHeatIndex}F around ${peakTime}`);

  await axios.post(
    "https://onesignal.com/api/v1/notifications",
    {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: "Today's Heat Forecast" },
      contents: {
        en: message
      }
    },
    {
      headers: {
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  console.log("Notification sent");
}

run().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
