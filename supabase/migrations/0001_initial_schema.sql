-- ============================================================
-- Bugsok AI — Supabase Database Migration
-- File: 0001_initial_schema.sql
-- Description: Creates all tables, triggers, RLS policies, and
--              storage buckets for the Bugsok AI plant health tracker.
-- Run this script once in your Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- SECTION 1: EXTENSIONS
-- Enable UUID generation support.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- SECTION 2: TABLE DEFINITIONS
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: profiles
-- Stores user profile metadata. Linked to Supabase Auth.
-- A trigger (Section 4) auto-inserts a row here on registration.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT        UNIQUE,
    full_name   TEXT,
    avatar_url  TEXT,
    gender      TEXT        CHECK (gender IN ('Male', 'Female', 'Other')),
    birthdate   DATE,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Public user profile data linked to Supabase Auth users.';

-- ------------------------------------------------------------
-- TABLE: scans
-- Stores the full plant diagnosis history for each user.
-- UUIDs are generated on the client to support offline creation.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scans (
    id               UUID        NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    crop_name        TEXT        NOT NULL,
    condition_name   TEXT,
    severity         TEXT        CHECK (severity IN ('None', 'Low', 'Moderate', 'High')),
    health_score     INTEGER     CHECK (health_score BETWEEN 0 AND 100),
    confidence_score INTEGER     CHECK (confidence_score BETWEEN 0 AND 100),
    local_image_path TEXT,
    cloud_image_url  TEXT,
    diagnosis_text   TEXT,
    synced           BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.scans IS 'Plant leaf scan history including AI diagnosis results.';
COMMENT ON COLUMN public.scans.local_image_path IS 'Temporary local device URI. Not synced to cloud.';
COMMENT ON COLUMN public.scans.cloud_image_url IS 'Public URL of the uploaded image in Supabase Storage.';
COMMENT ON COLUMN public.scans.synced IS 'TRUE when the scan record is fully uploaded to Supabase.';

-- ------------------------------------------------------------
-- TABLE: chat_sessions
-- Groups chat messages under a specific scan event.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id         UUID        NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id    UUID        NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title      TEXT,
    synced     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.chat_sessions IS 'A follow-up chat conversation session linked to a specific scan.';

-- ------------------------------------------------------------
-- TABLE: chat_messages
-- Stores individual AI and user chat bubbles.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id         UUID        NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID        NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    sender     TEXT        NOT NULL CHECK (sender IN ('user', 'ai')),
    model_used TEXT,
    message    TEXT        NOT NULL,
    synced     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.chat_messages IS 'Individual chat message bubbles from the user or AI model.';
COMMENT ON COLUMN public.chat_messages.model_used IS 'e.g. "gemini-3.1-flash-lite" or "gemma-4-31b"';


-- ============================================================
-- SECTION 3: INDEXES
-- Speeds up common query patterns (lookup by user_id, scan_id).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_scans_user_id          ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at       ON public.scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_scan_id  ON public.chat_sessions(scan_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id  ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session  ON public.chat_messages(session_id);


-- ============================================================
-- SECTION 4: TRIGGER — Auto-Provision Profile on Registration
-- Whenever a new row is inserted into auth.users (a user signs up),
-- this trigger automatically creates a matching row in public.profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SECTION 5: ROW-LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access and modify their own data.
-- ============================================================

-- --- profiles ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- --- scans ---
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scans"
    ON public.scans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans"
    ON public.scans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans"
    ON public.scans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans"
    ON public.scans FOR DELETE
    USING (auth.uid() = user_id);

-- --- chat_sessions ---
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat sessions"
    ON public.chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions"
    ON public.chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
    ON public.chat_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- --- chat_messages ---
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their own sessions"
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions s
            WHERE s.id = chat_messages.session_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages into their own sessions"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_sessions s
            WHERE s.id = chat_messages.session_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages from their own sessions"
    ON public.chat_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions s
            WHERE s.id = chat_messages.session_id
            AND s.user_id = auth.uid()
        )
    );


-- ============================================================
-- SECTION 6: STORAGE BUCKETS
-- Create the two storage buckets for images.
-- Run this section only once. Skip if buckets already exist.
-- ============================================================

-- Bucket: plant-images
-- Stores uploaded leaf photos from the scan screen.
INSERT INTO storage.buckets (id, name, public)
VALUES ('plant-images', 'plant-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Bucket: avatars
-- Stores user profile pictures uploaded during registration.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Allow authenticated users to upload to plant-images
CREATE POLICY "Authenticated users can upload plant images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'plant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS: Allow authenticated users to view their own plant images
CREATE POLICY "Authenticated users can view their own plant images"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'plant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS: Allow authenticated users to delete their own plant images
CREATE POLICY "Authenticated users can delete their own plant images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'plant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS: Allow authenticated users to upload their own avatars
CREATE POLICY "Authenticated users can upload their own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS: Allow authenticated users to update their own avatars
CREATE POLICY "Authenticated users can update their own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS: Allow anyone to view avatars (since it's a public bucket)
CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- ============================================================
-- END OF MIGRATION
-- ============================================================
