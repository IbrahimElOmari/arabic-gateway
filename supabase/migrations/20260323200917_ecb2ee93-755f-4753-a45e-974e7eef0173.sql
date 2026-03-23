-- Private chat rooms for 1-on-1 messaging
CREATE TABLE public.private_chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  is_group boolean NOT NULL DEFAULT false,
  name text
);

CREATE TABLE public.private_chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.private_chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE public.private_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.private_chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.private_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their rooms" ON public.private_chat_rooms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.private_chat_participants WHERE room_id = id AND user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create rooms" ON public.private_chat_rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage all rooms" ON public.private_chat_rooms FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view participants in their rooms" ON public.private_chat_participants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.private_chat_participants p2 WHERE p2.room_id = private_chat_participants.room_id AND p2.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can add participants" ON public.private_chat_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage participants" ON public.private_chat_participants FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Participants can view messages" ON public.private_chat_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.private_chat_participants WHERE room_id = private_chat_messages.room_id AND user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Participants can send messages" ON public.private_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.private_chat_participants WHERE room_id = private_chat_messages.room_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage messages" ON public.private_chat_messages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chat_messages;

CREATE TRIGGER update_private_chat_rooms_updated_at BEFORE UPDATE ON public.private_chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_private_chat_messages_updated_at BEFORE UPDATE ON public.private_chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();