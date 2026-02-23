import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiInvoke } from '@/lib/supabase-api';
import { useAuth } from '@/contexts/AuthContext';

interface Ticket {
  id: string;
  ticket_number: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  first_response_at: string | null;
  user?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  assigned?: {
    full_name: string;
    avatar_url: string | null;
  };
  labels?: Array<{
    label: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface TicketResponse {
  id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  user: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface TicketWithResponses extends Ticket {
  responses: TicketResponse[];
}

interface CreateTicketData {
  category: string;
  priority?: string;
  subject: string;
  description: string;
}

export function useHelpdesk() {
  const { user, isAdmin, isTeacher } = useAuth();
  const queryClient = useQueryClient();
  const isStaff = isAdmin || isTeacher;

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['helpdesk', 'tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiInvoke<{ tickets: Ticket[] }>('helpdesk', {
        action: 'get_tickets',
      });
      return response.tickets || [];
    },
    enabled: !!user,
  });

  const { data: labels = [], isLoading: loadingLabels } = useQuery({
    queryKey: ['helpdesk', 'labels'],
    queryFn: async () => {
      // For labels we can use apiQuery if it was a table, but here it seems tickets/labels are handled via function or table?
      // The original code used supabase.from('ticket_labels')... so let's stick to apiQuery if possible, 
      // but apiQuery wrapper I wrote takes a table string.
      // Wait, original code: supabase.from('ticket_labels').select('*').order('name')
      // Let's use apiInvoke if we want consistency or apiQuery. 
      // Let's use apiQuery for direct table access as per 6.1 description for "apiQuery"
      // But wait, I need to import apiQuery.
      const { apiQuery } = await import('@/lib/supabase-api');
      return apiQuery<Array<{ id: string; name: string; color: string }>>('ticket_labels', (q) => 
        q.select('*').order('name')
      );
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: CreateTicketData) => {
      const response = await apiInvoke<{ ticket: Ticket }>('helpdesk', {
        action: 'create_ticket',
        ...ticketData,
      });
      return response.ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'tickets'] });
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, updates }: { ticketId: string, updates: { status?: string; priority?: string; assignedTo?: string } }) => {
      const response = await apiInvoke<{ success: boolean }>('helpdesk', {
        action: 'update_ticket',
        ticketId,
        ...updates,
      });
      return response.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'tickets'] });
    },
  });

  const addResponseMutation = useMutation({
    mutationFn: async ({ ticketId, content, isInternal }: { ticketId: string, content: string, isInternal: boolean }) => {
      const response = await apiInvoke<{ success: boolean }>('helpdesk', {
        action: 'add_response',
        ticketId,
        content,
        isInternal,
      });
      return response.success;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific ticket details if we had a query for that
      // For now just general tickets might be enough or if we have a detail view
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'tickets'] });
    },
  });

  const getTicketDetails = useCallback(async (ticketId: string): Promise<TicketWithResponses | null> => {
    try {
      const response = await apiInvoke<{ ticket: TicketWithResponses }>('helpdesk', {
        action: 'get_ticket_details',
        ticketId,
      });
      return response.ticket;
    } catch (error) {
      console.error('Error getting ticket details:', error);
      return null;
    }
  }, []);

  const createTicket = (data: CreateTicketData) => createTicketMutation.mutateAsync(data);
  const updateTicket = (ticketId: string, updates: any) => updateTicketMutation.mutateAsync({ ticketId, updates });
  const addResponse = (ticketId: string, content: string, isInternal: boolean = false) => addResponseMutation.mutateAsync({ ticketId, content, isInternal });

  const fetchTickets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['helpdesk', 'tickets'] });
  }, [queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'waiting_response':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'resolved':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'closed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return {
    tickets,
    labels,
    loading: loadingTickets || loadingLabels,
    isStaff,
    createTicket,
    getTicketDetails,
    updateTicket,
    addResponse,
    fetchTickets, // Kept for compatibility but effectively refetches via invalidation
    getStatusColor,
    getPriorityColor,
  };
}
