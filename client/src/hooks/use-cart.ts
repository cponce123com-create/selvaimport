import { useQuery, useMutation, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useAuth } from "./use-auth";
import { useState, useEffect, useCallback } from "react";

const GUEST_CART_KEY = "selva_import_guest_cart";

interface GuestCartItem {
  productId: number;
  quantity: number;
  product: any;
}

function getGuestCartItems(): GuestCartItem[] {
  try {
    const data = localStorage.getItem(GUEST_CART_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function setGuestCartItems(items: GuestCartItem[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

export function useCart() {
  const { data: user } = useAuth();

  const serverCart = useQuery({
    queryKey: [api.cart.get.path],
    queryFn: async () => {
      const res = await fetch(api.cart.get.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Error al cargar el carrito");
      return api.cart.get.responses[200].parse(await res.json());
    },
    enabled: !!user,
  });

  const [guestItems, setGuestItems] = useState<GuestCartItem[]>(() => getGuestCartItems());

  useEffect(() => {
    if (!user) {
      setGuestItems(getGuestCartItems());
    }
  }, [user]);

  useEffect(() => {
    const refresh = () => setGuestItems(getGuestCartItems());
    window.addEventListener("guest-cart-update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("guest-cart-update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (user) {
    return serverCart;
  }

  return {
    data: guestItems.length > 0 ? { cart: { id: 0, userId: 0 }, items: guestItems.map((item, i) => ({ id: i + 1, cartId: 0, productId: item.productId, quantity: item.quantity, product: item.product })) } : { cart: { id: 0, userId: 0 }, items: [] },
    isLoading: false,
    error: null,
  } as UseQueryResult;
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { data: user } = useAuth();

  return useMutation({
    mutationFn: async (data: { productId: number; quantity: number; product?: any }) => {
      if (user) {
        const res = await fetch(api.cart.addItem.path, {
          method: api.cart.addItem.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: data.productId, quantity: data.quantity }),
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al agregar al carrito");
        return api.cart.addItem.responses[200].parse(await res.json());
      } else {
        const items = getGuestCartItems();
        const existing = items.find(i => i.productId === data.productId);
        if (existing) {
          existing.quantity += data.quantity;
        } else {
          items.push({ productId: data.productId, quantity: data.quantity, product: data.product });
        }
        setGuestCartItems(items);
        return data;
      }
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: [api.cart.get.path] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["guest-cart"] });
        window.dispatchEvent(new Event("guest-cart-update"));
      }
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const { data: user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, quantity, productId }: { id: number; quantity: number; productId?: number }) => {
      if (user) {
        const url = buildUrl(api.cart.updateItem.path, { id });
        const res = await fetch(url, {
          method: api.cart.updateItem.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al actualizar el carrito");
        return api.cart.updateItem.responses[200].parse(await res.json());
      } else {
        const items = getGuestCartItems();
        if (quantity <= 0) {
          const filtered = items.filter(i => i.productId !== productId);
          setGuestCartItems(filtered);
        } else {
          const item = items.find(i => i.productId === productId);
          if (item) item.quantity = quantity;
          setGuestCartItems(items);
        }
        return { quantity };
      }
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: [api.cart.get.path] });
      } else {
        window.dispatchEvent(new Event("guest-cart-update"));
      }
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  const { data: user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (user) {
        const res = await fetch(api.cart.clear.path, {
          method: api.cart.clear.method,
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al vaciar el carrito");
      } else {
        clearGuestCart();
      }
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: [api.cart.get.path] });
      } else {
        window.dispatchEvent(new Event("guest-cart-update"));
      }
    },
  });
}
