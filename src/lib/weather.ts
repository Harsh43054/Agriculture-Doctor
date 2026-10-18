export type Weather = {
  temperature: number;
  humidity: number;
  rain: number;
  wind: number;
  code: number;
  time: string;
  daily: {
    date: string;
    high: number;
    low: number;
    rainChance: number;
    code: number;
  }[];
};
export function weatherLabel(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorms";
}
export function weatherAdvice(w: Weather) {
  const tips = [];
  if (w.daily[0]?.rainChance >= 60)
    tips.push(
      "Rain is likely today. Check the forecast before irrigating or applying foliar treatments.",
    );
  if (w.humidity >= 80)
    tips.push(
      "High humidity can favour fungal growth. Scout for leaf spots and improve airflow around plants.",
    );
  if (w.temperature >= 35)
    tips.push(
      "Hot conditions: inspect plants for heat stress and check root-zone moisture before watering.",
    );
  if (w.wind >= 20)
    tips.push("Windy conditions: postpone spraying and secure young plants.");
  if (!tips.length)
    tips.push(
      "Scout both sides of leaves and check soil moisture before your next irrigation.",
    );
  return tips;
}
