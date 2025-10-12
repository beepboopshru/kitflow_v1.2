import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Trash2, ShieldAlert } from "lucide-react";

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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Zone</h1>
          <p className="text-muted-foreground mt-2">
            Administrative tools and dangerous operations
          </p>
        </div>

        {/* Assignment Management Section */}
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Assignment Management</CardTitle>
            </div>
            <CardDescription>
              Dangerous operations that affect assignment data. Use with caution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-sm">Clear Pending Assignments</h3>
                <p className="text-sm text-muted-foreground">
                  Deletes all non-dispatched assignments and restores stock to affected kits.
                </p>
                <Button
                  variant="outline"
                  onClick={handleClearAllPending}
                  className="text-destructive hover:text-destructive w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Pending
                </Button>
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-sm">Clear All Assignments</h3>
                <p className="text-sm text-muted-foreground">
                  Deletes ALL assignments including dispatched ones. Stock restored for pending only.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleClearAll}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for future admin tools */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Admin Tools</CardTitle>
            <CardDescription>
              More administrative features will be added here in the future.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This section is reserved for future administrative functionality.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
