
ALTER TABLE public.profiles ADD COLUMN display_name text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN avatar_url text DEFAULT NULL;

ALTER TABLE public.tournaments ADD COLUMN game_name text DEFAULT 'Free Fire' NOT NULL;
