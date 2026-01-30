import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTicketRequest {
  action: "create_ticket";
  category: string;
  priority?: string;
  subject: string;
  description: string;
}

interface UpdateTicketRequest {
  action: "update_ticket";
  ticketId: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
}

interface AddResponseRequest {
  action: "add_response";
  ticketId: string;
  content: string;
  isInternal?: boolean;
}

interface GetTicketsRequest {
  action: "get_tickets";
  status?: string;
  assignedToMe?: boolean;
  limit?: number;
  offset?: number;
}

interface GetTicketDetailsRequest {
  action: "get_ticket_details";
  ticketId: string;
}

type HelpdeskRequest = CreateTicketRequest | UpdateTicketRequest | AddResponseRequest | GetTicketsRequest | GetTicketDetailsRequest;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isStaff = roleData?.role === "admin" || roleData?.role === "teacher";

    const body: HelpdeskRequest = await req.json();

    switch (body.action) {
      case "create_ticket": {
        const { data: ticket, error } = await supabase
          .from("support_tickets")
          .insert({
            user_id: user.id,
            category: body.category,
            priority: body.priority || "medium",
            subject: body.subject,
            description: body.description,
          })
          .select()
          .single();

        if (error) throw error;

        // Send notification email to admin
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              type: "ticket_created",
              to: "support@huisvanhetarabisch.nl",
              data: {
                ticketNumber: ticket.ticket_number,
                subject: ticket.subject,
                category: ticket.category,
                priority: ticket.priority,
              },
              language: "nl",
            }),
          });
        } catch (emailError) {
          console.error("Failed to send ticket notification:", emailError);
        }

        return new Response(
          JSON.stringify({ success: true, ticket }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_ticket": {
        if (!isStaff) {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updates: Record<string, any> = {};
        if (body.status) {
          updates.status = body.status;
          if (body.status === "resolved") {
            updates.resolved_at = new Date().toISOString();
          }
        }
        if (body.priority) updates.priority = body.priority;
        if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo;

        const { data: ticket, error } = await supabase
          .from("support_tickets")
          .update(updates)
          .eq("id", body.ticketId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, ticket }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "add_response": {
        // Get ticket to verify access
        const { data: ticket } = await supabase
          .from("support_tickets")
          .select("user_id, status")
          .eq("id", body.ticketId)
          .single();

        if (!ticket) {
          return new Response(
            JSON.stringify({ error: "Ticket not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check access
        if (!isStaff && ticket.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Only staff can add internal notes
        if (body.isInternal && !isStaff) {
          return new Response(
            JSON.stringify({ error: "Only staff can add internal notes" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: response, error } = await supabase
          .from("ticket_responses")
          .insert({
            ticket_id: body.ticketId,
            user_id: user.id,
            content: body.content,
            is_internal: body.isInternal || false,
          })
          .select()
          .single();

        if (error) throw error;

        // Update ticket status
        const newStatus = isStaff ? "waiting_response" : "in_progress";
        await supabase
          .from("support_tickets")
          .update({ 
            status: newStatus,
            first_response_at: ticket.status === "open" && isStaff 
              ? new Date().toISOString() 
              : undefined,
          })
          .eq("id", body.ticketId);

        // Send notification to the other party
        if (!body.isInternal) {
          const { data: ticketDetails } = await supabase
            .from("support_tickets")
            .select("user_id, ticket_number, subject")
            .eq("id", body.ticketId)
            .single();

          if (ticketDetails) {
            const notifyUserId = isStaff ? ticketDetails.user_id : null;
            
            if (notifyUserId || !isStaff) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("email, preferred_language")
                .eq("user_id", notifyUserId || ticketDetails.user_id)
                .single();

              if (profile) {
                try {
                  await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                      type: "ticket_response",
                      to: profile.email,
                      data: {
                        ticketNumber: ticketDetails.ticket_number,
                        subject: ticketDetails.subject,
                      },
                      language: profile.preferred_language || "nl",
                    }),
                  });
                } catch (emailError) {
                  console.error("Failed to send response notification:", emailError);
                }
              }
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, response }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_tickets": {
        let query = supabase
          .from("support_tickets")
          .select(`
            *,
            user:profiles!support_tickets_user_id_fkey (full_name, email, avatar_url),
            assigned:profiles!support_tickets_assigned_to_fkey (full_name, avatar_url),
            labels:ticket_label_assignments (
              label:ticket_labels (*)
            )
          `)
          .order("created_at", { ascending: false });

        // Non-staff can only see their own tickets
        if (!isStaff) {
          query = query.eq("user_id", user.id);
        }

        if (body.status) {
          query = query.eq("status", body.status);
        }

        if (body.assignedToMe && isStaff) {
          query = query.eq("assigned_to", user.id);
        }

        if (body.limit) {
          query = query.limit(body.limit);
        }

        if (body.offset) {
          query = query.range(body.offset, body.offset + (body.limit || 10) - 1);
        }

        const { data: tickets, error, count } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, tickets, count }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_ticket_details": {
        const { data: ticket, error } = await supabase
          .from("support_tickets")
          .select(`
            *,
            user:profiles!support_tickets_user_id_fkey (full_name, email, avatar_url),
            assigned:profiles!support_tickets_assigned_to_fkey (full_name, avatar_url),
            labels:ticket_label_assignments (
              label:ticket_labels (*)
            ),
            responses:ticket_responses (
              *,
              user:profiles!ticket_responses_user_id_fkey (full_name, avatar_url)
            )
          `)
          .eq("id", body.ticketId)
          .single();

        if (error) throw error;

        // Check access
        if (!isStaff && ticket.user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Filter internal notes for non-staff
        if (!isStaff && ticket.responses) {
          ticket.responses = ticket.responses.filter((r: any) => !r.is_internal);
        }

        return new Response(
          JSON.stringify({ success: true, ticket }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Helpdesk error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
