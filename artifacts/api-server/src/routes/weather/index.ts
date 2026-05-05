import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHER_BASE = "https://api.openweathermap.org/data/2.5";
const GEO_BASE = "https://api.openweathermap.org/geo/1.0";

function weatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

async function getMockWeather(city: string, units: string) {
  const isMetric = units !== "imperial";
  const tempUnit = isMetric ? "°C" : "°F";
  const baseTemp = isMetric ? 22 : 72;
  const conditions = ["Clear", "Partly Cloudy", "Overcast", "Light Rain", "Sunny"];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];

  const aiInsight = await generateWeatherInsight(city, baseTemp + tempUnit, condition);

  return {
    city,
    country: "US",
    current: {
      temp: baseTemp,
      feelsLike: baseTemp - 2,
      humidity: 65,
      windSpeed: 12,
      condition,
      description: condition.toLowerCase(),
      icon: "01d",
      visibility: 10,
      pressure: 1013,
      uvIndex: 5,
    },
    forecast: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      return {
        date: dateStr,
        dayName: getDayName(dateStr),
        tempMin: baseTemp - 5 + Math.floor(Math.random() * 4),
        tempMax: baseTemp + 3 + Math.floor(Math.random() * 4),
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        icon: "01d",
        precipitationChance: Math.floor(Math.random() * 40),
      };
    }),
    aiInsight,
  };
}

async function generateWeatherInsight(city: string, temp: string, condition: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Give a 2-3 sentence smart weather insight for ${city}: currently ${temp}, ${condition}. Include health and activity recommendations. Be specific and helpful.`,
        },
      ],
    });
    return response.choices[0]?.message?.content ?? "Great day to explore!";
  } catch {
    return `Current conditions in ${city}: ${condition} at ${temp}. Stay prepared for changing weather patterns.`;
  }
}

router.get("/weather", async (req, res): Promise<void> => {
  const city = req.query.city as string;
  const units = (req.query.units as string) ?? "metric";

  if (!city) {
    res.status(400).json({ error: "City parameter is required" });
    return;
  }

  try {
    if (!WEATHER_API_KEY) {
      const mockData = await getMockWeather(city, units);
      res.json(mockData);
      return;
    }

    const geoRes = await fetch(`${GEO_BASE}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${WEATHER_API_KEY}`);
    const geoData = await geoRes.json() as Array<{ lat: number; lon: number; name: string; country: string }>;

    if (!geoData || geoData.length === 0) {
      res.status(404).json({ error: `City "${city}" not found` });
      return;
    }

    const { lat, lon, name, country } = geoData[0];

    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${WEATHER_BASE}/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${WEATHER_API_KEY}`),
      fetch(`${WEATHER_BASE}/forecast?lat=${lat}&lon=${lon}&units=${units}&cnt=40&appid=${WEATHER_API_KEY}`),
    ]);

    const current = await currentRes.json() as {
      main: { temp: number; feels_like: number; humidity: number; pressure: number };
      wind: { speed: number };
      weather: Array<{ main: string; description: string; icon: string }>;
      visibility: number;
    };

    const forecast = await forecastRes.json() as {
      list: Array<{
        dt_txt: string;
        main: { temp_min: number; temp_max: number };
        weather: Array<{ main: string; icon: string }>;
        pop: number;
      }>;
    };

    const dailyForecasts = forecast.list
      .filter((_: unknown, i: number) => i % 8 === 0)
      .slice(0, 7)
      .map((item) => ({
        date: item.dt_txt.split(" ")[0],
        dayName: getDayName(item.dt_txt.split(" ")[0]),
        tempMin: Math.round(item.main.temp_min),
        tempMax: Math.round(item.main.temp_max),
        condition: item.weather[0]?.main ?? "Unknown",
        icon: weatherIconUrl(item.weather[0]?.icon ?? "01d"),
        precipitationChance: Math.round(item.pop * 100),
      }));

    const aiInsight = await generateWeatherInsight(name, `${Math.round(current.main.temp)}°`, current.weather[0]?.main ?? "");

    res.json({
      city: name,
      country,
      current: {
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        humidity: current.main.humidity,
        windSpeed: Math.round(current.wind.speed),
        condition: current.weather[0]?.main ?? "Unknown",
        description: current.weather[0]?.description ?? "",
        icon: weatherIconUrl(current.weather[0]?.icon ?? "01d"),
        visibility: Math.round((current.visibility ?? 10000) / 1000),
        pressure: current.main.pressure,
        uvIndex: 3,
      },
      forecast: dailyForecasts,
      aiInsight,
    });
  } catch (err) {
    logger.error({ err }, "Weather fetch error");
    const mockData = await getMockWeather(city, units);
    res.json(mockData);
  }
});

export default router;
