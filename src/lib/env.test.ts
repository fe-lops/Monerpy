import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "./env";

describe("normalizeSupabaseUrl", () => {
  it("aceita a URL correta", () => {
    expect(normalizeSupabaseUrl("https://abcdefghijklmnopqrst.supabase.co")).toBe("https://abcdefghijklmnopqrst.supabase.co");
  });

  it("corrige erros comuns de cópia", () => {
    expect(normalizeSupabaseUrl("abcdefghijklmnopqrst.supabase.co")).toBe("https://abcdefghijklmnopqrst.supabase.co");
    expect(normalizeSupabaseUrl("abcdefghijklmnopqrst")).toBe("https://abcdefghijklmnopqrst.supabase.co");
    expect(normalizeSupabaseUrl(" https://abcdefghijklmnopqrst.supabase.co/rest/v1/ ")).toBe("https://abcdefghijklmnopqrst.supabase.co");
    expect(normalizeSupabaseUrl('"https://abcdefghijklmnopqrst.supabase.co"')).toBe("https://abcdefghijklmnopqrst.supabase.co");
  });

  it("rejeita valores que não são URL", () => {
    expect(normalizeSupabaseUrl("")).toBe("");
    expect(normalizeSupabaseUrl("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.x")).toBe("");
    expect(normalizeSupabaseUrl("sb_publishable_abc")).toBe("");
    expect(normalizeSupabaseUrl("minha url")).toBe("");
  });
});
