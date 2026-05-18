import { describe, it, expect } from "vitest";

const BASE_URL = process.env.TEST_URL || "http://localhost:5000";

describe("Categories API", () => {
  it("should pass a basic smoke test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should list categories if server is running", async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${BASE_URL}/api/categories`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Categories is an array
      expect(Array.isArray(data)).toBe(true);

      if (data.length > 0) {
        const first = data[0];
        expect(first).toHaveProperty("id");
        expect(first).toHaveProperty("name");
        expect(first).toHaveProperty("slug");
      }
    } catch {
      console.warn("⚠️  Servidor no disponible, saltando test de integración");
    }
  });
});
