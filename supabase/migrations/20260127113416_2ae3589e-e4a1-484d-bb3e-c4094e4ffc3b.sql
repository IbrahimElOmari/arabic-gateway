-- Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    date_of_birth DATE,
    study_level TEXT,
    avatar_url TEXT,
    preferred_language TEXT DEFAULT 'nl' CHECK (preferred_language IN ('nl', 'en', 'ar')),
    preferred_theme TEXT DEFAULT 'professional' CHECK (preferred_theme IN ('professional', 'playful')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create levels table (Beginner, Intermediate, Advanced)
CREATE TABLE public.levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_nl TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classes table
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID REFERENCES public.levels(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    max_students INTEGER DEFAULT 50 CHECK (max_students > 0 AND max_students <= 50),
    price DECIMAL(10, 2),
    currency TEXT DEFAULT 'EUR',
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class enrollments table
CREATE TABLE public.class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'failed', 'withdrawn')),
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    final_score DECIMAL(5, 2),
    UNIQUE (class_id, student_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'teacher' THEN 2 
      WHEN 'student' THEN 3 
    END
  LIMIT 1
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_levels_updated_at
    BEFORE UPDATE ON public.levels
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    
    -- Default role is student
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view student profiles in their classes"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'teacher') AND
        user_id IN (
            SELECT ce.student_id 
            FROM public.class_enrollments ce
            JOIN public.classes c ON ce.class_id = c.id
            WHERE c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles (only admins can manage roles)
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
    ON public.user_roles FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
    ON public.user_roles FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
    ON public.user_roles FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for levels (public read, admin write)
CREATE POLICY "Anyone can view levels"
    ON public.levels FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage levels"
    ON public.levels FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for classes
CREATE POLICY "Anyone can view active classes"
    ON public.classes FOR SELECT
    TO authenticated
    USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view their own classes"
    ON public.classes FOR SELECT
    TO authenticated
    USING (teacher_id = auth.uid());

CREATE POLICY "Admins can manage classes"
    ON public.classes FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for class_enrollments
CREATE POLICY "Students can view their own enrollments"
    ON public.class_enrollments FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Teachers can view enrollments in their classes"
    ON public.class_enrollments FOR SELECT
    TO authenticated
    USING (
        class_id IN (
            SELECT id FROM public.classes WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all enrollments"
    ON public.class_enrollments FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default levels
INSERT INTO public.levels (name, name_nl, name_en, name_ar, description, display_order) VALUES
    ('beginner', 'Beginner', 'Beginner', 'مبتدئ', 'Basic Arabic for beginners', 1),
    ('intermediate', 'Gemiddeld', 'Intermediate', 'متوسط', 'Intermediate Arabic', 2),
    ('advanced', 'Gevorderd', 'Advanced', 'متقدم', 'Advanced Arabic', 3);