import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Copy, Trash2, Loader2, Mail, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function AdminInvitationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "teacher">("admin");

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error } = await supabase.from("admin_invitations").insert({
        email,
        role,
        invited_by: user!.id,
        token,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;

      return token;
    },
    onSuccess: (token) => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      setShowInviteDialog(false);
      setEmail("");

      const inviteUrl = `${window.location.origin}/register?invite=${token}`;
      navigator.clipboard.writeText(inviteUrl);

      toast({
        title: t("admin.invitationCreated", "Invitation Created"),
        description: t("admin.invitationCopied", "The invitation link has been copied to your clipboard."),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.invitationError", "Failed to create invitation."),
      });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      toast({
        title: t("admin.invitationDeleted", "Invitation Deleted"),
      });
    },
  });

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: t("common.copied", "Copied!"),
      description: t("admin.linkCopied", "Invitation link copied to clipboard."),
    });
  };

  const getStatusBadge = (invitation: any) => {
    if (invitation.accepted_at) {
      return <Badge className="bg-green-500">{t("admin.accepted", "Accepted")}</Badge>;
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return <Badge variant="destructive">{t("admin.expired", "Expired")}</Badge>;
    }
    return <Badge variant="outline">{t("admin.pending", "Pending")}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("admin.adminInvitations", "Admin Invitations")}</h1>
          <p className="text-muted-foreground">
            {t("admin.adminInvitationsDescription", "Invite new administrators and teachers to the platform")}
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("admin.inviteUser", "Invite User")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.email", "Email")}</TableHead>
                <TableHead>{t("admin.role", "Role")}</TableHead>
                <TableHead>{t("admin.status", "Status")}</TableHead>
                <TableHead>{t("admin.expires", "Expires")}</TableHead>
                <TableHead className="text-right">{t("admin.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : invitations && invitations.length > 0 ? (
                invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant={invitation.role === "admin" ? "destructive" : "default"}>
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(invitation)}</TableCell>
                    <TableCell>
                      {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {!invitation.accepted_at && new Date(invitation.expires_at) > new Date() && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInviteLink(invitation.token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t("admin.noInvitations", "No invitations yet")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.inviteUser", "Invite User")}</DialogTitle>
            <DialogDescription>
              {t("admin.inviteDescription", "Send an invitation to a new administrator or teacher.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">{t("admin.email", "Email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <Label>{t("admin.role", "Role")}</Label>
              <Select value={role} onValueChange={(v: "admin" | "teacher") => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("admin.admin", "Admin")}</SelectItem>
                  <SelectItem value="teacher">{t("admin.teacher", "Teacher")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => createInvitationMutation.mutate()}
              disabled={!email || createInvitationMutation.isPending}
            >
              {createInvitationMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {t("admin.sendInvitation", "Send Invitation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
