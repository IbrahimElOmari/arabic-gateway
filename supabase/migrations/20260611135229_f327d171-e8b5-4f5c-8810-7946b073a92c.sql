CREATE OR REPLACE FUNCTION public.private_chat_is_participant(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.private_chat_participants p
    WHERE p.room_id = _room_id
      AND p.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.private_chat_can_add_participant(_room_id uuid, _actor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.private_chat_rooms r
    WHERE r.id = _room_id
      AND r.is_group = true
  )
  AND public.private_chat_is_participant(_room_id, _actor_id)
$$;

REVOKE EXECUTE ON FUNCTION public.private_chat_is_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.private_chat_can_add_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.private_chat_is_participant(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.private_chat_can_add_participant(uuid, uuid) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_chat_messages TO authenticated;
GRANT ALL ON public.private_chat_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_chat_rooms TO authenticated;
GRANT ALL ON public.private_chat_rooms TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_chat_participants TO authenticated;
GRANT ALL ON public.private_chat_participants TO service_role;

DROP POLICY IF EXISTS "Participants can view their rooms" ON public.private_chat_rooms;
DROP POLICY IF EXISTS "Participants can update their rooms" ON public.private_chat_rooms;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.private_chat_participants;
DROP POLICY IF EXISTS "Participants can add users to existing group rooms" ON public.private_chat_participants;
DROP POLICY IF EXISTS "Participants can view messages" ON public.private_chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.private_chat_messages;

CREATE POLICY "Participants can view their rooms"
ON public.private_chat_rooms
FOR SELECT
TO authenticated
USING (
  public.private_chat_is_participant(id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Participants can update their rooms"
ON public.private_chat_rooms
FOR UPDATE
TO authenticated
USING (
  public.private_chat_is_participant(id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.private_chat_is_participant(id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can view participants in their rooms"
ON public.private_chat_participants
FOR SELECT
TO authenticated
USING (
  public.private_chat_is_participant(room_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Participants can add users to existing group rooms"
ON public.private_chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.private_chat_can_add_participant(room_id, auth.uid())
);

CREATE POLICY "Participants can view messages"
ON public.private_chat_messages
FOR SELECT
TO authenticated
USING (
  public.private_chat_is_participant(room_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Participants can send messages"
ON public.private_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.private_chat_is_participant(room_id, auth.uid())
);