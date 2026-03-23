-- Tighten INSERT policies for private chat rooms and participants
DROP POLICY "Authenticated users can create rooms" ON public.private_chat_rooms;
CREATE POLICY "Authenticated users can create rooms" ON public.private_chat_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Users can add participants" ON public.private_chat_participants;
CREATE POLICY "Users can add participants to their rooms" ON public.private_chat_participants FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.private_chat_participants p2 WHERE p2.room_id = private_chat_participants.room_id AND p2.user_id = auth.uid())
  OR NOT EXISTS (SELECT 1 FROM public.private_chat_participants p3 WHERE p3.room_id = private_chat_participants.room_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);