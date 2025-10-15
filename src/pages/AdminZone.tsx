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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Trash2, AlertTriangle, Shield, User, Users } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminZone() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const currentUserRole = useQuery(api.roles.getCurrentUserRole);
  const assignments = useQuery(api.assignments.list);
  const clearAllPending = useMutation(api.assignments.clearAllPendingAssignments);
  const clearAll = useMutation(api.assignments.clearAllAssignments);

  // User management queries and mutations
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

  const handleClearAllPendingAssignments = async () => {
    const pendingCount = (assignments ?? []).filter(
      (a) => a.status !== "dispatched" && typeof a.dispatchedAt !== "number"
    ).length;

    if (pendingCount === 0) {
      toast("No pending assignments to clear");
      return;
    }

    const first = confirm(
      `This will delete ${pendingCount} pending assignment(s) and restore stock to all affected kits. Continue?`
    );
    if (!first) return;

    const second = confirm("Are you absolutely sure? This cannot be undone.");
    if (!second) return;

    try {
      const result = await clearAllPending();
      toast(`Cleared ${result.deletedCount} assignment(s) successfully`);
    } catch (error) {
      toast("Error clearing assignments", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleClearAllAssignments = async () => {
    const totalCount = assignments?.length ?? 0;

    if (totalCount === 0) {
      toast("No assignments to clear");
      return;
    }

    const first = confirm(
      `This will delete ALL ${totalCount} assignment(s) including dispatched ones. Stock will be restored for pending assignments only. Continue?`
    );
    if (!first) return;

    const second = confirm("Are you absolutely sure? This action is IRREVERSIBLE and will delete ALL assignment history.");
    if (!second) return;

    try {
      const result = await clearAll();
      toast(`Cleared ${result.deletedCount} assignment(s) successfully`);
    } catch (error) {
      toast("Error clearing all assignments", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleRoleChange = async (userId: Id<"users">, newRole: "admin" | "manager" | "research_development" | "operations" | "inventory" | "content") => {
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

  const handleApproveUser = async (userId: Id<"users">, role: "admin" | "manager" | "research_development" | "operations" | "inventory" | "content", userName: string) => {
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
      case "manager":
        return <Shield className="h-4 w-4 text-orange-500" />;
      case "research_development":
        return <User className="h-4 w-4 text-blue-500" />;
      case "operations":
        return <Users className="h-4 w-4 text-green-500" />;
      case "inventory":
        return <Users className="h-4 w-4 text-purple-500" />;
      case "content":
        return <Users className="h-4 w-4 text-pink-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading || !isAuthenticated || currentUserRole !== "admin") {
    return null;
  }

  const pendingCount = (assignments ?? []).filter(
    (a) => a.status !== "dispatched" && typeof a.dispatchedAt !== "number"
  ).length;
  const totalCount = assignments?.length ?? 0;

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Zone</h1>
          <p className="text-muted-foreground mt-2">
            Administrative tools for managing system data and users
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mt-1">
              These actions are irreversible. Please proceed with caution.
            </p>
          </div>
        </div>

        {/* User Management Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">User Management</h2>

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
                          defaultValue="inventory"
                          onValueChange={(value) =>
                            handleApproveUser(
                              u._id,
                              value as
                                | "admin"
                                | "manager"
                                | "research_development"
                                | "operations"
                                | "inventory"
                                | "content",
                              u.name || u.email || "Anonymous User"
                            )
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Approve as..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="research_development">
                              Research & Development
                            </SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="inventory">Inventory</SelectItem>
                            <SelectItem value="content">Content</SelectItem>
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

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="approved-users">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                Approved Users ({users?.filter((u) => u.isApproved !== false).length || 0})
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardDescription>
                      View and manage user roles. All users share the same database.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {users
                        ?.filter((u) => u.isApproved !== false)
                        .map((u) => (
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
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      (You)
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {u.email || "No email"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={u.role || "inventory"}
                                onValueChange={(value) =>
                                  handleRoleChange(
                                    u._id,
                                    value as
                                      | "admin"
                                      | "manager"
                                      | "research_development"
                                      | "operations"
                                      | "inventory"
                                      | "content"
                                  )
                                }
                                disabled={u._id === user?._id}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="research_development">
                                    Research & Development
                                  </SelectItem>
                                  <SelectItem value="operations">Operations</SelectItem>
                                  <SelectItem value="inventory">Inventory</SelectItem>
                                  <SelectItem value="content">Content</SelectItem>
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Assignment Management Section */}
        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="assignment-management">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                Assignment Management
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2 pt-4">
                  {/* Clear Pending Assignments */}
                  <Card className="border-orange-200 hover:border-orange-300 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <Trash2 className="h-5 w-5" />
                        Clear Pending Assignments
                      </CardTitle>
                      <CardDescription>
                        Delete all non-dispatched assignments and restore stock to kits
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <p>
                          Current pending assignments:{" "}
                          <span className="font-semibold">{pendingCount}</span>
                        </p>
                        <p className="mt-2">This will:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Delete all "assigned" and "packed" assignments</li>
                          <li>Restore stock quantities to affected kits</li>
                          <li>Keep dispatched assignments intact</li>
                        </ul>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleClearAllPendingAssignments}
                        className="w-full text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                        disabled={pendingCount === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear {pendingCount} Pending Assignment
                        {pendingCount !== 1 ? "s" : ""}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Clear All Assignments */}
                  <Card className="border-destructive/20 hover:border-destructive/30 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Clear All Assignments
                      </CardTitle>
                      <CardDescription>
                        Delete ALL assignments including dispatched ones (IRREVERSIBLE)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <p>
                          Total assignments:{" "}
                          <span className="font-semibold">{totalCount}</span>
                        </p>
                        <p className="mt-2">This will:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Delete ALL assignments (assigned, packed, dispatched)</li>
                          <li>Restore stock for non-dispatched assignments only</li>
                          <li>Remove all assignment history permanently</li>
                        </ul>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleClearAllAssignments}
                        className="w-full"
                        disabled={totalCount === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All {totalCount} Assignment
                        {totalCount !== 1 ? "s" : ""}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Role Descriptions Section */}
        <div className="space-y-4">
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
                <Shield className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium">Manager</p>
                  <p className="text-sm text-muted-foreground">
                    Same access as admin but no user management
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Research & Development</p>
                  <p className="text-sm text-muted-foreground">
                    Kit management only - no client management, vendors, or services
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Operations</p>
                  <p className="text-sm text-muted-foreground">
                    Inventory management, vendors, and services
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Inventory</p>
                  <p className="text-sm text-muted-foreground">
                    Only inventory management access
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-pink-500 mt-0.5" />
                <div>
                  <p className="font-medium">Content</p>
                  <p className="text-sm text-muted-foreground">
                    Can only view and upload images
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </Layout>
  );
}