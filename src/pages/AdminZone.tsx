import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Trash2, AlertTriangle, UserPlus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminZone() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const assignments = useQuery(api.assignments.list);
  const clearAllPending = useMutation(api.assignments.clearAllPendingAssignments);
  const clearAll = useMutation(api.assignments.clearAllAssignments);
  const createAccount = useMutation(api.users.createUserAccount);

  const [newAccountForm, setNewAccountForm] = useState({
    username: "",
    password: "",
    role: "user" as "admin" | "user" | "member",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAccountForm.username || !newAccountForm.password) {
      toast("Error", { description: "Username and password are required" });
      return;
    }

    if (newAccountForm.password.length < 4) {
      toast("Error", { description: "Password must be at least 4 characters" });
      return;
    }

    try {
      await createAccount({
        username: newAccountForm.username,
        password: newAccountForm.password,
        role: newAccountForm.role,
      });
      toast("Account created successfully", {
        description: `User "${newAccountForm.username}" has been created with role: ${newAccountForm.role}`,
      });
      setNewAccountForm({ username: "", password: "", role: "user" });
    } catch (error) {
      toast("Error creating account", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (isLoading || !isAuthenticated) {
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
            Administrative tools for managing system data
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

        {/* Account Creation Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">User Account Management</h2>
          
          <Card className="border-blue-200 hover:border-blue-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <UserPlus className="h-5 w-5" />
                Create New User Account
              </CardTitle>
              <CardDescription>
                Create a new user account with username and password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={newAccountForm.username}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, username: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password (min 4 characters)"
                    value={newAccountForm.password}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, password: e.target.value })}
                    required
                    minLength={4}
                  />
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newAccountForm.role}
                    onValueChange={(value: "admin" | "user" | "member") =>
                      setNewAccountForm({ ...newAccountForm, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Assignment Management Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Assignment Management</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
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
                  <p>Current pending assignments: <span className="font-semibold">{pendingCount}</span></p>
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
                  Clear {pendingCount} Pending Assignment{pendingCount !== 1 ? 's' : ''}
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
                  <p>Total assignments: <span className="font-semibold">{totalCount}</span></p>
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
                  Clear All {totalCount} Assignment{totalCount !== 1 ? 's' : ''}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Placeholder for future admin tools */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-muted-foreground">More Admin Tools</CardTitle>
            <CardDescription>
              Additional administrative features will be added here
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    </Layout>
  );
}