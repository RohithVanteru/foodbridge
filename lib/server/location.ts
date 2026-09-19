export type Place = { latitude: number | null; longitude: number | null; city: string; radiusKm?: number };
export function distanceKm(a: Place, b: Place) {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const rad = (v: number) => v * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function matchesLocation(a: Place, b: Place) {
  const distance = distanceKm(a, b);
  return distance === null ? a.city.toLowerCase().trim() === b.city.toLowerCase().trim() : distance <= (a.radiusKm ?? 25);
}
export function matchingLocationSQL(home: Place) {
  if (home.latitude == null || home.longitude == null) return sql`${donations.city} = ${home.city}`;
  const distance = sql`12742 * asin(sqrt(least(1.0, greatest(0.0,
    power(sin(radians(${donations.latitude} - ${home.latitude}::double precision) / 2), 2)
    + cos(radians(${home.latitude}::double precision)) * cos(radians(${donations.latitude}))
    * power(sin(radians(${donations.longitude} - ${home.longitude}::double precision) / 2), 2)
  ))))`;
  return sql`((${donations.latitude} IS NOT NULL AND ${donations.longitude} IS NOT NULL AND ${distance} <= ${home.radiusKm ?? 25}) OR ((${donations.latitude} IS NULL OR ${donations.longitude} IS NULL) AND ${donations.city} = ${home.city}))`;
}
import { sql } from "drizzle-orm";
import { donations } from "@/db/schema";
