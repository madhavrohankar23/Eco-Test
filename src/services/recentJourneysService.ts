import { supabase } from "../supabaseClient";
import type { Point } from "../components/PlaceSearch";

export interface RecentJourneyRecord {
  id: string;
  userId: string;
  title: string;
  origin: Point;
  destination: Point;
  createdAt: string;
}

function getLocalKey(userId: string): string {
  return `ecomove_recent_journeys_${userId}`;
}

export async function fetchUserRecentJourneys(userId: string): Promise<RecentJourneyRecord[]> {
  if (!userId) return [];

  if (userId === "demo-user-nagpur-001") {
    try {
      const raw = localStorage.getItem(getLocalKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from("recent_journeys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.warn("Supabase fetch recent_journeys failed:", error.message);
      const raw = localStorage.getItem(getLocalKey(userId));
      return raw ? JSON.parse(raw) : [];
    }

    const formatted: RecentJourneyRecord[] = (data || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      title: r.title || `${r.origin?.name || "Origin"} ➔ ${r.destination?.name || "Destination"}`,
      origin: r.origin,
      destination: r.destination,
      createdAt: r.created_at,
    }));

    try {
      localStorage.setItem(getLocalKey(userId), JSON.stringify(formatted));
    } catch {}

    return formatted;
  } catch {
    try {
      const raw = localStorage.getItem(getLocalKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function recordUserRecentJourney(
  userId: string,
  origin: Point,
  destination: Point,
  title?: string
): Promise<RecentJourneyRecord | null> {
  if (!userId || !origin || !destination) return null;

  const titleStr = title || `${origin.name} ➔ ${destination.name}`;
  const localRecord: RecentJourneyRecord = {
    id: `recent_${Date.now()}`,
    userId,
    title: titleStr,
    origin,
    destination,
    createdAt: new Date().toISOString(),
  };

  // Local user cache
  try {
    const existing = await fetchUserRecentJourneys(userId);
    // Deduplicate same origin/destination
    const filtered = existing.filter(
      (r) => !(r.origin.name === origin.name && r.destination.name === destination.name)
    );
    const updated = [localRecord, ...filtered].slice(0, 10);
    localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));
  } catch {}

  if (userId === "demo-user-nagpur-001") {
    return localRecord;
  }

  try {
    const { data, error } = await supabase
      .from("recent_journeys")
      .insert({
        user_id: userId,
        title: titleStr,
        origin,
        destination,
      })
      .select()
      .single();

    if (error) {
      console.warn("Supabase insert recent_journeys failed:", error.message);
      return localRecord;
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      origin: data.origin,
      destination: data.destination,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.warn("Error inserting recent journey:", err);
    return localRecord;
  }
}

export async function clearUserRecentJourneys(userId: string): Promise<void> {
  try {
    localStorage.removeItem(getLocalKey(userId));
  } catch {}

  if (userId === "demo-user-nagpur-001" || !userId) return;

  try {
    await supabase.from("recent_journeys").delete().eq("user_id", userId);
  } catch (err) {
    console.warn("Error clearing recent journeys in Supabase:", err);
  }
}
