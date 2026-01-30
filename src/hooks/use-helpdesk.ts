import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState<Array<{ id: string; name: string; color: string }>>([]);

  const isStaff = isAdmin || isTeacher;

  const fetchTickets = useCallback(async (filters?: {
    status?: string;
    assignedToMe?: boolean;
  }) => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('helpdesk', {
        body: {
          action: 'get_tickets',
          ...filters,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.data?.tickets) {
        setTickets(response.data.tickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchLabels = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('ticket_labels')
        .select('*')
        .order('name');
      
      setLabels(data || []);
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchLabels();
  }, [fetchTickets, fetchLabels]);

  const createTicket = async (ticketData: CreateTicketData): Promise<Ticket | null> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('helpdesk', {
        body: {
          action: 'create_ticket',
          ...ticketData,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.data?.ticket) {
        await fetchTickets();
        return response.data.ticket;
      }
      return null;
    } catch (error) {
      console.error('Error creating ticket:', error);
      return null;
    }
  };

  const getTicketDetails = async (ticketId: string): Promise<TicketWithResponses | null> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('helpdesk', {
        body: {
          action: 'get_ticket_details',
          ticketId,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      return response.data?.ticket || null;
    } catch (error) {
      console.error('Error getting ticket details:', error);
      return null;
    }
  };

  const updateTicket = async (
    ticketId: string,
    updates: { status?: string; priority?: string; assignedTo?: string }
  ): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('helpdesk', {
        body: {
          action: 'update_ticket',
          ticketId,
          ...updates,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.data?.success) {
        await fetchTickets();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating ticket:', error);
      return false;
    }
  };

  const addResponse = async (
    ticketId: string,
    content: string,
    isInternal: boolean = false
  ): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('helpdesk', {
        body: {
          action: 'add_response',
          ticketId,
          content,
          isInternal,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      return response.data?.success || false;
    } catch (error) {
      console.error('Error adding response:', error);
      return false;
    }
  };

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
    loading,
    isStaff,
    createTicket,
    getTicketDetails,
    updateTicket,
    addResponse,
    fetchTickets,
    getStatusColor,
    getPriorityColor,
  };
}
