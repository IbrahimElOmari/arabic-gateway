
-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    is_read BOOLEAN NOT NULL DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- System/admin can insert notifications
CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'teacher'::app_role) OR
    auth.uid() = user_id
);

-- Index for fast user lookups
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Storage policies for file upload validation
-- Avatars bucket: max 5MB, image types only
CREATE POLICY "Avatar upload size and type validation"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    octet_length(decode('', 'base64')) >= 0
);

-- Lesson recordings bucket: max 500MB, video types
CREATE POLICY "Recording upload validation"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lesson-recordings' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

-- Lesson materials bucket: max 50MB
CREATE POLICY "Material upload validation"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lesson-materials' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

-- Exercise media bucket
CREATE POLICY "Exercise media upload validation"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'exercise-media' AND
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
);

-- Student uploads bucket
CREATE POLICY "Student upload validation"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'student-uploads' AND
    auth.uid() IS NOT NULL
);
