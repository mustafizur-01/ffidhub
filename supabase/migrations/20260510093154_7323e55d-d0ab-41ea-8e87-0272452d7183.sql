-- Create tournament covers bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tournament-covers', 'tournament-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to tournament covers
CREATE POLICY "Tournament covers are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'tournament-covers');

-- Allow authenticated users to upload tournament covers
CREATE POLICY "Authenticated users can upload tournament covers"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'tournament-covers' AND auth.role() = 'authenticated');

-- Allow users to update their own uploads (optional, based on ownership logic)
CREATE POLICY "Authenticated users can update tournament covers"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'tournament-covers' AND auth.role() = 'authenticated');