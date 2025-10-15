import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Shield, User, Users, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function UserManagement() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const currentUserRole = useQuery(api.roles.getCurrentUserRole);
  
  // Only fetch users list if current user is admin
  const users = useQuery(
    api.roles.listUsersWithRoles,
    currentUserRole === "admin" ? {} : "skip"
  );
  const pendingUsers = useQuery(
    api.roles.listPendingUsers,
    currentUserRole === "admin" ? {} : "skip"
  );
  const updateRole = useMutation(api.roles.updateUserRole);
  const deleteUser = useMutation(api.roles.deleteUser);
  const approveUser = useMutation(api.roles.approveUser);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (currentUserRole !== undefined && currentUserRole !== "admin") {
      toast.error("Admin access required");
      navigate("/dashboard");
    }
  }, [currentUserRole, navigate]);

  const handleRoleChange = async (userId: Id<"users">, newRole: "admin" | "user" | "member") => {
    try {
      await updateRole({ userId, role: newRole });
      toast.success("User role updated successfully");
    } catch (error) {
      toast.error("Failed to update role", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDeleteUser = async (userId: Id<"users">, userName: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete ${userName}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteUser({ userId });
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleApproveUser = async (userId: Id<"users">, role: "admin" | "user" | "member", userName: string) => {
    try {
      await approveUser({ userId, role });
      toast.success(`${userName} approved as ${role}`);
    } catch (error) {
      toast.error("Failed to approve user", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4 text-red-500" />;
      case "user":
        return <User className="h-4 w-4 text-blue-500" />;
      case "member":
        return <Users className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading || !isAuthenticated || currentUserRole !== "admin") {
    return null;
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user roles and permissions
          </p>
        </div>

        {pendingUsers && pendingUsers.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                Pending Approvals ({pendingUsers.length})
              </CardTitle>
              <CardDescription>
                New users waiting for admin approval to access the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingUsers.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50"
                  >
                    <div className="flex items-center gap-4">
                      <User className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="font-medium">
                          {u.name || u.email || "Anonymous User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {u.email || "No email"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        defaultValue="user"
                        onValueChange={(value) =>
                          handleApproveUser(
                            u._id,
                            value as "admin" | "user" | "member",
                            u.name || u.email || "Anonymous User"
                          )
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Approve as..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Approve as Admin</SelectItem>
                          <SelectItem value="user">Approve as User</SelectItem>
                          <SelectItem value="member">Approve as Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDeleteUser(
                            u._id,
                            u.name || u.email || "Anonymous User"
                          )
                        }
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Approved Users</CardTitle>
            <CardDescription>
              View and manage user roles. All users share the same database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users?.filter(u => u.isApproved !== false).map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getRoleIcon(u.role)}
                    <div>
                      <p className="font-medium">
                        {u.name || u.email || "Anonymous User"}
                        {u._id === user?._id && (
                          <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {u.email || "No email"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={u.role || "user"}
                      onValueChange={(value) =>
                        handleRoleChange(u._id, value as "admin" | "user" | "member")
                      }
                      disabled={u._id === user?._id}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleDeleteUser(
                          u._id,
                          u.name || u.email || "Anonymous User"
                        )
                      }
                      disabled={u._id === user?._id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Descriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-sm text-muted-foreground">
                  Full access to all features including user management and admin zone
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">User</p>
                <p className="text-sm text-muted-foreground">
                  Standard access to manage kits, clients, assignments, and inventory
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Member</p>
                <p className="text-sm text-muted-foreground">
                  Limited access - can view data but cannot make changes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
}