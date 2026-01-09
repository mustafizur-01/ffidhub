-- Create login method enum
CREATE TYPE public.login_method AS ENUM ('FB', 'Google', 'VK');

-- Create table for FF MAX ID listings
CREATE TABLE public.id_listings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    id_level INTEGER NOT NULL,
    login_method login_method NOT NULL,
    key_items TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    contact_number TEXT NOT NULL,
    image_url TEXT,
    is_email_binded BOOLEAN NOT NULL DEFAULT false,
    binded_email TEXT,
    security_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for verified members
CREATE TABLE public.verified_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    member_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.id_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for id_listings (public read, anyone can insert)
CREATE POLICY "Anyone can view listings"
ON public.id_listings
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create listings"
ON public.id_listings
FOR INSERT
WITH CHECK (true);

-- RLS policies for verified_members
CREATE POLICY "Anyone can view their own member info by email"
ON public.verified_members
FOR SELECT
USING (true);

CREATE POLICY "Anyone can register as member"
ON public.verified_members
FOR INSERT
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_id_listings_updated_at
BEFORE UPDATE ON public.id_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for ID screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('id-screenshots', 'id-screenshots', true);

-- Storage policies for screenshots
CREATE POLICY "Anyone can view screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'id-screenshots');

CREATE POLICY "Anyone can upload screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'id-screenshots');