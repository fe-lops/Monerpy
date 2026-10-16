import { describe, expect, it } from "vitest";
import { registerSchema, registrationDecisionSchema } from "./schemas";

describe("registerSchema", () => {
  it("normaliza o e-mail (espaços e maiúsculas)", () => {
    expect(registerSchema.parse({ email: "  Ana.Silva@Email.COM " }).email).toBe("ana.silva@email.com");
  });

  it("rejeita e-mail inválido ou vazio", () => {
    expect(registerSchema.safeParse({ email: "ana" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("campo-armadilha preenchido é inválido (robô)", () => {
    expect(registerSchema.safeParse({ email: "a@b.com", website: "spam" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "a@b.com", website: "" }).success).toBe(true);
  });
});

describe("registrationDecisionSchema", () => {
  it("aceita apenas aprovar ou recusar, com motivo curto", () => {
    expect(registrationDecisionSchema.safeParse({ action: "approve" }).success).toBe(true);
    expect(registrationDecisionSchema.safeParse({ action: "reject", note: "Fora do perfil" }).success).toBe(true);
    expect(registrationDecisionSchema.safeParse({ action: "delete" }).success).toBe(false);
    expect(registrationDecisionSchema.safeParse({ action: "reject", note: "x".repeat(501) }).success).toBe(false);
  });
});
