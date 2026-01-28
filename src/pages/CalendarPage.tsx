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
  Trash2,
  Clock,
  MapPin
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

const weekDays = {
  nl: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ar: ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'],
};

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
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
  const currentWeekDays = weekDays[i18n.language as keyof typeof weekDays] || weekDays.en;

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
    mutationFn: async (eventData: typeof formData) => {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: eventData.title,
          description: eventData.description || null,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          all_day: eventData.all_day,
          event_type: eventData.event_type,
          location: eventData.location || null,
          notes: eventData.notes || null,
          creator_id: user?.id,
          target_type: 'user' as const,
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
      setSelectedEvent(null);
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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                  <Label>{t('calendar.eventDescription')}</Label>
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

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-3">
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
                {currentWeekDays.map((day) => (
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
                            className="text-xs p-1 rounded truncate cursor-pointer"
                            style={{ 
                              backgroundColor: `${event.color}20`, 
                              color: event.color,
                              borderLeft: `3px solid ${event.color}`
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
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

          {/* Event details sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedEvent ? selectedEvent.title : t('calendar.noEvents')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEvent ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(parseISO(selectedEvent.start_time), 'PPp', { locale })}
                    </span>
                  </div>
                  
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  
                  {selectedEvent.description && (
                    <p className="text-sm">{selectedEvent.description}</p>
                  )}
                  
                  <div 
                    className="inline-block px-2 py-1 rounded text-xs"
                    style={{ 
                      backgroundColor: `${selectedEvent.color}20`, 
                      color: selectedEvent.color 
                    }}
                  >
                    {t(`calendar.types.${selectedEvent.event_type}`)}
                  </div>
                  
                  {selectedEvent.creator_id === user?.id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteEventMutation.mutate(selectedEvent.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              ) : (
              <p className="text-sm text-muted-foreground">
                {t('calendar.selectEvent')}
              </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
