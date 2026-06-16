
ALTER TABLE public.curriculum_items
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.curriculum_items.audio_url IS 'URL van de NS-audio voor dit item; per oefening via de app gekoppeld.';
COMMENT ON COLUMN public.curriculum_items.image_url IS 'URL van de afbeelding voor dit item; per oefening via de app gekoppeld.';
