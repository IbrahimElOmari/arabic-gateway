-- Fix 13a: Secure private_chat_participants INSERT and add atomic RPC

DROP POLICY IF EXISTS "Users can add participants to their rooms"
  ON public.private_chat_participants;

CREATE OR REPLACE FUNCTION public.create_private_chat_room(
  p_other_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_room_id   UUID;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create a chat room with yourself';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_other_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  SELECT pcp1.room_id INTO v_room_id
  FROM public.private_chat_participants pcp1
  JOIN public.private_chat_participants pcp2
    ON pcp1.room_id = pcp2.room_id
  JOIN public.private_chat_rooms pcr
    ON pcr.id = pcp1.room_id
  WHERE pcp1.user_id = v_caller_id
    AND pcp2.user_id = p_other_user_id
    AND pcr.is_group = false
  LIMIT 1;

  IF v_room_id IS NOT NULL THEN
    RETURN v_room_id;
  END IF;

  INSERT INTO public.private_chat_rooms (is_group, class_id)
  VALUES (false, NULL)
  RETURNING id INTO v_room_id;

  INSERT INTO public.private_chat_participants (room_id, user_id)
  VALUES (v_room_id, v_caller_id),
         (v_room_id, p_other_user_id);

  RETURN v_room_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_private_chat_room(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_private_chat_room(UUID) TO authenticated;

CREATE POLICY "Participants can add users to existing group rooms"
  ON public.private_chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      EXISTS (
        SELECT 1
        FROM public.private_chat_participants existing
        WHERE existing.room_id = private_chat_participants.room_id
          AND existing.user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1
        FROM public.private_chat_rooms pcr
        WHERE pcr.id = private_chat_participants.room_id
          AND pcr.is_group = true
      )
    )
  );