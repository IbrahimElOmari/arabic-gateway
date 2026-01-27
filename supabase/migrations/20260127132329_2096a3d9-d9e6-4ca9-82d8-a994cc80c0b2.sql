-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create storage buckets for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('lesson-recordings', 'lesson-recordings', false, 524288000, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
    ('lesson-materials', 'lesson-materials', false, 20971520, ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('exercise-media', 'exercise-media', false, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']),
    ('student-uploads', 'student-uploads', false, 104857600, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf']);

-- =============================================
-- STORAGE RLS POLICIES
-- =============================================

-- Lesson recordings: Teachers can upload, enrolled students can view
CREATE POLICY "Teachers can upload lesson recordings"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'lesson-recordings' 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Teachers can update lesson recordings"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'lesson-recordings' 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Teachers can delete lesson recordings"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'lesson-recordings' 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Authenticated users can view lesson recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-recordings' AND auth.role() = 'authenticated');

-- Lesson materials: Teachers can manage, enrolled students can view
CREATE POLICY "Teachers can upload lesson materials"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'lesson-materials' 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Teachers can update lesson materials"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'lesson-materials' 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Teachers can delete lesson materials"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'lesson-materials' 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Authenticated users can view lesson materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-materials' AND auth.role() = 'authenticated');

-- Exercise media: Teachers can manage, students can view
CREATE POLICY "Teachers can upload exercise media"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'exercise-media' 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Teachers can update exercise media"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'exercise-media' 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Teachers can delete exercise media"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'exercise-media' 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Authenticated users can view exercise media"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-media' AND auth.role() = 'authenticated');

-- Student uploads: Students can upload their own, teachers can view all
CREATE POLICY "Students can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'student-uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can view their own uploads"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'student-uploads' 
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR public.has_role(auth.uid(), 'admin') 
        OR public.has_role(auth.uid(), 'teacher')
    )
);

CREATE POLICY "Teachers can view all student uploads"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'student-uploads' 
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);