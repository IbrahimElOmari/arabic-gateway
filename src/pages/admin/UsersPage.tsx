import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, UserCog, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AppRole = "admin" | "teacher" | "student";

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  role?: AppRole;
}

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("student");

  // Fetch users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", searchQuery, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, user_id, full_name, email, created_at")
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.user_id)
            .maybeSingle();

          return {
            ...profile,
            role: roleData?.role as AppRole | undefined,
          };
        })
      );

      // Filter by role if specified
      if (roleFilter !== "all") {
        return usersWithRoles.filter((u) => u.role === roleFilter);
      }

      return usersWithRoles;
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First, delete existing role
      await supabase.from("user_roles").delete().eq("user_id", userId);

      // Then insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: t("admin.roleUpdated", "Role Updated"),
        description: t("admin.roleUpdatedDescription", "User role has been updated successfully."),
      });
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("admin.roleUpdateError", "Failed to update user role."),
      });
    },
  });

  const handleRoleChange = () => {
    if (selectedUser) {
      updateRoleMutation.mutate({ userId: selectedUser.user_id, role: newRole });
    }
  };

  const getRoleBadgeVariant = (role?: AppRole) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "teacher":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("admin.userManagement", "User Management")}
        </h1>
        <p className="text-muted-foreground">
          {t("admin.userManagementDescription", "Manage user accounts and roles")}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("admin.searchUsers", "Search users...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("admin.filterByRole", "Filter by role")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.allRoles", "All Roles")}</SelectItem>
            <SelectItem value="admin">{t("admin.admin", "Admin")}</SelectItem>
            <SelectItem value="teacher">{t("admin.teacher", "Teacher")}</SelectItem>
            <SelectItem value="student">{t("admin.student", "Student")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.name", "Name")}</TableHead>
              <TableHead>{t("admin.email", "Email")}</TableHead>
              <TableHead>{t("admin.role", "Role")}</TableHead>
              <TableHead>{t("admin.joinedDate", "Joined")}</TableHead>
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
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role || "student"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setNewRole(user.role || "student");
                      }}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      {t("admin.editRole", "Edit Role")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t("admin.noUsersFound", "No users found")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editUserRole", "Edit User Role")}</DialogTitle>
            <DialogDescription>
              {t("admin.editUserRoleDescription", "Change the role for")} {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">{t("admin.student", "Student")}</SelectItem>
                <SelectItem value="teacher">{t("admin.teacher", "Teacher")}</SelectItem>
                <SelectItem value="admin">{t("admin.admin", "Admin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
