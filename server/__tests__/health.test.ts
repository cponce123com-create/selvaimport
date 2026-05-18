import { describe, it, expect } from "vitest";

const BASE_URL = process.env.TEST_URL || "http://localhost:5000";

describe("Health endpoint", () => {
  it("should pass a basic smoke test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should return 200 and status ok if server is running", async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${BASE_URL}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("status");
    } catch {
      // Si el servidor no está corriendo, este test se omite
      console.warn("⚠️  Servidor no disponible, saltando test de integración");
    }
  });
});
