import { supabase } from "../supabaseClient";
import type { IssuedTicket, TransitMode } from "../lib/ticketing";

function getLocalKey(userId: string): string {
  return `ecomove_tickets_${userId}`;
}

export async function fetchUserTickets(userId: string): Promise<IssuedTicket[]> {
  if (!userId) return [];

  const readLocal = (): IssuedTicket[] => {
    try {
      const raw = localStorage.getItem(getLocalKey(userId));
      if (!raw) return [];
      const list = JSON.parse(raw) as IssuedTicket[];
      const now = Date.now();
      return list.map((t) => {
        if (t.status === "active" && new Date(t.validUntil).getTime() < now) {
          return { ...t, status: "expired" };
        }
        return t;
      });
    } catch {
      return [];
    }
  };

  if (userId === "demo-user-nagpur-001") {
    return readLocal();
  }

  try {
    const { data, error } = await supabase
      .from("user_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch user_tickets failed, using local cache:", error.message);
      return readLocal();
    }

    const now = Date.now();
    const formatted: IssuedTicket[] = (data || []).map((row) => {
      const isExpired = row.status === "active" && new Date(row.valid_until).getTime() < now;
      if (row.ticket_payload && typeof row.ticket_payload === "object" && Object.keys(row.ticket_payload).length > 0) {
        const payload = row.ticket_payload as IssuedTicket;
        return {
          ...payload,
          status: isExpired ? "expired" : (row.status || payload.status),
        };
      }
      return {
        id: row.id,
        category: (row.ticket_type === "standard_metro" ? "standard_metro" : row.ticket_type === "standard_bus" ? "standard_bus" : "exclusive_eco") as IssuedTicket["category"],
        mode: (row.ticket_type === "standard_metro" ? "metro" : row.ticket_type === "standard_bus" ? "bus" : "combo") as TransitMode,
        title: `${row.from_station || "Origin"} → ${row.to_station || "Destination"}`,
        source: row.from_station || "Origin",
        destination: row.to_station || "Destination",
        lineOrRouteName: "Nagpur Eco Transit",
        legs: Array.isArray(row.legs) ? row.legs : [],
        currentLegIndex: 0,
        currentLegStep: "not_started",
        bookingTime: row.created_at || new Date().toISOString(),
        validUntil: row.valid_until || new Date().toISOString(),
        passengers: { adult: 1, child: 0, student: 0, senior: 0 },
        totalPassengers: 1,
        standardBaseFare: Number(row.fare_rs || 0),
        discountAmount: 0,
        discountPercent: 0,
        finalFare: Number(row.fare_rs || 0),
        co2SavedKg: 0.85,
        greenPointsEarned: 15,
        paymentMethod: (row.payment_method?.toLowerCase() === "mahacard" ? "mahacard" : row.payment_method?.toLowerCase() === "card" ? "card" : "upi") as IssuedTicket["paymentMethod"],
        transactionRef: `TXN-${row.id}`,
        qrPayload: row.qr_payload || `ECO-${row.id}`,
        status: isExpired ? "expired" : (row.status as IssuedTicket["status"]),
        gateScans: [],
      };
    });

    try {
      localStorage.setItem(getLocalKey(userId), JSON.stringify(formatted));
    } catch {}

    return formatted;
  } catch (err) {
    console.warn("Error fetching user tickets from Supabase:", err);
    return readLocal();
  }
}

export async function saveUserTicket(userId: string, ticket: IssuedTicket): Promise<IssuedTicket> {
  // Sync to local user storage
  try {
    const existing = await fetchUserTickets(userId);
    const updated = [ticket, ...existing.filter((t) => t.id !== ticket.id)];
    localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));
  } catch {}

  if (userId === "demo-user-nagpur-001" || !userId) {
    return ticket;
  }

  try {
    const { error } = await supabase
      .from("user_tickets")
      .upsert({
        id: ticket.id,
        user_id: userId,
        ticket_number: ticket.id,
        ticket_type: ticket.category || "eco_pass",
        from_station: ticket.source,
        to_station: ticket.destination,
        fare_rs: ticket.finalFare,
        status: ticket.status,
        valid_until: ticket.validUntil,
        legs: ticket.legs,
        qr_payload: ticket.qrPayload,
        payment_method: ticket.paymentMethod || "UPI",
        ticket_payload: ticket,
        created_at: ticket.bookingTime || new Date().toISOString(),
      });

    if (error) {
      console.warn("Supabase save user_tickets failed:", error.message);
    }
  } catch (err) {
    console.warn("Error inserting user ticket in Supabase:", err);
  }

  return ticket;
}

export async function deleteUserTicket(userId: string, ticketId: string): Promise<boolean> {
  try {
    const existing = await fetchUserTickets(userId);
    const updated = existing.filter((t) => t.id !== ticketId);
    localStorage.setItem(getLocalKey(userId), JSON.stringify(updated));
  } catch {}

  if (userId === "demo-user-nagpur-001" || !userId) {
    return true;
  }

  try {
    await supabase.from("user_tickets").delete().eq("id", ticketId).eq("user_id", userId);
    return true;
  } catch {
    return false;
  }
}
