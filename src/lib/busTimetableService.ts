import schedulesData from "@/data/bus_schedules.json";
import networkData from "@/data/network.json";

export interface FormattedDeparture {
  minFromMidnight: number;          // Origin terminal departure time
  stopMinFromMidnight: number;      // Boarding stop departure time (depMin + offset)
  formattedTime: string;            // Time formatted for display at current stop
  originFormattedTime: string;      // Time formatted at origin terminal
  stopOffsetMin: number;            // Minutes offset from origin to stop
  isPast: boolean;
  isNext: boolean;
  minutesUntil: number;
}

export interface BusTimetableRoute {
  routeName: string;
  busNumber: string;
  displayBusNumber: string;
  routeId: string;
  durationMin: number;
  tripsPerDay: number;
  frequencyMin: number;
  firstBus: string;
  lastBus: string;
  nextBus: FormattedDeparture | null;
  departures: FormattedDeparture[];
  timeSlots: {
    morning: FormattedDeparture[];   // 06:00 - 11:59 (360 - 719)
    afternoon: FormattedDeparture[]; // 12:00 - 16:59 (720 - 1019)
    evening: FormattedDeparture[];   // 17:00 - 20:59 (1020 - 1259)
    night: FormattedDeparture[];     // 21:00 - 05:59 (1260 - 359)
  };
  stops: string[];
  stopOffsets: number[];            // Cumulative minutes from origin to each stop [0, 2, 6, ...]
  boardingStopName?: string | undefined;
  boardingStopIndex?: number | undefined;
  boardingStopOffsetMin: number;
  allTripsFinishedToday: boolean;
}

export interface BusTimetableResult {
  queryBusNumber: string;
  queryRouteName?: string | undefined;
  queryFromStop?: string | undefined;
  queryToStop?: string | undefined;
  matchedRoutes: BusTimetableRoute[];
}

// Convert minutes from midnight to readable AM/PM format (e.g. 390 -> "6:30 AM")
export function formatMinutesToTime(min: number): string {
  const norm = ((Math.round(min) % 1440) + 1440) % 1440;
  let h = Math.floor(norm / 60);
  const m = norm % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m < 10 ? "0" : ""}${m} ${ampm}`;
}

// Haversine formula for distance in meters
function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}

// Get current local time in minutes from midnight (Nagpur IST)
export function getCurrentMinutesFromMidnight(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Finds the best matching stop index along a stop sequence without false substring collisions
 */
export function findBestStopIndex(stopNames: string[], targetStop: string): number {
  if (!targetStop || stopNames.length === 0) return -1;
  const clean = targetStop.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const sLower = stopNames.map((s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim());

  // 1. Exact equality
  const exactIdx = sLower.findIndex((s) => s === clean);
  if (exactIdx !== -1) return exactIdx;

  // 2. Stop name contains target stop name (e.g. "electronic zone" in "electronic zone 2")
  const containsIdx = sLower.findIndex((s) => s.includes(clean));
  if (containsIdx !== -1) return containsIdx;

  // 3. Target stop name contains stop name (only if stop name is specific >= 6 chars)
  let bestIdx = -1;
  let maxMatchedLen = 0;
  for (let i = 0; i < sLower.length; i++) {
    const s = sLower[i]!;
    if (s.length >= 6 && clean.includes(s) && s.length > maxMatchedLen) {
      maxMatchedLen = s.length;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Searches and formats complete timetable schedule from bus_schedules.json
 * with ground-truth travel direction priority and stop-offset departure times.
 */
export function getBusTimetable(
  busNumber?: string | undefined,
  routeName?: string | undefined,
  fromStop?: string | undefined,
  toStop?: string | undefined
): BusTimetableResult | null {
  if (!busNumber && !routeName) return null;

  const currentMin = getCurrentMinutesFromMidnight();
  const rawSchedules = schedulesData as Record<string, any>;
  const cleanBusNum = (busNumber || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase().trim();
  const cleanRoute = (routeName || "").toLowerCase().trim();

  // Index stops and calculate accurate stop offsets from network.json
  const routeStopsMap = new Map<string, { names: string[]; offsets: number[]; totalDurationMin: number }>();
  if (networkData && Array.isArray((networkData as any).bus)) {
    for (const r of (networkData as any).bus) {
      if (r?.route && Array.isArray(r.stops) && r.stops.length > 0) {
        const key = r.route.toLowerCase().trim();
        const sched = rawSchedules[key];
        const dur = typeof sched?.durationMin === "number" ? sched.durationMin : 45;

        // Calculate cumulative distance and stop offsets
        const cumDist: number[] = [0];
        for (let sIdx = 1; sIdx < r.stops.length; sIdx++) {
          const prev = r.stops[sIdx - 1];
          const curr = r.stops[sIdx];
          if (!prev || !curr) continue;
          const d = haversineM(prev.lat, prev.lon, curr.lat, curr.lon) * 1.25;
          const prevDist = cumDist[cumDist.length - 1] ?? 0;
          cumDist.push(prevDist + d);
        }
        const totalDist = cumDist[cumDist.length - 1] ?? 1;
        const offsets = cumDist.map((d) => (totalDist > 0 ? (d / totalDist) * dur : 0));
        const names = r.stops.map((s: any) => s.name || "").filter(Boolean);

        routeStopsMap.set(key, {
          names,
          offsets,
          totalDurationMin: dur,
        });
      }
    }
  }

  // 1. Collect candidate entries matching exact busNumber or exact routeName
  let candidateEntries: Array<{ key: string; data: any }> = [];

  if (cleanBusNum) {
    for (const [key, value] of Object.entries(rawSchedules)) {
      if (!value) continue;
      const valBusNum = String(value.busNumber || value.displayBusNumber || "").toLowerCase().trim();
      const valAllNums: string[] = Array.isArray(value.allBusNumbers)
        ? value.allBusNumbers.map((n: any) => String(n).toLowerCase().trim())
        : [];
      if (valBusNum === cleanBusNum || valAllNums.includes(cleanBusNum)) {
        candidateEntries.push({ key, data: value });
      }
    }
  }

  // If no candidates matched exact busNumber, match by routeName
  if (candidateEntries.length === 0 && cleanRoute) {
    for (const [key, value] of Object.entries(rawSchedules)) {
      if (!value) continue;
      const valRouteName = String(value.routeName || key).toLowerCase().trim();
      if (valRouteName === cleanRoute || key === cleanRoute || valRouteName.includes(cleanRoute) || cleanRoute.includes(valRouteName)) {
        candidateEntries.push({ key, data: value });
      }
    }
  }

  // Fallback: search by terminal stops
  if (candidateEntries.length === 0 && fromStop && toStop) {
    const cleanFrom = fromStop.toLowerCase().trim();
    const cleanTo = toStop.toLowerCase().trim();
    for (const [key, value] of Object.entries(rawSchedules)) {
      if (!value) continue;
      const valRouteName = String(value.routeName || key).toLowerCase().trim();
      if (valRouteName.includes(cleanFrom) && valRouteName.includes(cleanTo)) {
        candidateEntries.push({ key, data: value });
      }
    }
  }

  if (candidateEntries.length === 0) {
    return null;
  }

  // 2. Score candidates strictly prioritizing ground-truth travel direction
  const scoredEntries = candidateEntries.map(({ key, data }) => {
    let score = 0;
    const valRouteName = String(data.routeName || key).toLowerCase().trim();
    const stopsInfo = routeStopsMap.get(key) || routeStopsMap.get(valRouteName);

    if (fromStop && toStop && stopsInfo) {
      const fIdx = findBestStopIndex(stopsInfo.names, fromStop);
      const tIdx = findBestStopIndex(stopsInfo.names, toStop);

      if (fIdx !== -1 && tIdx !== -1) {
        if (fIdx < tIdx) {
          // Bus visits fromStop before toStop -> Exact forward travel direction!
          score += 10000;
        } else {
          // Bus visits toStop before fromStop -> Opposite return direction!
          score -= 10000;
        }
      } else if (fIdx !== -1) {
        score += 500;
      }
    } else if (fromStop && stopsInfo) {
      const fIdx = findBestStopIndex(stopsInfo.names, fromStop);
      if (fIdx !== -1) {
        score += 500;
      }
    }

    if (cleanRoute) {
      if (valRouteName === cleanRoute || key === cleanRoute) {
        score += 1000;
      } else if (valRouteName.includes(cleanRoute) || cleanRoute.includes(valRouteName)) {
        score += 300;
      }
    }

    return { key, data, score };
  });

  // Sort by score descending (so the exact directional path comes first)
  scoredEntries.sort((a, b) => b.score - a.score);

  const formattedRoutes: BusTimetableRoute[] = scoredEntries.map(({ key, data }) => {
    const routeNameFormatted = data.routeName || key;
    const stopsInfo =
      routeStopsMap.get(key.toLowerCase().trim()) ||
      routeStopsMap.get(routeNameFormatted.toLowerCase().trim());

    const stopsList = stopsInfo?.names || [];
    const stopOffsets = stopsInfo?.offsets || [];

    // Calculate boarding stop offset if fromStop is supplied
    let boardingStopName: string | undefined;
    let boardingStopIndex: number | undefined;
    let boardingStopOffsetMin = 0;

    if (fromStop && stopsList.length > 0) {
      const foundIdx = findBestStopIndex(stopsList, fromStop);
      if (foundIdx !== -1) {
        boardingStopIndex = foundIdx;
        boardingStopName = stopsList[foundIdx];
        boardingStopOffsetMin = Math.round(stopOffsets[foundIdx] ?? 0);
      }
    }

    const rawDeps: number[] = Array.isArray(data.departures)
      ? data.departures
          .filter((d: any) => typeof d === "number" && d >= 0 && d <= 1440)
          .sort((a: number, b: number) => a - b)
      : [];

    let nextDepartureObj: FormattedDeparture | null = null;
    let minDiffToNext = Infinity;

    const formattedDeps: FormattedDeparture[] = rawDeps.map((depMin) => {
      const stopDepMin = depMin + boardingStopOffsetMin;
      const isPast = stopDepMin < currentMin;
      const diff = stopDepMin - currentMin;

      // Find the next upcoming departure at this boarding stop
      if (!isPast && diff >= 0 && diff < minDiffToNext) {
        minDiffToNext = diff;
      }

      return {
        minFromMidnight: depMin,
        stopMinFromMidnight: stopDepMin,
        formattedTime: formatMinutesToTime(stopDepMin),
        originFormattedTime: formatMinutesToTime(depMin),
        stopOffsetMin: boardingStopOffsetMin,
        isPast,
        isNext: false,
        minutesUntil: diff,
      };
    });

    // Mark the next upcoming departure
    for (const d of formattedDeps) {
      if (!d.isPast && d.minutesUntil === minDiffToNext) {
        d.isNext = true;
        nextDepartureObj = d;
        break;
      }
    }

    const allTripsFinishedToday = !nextDepartureObj && formattedDeps.length > 0;

    // If all departures today have passed, show first morning bus tomorrow
    if (!nextDepartureObj && formattedDeps.length > 0) {
      const first = formattedDeps[0]!;
      nextDepartureObj = {
        ...first,
        isNext: true,
        minutesUntil: 1440 - currentMin + first.stopMinFromMidnight,
      };
    }

    // Time Slot Bucketing (based on stop departure time)
    const morning = formattedDeps.filter((d) => d.stopMinFromMidnight >= 360 && d.stopMinFromMidnight < 720);
    const afternoon = formattedDeps.filter((d) => d.stopMinFromMidnight >= 720 && d.stopMinFromMidnight < 1020);
    const evening = formattedDeps.filter((d) => d.stopMinFromMidnight >= 1020 && d.stopMinFromMidnight < 1260);
    const night = formattedDeps.filter((d) => d.stopMinFromMidnight >= 1260 || d.stopMinFromMidnight < 360);

    // Calculate Average Headway
    const trips = rawDeps.length;
    let headway = 15;
    if (trips >= 2) {
      headway = Math.max(5, Math.round((rawDeps[trips - 1]! - rawDeps[0]!) / (trips - 1)));
    }

    const totalDuration = typeof data.durationMin === "number" ? Math.round(data.durationMin) : (stopsInfo?.totalDurationMin || 45);

    // Compute non-decreasing cumulative minutes from origin to every stop [0, 2, 6, ...]
    const computedStopOffsets: number[] = [];
    let lastOff = 0;
    for (let sIdx = 0; sIdx < stopsList.length; sIdx++) {
      if (sIdx === 0) {
        computedStopOffsets.push(0);
      } else if (stopOffsets && stopOffsets[sIdx] !== undefined) {
        lastOff = Math.max(lastOff, Math.round(stopOffsets[sIdx] ?? 0));
        computedStopOffsets.push(lastOff);
      } else if (stopsList.length > 1) {
        const interp = Math.round((sIdx / (stopsList.length - 1)) * totalDuration);
        lastOff = Math.max(lastOff, interp);
        computedStopOffsets.push(lastOff);
      } else {
        computedStopOffsets.push(0);
      }
    }

    return {
      routeName: routeNameFormatted,
      busNumber: String(data.busNumber || data.displayBusNumber || cleanBusNum || "Bus"),
      displayBusNumber: String(data.displayBusNumber || data.busNumber || cleanBusNum || "Bus"),
      routeId: String(data.routeId || ""),
      durationMin: totalDuration,
      tripsPerDay: trips,
      frequencyMin: headway,
      firstBus: formattedDeps[0]?.formattedTime || "06:00 AM",
      lastBus: formattedDeps[formattedDeps.length - 1]?.formattedTime || "09:30 PM",
      nextBus: nextDepartureObj,
      departures: formattedDeps,
      timeSlots: {
        morning,
        afternoon,
        evening,
        night,
      },
      stops: stopsList,
      stopOffsets: computedStopOffsets,
      boardingStopName,
      boardingStopIndex,
      boardingStopOffsetMin,
      allTripsFinishedToday,
    };
  });

  return {
    queryBusNumber: cleanBusNum || busNumber || "",
    queryRouteName: routeName,
    queryFromStop: fromStop,
    queryToStop: toStop,
    matchedRoutes: formattedRoutes,
  };
}
