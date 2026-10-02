import { supabase } from "../supabaseClient";
import type { UserEcoStats } from "./dbTypes";

export type { UserEcoStats };

function getLocalKey(userId: string): string {
  return `ecomove_eco_rewards_${userId}`;
}

const DEFAULT_ECO_STATS: UserEcoStats = {
  userId: "",
  totalCo2SavedKg: 0,
  greenTripsCount: 0,
  claimedRewardIds: [],
  updatedAt: new Date().toISOString(),
};

export async function fetchUserEcoStats(userId: string): Promise<UserEcoStats> {
  if (!userId) return DEFAULT_ECO_STATS;

  // Check local cache for demo or offline
  const readLocal = (): UserEcoStats => {
    try {
      const raw = localStorage.getItem(getLocalKey(userId));
      return raw ? JSON.parse(raw) : { ...DEFAULT_ECO_STATS, userId };
    } catch {
      return { ...DEFAULT_ECO_STATS, userId };
    }
  };

  if (userId === "demo-user-nagpur-001") {
    return readLocal();
  }

  try {
    const { data, error } = await supabase
      .from("user_eco_rewards")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch user eco rewards from Supabase:", error.message);
      return readLocal();
    }

    if (!data) {
      // First time user, return initial stats
      return readLocal();
    }

    const stats: UserEcoStats = {
      userId: data.user_id,
      totalCo2SavedKg: Number(data.total_co2_saved_kg || 0),
      greenTripsCount: Number(data.green_trips_count || 0),
      claimedRewardIds: Array.isArray(data.claimed_reward_ids) ? data.claimed_reward_ids : [],
      updatedAt: data.updated_at,
    };

    try {
      localStorage.setItem(getLocalKey(userId), JSON.stringify(stats));
    } catch {}

    return stats;
  } catch (err) {
    console.warn("Eco stats fetch error:", err);
    return readLocal();
  }
}

export async function claimUserRewardMilestone(
  userId: string,
  milestoneId: string
): Promise<string[]> {
  if (!userId) return [];

  // Update local cache
  let currentClaimed: string[] = [];
  try {
    const cached = await fetchUserEcoStats(userId);
    if (!cached.claimedRewardIds.includes(milestoneId)) {
      currentClaimed = [...cached.claimedRewardIds, milestoneId];
      const updated = { ...cached, claimedRewardIds: currentClaimed, updatedAt: new Date().toISOString() };
      localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));
    } else {
      currentClaimed = cached.claimedRewardIds;
    }
  } catch {}

  if (userId === "demo-user-nagpur-001") {
    return currentClaimed;
  }

  try {
    const { error } = await supabase
      .from("user_eco_rewards")
      .upsert({
        user_id: userId,
        claimed_reward_ids: currentClaimed,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      console.warn("Supabase reward claim update failed:", error.message);
    }
  } catch (err) {
    console.warn("Error claiming reward milestone in Supabase:", err);
  }

  return currentClaimed;
}

export async function recordTripCo2Savings(
  userId: string,
  co2SavedKg: number
): Promise<UserEcoStats> {
  const current = await fetchUserEcoStats(userId);
  const updatedStats: UserEcoStats = {
    ...current,
    totalCo2SavedKg: Math.round((current.totalCo2SavedKg + co2SavedKg) * 100) / 100,
    greenTripsCount: current.greenTripsCount + 1,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(getLocalKey(userId), JSON.stringify(updatedStats));
  } catch {}

  if (userId === "demo-user-nagpur-001" || !userId) {
    return updatedStats;
  }

  try {
    await supabase.from("user_eco_rewards").upsert({
      user_id: userId,
      total_co2_saved_kg: updatedStats.totalCo2SavedKg,
      green_trips_count: updatedStats.greenTripsCount,
      claimed_reward_ids: updatedStats.claimedRewardIds,
      updated_at: updatedStats.updatedAt,
    }, { onConflict: "user_id" });
  } catch (err) {
    console.warn("Error syncing trip CO2 savings to Supabase:", err);
  }

  return updatedStats;
}
