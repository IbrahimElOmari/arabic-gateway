-- =====================================================
-- FORUM & CHAT TABLES
-- =====================================================

-- Forum rooms (4 fixed rooms)
CREATE TABLE public.forum_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    name_nl TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'message-circle',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum posts
CREATE TABLE public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.forum_rooms(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum comments (replies to posts)
CREATE TABLE public.forum_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum likes (for posts and comments)
CREATE TABLE public.forum_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT like_target_check CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    UNIQUE(user_id, post_id),
    UNIQUE(user_id, comment_id)
);

-- Class chat messages (real-time)
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat reactions (emoji reactions)
CREATE TABLE public.chat_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE public.forum_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - FORUM ROOMS
-- =====================================================

CREATE POLICY "Anyone can view forum rooms"
ON public.forum_rooms FOR SELECT
USING (true);

CREATE POLICY "Admins can manage forum rooms"
ON public.forum_rooms FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES - FORUM POSTS
-- =====================================================

CREATE POLICY "Authenticated users can view forum posts"
ON public.forum_posts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create their own posts"
ON public.forum_posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts"
ON public.forum_posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

CREATE POLICY "Users can delete their own posts"
ON public.forum_posts FOR DELETE
TO authenticated
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- =====================================================
-- RLS POLICIES - FORUM COMMENTS
-- =====================================================

CREATE POLICY "Authenticated users can view forum comments"
ON public.forum_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create their own comments"
ON public.forum_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments"
ON public.forum_comments FOR UPDATE
TO authenticated
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

CREATE POLICY "Users can delete their own comments"
ON public.forum_comments FOR DELETE
TO authenticated
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- =====================================================
-- RLS POLICIES - FORUM LIKES
-- =====================================================

CREATE POLICY "Authenticated users can view likes"
ON public.forum_likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage their own likes"
ON public.forum_likes FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - CHAT MESSAGES
-- =====================================================

CREATE POLICY "Enrolled students can view class chat"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM class_enrollments
        WHERE class_enrollments.class_id = chat_messages.class_id
        AND class_enrollments.student_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
    OR EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = chat_messages.class_id
        AND classes.teacher_id = auth.uid()
    )
);

CREATE POLICY "Enrolled users can send chat messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id AND (
        EXISTS (
            SELECT 1 FROM class_enrollments
            WHERE class_enrollments.class_id = chat_messages.class_id
            AND class_enrollments.student_id = auth.uid()
        )
        OR has_role(auth.uid(), 'admin')
        OR EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = chat_messages.class_id
            AND classes.teacher_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update their own messages"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages or admins/teachers can delete any"
ON public.chat_messages FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- =====================================================
-- RLS POLICIES - CHAT REACTIONS
-- =====================================================

CREATE POLICY "Users can view reactions in their chats"
ON public.chat_reactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM chat_messages cm
        JOIN class_enrollments ce ON ce.class_id = cm.class_id
        WHERE cm.id = chat_reactions.message_id
        AND ce.student_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Users can add their own reactions"
ON public.chat_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
ON public.chat_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_forum_posts_updated_at
    BEFORE UPDATE ON public.forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_comments_updated_at
    BEFORE UPDATE ON public.forum_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ENABLE REALTIME FOR CHAT
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;

-- =====================================================
-- SEED DATA - FIXED FORUM ROOMS
-- =====================================================

INSERT INTO public.forum_rooms (name, name_nl, name_en, name_ar, description, icon, display_order) VALUES
('general', 'Algemeen', 'General', 'عام', 'General discussions about learning Arabic', 'message-circle', 1),
('exercises', 'Oefeningen', 'Exercises', 'تمارين', 'Discuss exercises and get help with practice', 'book-open', 2),
('collaboration', 'Samenwerking', 'Collaboration', 'تعاون', 'Find study partners and collaborate with classmates', 'users', 3),
('extras', 'Extra', 'Extras', 'إضافات', 'Share resources, tips, and interesting content', 'sparkles', 4);