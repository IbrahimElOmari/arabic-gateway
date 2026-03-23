
-- Fix private_chat_rooms SELECT policy: wrong column reference
DROP POLICY IF EXISTS "Participants can view their rooms" ON public.private_chat_rooms;
CREATE POLICY "Participants can view their rooms"
ON public.private_chat_rooms
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM private_chat_participants
    WHERE private_chat_participants.room_id = private_chat_rooms.id
      AND private_chat_participants.user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add missing UPDATE policy for private_chat_rooms
CREATE POLICY "Participants can update their rooms"
ON public.private_chat_rooms
FOR UPDATE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM private_chat_participants
    WHERE private_chat_participants.room_id = private_chat_rooms.id
      AND private_chat_participants.user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM private_chat_participants
    WHERE private_chat_participants.room_id = private_chat_rooms.id
      AND private_chat_participants.user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);
