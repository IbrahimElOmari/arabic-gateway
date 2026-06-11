GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_chat_messages TO authenticated;
GRANT ALL ON public.private_chat_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_chat_rooms TO authenticated;
GRANT ALL ON public.private_chat_rooms TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_chat_participants TO authenticated;
GRANT ALL ON public.private_chat_participants TO service_role;