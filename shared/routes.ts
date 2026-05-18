import { z } from "zod";
import { insertUserSchema, insertCategorySchema, insertProductSchema, insertOrderSchema, guestOrderSchema, insertSitePageSchema } from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/auth/login" as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        200: z.object({ id: z.number(), email: z.string(), name: z.string(), role: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: "POST" as const,
      path: "/api/auth/register" as const,
      input: z.object({ email: z.string().email(), password: z.string(), name: z.string() }),
      responses: {
        201: z.object({ id: z.number(), email: z.string(), name: z.string(), role: z.string() }),
        400: errorSchemas.validation,
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/auth/me" as const,
      responses: {
        200: z.object({ id: z.number(), email: z.string(), name: z.string(), role: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout" as const,
      responses: { 200: z.object({ message: z.string() }) },
    },
  },
  products: {
    list: {
      method: "GET" as const,
      path: "/api/products" as const,
      input: z.object({ search: z.string().optional(), categoryId: z.coerce.number().optional() }).optional(),
      responses: { 200: z.object({ products: z.array(z.any()), total: z.number(), page: z.number(), totalPages: z.number() }) },
    },
    get: {
      method: "GET" as const,
      path: "/api/products/:id" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    create: {
      method: "POST" as const,
      path: "/api/products" as const,
      input: insertProductSchema.extend({
        slug: z.string().optional(),
        price: z.coerce.string(),
        offerPrice: z.coerce.string().nullable().optional(),
        barcode: z.string().nullable().optional(),
        purchasePrice: z.coerce.string().nullable().optional(),
        supplierId: z.number().nullable().optional(),
        images: z.array(z.string().url()).max(5).optional(),
        videoUrl: z.string().nullable().optional(),
        videoPublicId: z.string().nullable().optional(),
      }),
      responses: { 201: z.any(), 401: errorSchemas.unauthorized },
    },
    update: {
      method: "PUT" as const,
      path: "/api/products/:id" as const,
      input: insertProductSchema.partial().extend({
        price: z.coerce.string().optional(),
        offerPrice: z.coerce.string().nullable().optional(),
        barcode: z.string().nullable().optional(),
        purchasePrice: z.coerce.string().nullable().optional(),
        supplierId: z.number().nullable().optional(),
        images: z.array(z.string().url()).max(5).optional(),
        videoUrl: z.string().nullable().optional(),
        videoPublicId: z.string().nullable().optional(),
      }),
      responses: { 200: z.any(), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/products/:id" as const,
      responses: { 204: z.void(), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound },
    },
  },
  categories: {
    list: {
      method: "GET" as const,
      path: "/api/categories" as const,
      responses: { 200: z.array(z.any()) },
    },
    create: {
      method: "POST" as const,
      path: "/api/categories" as const,
      input: insertCategorySchema,
      responses: { 201: z.any(), 401: errorSchemas.unauthorized },
    },
  },
  cart: {
    get: {
      method: "GET" as const,
      path: "/api/cart" as const,
      responses: { 200: z.any(), 401: errorSchemas.unauthorized },
    },
    addItem: {
      method: "POST" as const,
      path: "/api/cart/items" as const,
      input: z.object({ productId: z.number(), quantity: z.number().min(1).default(1) }),
      responses: { 200: z.any(), 401: errorSchemas.unauthorized },
    },
    updateItem: {
      method: "PUT" as const,
      path: "/api/cart/items/:id" as const,
      input: z.object({ quantity: z.number().min(0) }),
      responses: { 200: z.any(), 401: errorSchemas.unauthorized },
    },
    clear: {
      method: "DELETE" as const,
      path: "/api/cart" as const,
      responses: { 204: z.void(), 401: errorSchemas.unauthorized },
    },
  },
  orders: {
    list: {
      method: "GET" as const,
      path: "/api/orders" as const,
      responses: { 200: z.array(z.any()), 401: errorSchemas.unauthorized },
    },
    get: {
      method: "GET" as const,
      path: "/api/orders/:id" as const,
      responses: { 200: z.any(), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound },
    },
    create: {
      method: "POST" as const,
      path: "/api/orders" as const,
      input: insertOrderSchema,
      responses: { 201: z.any(), 400: errorSchemas.validation, 401: errorSchemas.unauthorized },
    },
    updateStatus: {
      method: "PATCH" as const,
      path: "/api/orders/:id/status" as const,
      input: z.object({ status: z.string() }),
      responses: { 200: z.any(), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound },
    },
    createGuest: {
      method: "POST" as const,
      path: "/api/orders/guest" as const,
      input: guestOrderSchema,
      responses: { 201: z.any(), 400: errorSchemas.validation },
    },
  },
  pages: {
    get: {
      method: "GET" as const,
      path: "/api/pages/:slug" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    list: {
      method: "GET" as const,
      path: "/api/pages" as const,
      responses: { 200: z.array(z.any()) },
    },
    update: {
      method: "PUT" as const,
      path: "/api/admin/pages/:slug" as const,
      input: z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        imageUrl: z.string().nullable().optional(),
      }),
      responses: { 200: z.any(), 401: errorSchemas.unauthorized },
    },
  },
  admin: {
    customers: {
      method: "GET" as const,
      path: "/api/admin/customers" as const,
      responses: { 200: z.any(), 401: errorSchemas.unauthorized },
    },
    coupons: {
      list: {
        method: "GET" as const,
        path: "/api/admin/coupons" as const,
        responses: { 200: z.array(z.any()), 401: errorSchemas.unauthorized },
      },
      create: {
        method: "POST" as const,
        path: "/api/admin/coupons" as const,
        input: z.object({
          code: z.string().min(1),
          discountType: z.enum(["percentage", "fixed"]).default("percentage"),
          discountValue: z.coerce.string().refine(v => Number(v) > 0, "El valor debe ser mayor a 0"),
          maxUses: z.coerce.number().int().positive().optional().nullable(),
          expiryDate: z.string().optional().nullable(),
          isActive: z.boolean().default(true),
        }),
        responses: { 201: z.any(), 400: errorSchemas.validation, 401: errorSchemas.unauthorized },
      },
      update: {
        method: "PUT" as const,
        path: "/api/admin/coupons/:id" as const,
        input: z.object({
          code: z.string().min(1).optional(),
          discountType: z.enum(["percentage", "fixed"]).optional(),
          discountValue: z.coerce.string().optional(),
          maxUses: z.coerce.number().int().positive().optional().nullable(),
          expiryDate: z.string().optional().nullable(),
          isActive: z.boolean().optional(),
        }),
        responses: { 200: z.any(), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/admin/coupons/:id" as const,
        responses: { 204: z.void(), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound },
      },
    },
  },
  coupons: {
    validate: {
      method: "POST" as const,
      path: "/api/coupons/validate" as const,
      input: z.object({ code: z.string() }),
      responses: { 200: z.any(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
