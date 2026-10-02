import { supabase } from "../supabaseClient";
import type { UserProfile } from "./dbTypes";

const DEMO_PROFILE: UserProfile = {
  id: "demo-user-nagpur-001",
  fullName: "Demo Commuter (Nagpur)",
  email: "demo@ecomove.nagpur",
  phone: "+91 98765 43210",
  preferredMode: "fastest",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (userId === "demo-user-nagpur-001") {
    return DEMO_PROFILE;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch user profile from Supabase:", error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      fullName: data.full_name || "Nagpur Commuter",
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatar_url,
      preferredMode: data.preferred_mode || "fastest",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn("Profile fetch error:", err);
    return null;
  }
}

export async function upsertUserProfile(profile: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> {
  if (profile.id === "demo-user-nagpur-001") {
    return { ...DEMO_PROFILE, ...profile };
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: profile.id,
        full_name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatarUrl,
        preferred_mode: profile.preferredMode,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn("Could not upsert user profile:", error.message);
      return null;
    }

    return {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatar_url,
      preferredMode: data.preferred_mode,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn("Profile upsert error:", err);
    return null;
  }
}
