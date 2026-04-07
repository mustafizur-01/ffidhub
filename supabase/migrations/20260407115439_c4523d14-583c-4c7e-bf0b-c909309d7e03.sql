
-- Create tournament status enum
CREATE TYPE public.tournament_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  game_mode TEXT NOT NULL DEFAULT 'Battle Royale',
  max_players INTEGER NOT NULL DEFAULT 50,
  entry_fee NUMERIC NOT NULL DEFAULT 0,
  prize_pool NUMERIC NOT NULL DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status tournament_status NOT NULL DEFAULT 'upcoming',
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can create tournaments" ON public.tournaments FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update tournaments" ON public.tournaments FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete tournaments" ON public.tournaments FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create tournament participants table
CREATE TABLE public.tournament_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participant count" ON public.tournament_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave tournaments" ON public.tournament_participants FOR DELETE USING (auth.uid() = user_id);
