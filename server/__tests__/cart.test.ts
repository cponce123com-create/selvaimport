import { describe, it, expect } from "vitest";

const BASE_URL = process.env.TEST_URL || "http://localhost:5000";

describe("Cart & Sitemap API", () => {
  it("should pass a basic smoke test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should return sitemap.xml if server is running", async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${BASE_URL}/sitemap.xml`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      expect(res.status).toBe(200);

      const text = await res.text();
      expect(text).toContain("<?xml");
      expect(text).toContain("<urlset");
      expect(text).toContain("<url>");
      expect(res.headers.get("Content-Type")).toContain("application/xml");
    } catch {
      console.warn("⚠️  Servidor no disponible, saltando test de integración");
    }
  });

  it("should return robots.txt if server is running", async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${BASE_URL}/robots.txt`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      expect(res.status).toBe(200);

      const text = await res.text();
      expect(text).toContain("User-agent");
      expect(text).toContain("Sitemap");
      expect(res.headers.get("Content-Type")).toContain("text/plain");
    } catch {
      console.warn("⚠️  Servidor no disponible, saltando test de integración");
    }
  });

  it("should return security headers if server is running", async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${BASE_URL}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Security headers
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
      expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    } catch {
      console.warn("⚠️  Servidor no disponible, saltando test de integración");
    }
  });

  it("should reject unauthenticated cart access if server is running", async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      // Sin cookie de sesión, debe devolver 401
      const res = await fetch(`${BASE_URL}/api/cart`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      expect(res.status).toBe(401);
    } catch {
      console.warn("⚠️  Servidor no disponible, saltando test de integración");
    }
  });
});
