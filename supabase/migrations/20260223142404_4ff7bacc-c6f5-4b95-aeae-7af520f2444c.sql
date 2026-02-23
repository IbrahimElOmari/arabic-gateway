CREATE INDEX IF NOT EXISTS idx_leaderboards_period_points 
ON public.leaderboards(period, period_start, points DESC);