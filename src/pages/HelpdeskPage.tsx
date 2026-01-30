import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHelpdesk } from '@/hooks/use-helpdesk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, MessageSquare, Clock, User, AlertCircle, 
  CheckCircle, Send, Eye, Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { nl, enUS, ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, React.ElementType> = {
  technical: AlertCircle,
  billing: AlertCircle,
  content: MessageSquare,
  account: User,
  feedback: MessageSquare,
  other: MessageSquare,
};

export function HelpdeskPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { 
    tickets, 
    loading, 
    isStaff,
    createTicket, 
    getTicketDetails,
    updateTicket,
    addResponse,
    fetchTickets,
    getStatusColor, 
    getPriorityColor 
  } = useHelpdesk();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [newResponse, setNewResponse] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    priority: 'medium',
    subject: '',
    description: '',
  });

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'ar': return ar;
      case 'en': return enUS;
      default: return nl;
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    setSelectedTicket(ticketId);
    const details = await getTicketDetails(ticketId);
    setTicketDetails(details);
  };

  const handleCreateTicket = async () => {
    if (!formData.category || !formData.subject || !formData.description) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('helpdesk.fillAllFields'),
      });
      return;
    }

    setSubmitting(true);
    const ticket = await createTicket(formData);
    setSubmitting(false);

    if (ticket) {
      toast({
        title: t('helpdesk.ticketCreated'),
        description: t('helpdesk.ticketNumber', { number: ticket.ticket_number }),
      });
      setShowCreateDialog(false);
      setFormData({ category: '', priority: 'medium', subject: '', description: '' });
    } else {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('helpdesk.createError'),
      });
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return;

    setSubmitting(true);
    const success = await addResponse(selectedTicket, newResponse, isInternal);
    setSubmitting(false);

    if (success) {
      setNewResponse('');
      await loadTicketDetails(selectedTicket);
    } else {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('helpdesk.responseError'),
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    await updateTicket(selectedTicket, { status: newStatus });
    await loadTicketDetails(selectedTicket);
  };

  const filteredTickets = statusFilter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === statusFilter);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('helpdesk.title')}</h1>
          <p className="text-muted-foreground">{t('helpdesk.description')}</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('helpdesk.newTicket')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('helpdesk.createTicket')}</DialogTitle>
              <DialogDescription>{t('helpdesk.createDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('helpdesk.category')}</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('helpdesk.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">{t('helpdesk.categories.technical')}</SelectItem>
                    <SelectItem value="billing">{t('helpdesk.categories.billing')}</SelectItem>
                    <SelectItem value="content">{t('helpdesk.categories.content')}</SelectItem>
                    <SelectItem value="account">{t('helpdesk.categories.account')}</SelectItem>
                    <SelectItem value="feedback">{t('helpdesk.categories.feedback')}</SelectItem>
                    <SelectItem value="other">{t('helpdesk.categories.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('helpdesk.priority')}</label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('helpdesk.priorities.low')}</SelectItem>
                    <SelectItem value="medium">{t('helpdesk.priorities.medium')}</SelectItem>
                    <SelectItem value="high">{t('helpdesk.priorities.high')}</SelectItem>
                    <SelectItem value="urgent">{t('helpdesk.priorities.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('helpdesk.subject')}</label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={t('helpdesk.subjectPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('helpdesk.descriptionLabel')}</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('helpdesk.descriptionPlaceholder')}
                  rows={4}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateTicket} disabled={submitting}>
                {submitting ? t('common.loading') : t('helpdesk.submit')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tickets List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('helpdesk.tickets')}</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('helpdesk.allStatuses')}</SelectItem>
                  <SelectItem value="open">{t('helpdesk.statuses.open')}</SelectItem>
                  <SelectItem value="in_progress">{t('helpdesk.statuses.inProgress')}</SelectItem>
                  <SelectItem value="waiting_response">{t('helpdesk.statuses.waitingResponse')}</SelectItem>
                  <SelectItem value="resolved">{t('helpdesk.statuses.resolved')}</SelectItem>
                  <SelectItem value="closed">{t('helpdesk.statuses.closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse h-20 bg-muted rounded-lg" />
                  ))}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {t('helpdesk.noTickets')}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTickets.map((ticket) => {
                    const CategoryIcon = categoryIcons[ticket.category] || MessageSquare;
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => loadTicketDetails(ticket.id)}
                        className={cn(
                          "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedTicket === ticket.id && "bg-muted"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <CategoryIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                {ticket.ticket_number}
                              </span>
                              <Badge className={cn("text-xs", getStatusColor(ticket.status))}>
                                {t(`helpdesk.statuses.${ticket.status.replace('_', '')}`)}
                              </Badge>
                            </div>
                            <p className="font-medium truncate">{ticket.subject}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn("text-xs", getPriorityColor(ticket.priority))}>
                                {t(`helpdesk.priorities.${ticket.priority}`)}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(ticket.created_at), 'PP', { locale: getDateLocale() })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Ticket Details */}
        <Card className="lg:col-span-2">
          {ticketDetails ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">
                        {ticketDetails.ticket_number}
                      </span>
                      <Badge className={cn(getStatusColor(ticketDetails.status))}>
                        {t(`helpdesk.statuses.${ticketDetails.status.replace('_', '')}`)}
                      </Badge>
                      <Badge variant="outline" className={cn(getPriorityColor(ticketDetails.priority))}>
                        {t(`helpdesk.priorities.${ticketDetails.priority}`)}
                      </Badge>
                    </div>
                    <CardTitle>{ticketDetails.subject}</CardTitle>
                    <CardDescription className="mt-2">
                      {t('helpdesk.createdBy')} {ticketDetails.user?.full_name} • {format(new Date(ticketDetails.created_at), 'PPp', { locale: getDateLocale() })}
                    </CardDescription>
                  </div>
                  {isStaff && (
                    <Select value={ticketDetails.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t('helpdesk.statuses.open')}</SelectItem>
                        <SelectItem value="in_progress">{t('helpdesk.statuses.inProgress')}</SelectItem>
                        <SelectItem value="waiting_response">{t('helpdesk.statuses.waitingResponse')}</SelectItem>
                        <SelectItem value="resolved">{t('helpdesk.statuses.resolved')}</SelectItem>
                        <SelectItem value="closed">{t('helpdesk.statuses.closed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Original description */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap">{ticketDetails.description}</p>
                </div>

                <Separator />

                {/* Responses */}
                <ScrollArea className="h-[250px]">
                  <div className="space-y-4">
                    {ticketDetails.responses?.map((response: any) => (
                      <div 
                        key={response.id} 
                        className={cn(
                          "flex gap-3",
                          response.is_internal && "opacity-75"
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={response.user?.avatar_url} />
                          <AvatarFallback>
                            {response.user?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {response.user?.full_name}
                            </span>
                            {response.is_internal && (
                              <Badge variant="outline" className="text-xs">
                                {t('helpdesk.internal')}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(response.created_at), 'PPp', { locale: getDateLocale() })}
                            </span>
                          </div>
                          <div className={cn(
                            "p-3 rounded-lg",
                            response.is_internal ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-muted"
                          )}>
                            <p className="whitespace-pre-wrap text-sm">{response.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator />

                {/* Reply form */}
                <div className="space-y-3">
                  <Textarea
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    placeholder={t('helpdesk.replyPlaceholder')}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    {isStaff && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded"
                        />
                        {t('helpdesk.internalNote')}
                      </label>
                    )}
                    <Button 
                      onClick={handleSendResponse} 
                      disabled={!newResponse.trim() || submitting}
                      className="ml-auto"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {submitting ? t('common.loading') : t('helpdesk.sendReply')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              <div className="text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('helpdesk.selectTicket')}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default HelpdeskPage;
