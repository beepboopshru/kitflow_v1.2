import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { AlertTriangle, Box, Package, Users } from "lucide-react";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const summary = useQuery(api.reports.getInventorySummary);
  const lowStockKits = useQuery(api.kits.getLowStockKits);
  const kits = useQuery(api.kits.list);
  const clientAllocations = useQuery(api.reports.getClientAllocation);

  // Add local filters
  const [typeFilter, setTypeFilter] = useState<"all" | "cstem" | "robotics">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "low_stock">("all");
  const [kitFilter, setKitFilter] = useState<string>("all");

  // Filtered kits derived from kits query
  const filteredKits = (kits ?? []).filter((k) => {
    const typeOk = typeFilter === "all" ? true : k.type === typeFilter;
    let statusOk = true;
    if (statusFilter === "in_stock") {
      statusOk = k.stockCount > k.lowStockThreshold;
    } else if (statusFilter === "low_stock") {
      statusOk = k.stockCount <= k.lowStockThreshold;
    }
    const kitOk = kitFilter === "all" ? true : k._id === kitFilter;
    return typeOk && statusOk && kitOk;
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const stats = [
    {
      title: "Total Kits",
      value: summary?.totalKits || 0,
      icon: Box,
      color: "text-blue-600",
    },
    {
      title: "Total Stock",
      value: summary?.totalStock || 0,
      icon: Package,
      color: "text-green-600",
    },
    {
      title: "Low Stock Alerts",
      value: summary?.lowStockKits || 0,
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      title: "Dispatched",
      value: summary?.dispatchedCount || 0,
      icon: Users,
      color: "text-purple-600",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your inventory management system
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Kit Quick Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Kit Quick Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Options • Kit Type</Label>
                <Select value={typeFilter} onValueChange={(v: "all" | "cstem" | "robotics") => setTypeFilter(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="cstem">CSTEM</SelectItem>
                    <SelectItem value="robotics">Robotics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Kit Lists • Select Kit</Label>
                <Select value={kitFilter} onValueChange={(v: string) => setKitFilter(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All kits" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Kits</SelectItem>
                    {(kits ?? []).map((k) => (
                      <SelectItem key={k._id} value={k._id}>
                        {k.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Pouching Plan • Status</Label>
                <Select value={statusFilter} onValueChange={(v: "all" | "in_stock" | "low_stock") => setStatusFilter(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKits.slice(0, 6).map((kit) => (
                <div key={kit._id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{kit.name}</div>
                      <Badge variant="outline" className="mt-1">
                        {kit.type.toUpperCase()}
                      </Badge>
                    </div>
                    <Badge variant={kit.status === "in_stock" ? "default" : "secondary"}>
                      {kit.status === "in_stock" ? "In Stock" : "Assigned"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Stock: {kit.stockCount}</span>
                    </div>
                    {kit.stockCount <= kit.lowStockThreshold && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">Low</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredKits.length === 0 && (
                <div className="text-sm text-muted-foreground">No kits match your filters.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kit Type Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock by Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">CSTEM Kits</span>
                <Badge variant="secondary">{summary?.cstemStock || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Robotics Kits</span>
                <Badge variant="secondary">{summary?.roboticsStock || 0}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Assigned</span>
                <Badge variant="outline">{summary?.assignedCount || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Packed</span>
                <Badge variant="outline">{summary?.packedCount || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Dispatched</span>
                <Badge variant="outline">{summary?.dispatchedCount || 0}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Reports - Upcoming Dispatches */}
        {clientAllocations && clientAllocations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Client Reports - Upcoming Dispatches This Month</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientAllocations
                  .filter(allocation => allocation.upcomingThisMonth > 0)
                  .map((allocation) => (
                    <div key={allocation.client._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted/30 rounded-lg gap-3">
                      <div className="flex-1">
                        <p className="font-medium">{allocation.client.name}</p>
                        <p className="text-sm text-muted-foreground">{allocation.client.organization}</p>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="text-center">
                          <div className="text-sm font-medium">{allocation.upcomingQty}</div>
                          <div className="text-xs text-muted-foreground">Upcoming Qty</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{allocation.upcomingThisMonth}</div>
                          <div className="text-xs text-muted-foreground">Assignments</div>
                        </div>
                      </div>
                    </div>
                  ))}
                {clientAllocations.filter(allocation => allocation.upcomingThisMonth > 0).length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No upcoming dispatches scheduled for this month
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Low Stock Alerts */}
        {lowStockKits && lowStockKits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>Low Stock Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockKits.map((kit) => (
                  <div key={kit._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium">{kit.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {kit.type.toUpperCase()} • Stock: {kit.stockCount}
                      </p>
                    </div>
                    <Badge variant="destructive">Low Stock</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}