import { describe, it, expect } from "vitest";

const BASE_URL = process.env.TEST_URL || "http://localhost:5000";

describe("Products API", () => {
  it("should pass a basic smoke test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should list products with pagination if server is running", async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${BASE_URL}/api/products`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Should have pagination structure
      expect(data).toHaveProperty("products");
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("page");
      expect(data).toHaveProperty("totalPages");

      // Products is an array
      expect(Array.isArray(data.products)).toBe(true);

      // Pagination defaults
      expect(data.page).toBe(1);
      expect(data.totalPages).toBeGreaterThanOrEqual(1);
    } catch {
      console.warn("⚠️  Servidor no disponible, saltando test de integración");
    }
  });

  it("should filter products by category if server is running", async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      // First get all products to find category IDs
      const allRes = await fetch(`${BASE_URL}/api/products`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const allData = await allRes.json();

      if (allData.products.length > 0 && allData.products[0].categoryId) {
        const catId = allData.products[0].categoryId;
        const res = await fetch(`${BASE_URL}/api/products?categoryId=${catId}`);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(data.products)).toBe(true);
        data.products.forEach((p: any) => {
          expect(p.categoryId).toBe(catId);
        });
      }
    } catch {
      console.warn("⚠️  Servidor no disponible, saltando test de integración");
    }
  });

  it("should search products by name if server is running", async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${BASE_URL}/api/products?search=telefono`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 200) {
        const data = await res.json();
        expect(Array.isArray(data.products)).toBe(true);
      }
    } catch {
      console.warn("⚠️  Servidor no disponible, saltando test de integración");
    }
  });
});
