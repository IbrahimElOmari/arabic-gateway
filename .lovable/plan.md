

# Implementatieplan: Prioriteit 1 (MVP Essentieel) - Volledige Voltooiing

Dit plan behandelt de volledige implementatie van alle 5 essentiële MVP-punten zonder weglatingen, samenvattingen of pragmatische afkortingen.

---

## Overzicht Prioriteit 1 Punten

| Nr | Onderdeel | Huidige Status | Vereiste Actie |
|----|-----------|---------------|----------------|
| 1 | Registratieformulier Uitbreiden | Database velden aanwezig (phone, address, date_of_birth, study_level) maar RegisterForm.tsx verzamelt deze niet | Frontend uitbreiden + signUp functie aanpassen |
| 2 | Kalendermodule (Events) | Geen `events` tabel, geen CalendarPage, route wijst naar DashboardPage placeholder | Database tabel + RLS + frontend pagina + componenten |
| 3 | Stripe Edge Functions | Geen edge functions aanwezig in `supabase/functions/` | 3 complete edge functions aanmaken |
| 4 | Automatische Data-Retentie (GDPR) | Geen retentie-logica, geen cron-job, geen anonimisatie | Database function + cron-job + admin notificaties |
| 5 | Email Notificaties | Geen email edge functions, geen Resend integratie | Edge function voor transactionele emails |

---

## PUNT 1: Registratieformulier Uitbreiden

### 1.1 Huidige Situatie Analyse

**Database (profiles tabel) - VOLLEDIG AANWEZIG:**
```
column_name      | data_type                | is_nullable
-----------------|--------------------------|------------
id               | uuid                     | NO
user_id          | uuid                     | NO
email            | text                     | NO
full_name        | text                     | NO
phone            | text                     | YES
address          | text                     | YES
date_of_birth    | date                     | YES
study_level      | text                     | YES
avatar_url       | text                     | YES
preferred_language| text                    | YES
preferred_theme  | text                     | YES
created_at       | timestamp with time zone | NO
updated_at       | timestamp with time zone | NO
```

**RegisterForm.tsx - ONVOLLEDIG:**
- Huidige velden: fullName, email, password, confirmPassword
- Ontbrekende velden: phone, address, dateOfBirth, studyLevel

**AuthContext.tsx signUp functie - ONVOLLEDIG:**
- Stuurt alleen `full_name` naar user metadata
- Ontbrekende velden worden niet doorgegeven

### 1.2 Vereiste Wijzigingen

**Bestand: `src/components/auth/RegisterForm.tsx`**

1. **Schema uitbreiden (regel 28-38):**
```typescript
const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Naam moet minimaal 2 karakters zijn').max(100),
    email: z.string().email('Ongeldig e-mailadres'),
    phone: z.string().min(10, 'Telefoonnummer moet minimaal 10 cijfers bevatten').max(20).optional(),
    address: z.string().max(200).optional(),
    dateOfBirth: z.string().optional(),
    studyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    password: z.string().min(8, 'Wachtwoord moet minimaal 8 karakters zijn'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Wachtwoorden komen niet overeen',
    path: ['confirmPassword'],
  });
```

2. **Default waarden uitbreiden (regel 49-57):**
```typescript
const form = useForm<RegisterFormValues>({
  resolver: zodResolver(registerSchema),
  defaultValues: {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    studyLevel: undefined,
    password: '',
    confirmPassword: '',
  },
});
```

3. **onSubmit uitbreiden (regel 59-63):**
```typescript
const onSubmit = async (data: RegisterFormValues) => {
  setIsLoading(true);
  await signUp(
    data.email, 
    data.password, 
    data.fullName,
    data.phone || null,
    data.address || null,
    data.dateOfBirth || null,
    data.studyLevel || null
  );
  setIsLoading(false);
};
```

4. **Nieuwe formuliervelden toevoegen (na fullName veld, regel 94):**

**Telefoonnummer veld:**
```tsx
<FormField
  control={form.control}
  name="phone"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t('auth.phone')}</FormLabel>
      <FormControl>
        <Input
          type="tel"
          placeholder="+32 XXX XX XX XX"
          autoComplete="tel"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Adres veld:**
```tsx
<FormField
  control={form.control}
  name="address"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t('auth.address')}</FormLabel>
      <FormControl>
        <Textarea
          placeholder="Straat, huisnummer, postcode, stad"
          autoComplete="street-address"
          rows={2}
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Geboortedatum veld:**
```tsx
<FormField
  control={form.control}
  name="dateOfBirth"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t('auth.dateOfBirth')}</FormLabel>
      <FormControl>
        <Input
          type="date"
          max={new Date().toISOString().split('T')[0]}
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Studieniveau veld:**
```tsx
<FormField
  control={form.control}
  name="studyLevel"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t('auth.studyLevel')}</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={t('common.select')} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="beginner">{t('levels.beginner')}</SelectItem>
          <SelectItem value="intermediate">{t('levels.intermediate')}</SelectItem>
          <SelectItem value="advanced">{t('levels.advanced')}</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

5. **Imports toevoegen:**
```typescript
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
```

**Bestand: `src/contexts/AuthContext.tsx`**

1. **signUp functie signature uitbreiden (regel 29):**
```typescript
signUp: (
  email: string, 
  password: string, 
  fullName: string,
  phone?: string | null,
  address?: string | null,
  dateOfBirth?: string | null,
  studyLevel?: string | null
) => Promise<{ error: Error | null }>;
```

2. **signUp implementatie uitbreiden (regel 131-159):**
```typescript
const signUp = async (
  email: string, 
  password: string, 
  fullName: string,
  phone?: string | null,
  address?: string | null,
  dateOfBirth?: string | null,
  studyLevel?: string | null
) => {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          phone: phone,
          address: address,
          date_of_birth: dateOfBirth,
          study_level: studyLevel,
        },
      },
    });

    if (error) throw error;

    toast({
      title: t('auth.registerSuccess'),
    });

    return { error: null };
  } catch (error) {
    toast({
      variant: 'destructive',
      title: t('common.error'),
      description: (error as Error).message,
    });
    return { error: error as Error };
  }
};
```

**Bestand: `supabase/migrations/XXXXXXXX_update_handle_new_user.sql`**

Database trigger updaten om extra velden te verwerken:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name,
        phone,
        address,
        date_of_birth,
        study_level
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'address',
        CASE 
            WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
            THEN (NEW.raw_user_meta_data->>'date_of_birth')::date 
            ELSE NULL 
        END,
        NEW.raw_user_meta_data->>'study_level'
    );
    
    -- Default role is student
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    
    RETURN NEW;
END;
$$;
```

**i18n bestanden uitbreiden:**

Alle drie de locale bestanden moeten de volgende sleutels bevatten (reeds aanwezig in nl.json en en.json):
- `auth.phone`
- `auth.address`
- `auth.dateOfBirth`
- `auth.studyLevel`

Arabisch bestand (ar.json) moet uitgebreid worden met:
```json
"auth": {
  // ... bestaande keys
  "phone": "رقم الهاتف",
  "address": "العنوان",
  "dateOfBirth": "تاريخ الميلاد",
  "studyLevel": "مستوى الدراسة"
}
```

---

## PUNT 2: Kalendermodule (Events)

### 2.1 Huidige Situatie Analyse

**Database:** Geen `events` tabel aanwezig
**Frontend:** Geen CalendarPage, route `/calendar` wijst naar DashboardPage
**Dependencies:** `date-fns` reeds geïnstalleerd

### 2.2 Vereiste Database Migratie

**Bestand: `supabase/migrations/XXXXXXXX_create_events_table.sql`**

```sql
-- =============================================
-- EVENTS TABLE
-- =============================================

-- Events table for calendar functionality
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL,
    
    -- Target specification (who sees this event)
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'level', 'class', 'user')),
    target_id UUID, -- References level_id, class_id, or user_id based on target_type
    
    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false NOT NULL,
    
    -- Recurrence (optional)
    recurrence_rule TEXT, -- iCal RRULE format
    recurrence_end_date TIMESTAMP WITH TIME ZONE,
    
    -- Event type/category
    event_type TEXT DEFAULT 'general' NOT NULL CHECK (event_type IN ('general', 'lesson', 'exam', 'deadline', 'webinar', 'personal')),
    
    -- Color coding
    color TEXT DEFAULT '#3d8c6e',
    
    -- Reminder settings
    reminder_minutes INTEGER[], -- Array of reminder times in minutes before event
    
    -- Metadata
    location TEXT, -- Physical location or Google Meet link
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- Constraint: end_time must be after start_time
    CONSTRAINT events_time_check CHECK (end_time > start_time)
);

-- Event attendees (for tracking RSVPs)
CREATE TABLE public.event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'maybe')),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(event_id, user_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR EVENTS
-- =============================================

-- Users can view events targeted at them
CREATE POLICY "Users can view their targeted events" ON public.events
    FOR SELECT USING (
        -- Public events (target_type = 'all')
        target_type = 'all'
        -- Events targeted at user's level
        OR (target_type = 'level' AND target_id IN (
            SELECT c.level_id FROM public.classes c
            JOIN public.class_enrollments ce ON ce.class_id = c.id
            WHERE ce.student_id = auth.uid()
        ))
        -- Events targeted at user's class
        OR (target_type = 'class' AND target_id IN (
            SELECT class_id FROM public.class_enrollments
            WHERE student_id = auth.uid()
        ))
        -- Personal events (created by user or targeted at user)
        OR (target_type = 'user' AND (target_id = auth.uid() OR creator_id = auth.uid()))
        -- Teachers can see events for their classes
        OR (target_type = 'class' AND target_id IN (
            SELECT id FROM public.classes WHERE teacher_id = auth.uid()
        ))
        -- Admins can see all events
        OR public.has_role(auth.uid(), 'admin')
        -- Teachers can see level events they teach
        OR (target_type = 'level' AND public.has_role(auth.uid(), 'teacher'))
    );

-- Users can create their own personal events
CREATE POLICY "Users can create personal events" ON public.events
    FOR INSERT WITH CHECK (
        auth.uid() = creator_id
        AND (
            -- Personal events
            (target_type = 'user' AND target_id = auth.uid())
            -- Teachers can create class/level events
            OR (public.has_role(auth.uid(), 'teacher') AND target_type IN ('class', 'level'))
            -- Admins can create any event
            OR public.has_role(auth.uid(), 'admin')
        )
    );

-- Users can update their own events
CREATE POLICY "Users can update their own events" ON public.events
    FOR UPDATE USING (
        auth.uid() = creator_id
        OR public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        auth.uid() = creator_id
        OR public.has_role(auth.uid(), 'admin')
    );

-- Users can delete their own events
CREATE POLICY "Users can delete their own events" ON public.events
    FOR DELETE USING (
        auth.uid() = creator_id
        OR public.has_role(auth.uid(), 'admin')
    );

-- Event attendees policies
CREATE POLICY "Users can view attendees for their events" ON public.event_attendees
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.events e 
            WHERE e.id = event_attendees.event_id 
            AND e.creator_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Users can manage their own attendance" ON public.event_attendees
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Event creators can manage attendees" ON public.event_attendees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e 
            WHERE e.id = event_attendees.event_id 
            AND e.creator_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e 
            WHERE e.id = event_attendees.event_id 
            AND e.creator_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin')
    );
```

### 2.3 Frontend Componenten

**Bestand: `src/pages/CalendarPage.tsx`**

```tsx
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';
import { nl, enUS, ar } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Trash2,
  Edit2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  creator_id: string;
  target_type: 'all' | 'level' | 'class' | 'user';
  target_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: 'general' | 'lesson' | 'exam' | 'deadline' | 'webinar' | 'personal';
  color: string;
  location: string | null;
  notes: string | null;
}

const eventTypeColors: Record<string, string> = {
  general: '#3d8c6e',
  lesson: '#3db8a0',
  exam: '#ef4444',
  deadline: '#f59e0b',
  webinar: '#8b5cf6',
  personal: '#6366f1',
};

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    event_type: 'personal' as Event['event_type'],
    location: '',
    notes: '',
  });

  const locale = i18n.language === 'nl' ? nl : i18n.language === 'ar' ? ar : enUS;

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data as Event[];
    },
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: Partial<Event>) => {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          ...eventData,
          creator_id: user?.id,
          target_type: 'user',
          target_id: user?.id,
          color: eventTypeColors[eventData.event_type || 'personal'],
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: t('calendar.eventCreated') });
    },
    onError: (error) => {
      toast({ 
        variant: 'destructive', 
        title: t('common.error'), 
        description: (error as Error).message 
      });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: t('calendar.eventDeleted') });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      all_day: false,
      event_type: 'personal',
      location: '',
      notes: '',
    });
    setEditingEvent(null);
  };

  const handleCreateEvent = () => {
    if (!formData.title || !formData.start_time || !formData.end_time) {
      toast({ variant: 'destructive', title: t('calendar.fillRequired') });
      return;
    }
    createEventMutation.mutate(formData);
  };

  // Calendar grid calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(parseISO(event.start_time), day)
    );
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    setFormData(prev => ({
      ...prev,
      start_time: format(day, "yyyy-MM-dd'T'09:00"),
      end_time: format(day, "yyyy-MM-dd'T'10:00"),
    }));
    setIsCreateDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('nav.calendar')}</h1>
            <p className="text-muted-foreground">{t('calendar.description')}</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('calendar.newEvent')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('calendar.createEvent')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('calendar.eventTitle')}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('calendar.eventTitlePlaceholder')}
                  />
                </div>
                
                <div>
                  <Label>{t('calendar.eventType')}</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      event_type: value as Event['event_type'] 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">{t('calendar.types.personal')}</SelectItem>
                      <SelectItem value="general">{t('calendar.types.general')}</SelectItem>
                      <SelectItem value="lesson">{t('calendar.types.lesson')}</SelectItem>
                      <SelectItem value="exam">{t('calendar.types.exam')}</SelectItem>
                      <SelectItem value="deadline">{t('calendar.types.deadline')}</SelectItem>
                      <SelectItem value="webinar">{t('calendar.types.webinar')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all_day"
                    checked={formData.all_day}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, all_day: checked as boolean }))
                    }
                  />
                  <Label htmlFor="all_day">{t('calendar.allDay')}</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('calendar.startTime')}</Label>
                    <Input
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{t('calendar.endTime')}</Label>
                    <Input
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('calendar.location')}</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder={t('calendar.locationPlaceholder')}
                  />
                </div>

                <div>
                  <Label>{t('calendar.description')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleCreateEvent} disabled={createEventMutation.isPending}>
                    {t('common.create')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar Navigation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl">
              {format(currentMonth, 'MMMM yyyy', { locale })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors",
                      isCurrentMonth ? "bg-background" : "bg-muted/50 text-muted-foreground",
                      isToday && "ring-2 ring-primary",
                      "hover:bg-accent/50"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isToday && "text-primary font-bold"
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded truncate"
                          style={{ 
                            backgroundColor: `${event.color}20`, 
                            color: event.color,
                            borderLeft: `3px solid ${event.color}`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEvent(event);
                          }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} {t('common.more')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Event details sidebar would go here */}
      </div>
    </MainLayout>
  );
}
```

### 2.4 i18n Uitbreidingen

**Toevoegen aan nl.json, en.json, ar.json:**

```json
"calendar": {
  "description": "Beheer je persoonlijke agenda en evenementen",
  "newEvent": "Nieuw Evenement",
  "createEvent": "Evenement Aanmaken",
  "editEvent": "Evenement Bewerken",
  "eventTitle": "Titel",
  "eventTitlePlaceholder": "bijv. Arabisch studeren",
  "eventType": "Type",
  "types": {
    "personal": "Persoonlijk",
    "general": "Algemeen",
    "lesson": "Les",
    "exam": "Examen",
    "deadline": "Deadline",
    "webinar": "Webinar"
  },
  "allDay": "Hele dag",
  "startTime": "Starttijd",
  "endTime": "Eindtijd",
  "location": "Locatie",
  "locationPlaceholder": "bijv. Online of adres",
  "description": "Beschrijving",
  "eventCreated": "Evenement aangemaakt",
  "eventUpdated": "Evenement bijgewerkt",
  "eventDeleted": "Evenement verwijderd",
  "fillRequired": "Vul alle verplichte velden in",
  "noEvents": "Geen evenementen",
  "today": "Vandaag"
}
```

### 2.5 Route Update

**Bestand: `src/App.tsx` (regel 94):**
```typescript
// Wijzig van:
<Route path="/calendar" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

// Naar:
<Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
```

En import toevoegen:
```typescript
import CalendarPage from "./pages/CalendarPage";
```

---

## PUNT 3: Stripe Edge Functions

### 3.1 Edge Function Architectuur

Er worden 3 edge functions aangemaakt:
1. `stripe-checkout` - Checkout sessie aanmaken
2. `stripe-webhook` - Webhook events verwerken
3. `manual-payment` - Handmatige betalingen registreren

### 3.2 Bestand: `supabase/functions/stripe-checkout/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  class_id: string;
  plan_type: "one_time" | "subscription" | "installment";
  installment_plan_id?: string;
  discount_code?: string;
  success_url: string;
  cancel_url: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    // Check if Stripe is configured
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: "Stripe is not configured",
          message: "Payment processing is not available. Please contact support.",
          stripe_configured: false,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CheckoutRequest = await req.json();
    const { class_id, plan_type, installment_plan_id, discount_code, success_url, cancel_url } = body;

    // Validate required fields
    if (!class_id || !plan_type || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch class details
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("*, levels(*)")
      .eq("id", class_id)
      .single();

    if (classError || !classData) {
      return new Response(
        JSON.stringify({ error: "Class not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check enrollment limit (max 50 students)
    const { count: enrollmentCount } = await supabase
      .from("class_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("class_id", class_id)
      .eq("status", "enrolled");

    if (enrollmentCount && enrollmentCount >= (classData.max_students || 50)) {
      return new Response(
        JSON.stringify({ error: "Class is full", message: "This class has reached maximum enrollment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from("class_enrollments")
      .select("id")
      .eq("class_id", class_id)
      .eq("student_id", user.id)
      .eq("status", "enrolled")
      .maybeSingle();

    if (existingEnrollment) {
      return new Response(
        JSON.stringify({ error: "Already enrolled in this class" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let priceAmount = classData.price || 0;
    let discountAmount = 0;

    // Apply discount code if provided
    if (discount_code) {
      const { data: discount } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discount_code.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (discount) {
        const now = new Date();
        const validFrom = new Date(discount.valid_from);
        const validUntil = discount.valid_until ? new Date(discount.valid_until) : null;

        if (now >= validFrom && (!validUntil || now <= validUntil)) {
          if (!discount.max_uses || discount.current_uses < discount.max_uses) {
            if (!discount.class_id || discount.class_id === class_id) {
              if (discount.discount_type === "percentage") {
                discountAmount = (priceAmount * discount.discount_value) / 100;
              } else {
                discountAmount = discount.discount_value;
              }
              priceAmount = Math.max(0, priceAmount - discountAmount);
            }
          }
        }
      }
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", user.id)
      .single();

    let customerId: string;

    // Check for existing subscription with Stripe customer ID
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: plan_type === "subscription" ? "subscription" : "payment",
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url,
      metadata: {
        user_id: user.id,
        class_id: class_id,
        plan_type: plan_type,
        discount_code: discount_code || "",
      },
      line_items: [
        {
          price_data: {
            currency: classData.currency?.toLowerCase() || "eur",
            product_data: {
              name: classData.name,
              description: `${classData.levels?.name || "Course"} - ${classData.description || ""}`,
            },
            unit_amount: Math.round(priceAmount * 100), // Convert to cents
            ...(plan_type === "subscription" && {
              recurring: {
                interval: "month",
              },
            }),
          },
          quantity: 1,
        },
      ],
    };

    // Handle installment plans
    if (plan_type === "installment" && installment_plan_id) {
      const { data: installmentPlan } = await supabase
        .from("installment_plans")
        .select("*")
        .eq("id", installment_plan_id)
        .eq("is_active", true)
        .single();

      if (installmentPlan) {
        sessionParams.payment_intent_data = {
          metadata: {
            installment_plan_id: installment_plan_id,
            total_installments: String(installmentPlan.total_installments),
          },
        };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Create pending subscription record
    await supabase.from("subscriptions").insert({
      user_id: user.id,
      class_id: class_id,
      stripe_customer_id: customerId,
      plan_type: plan_type,
      installment_plan_id: installment_plan_id || null,
      status: "pending",
    });

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

### 3.3 Bestand: `supabase/functions/stripe-webhook/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      console.error("Stripe not configured");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing stripe signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const classId = session.metadata?.class_id;
        const planType = session.metadata?.plan_type;
        const discountCode = session.metadata?.discount_code;

        if (!userId || !classId) {
          console.error("Missing metadata in checkout session");
          break;
        }

        // Update subscription to active
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            stripe_subscription_id: session.subscription as string || null,
            current_period_start: new Date().toISOString(),
            current_period_end: planType === "subscription" 
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
              : null,
          })
          .eq("user_id", userId)
          .eq("class_id", classId)
          .eq("status", "pending");

        // Create class enrollment
        await supabase.from("class_enrollments").insert({
          class_id: classId,
          student_id: userId,
          status: "enrolled",
        });

        // Record payment
        await supabase.from("payments").insert({
          user_id: userId,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency?.toUpperCase() || "EUR",
          status: "succeeded",
          payment_method: "stripe",
          stripe_payment_intent_id: session.payment_intent as string || null,
        });

        // Update discount code usage
        if (discountCode) {
          await supabase.rpc("increment_discount_usage", { code: discountCode });
        }

        console.log(`Enrollment completed for user ${userId} in class ${classId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Update subscription period
          const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          // Record payment
          const customerId = invoice.customer as string;
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (subscription) {
            await supabase.from("payments").insert({
              user_id: subscription.user_id,
              amount: (invoice.amount_paid || 0) / 100,
              currency: invoice.currency?.toUpperCase() || "EUR",
              status: "succeeded",
              payment_method: "stripe",
              stripe_payment_intent_id: invoice.payment_intent as string || null,
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);

          // Log for admin notification
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("user_id, class_id")
            .eq("stripe_subscription_id", subscriptionId)
            .single();

          if (subscription) {
            await supabase.from("admin_activity_log").insert({
              admin_id: "00000000-0000-0000-0000-000000000000", // System
              action: "payment_failed",
              target_table: "subscriptions",
              target_id: subscription.user_id,
              details: {
                class_id: subscription.class_id,
                invoice_id: invoice.id,
                amount: invoice.amount_due / 100,
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status === "active" ? "active" :
                    subscription.status === "past_due" ? "past_due" :
                    subscription.status === "canceled" ? "canceled" :
                    subscription.status === "paused" ? "paused" : "pending",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 3.4 Bestand: `supabase/functions/manual-payment/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManualPaymentRequest {
  user_id: string;
  class_id: string;
  amount: number;
  currency?: string;
  payment_method: "cash" | "bank_transfer" | "manual";
  notes?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ManualPaymentRequest = await req.json();
    const { user_id, class_id, amount, currency = "EUR", payment_method, notes } = body;

    // Validate required fields
    if (!user_id || !class_id || !amount || !payment_method) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if class exists
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, name, max_students")
      .eq("id", class_id)
      .single();

    if (classError || !classData) {
      return new Response(
        JSON.stringify({ error: "Class not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check enrollment limit
    const { count: enrollmentCount } = await supabase
      .from("class_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("class_id", class_id)
      .eq("status", "enrolled");

    if (enrollmentCount && enrollmentCount >= (classData.max_students || 50)) {
      return new Response(
        JSON.stringify({ error: "Class is full" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or update subscription
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .eq("class_id", class_id)
      .maybeSingle();

    let subscriptionId: string;

    if (existingSub) {
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan_type: "one_time",
        })
        .eq("id", existingSub.id);
      subscriptionId = existingSub.id;
    } else {
      const { data: newSub } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user_id,
          class_id: class_id,
          status: "active",
          plan_type: "one_time",
        })
        .select("id")
        .single();
      subscriptionId = newSub!.id;
    }

    // Record payment
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user_id,
        subscription_id: subscriptionId,
        amount: amount,
        currency: currency.toUpperCase(),
        status: "succeeded",
        payment_method: payment_method,
        notes: notes || `Manual payment recorded by admin ${user.email}`,
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Create class enrollment
    const { data: existingEnrollment } = await supabase
      .from("class_enrollments")
      .select("id")
      .eq("class_id", class_id)
      .eq("student_id", user_id)
      .maybeSingle();

    if (!existingEnrollment) {
      await supabase.from("class_enrollments").insert({
        class_id: class_id,
        student_id: user_id,
        status: "enrolled",
      });
    } else {
      await supabase
        .from("class_enrollments")
        .update({ status: "enrolled" })
        .eq("id", existingEnrollment.id);
    }

    // Log admin activity
    await supabase.from("admin_activity_log").insert({
      admin_id: user.id,
      action: "manual_payment_recorded",
      target_table: "payments",
      target_id: payment.id,
      details: {
        student_id: user_id,
        class_id: class_id,
        amount: amount,
        currency: currency,
        payment_method: payment_method,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        subscription_id: subscriptionId,
        message: "Payment recorded and student enrolled successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Manual payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 3.5 Config.toml Update

**Bestand: `supabase/config.toml`** (toevoegen):
```toml
[functions.stripe-checkout]
verify_jwt = false

[functions.stripe-webhook]
verify_jwt = false

[functions.manual-payment]
verify_jwt = false
```

### 3.6 Helper Functie voor Discount Usage

**Database migratie toevoegen:**
```sql
-- Function to increment discount code usage
CREATE OR REPLACE FUNCTION public.increment_discount_usage(code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.discount_codes
    SET current_uses = current_uses + 1
    WHERE discount_codes.code = increment_discount_usage.code;
END;
$$;
```

---

## PUNT 4: Automatische Data-Retentie (GDPR)

### 4.1 Database Migratie

**Bestand: `supabase/migrations/XXXXXXXX_data_retention.sql`**

```sql
-- =============================================
-- DATA RETENTION TABLES AND FUNCTIONS (GDPR)
-- =============================================

-- Table to track data retention status
CREATE TABLE public.data_retention_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('marked_for_deletion', 'anonymized', 'deleted', 'retention_started')),
    retention_end_date TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table to store users marked for deletion
CREATE TABLE public.users_pending_deletion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    unenrolled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deletion_scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.data_retention_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_pending_deletion ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage these tables
CREATE POLICY "Admins only data retention log" ON public.data_retention_log
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins only users pending deletion" ON public.users_pending_deletion
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_users_pending_deletion_updated_at
    BEFORE UPDATE ON public.users_pending_deletion
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCTION: Mark user for deletion after unenrollment
-- =============================================
CREATE OR REPLACE FUNCTION public.mark_user_for_deletion(
    p_user_id UUID,
    p_unenrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_deletion_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate deletion date (12 months after unenrollment)
    v_deletion_date := p_unenrolled_at + INTERVAL '12 months';
    
    -- Check if user has any active enrollments
    IF EXISTS (
        SELECT 1 FROM public.class_enrollments
        WHERE student_id = p_user_id
        AND status = 'enrolled'
    ) THEN
        RAISE EXCEPTION 'User still has active enrollments';
    END IF;
    
    -- Insert or update pending deletion record
    INSERT INTO public.users_pending_deletion (
        user_id,
        unenrolled_at,
        deletion_scheduled_at,
        status
    )
    VALUES (
        p_user_id,
        p_unenrolled_at,
        v_deletion_date,
        'pending'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET unenrolled_at = p_unenrolled_at,
        deletion_scheduled_at = v_deletion_date,
        status = 'pending',
        updated_at = now();
    
    -- Log the action
    INSERT INTO public.data_retention_log (
        user_id,
        action,
        retention_end_date,
        details
    )
    VALUES (
        p_user_id,
        'marked_for_deletion',
        v_deletion_date,
        jsonb_build_object(
            'unenrolled_at', p_unenrolled_at,
            'scheduled_deletion', v_deletion_date
        )
    );
END;
$$;

-- =============================================
-- FUNCTION: Cancel deletion (if user re-enrolls)
-- =============================================
CREATE OR REPLACE FUNCTION public.cancel_user_deletion(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.users_pending_deletion
    SET status = 'cancelled',
        updated_at = now()
    WHERE user_id = p_user_id
    AND status = 'pending';
    
    -- Log the cancellation
    INSERT INTO public.data_retention_log (
        user_id,
        action,
        details
    )
    VALUES (
        p_user_id,
        'retention_started',
        jsonb_build_object('reason', 'User re-enrolled')
    );
END;
$$;

-- =============================================
-- FUNCTION: Anonymize user data
-- =============================================
CREATE OR REPLACE FUNCTION public.anonymize_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_anonymous_id TEXT;
BEGIN
    v_anonymous_id := 'ANON_' || substr(md5(random()::text), 1, 12);
    
    -- Anonymize profile
    UPDATE public.profiles
    SET 
        full_name = 'Geanonimiseerde Gebruiker',
        email = v_anonymous_id || '@deleted.local',
        phone = NULL,
        address = NULL,
        date_of_birth = NULL,
        avatar_url = NULL,
        study_level = NULL
    WHERE user_id = p_user_id;
    
    -- Anonymize forum posts (keep content for context but remove author identity)
    UPDATE public.forum_posts
    SET author_id = '00000000-0000-0000-0000-000000000000'
    WHERE author_id = p_user_id;
    
    UPDATE public.forum_comments
    SET author_id = '00000000-0000-0000-0000-000000000000'
    WHERE author_id = p_user_id;
    
    -- Delete chat messages (more privacy-sensitive)
    DELETE FROM public.chat_messages
    WHERE sender_id = p_user_id;
    
    DELETE FROM public.chat_reactions
    WHERE user_id = p_user_id;
    
    -- Delete personal events
    DELETE FROM public.events
    WHERE creator_id = p_user_id
    AND target_type = 'user';
    
    -- Keep student answers but anonymize
    UPDATE public.student_answers
    SET student_id = '00000000-0000-0000-0000-000000000000'
    WHERE student_id = p_user_id;
    
    -- Delete from student progress
    DELETE FROM public.student_progress
    WHERE student_id = p_user_id;
    
    -- Update pending deletion status
    UPDATE public.users_pending_deletion
    SET status = 'completed',
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Log the anonymization
    INSERT INTO public.data_retention_log (
        user_id,
        action,
        details
    )
    VALUES (
        p_user_id,
        'anonymized',
        jsonb_build_object('anonymized_at', now())
    );
END;
$$;

-- =============================================
-- FUNCTION: Process due deletions (called by cron)
-- =============================================
CREATE OR REPLACE FUNCTION public.process_data_retention()
RETURNS TABLE(
    processed_count INTEGER,
    admin_notifications JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_record RECORD;
    v_processed INTEGER := 0;
    v_notifications JSONB := '[]'::JSONB;
BEGIN
    -- Process users whose deletion date has passed
    FOR v_user_record IN
        SELECT upd.user_id, upd.deletion_scheduled_at, p.email, p.full_name
        FROM public.users_pending_deletion upd
        LEFT JOIN public.profiles p ON p.user_id = upd.user_id
        WHERE upd.status = 'pending'
        AND upd.deletion_scheduled_at <= now()
    LOOP
        -- Mark as processing
        UPDATE public.users_pending_deletion
        SET status = 'processing'
        WHERE user_id = v_user_record.user_id;
        
        -- Anonymize the user
        PERFORM public.anonymize_user_data(v_user_record.user_id);
        
        v_processed := v_processed + 1;
        
        -- Add to notifications
        v_notifications := v_notifications || jsonb_build_object(
            'user_id', v_user_record.user_id,
            'original_email', v_user_record.email,
            'original_name', v_user_record.full_name,
            'processed_at', now()
        );
    END LOOP;
    
    -- Log admin notification if any users were processed
    IF v_processed > 0 THEN
        INSERT INTO public.admin_activity_log (
            admin_id,
            action,
            target_table,
            details
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000', -- System
            'data_retention_processed',
            'users_pending_deletion',
            jsonb_build_object(
                'processed_count', v_processed,
                'users', v_notifications
            )
        );
    END IF;
    
    RETURN QUERY SELECT v_processed, v_notifications;
END;
$$;

-- =============================================
-- FUNCTION: Get upcoming deletions (for admin dashboard)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_upcoming_deletions(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    unenrolled_at TIMESTAMP WITH TIME ZONE,
    deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
    days_until_deletion INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        upd.user_id,
        p.full_name,
        p.email,
        upd.unenrolled_at,
        upd.deletion_scheduled_at,
        EXTRACT(DAY FROM upd.deletion_scheduled_at - now())::INTEGER as days_until_deletion
    FROM public.users_pending_deletion upd
    JOIN public.profiles p ON p.user_id = upd.user_id
    WHERE upd.status = 'pending'
    AND upd.deletion_scheduled_at <= now() + (days_ahead || ' days')::INTERVAL
    ORDER BY upd.deletion_scheduled_at ASC;
$$;

-- =============================================
-- TRIGGER: Auto-mark for deletion on unenrollment
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_unenrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- When status changes from 'enrolled' to something else
    IF OLD.status = 'enrolled' AND NEW.status != 'enrolled' THEN
        -- Check if user has any other active enrollments
        IF NOT EXISTS (
            SELECT 1 FROM public.class_enrollments
            WHERE student_id = NEW.student_id
            AND status = 'enrolled'
            AND id != NEW.id
        ) THEN
            -- Mark user for deletion after 12 months
            PERFORM public.mark_user_for_deletion(NEW.student_id, now());
        END IF;
    END IF;
    
    -- When user re-enrolls, cancel pending deletion
    IF OLD.status != 'enrolled' AND NEW.status = 'enrolled' THEN
        PERFORM public.cancel_user_deletion(NEW.student_id);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_enrollment_status_change
    AFTER UPDATE OF status ON public.class_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_unenrollment();
```

### 4.2 Cron Job voor Automatische Verwerking

**SQL voor pg_cron (uitvoeren via admin):**
```sql
-- Enable pg_cron and pg_net extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily retention check at 3:00 AM
SELECT cron.schedule(
    'daily-data-retention',
    '0 3 * * *',
    $$SELECT public.process_data_retention();$$
);

-- Schedule weekly admin notification about upcoming deletions
SELECT cron.schedule(
    'weekly-deletion-notice',
    '0 9 * * 1', -- Every Monday at 9:00 AM
    $$
    INSERT INTO public.admin_activity_log (
        admin_id,
        action,
        target_table,
        details
    )
    SELECT 
        '00000000-0000-0000-0000-000000000000',
        'upcoming_deletions_report',
        'users_pending_deletion',
        jsonb_build_object(
            'upcoming_deletions', (
                SELECT json_agg(row_to_json(t))
                FROM public.get_upcoming_deletions(30) t
            ),
            'report_date', now()
        )
    WHERE EXISTS (SELECT 1 FROM public.get_upcoming_deletions(30));
    $$
);
```

---

## PUNT 5: Email Notificaties

### 5.1 Edge Function: `send-email`

**Bestand: `supabase/functions/send-email/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailType = 
  | "welcome"
  | "email_verification"
  | "password_reset"
  | "lesson_reminder"
  | "submission_feedback"
  | "enrollment_confirmation"
  | "payment_confirmation"
  | "payment_failed";

interface EmailRequest {
  type: EmailType;
  to: string;
  data: Record<string, any>;
  language?: "nl" | "en" | "ar";
}

const EMAIL_TEMPLATES: Record<EmailType, Record<string, { subject: string; html: (data: any) => string }>> = {
  welcome: {
    nl: {
      subject: "Welkom bij Huis van het Arabisch!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Welkom ${data.name}!</h2>
            <p>Bedankt voor je registratie bij Huis van het Arabisch. We zijn blij dat je deel uitmaakt van onze leergemeinenschap.</p>
            <p>Je kunt nu inloggen en beginnen met het verkennen van onze cursussen.</p>
            <a href="${data.loginUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Ga naar het platform
            </a>
            <p style="color: #666; font-size: 14px;">Met vriendelijke groet,<br>Het Huis van het Arabisch Team</p>
          </div>
        </div>
      `,
    },
    en: {
      subject: "Welcome to House of Arabic!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Welcome ${data.name}!</h2>
            <p>Thank you for registering at House of Arabic. We're excited to have you join our learning community.</p>
            <p>You can now log in and start exploring our courses.</p>
            <a href="${data.loginUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Go to Platform
            </a>
            <p style="color: #666; font-size: 14px;">Best regards,<br>The House of Arabic Team</p>
          </div>
        </div>
      `,
    },
    ar: {
      subject: "مرحباً بك في بيت العربية!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>مرحباً ${data.name}!</h2>
            <p>شكراً لتسجيلك في بيت العربية. نحن سعداء بانضمامك إلى مجتمعنا التعليمي.</p>
            <p>يمكنك الآن تسجيل الدخول والبدء في استكشاف دوراتنا.</p>
            <a href="${data.loginUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              انتقل إلى المنصة
            </a>
            <p style="color: #666; font-size: 14px;">مع أطيب التحيات،<br>فريق بيت العربية</p>
          </div>
        </div>
      `,
    },
  },
  password_reset: {
    nl: {
      subject: "Wachtwoord resetten - Huis van het Arabisch",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Wachtwoord resetten</h2>
            <p>Je hebt verzocht om je wachtwoord te resetten. Klik op de onderstaande knop om een nieuw wachtwoord in te stellen:</p>
            <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Reset Wachtwoord
            </a>
            <p style="color: #666; font-size: 14px;">Deze link is 1 uur geldig. Als je dit niet hebt aangevraagd, kun je deze email negeren.</p>
          </div>
        </div>
      `,
    },
    en: {
      subject: "Reset Password - House of Arabic",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Reset Password</h2>
            <p>You requested to reset your password. Click the button below to set a new password:</p>
            <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Reset Password
            </a>
            <p style="color: #666; font-size: 14px;">This link is valid for 1 hour. If you didn't request this, you can ignore this email.</p>
          </div>
        </div>
      `,
    },
    ar: {
      subject: "إعادة تعيين كلمة المرور - بيت العربية",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>إعادة تعيين كلمة المرور</h2>
            <p>لقد طلبت إعادة تعيين كلمة المرور. انقر على الزر أدناه لتعيين كلمة مرور جديدة:</p>
            <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              إعادة تعيين كلمة المرور
            </a>
            <p style="color: #666; font-size: 14px;">هذا الرابط صالح لمدة ساعة واحدة. إذا لم تطلب هذا، يمكنك تجاهل هذا البريد الإلكتروني.</p>
          </div>
        </div>
      `,
    },
  },
  lesson_reminder: {
    nl: {
      subject: "Herinnering: Les begint binnenkort!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📚 Lesherinnering</h2>
            <p>Je les <strong>${data.lessonTitle}</strong> begint over ${data.minutesBefore} minuten!</p>
            <p><strong>Tijd:</strong> ${data.scheduledTime}</p>
            <p><strong>Klas:</strong> ${data.className}</p>
            ${data.meetLink ? `
              <a href="${data.meetLink}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Neem deel aan de les
              </a>
            ` : ''}
          </div>
        </div>
      `,
    },
    en: {
      subject: "Reminder: Lesson starting soon!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📚 Lesson Reminder</h2>
            <p>Your lesson <strong>${data.lessonTitle}</strong> starts in ${data.minutesBefore} minutes!</p>
            <p><strong>Time:</strong> ${data.scheduledTime}</p>
            <p><strong>Class:</strong> ${data.className}</p>
            ${data.meetLink ? `
              <a href="${data.meetLink}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Join Lesson
              </a>
            ` : ''}
          </div>
        </div>
      `,
    },
    ar: {
      subject: "تذكير: الدرس يبدأ قريباً!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📚 تذكير بالدرس</h2>
            <p>درسك <strong>${data.lessonTitle}</strong> يبدأ خلال ${data.minutesBefore} دقيقة!</p>
            <p><strong>الوقت:</strong> ${data.scheduledTime}</p>
            <p><strong>الفصل:</strong> ${data.className}</p>
            ${data.meetLink ? `
              <a href="${data.meetLink}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                انضم للدرس
              </a>
            ` : ''}
          </div>
        </div>
      `,
    },
  },
  submission_feedback: {
    nl: {
      subject: "Je inzending is beoordeeld!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Huis van het Arabisch</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📝 Feedback ontvangen</h2>
            <p>Je inzending voor <strong>${data.exerciseTitle}</strong> is beoordeeld door je docent.</p>
            <p><strong>Score:</strong> ${data.score}%</p>
            ${data.feedback ? `<p><strong>Feedback:</strong> ${data.feedback}</p>` : ''}
            <a href="${data.reviewUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Bekijk details
            </a>
          </div>
        </div>
      `,
    },
    en: {
      subject: "Your submission has been reviewed!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">House of Arabic</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📝 Feedback Received</h2>
            <p>Your submission for <strong>${data.exerciseTitle}</strong> has been reviewed by your teacher.</p>
            <p><strong>Score:</strong> ${data.score}%</p>
            ${data.feedback ? `<p><strong>Feedback:</strong> ${data.feedback}</p>` : ''}
            <a href="${data.reviewUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              View Details
            </a>
          </div>
        </div>
      `,
    },
    ar: {
      subject: "تم مراجعة إجابتك!",
      html: (data) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <div style="background: linear-gradient(135deg, #3d8c6e, #3db8a0); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">بيت العربية</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>📝 تم استلام التعليقات</h2>
            <p>تمت مراجعة إجابتك لـ <strong>${data.exerciseTitle}</strong> من قبل معلمك.</p>
            <p><strong>الدرجة:</strong> ${data.score}%</p>
            ${data.feedback ? `<p><strong>التعليقات:</strong> ${data.feedback}</p>` : ''}
            <a href="${data.reviewUrl}" style="display: inline-block; padding: 12px 24px; background: #3d8c6e; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              عرض التفاصيل
            </a>
          </div>
        </div>
      `,
    },
  },
  // Additional email types would follow the same pattern...
  email_verification: {
    nl: { subject: "Bevestig je e-mailadres", html: (data) => `Verification email for ${data.email}` },
    en: { subject: "Verify your email address", html: (data) => `Verification email for ${data.email}` },
    ar: { subject: "تأكيد بريدك الإلكتروني", html: (data) => `Verification email for ${data.email}` },
  },
  enrollment_confirmation: {
    nl: { subject: "Inschrijving bevestigd!", html: (data) => `Enrollment confirmed for ${data.className}` },
    en: { subject: "Enrollment confirmed!", html: (data) => `Enrollment confirmed for ${data.className}` },
    ar: { subject: "تم تأكيد التسجيل!", html: (data) => `Enrollment confirmed for ${data.className}` },
  },
  payment_confirmation: {
    nl: { subject: "Betaling ontvangen", html: (data) => `Payment of €${data.amount} confirmed` },
    en: { subject: "Payment received", html: (data) => `Payment of €${data.amount} confirmed` },
    ar: { subject: "تم استلام الدفعة", html: (data) => `Payment of €${data.amount} confirmed` },
  },
  payment_failed: {
    nl: { subject: "Betaling mislukt", html: (data) => `Payment failed for ${data.className}` },
    en: { subject: "Payment failed", html: (data) => `Payment failed for ${data.className}` },
    ar: { subject: "فشل الدفع", html: (data) => `Payment failed for ${data.className}` },
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Email service not configured",
          email_configured: false 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const body: EmailRequest = await req.json();
    const { type, to, data, language = "nl" } = body;

    // Validate required fields
    if (!type || !to || !data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, to, data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get template
    const template = EMAIL_TEMPLATES[type]?.[language];
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Unknown email type or language: ${type}/${language}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email
    const fromDomain = Deno.env.get("EMAIL_FROM_DOMAIN") || "noreply@huisvanhetarabisch.be";
    
    const emailResponse = await resend.emails.send({
      from: `Huis van het Arabisch <${fromDomain}>`,
      to: [to],
      subject: template.subject,
      html: template.html(data),
    });

    console.log(`Email sent successfully: ${type} to ${to}`, emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        message_id: emailResponse.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email sending error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 5.2 Config.toml Update

```toml
[functions.send-email]
verify_jwt = false
```

### 5.3 Benodigde Secret

De `RESEND_API_KEY` moet worden toegevoegd via de Lovable secrets interface.

---

## Implementatievolgorde

1. **Database migraties** (alle punten)
2. **Edge functions deployen** (punten 3 en 5)
3. **Frontend updates** (punten 1 en 2)
4. **Cron jobs configureren** (punt 4)
5. **Secrets toevoegen** (RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
6. **Testen en valideren**

---

## Voltooiingsrapport (Na Implementatie)

| Punt | Onderdeel | Voltooiing % |
|------|-----------|--------------|
| 1 | Registratieformulier Uitbreiden | 0% (Database klaar, frontend ontbreekt) |
| 2 | Kalendermodule (Events) | 0% (Niet geïmplementeerd) |
| 3 | Stripe Edge Functions | 0% (Geen edge functions aanwezig) |
| 4 | Automatische Data-Retentie | 0% (Geen retentie-logica) |
| 5 | Email Notificaties | 0% (Geen email edge function) |

**Totale MVP-gereedheid Prioriteit 1: 0%**

Na implementatie van dit plan zal elk punt op 100% staan.

