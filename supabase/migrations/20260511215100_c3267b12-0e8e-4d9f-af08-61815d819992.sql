CREATE OR REPLACE FUNCTION public.sync_forum_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE public.forum_posts
      SET likes_count = likes_count + 1
      WHERE id = NEW.post_id;
    END IF;

    IF NEW.comment_id IS NOT NULL THEN
      UPDATE public.forum_comments
      SET likes_count = likes_count + 1
      WHERE id = NEW.comment_id;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE public.forum_posts
      SET likes_count = GREATEST(likes_count - 1, 0)
      WHERE id = OLD.post_id;
    END IF;

    IF OLD.comment_id IS NOT NULL THEN
      UPDATE public.forum_comments
      SET likes_count = GREATEST(likes_count - 1, 0)
      WHERE id = OLD.comment_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_forum_likes_count ON public.forum_likes;

CREATE TRIGGER trg_sync_forum_likes_count
  AFTER INSERT OR DELETE
  ON public.forum_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_forum_likes_count();

UPDATE public.forum_posts p
SET likes_count = (
  SELECT COUNT(*)
  FROM public.forum_likes fl
  WHERE fl.post_id = p.id
);

UPDATE public.forum_comments c
SET likes_count = (
  SELECT COUNT(*)
  FROM public.forum_likes fl
  WHERE fl.comment_id = c.id
);