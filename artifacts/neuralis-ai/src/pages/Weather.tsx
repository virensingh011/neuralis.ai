import { useState } from "react";
import { motion } from "framer-motion";
import { useGetWeather } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CloudSun, Search, Wind, Droplets, Eye, ThermometerSun, Loader2, Sparkles } from "lucide-react";
import { getGetWeatherQueryKey } from "@workspace/api-client-react";

export default function Weather() {
  const [searchInput, setSearchInput] = useState("Boston"); // Default to Boston (MIT/Harvard vibe)
  const [city, setCity] = useState("Boston");

  const { data: weather, isLoading } = useGetWeather(
    { city, units: "metric" },
    { query: { enabled: !!city, queryKey: getGetWeatherQueryKey({ city, units: "metric" }) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setCity(searchInput.trim());
    }
  };

  return (
    <div className="min-h-full w-full p-8 max-w-6xl mx-auto space-y-8 relative">
      <div className="absolute top-0 left-0 -z-10 h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <CloudSun className="h-8 w-8 text-primary" /> Meteorological Analysis
          </h1>
          <p className="text-muted-foreground">Real-time global weather telemetry and AI forecasting.</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 relative z-10 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Query location..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 bg-card/50 border-border/50"
              data-testid="input-weather-search"
            />
          </div>
          <Button type="submit" disabled={isLoading} data-testid="button-search-weather">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
          </Button>
        </form>
      </header>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
        </div>
      ) : weather ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Current Conditions Hero */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-gradient-to-br from-card/80 to-card/20 border-border/50 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <CloudSun className="h-48 w-48" />
              </div>
              <CardContent className="p-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div>
                    <h2 className="text-4xl font-bold tracking-tight text-foreground mb-1">{weather.city}</h2>
                    <p className="text-lg text-muted-foreground font-medium">{weather.country}</p>
                    
                    <div className="mt-8 flex items-end gap-4">
                      <span className="text-7xl font-extrabold tracking-tighter">{Math.round(weather.current.temp)}°</span>
                      <div className="mb-2">
                        <p className="text-xl font-medium capitalize text-primary">{weather.current.condition}</p>
                        <p className="text-sm text-muted-foreground">Feels like {Math.round(weather.current.feelsLike)}°</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:border-l md:border-border/50 md:pl-8">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Wind className="h-4 w-4" /> Wind</div>
                      <p className="text-lg font-semibold">{weather.current.windSpeed} <span className="text-sm font-normal text-muted-foreground">m/s</span></p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Droplets className="h-4 w-4" /> Humidity</div>
                      <p className="text-lg font-semibold">{weather.current.humidity}%</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Eye className="h-4 w-4" /> Visibility</div>
                      <p className="text-lg font-semibold">{weather.current.visibility / 1000} <span className="text-sm font-normal text-muted-foreground">km</span></p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm"><ThermometerSun className="h-4 w-4" /> UV Index</div>
                      <p className="text-lg font-semibold">{weather.current.uvIndex}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" /> AI Insight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/90">{weather.aiInsight}</p>
              </CardContent>
            </Card>
          </div>

          {/* Forecast Grid */}
          <div>
            <h3 className="text-lg font-semibold mb-4">7-Day Projection</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {weather.forecast.map((day, i) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="bg-card/40 border-border/50 text-center py-4 hover:bg-card transition-colors">
                    <p className="text-sm font-medium text-muted-foreground mb-1">{day.dayName}</p>
                    <p className="text-xs text-muted-foreground mb-3">{new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    
                    <div className="flex justify-center mb-3">
                      <CloudSun className="h-8 w-8 text-foreground/80" />
                    </div>
                    
                    <div className="flex justify-center items-center gap-2 text-sm font-medium">
                      <span>{Math.round(day.tempMax)}°</span>
                      <span className="text-muted-foreground">{Math.round(day.tempMin)}°</span>
                    </div>
                    {day.precipitationChance > 0 && (
                      <p className="text-xs text-blue-400 mt-2 flex items-center justify-center gap-1">
                        <Droplets className="h-3 w-3" /> {day.precipitationChance}%
                      </p>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
