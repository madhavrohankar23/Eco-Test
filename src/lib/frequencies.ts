/**
 * Route-level frequency data (minutes between departures).
 

 */
export const ROUTE_FREQUENCY_MIN: Record<string, number> = {
  // ── Bus routes (NMMT) ────────────────────────────────────────────────────
  "Jaitala - Pardi": 20,
  "Jaripataka - Sonegaon": 20,
  "Khapri Metro Station - Tech Mahindra Mihan Sez": 30,
  "Khapri Metro Stattion - Mihan": 30,
  "Lokmanya nagr - Wadi -Tpoint": 20,
  "Maharaja Baug Terminal - Nirmal Nagar": 20,
  "Maharaja Baug Terminal - Sawarmendha": 25,
  "Maharaja Baug Terminal - Vaishnodevi Chowk": 15,
  "Panchasheel Chowk (Dhantoli) - C.R.P.F.Stand": 15,
  "Pardi - Y.C.C.E.College": 25,
  "Sitabuldi - Besa Chowk": 15,
  "Sitabuldi - Defence Gate No. 3": 20,
  "Sitabuldi - Koradi Depot": 20,
  "Sitabuldi - Pardi": 15,
  "Sitabuldi - Sonegaon": 15,
  "Sitabuldi - Suradevi": 20,
  "Sitabuldi - jaitala": 15,

  // ── Metro lines (Nagpur Metro) ────────────────────────────────────────────
  "Blue Line": 10,
  "Orange Line": 10,
};


export function getFrequencyMin(lineName: string): number {
  return ROUTE_FREQUENCY_MIN[lineName] ?? 20;
}
