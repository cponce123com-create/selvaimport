import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Brand = { id: number; name: string };

export function useBrands() {
  return useQuery<Brand[]>({
    queryKey: ["/api/admin/brands"],
    queryFn: async () => {
      const res = await fetch("/api/admin/brands", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch brands");
      return res.json();
    },
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create brand");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/brands"] }),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/brands/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete brand");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/brands"] }),
  });
}
