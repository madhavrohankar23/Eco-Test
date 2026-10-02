import type { Point } from "../components/PlaceSearch";
import type { IssuedTicket } from "../lib/ticketing";

export interface UserProfile {
  id: string;
  fullName: string;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  avatarUrl?: string | null | undefined;
  preferredMode: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbSavedJourney {
  id: string;
  userId: string;
  title?: string;
  origin: Point;
  destination: Point;
  totalTimeMin: number;
  totalFareRs: number;
  totalDistanceM: number;
  walkDistanceM: number;
  transfers: number;
  co2g: number;
  legs: Array<{
    mode: "walk" | "bus" | "metro" | "auto" | "bike";
    line?: string;
    busNumber?: string;
    timeMin: number;
    from?: string;
    to?: string;
  }>;
  createdAt: string;
}

export interface DbRecentJourney {
  id: string;
  userId: string;
  title?: string;
  origin: Point;
  destination: Point;
  journeyData?: Record<string, unknown>;
  createdAt: string;
}

export interface UserEcoStats {
  userId: string;
  totalCo2SavedKg: number;
  greenTripsCount: number;
  claimedRewardIds: string[];
  updatedAt: string;
}

export type DbTicket = IssuedTicket & {
  userId?: string;
};
