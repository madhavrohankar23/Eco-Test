-- ==========================================================
-- ECO-MOVE NAGPUR: SUPABASE POSTGRESQL DATABASE SCHEMA
-- Multi-user isolation, user-scoped profiles, saved routes,
-- recent history, gamified green rewards, and digital transit tickets.
-- ==========================================================

-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    preferred_mode TEXT DEFAULT 'fastest',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Saved Journeys (Favorite multimodal routes)
CREATE TABLE IF NOT EXISTS public.saved_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    origin JSONB NOT NULL,
    destination JSONB NOT NULL,
    total_time_min NUMERIC NOT NULL DEFAULT 0,
    total_fare_rs NUMERIC NOT NULL DEFAULT 0,
    total_distance_m NUMERIC NOT NULL DEFAULT 0,
    walk_distance_m NUMERIC NOT NULL DEFAULT 0,
    transfers INT NOT NULL DEFAULT 0,
    co2_g NUMERIC NOT NULL DEFAULT 0,
    legs JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Recent Journeys / Trip History
CREATE TABLE IF NOT EXISTS public.recent_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    origin JSONB NOT NULL,
    destination JSONB NOT NULL,
    journey_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Eco Carbon Savings & Gamified Rewards
CREATE TABLE IF NOT EXISTS public.user_eco_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_co2_saved_kg NUMERIC NOT NULL DEFAULT 0,
    green_trips_count INT NOT NULL DEFAULT 0,
    claimed_reward_ids TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Digital Transit Tickets & Passes (Wallet)
CREATE TABLE IF NOT EXISTS public.user_tickets (
    id TEXT PRIMARY KEY, -- e.g. "ECO-2026-...", "METRO-..."
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,
    ticket_type TEXT NOT NULL, -- 'eco_pass' | 'metro' | 'bus'
    from_station TEXT NOT NULL,
    to_station TEXT NOT NULL,
    fare_rs NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'used' | 'expired'
    valid_until TIMESTAMPTZ NOT NULL,
    legs JSONB NOT NULL DEFAULT '[]'::JSONB,
    qr_payload TEXT NOT NULL,
    payment_method TEXT DEFAULT 'UPI',
    ticket_payload JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ticket Confirmation Emails Log
CREATE TABLE IF NOT EXISTS public.ticket_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    html_body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures strictly isolated data access per user account
-- ==========================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_eco_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email logs"
    ON public.ticket_email_logs FOR SELECT
    USING (auth.uid() = user_id OR recipient_email = auth.email());

CREATE POLICY "Users can insert own email logs"
    ON public.ticket_email_logs FOR INSERT
    WITH CHECK (true);

-- Profiles RLS
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Saved Journeys RLS
CREATE POLICY "Users can view own saved journeys" 
    ON public.saved_journeys FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved journeys" 
    ON public.saved_journeys FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved journeys" 
    ON public.saved_journeys FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved journeys" 
    ON public.saved_journeys FOR DELETE 
    USING (auth.uid() = user_id);

-- Recent Journeys RLS
CREATE POLICY "Users can view own recent journeys" 
    ON public.recent_journeys FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recent journeys" 
    ON public.recent_journeys FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recent journeys" 
    ON public.recent_journeys FOR DELETE 
    USING (auth.uid() = user_id);

-- User Eco Rewards RLS
CREATE POLICY "Users can view own eco rewards" 
    ON public.user_eco_rewards FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eco rewards" 
    ON public.user_eco_rewards FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own eco rewards" 
    ON public.user_eco_rewards FOR UPDATE 
    USING (auth.uid() = user_id);

-- User Tickets RLS
CREATE POLICY "Users can view own tickets" 
    ON public.user_tickets FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets" 
    ON public.user_tickets FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" 
    ON public.user_tickets FOR UPDATE 
    USING (auth.uid() = user_id);

-- ==========================================================
-- AUTOMATIC PROFILE & ECO REWARDS INITIALIZATION TRIGGER
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nagpur Commuter'),
        NEW.email,
        COALESCE(NEW.phone, NEW.raw_user_meta_data->>'mobile')
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_eco_rewards (user_id, total_co2_saved_kg, green_trips_count, claimed_reward_ids)
    VALUES (NEW.id, 0, 0, '{}')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
