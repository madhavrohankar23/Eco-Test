import { supabase } from "../supabaseClient";
import type { DbSavedJourney } from "./dbTypes";
import type { SavedJourneyItem } from "../routes/app";

function getLocalKey(userId: string): string {
  return `ecomove_saved_journeys_${userId}`;
}

export async function fetchUserSavedJourneys(userId: string): Promise<SavedJourneyItem[]> {
  if (!userId) return [];

  // Demo user uses isolated sandbox
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
      .from("saved_journeys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch saved_journeys failed, falling back to local cache:", error.message);
      const raw = localStorage.getItem(getLocalKey(userId));
      return raw ? JSON.parse(raw) : [];
    }

    const formatted: SavedJourneyItem[] = (data || []).map((row) => ({
      id: row.id,
      origin: row.origin,
      destination: row.destination,
      totalTimeMin: Number(row.total_time_min),
      totalFareRs: Number(row.total_fare_rs),
      totalDistanceM: Number(row.total_distance_m),
      walkDistanceM: Number(row.walk_distance_m),
      transfers: Number(row.transfers),
      co2g: Number(row.co2_g),
      legs: Array.isArray(row.legs) ? row.legs : [],
      savedAt: row.created_at,
    }));

    // Update local cache for fast instant offline load
    try {
      localStorage.setItem(getLocalKey(userId), JSON.stringify(formatted));
    } catch {}

    return formatted;
  } catch (err) {
    console.warn("Error fetching saved journeys:", err);
    try {
      const raw = localStorage.getItem(getLocalKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function addUserSavedJourney(
  userId: string,
  journey: Omit<SavedJourneyItem, "id" | "savedAt">
): Promise<SavedJourneyItem | null> {
  const localId = `saved_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const savedItem: SavedJourneyItem = {
    ...journey,
    id: localId,
    savedAt: new Date().toISOString(),
  };

  // Demo user sandbox
  if (userId === "demo-user-nagpur-001" || !userId) {
    try {
      const existing = await fetchUserSavedJourneys(userId || "guest");
      const updated = [savedItem, ...existing.filter((j) => j.id !== localId)];
      localStorage.setItem(getLocalKey(userId || "guest"), JSON.stringify(updated));
    } catch {}
    return savedItem;
  }

  try {
    const { data, error } = await supabase
      .from("saved_journeys")
      .insert({
        user_id: userId,
        origin: journey.origin,
        destination: journey.destination,
        total_time_min: journey.totalTimeMin,
        total_fare_rs: journey.totalFareRs,
        total_distance_m: journey.totalDistanceM,
        walk_distance_m: journey.walkDistanceM,
        transfers: journey.transfers,
        co2_g: journey.co2g,
        legs: journey.legs,
      })
      .select()
      .single();

    if (error) {
      console.warn("Supabase insert saved_journeys failed, keeping local copy:", error.message);
      const existing = await fetchUserSavedJourneys(userId);
      const updated = [savedItem, ...existing];
      localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));
      return savedItem;
    }

    const inserted: SavedJourneyItem = {
      id: data.id,
      origin: data.origin,
      destination: data.destination,
      totalTimeMin: Number(data.total_time_min),
      totalFareRs: Number(data.total_fare_rs),
      totalDistanceM: Number(data.total_distance_m),
      walkDistanceM: Number(data.walk_distance_m),
      transfers: Number(data.transfers),
      co2g: Number(data.co2_g),
      legs: Array.isArray(data.legs) ? data.legs : [],
      savedAt: data.created_at,
    };

    // Sync to local cache
    const existing = await fetchUserSavedJourneys(userId);
    const updated = [inserted, ...existing.filter((j) => j.id !== inserted.id)];
    localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));

    return inserted;
  } catch (err) {
    console.warn("Error inserting saved journey:", err);
    return savedItem;
  }
}

export async function deleteUserSavedJourney(userId: string, journeyId: string): Promise<boolean> {
  // Update local cache first
  try {
    const raw = localStorage.getItem(getLocalKey(userId));
    if (raw) {
      const list = JSON.parse(raw) as SavedJourneyItem[];
      const updated = list.filter((j) => j.id !== journeyId);
      localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));
    }
  } catch {}

  if (userId === "demo-user-nagpur-001" || !userId) {
    return true;
  }

  try {
    const { error } = await supabase
      .from("saved_journeys")
      .delete()
      .eq("id", journeyId)
      .eq("user_id", userId);

    if (error) {
      console.warn("Supabase delete saved_journeys failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Error deleting saved journey:", err);
    return false;
  }
}
