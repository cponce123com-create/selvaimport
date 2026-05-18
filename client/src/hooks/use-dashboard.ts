import { useQuery } from "@tanstack/react-query";

export interface DashboardMetrics {
  salesToday: number;
  pendingOrders: number;
  lowStockItems: number;
  lowStockProducts: { id: number; name: string; inventory: number }[];
  monthlyRevenue: number;
  recentOrders: {
    id: number;
    status: string;
    totalAmount: string;
    guestName: string | null;
    createdAt: string | null;
  }[];
}

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ["/api/admin/metrics/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/metrics/dashboard", { credentials: "include" });
      if (res.status === 401) throw new Error("No autorizado");
      if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
      return res.json();
    },
  });
}
