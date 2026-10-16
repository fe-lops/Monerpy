import { describe, expect, it } from "vitest";
import { isKeyRejection, isSecretKey, projectRefFromUrl, serviceKeyProblem } from "./supabaseKeys";

const URL = "https://abcdefghijklmnopqrst.supabase.co";

/** Monta um JWT falso (assinatura irrelevante: só o conteúdo é analisado). */
function jwt(payload: object): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.assinatura`;
}

describe("serviceKeyProblem", () => {
  it("aceita service_role do mesmo projeto e Secret key nova", () => {
    expect(serviceKeyProblem(jwt({ role: "service_role", ref: "abcdefghijklmnopqrst" }), URL)).toBeNull();
    expect(serviceKeyProblem("sb_secret_xyz", URL)).toBeNull();
  });

  it("detecta a chave pública colada no lugar da secreta", () => {
    expect(serviceKeyProblem(jwt({ role: "anon", ref: "abcdefghijklmnopqrst" }), URL)).toMatch(/PÚBLICA/);
    expect(serviceKeyProblem("sb_publishable_xyz", URL)).toMatch(/PÚBLICA/);
  });

  it("detecta chave de outro projeto", () => {
    expect(serviceKeyProblem(jwt({ role: "service_role", ref: "zzzzzzzzzzzzzzzzzzzz" }), URL)).toMatch(/outro projeto/);
  });

  it("detecta chave ausente ou cortada", () => {
    expect(serviceKeyProblem("", URL)).toMatch(/não está configurada/);
    expect(serviceKeyProblem("eyJhbGci", URL)).toMatch(/copiada inteira/);
  });
});

describe("auxiliares", () => {
  it("isSecretKey reconhece os dois formatos", () => {
    expect(isSecretKey(jwt({ role: "service_role" }))).toBe(true);
    expect(isSecretKey("sb_secret_x")).toBe(true);
    expect(isSecretKey(jwt({ role: "anon" }))).toBe(false);
  });

  it("extrai o ID do projeto da URL", () => {
    expect(projectRefFromUrl(URL)).toBe("abcdefghijklmnopqrst");
    expect(projectRefFromUrl("http://localhost:54321")).toBeNull();
  });

  it("separa chave recusada de sessão expirada", () => {
    expect(isKeyRejection("Invalid API key")).toBe(true);
    expect(isKeyRejection("Legacy API keys are disabled")).toBe(true);
    expect(isKeyRejection("Auth session missing!")).toBe(false);
  });
});
