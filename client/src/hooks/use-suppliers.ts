import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const CSRF_HEADER = "x-csrf-protection";
const CSRF_VALUE = "1";

export type Supplier = {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string | null;
};

const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  contact: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return res.json();
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof supplierSchema>) => {
      const parsed = supplierSchema.parse(data);
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json", [CSRF_HEADER]: CSRF_VALUE },
        body: JSON.stringify(parsed),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof supplierSchema>> }) => {
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", [CSRF_HEADER]: CSRF_VALUE },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: "DELETE",
        headers: { [CSRF_HEADER]: CSRF_VALUE },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete supplier");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
  });
}
