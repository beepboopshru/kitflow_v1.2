import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Trash2, ShieldAlert, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminZone() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const assignments = useQuery(api.assignments.list);
  const clearAllPending = useMutation(api.assignments.clearAllPendingAssignments);
  const clearAll = useMutation(api.assignments.clearAllAssignments);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleClearAllPending = async () => {
    const pendingCount = (assignments ?? []).filter(
      (a) => a.status !== "dispatched"
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

  const handleClearAll = async () => {
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

  if (isLoading || !isAuthenticated) {
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
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Zone</h1>
              <p className="text-muted-foreground mt-1">
                Administrative tools and sensitive operations
              </p>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Restricted Access Area
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    The operations on this page can permanently affect your data. Please proceed with caution and ensure you understand the consequences of each action.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assignment Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-destructive/30 shadow-lg">
            <CardHeader className="border-b bg-destructive/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-xl">Assignment Management</CardTitle>
                  <CardDescription className="mt-1">
                    Dangerous operations that permanently affect assignment data
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Clear Pending Assignments */}
                <div className="space-y-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      Clear Pending Assignments
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Removes all non-dispatched assignments from the system and restores stock quantities to the affected kits. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleClearAllPending}
                    className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950 border-orange-200 dark:border-orange-800"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Pending
                  </Button>
                </div>

                {/* Clear All Assignments */}
                <div className="space-y-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5 hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                      Clear All Assignments
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Permanently deletes ALL assignments including dispatched ones. Stock will only be restored for pending assignments. This action is irreversible.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleClearAll}
                    className="w-full shadow-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Assignments
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Future Tools Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Additional Admin Tools</CardTitle>
              <CardDescription>
                More administrative features will be added here as needed
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <ShieldAlert className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  This section is reserved for future administrative functionality such as user management, system settings, and data exports.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  );
}