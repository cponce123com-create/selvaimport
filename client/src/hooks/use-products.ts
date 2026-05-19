import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useProducts(params?: { search?: string; categoryId?: number; admin?: boolean }) {
  return useQuery({
    queryKey: [api.products.list.path, params],
    queryFn: async () => {
      const url = new URL(api.products.list.path, window.location.origin);
      if (params?.search) url.searchParams.set("search", params.search);
      if (params?.categoryId) url.searchParams.set("categoryId", params.categoryId.toString());
      if (params?.admin) url.searchParams.set("admin", "true");

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      const json = await res.json();
      // La API devuelve { products: [...], total, page, totalPages }
      // Extraemos el array para compatibilidad con todos los consumidores
      return Array.isArray(json) ? json : (json.products ?? []);
    },
  });
}

export function usePaginatedProducts(params?: { search?: string; categoryId?: number; admin?: boolean; page?: number; limit?: number }) {
  return useQuery<{ products: any[]; total: number; page: number; totalPages: number }>({
    queryKey: [api.products.list.path, "paginated", params],
    queryFn: async () => {
      const url = new URL(api.products.list.path, window.location.origin);
      if (params?.search) url.searchParams.set("search", params.search);
      if (params?.categoryId) url.searchParams.set("categoryId", params.categoryId.toString());
      if (params?.admin) url.searchParams.set("admin", "true");
      if (params?.page !== undefined) url.searchParams.set("page", params.page.toString());
      if (params?.limit !== undefined) url.searchParams.set("limit", params.limit.toString());

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: [api.products.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.products.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      return api.products.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: ["/api/products/slug", slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/slug/${encodeURIComponent(slug)}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      return res.json();
    },
    enabled: !!slug,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.products.create.input>) => {
      const res = await fetch(api.products.create.path, {
        method: api.products.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create product");
      return api.products.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.products.list.path] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & z.infer<typeof api.products.update.input>) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: api.products.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update product");
      return api.products.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.get.path, variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.products.delete.path, { id });
      const res = await fetch(url, {
        method: api.products.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.products.list.path] }),
  });
}

export function useToggleProductVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isVisible }: { id: number; isVisible: boolean }) => {
      const res = await fetch(`/api/admin/products/${id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al actualizar visibilidad");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}

export function useProductTemplates(search?: string) {
  return useQuery<any[]>({
    queryKey: ["/api/product-templates/search", search],
    queryFn: async () => {
      const params = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/product-templates/search${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    enabled: typeof search === "string",
    staleTime: 30000,
  });
}

export function useAdminProductTemplates(params?: { search?: string; page?: number; limit?: number }) {
  return useQuery<{ templates: any[]; total: number; page: number; totalPages: number }>({
    queryKey: ["/api/admin/product-templates", params],
    queryFn: async () => {
      const url = new URL("/api/admin/product-templates", window.location.origin);
      if (params?.search) url.searchParams.set("search", params.search);
      if (params?.page) url.searchParams.set("page", params.page.toString());
      if (params?.limit) url.searchParams.set("limit", params.limit.toString());
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });
}

export function useDeleteProductTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/product-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete template");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/product-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/product-templates/search"] });
    },
  });
}
