import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const cents = z.number().int().positive("Informe um valor maior que zero.").max(99_999_999_999_99, "Valor muito alto.");

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const recoverSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
});
export type RecoverInput = z.infer<typeof recoverSchema>;

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Use pelo menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem." });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

/** Lançamento simples (entrada ou saída). */
export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    scope: z.enum(["BUSINESS", "PERSONAL"]),
    status: z.enum(["PENDING", "SETTLED"]),
    amount: cents,
    description: z.string().trim().max(80, "Use até 80 caracteres."),
    category_id: z.string().min(1, "Escolha uma categoria."),
    transaction_date: isoDate,
    /** Vencimento (saída) ou data prevista (entrada). Opcional para receitas previstas. */
    ref_date: isoDate.or(z.literal("")),
    settled_at: isoDate.or(z.literal("")),
    payment_method: z.enum(["PIX", "DEBIT_CARD", "CREDIT_CARD", "UNSPECIFIED"]),
    notes: z.string().max(500, "Use até 500 caracteres."),
  })
  .superRefine((v, ctx) => {
    if (v.status === "SETTLED") {
      if (!v.settled_at) ctx.addIssue({ code: "custom", path: ["settled_at"], message: "Informe a data efetiva." });
      if (v.payment_method === "UNSPECIFIED")
        ctx.addIssue({ code: "custom", path: ["payment_method"], message: "Escolha a forma de pagamento/recebimento." });
    }
    if (v.status === "PENDING" && v.type === "EXPENSE" && !v.ref_date)
      ctx.addIssue({ code: "custom", path: ["ref_date"], message: "Informe o vencimento." });
  });
export type TransactionInput = z.infer<typeof transactionSchema>;

export const installmentSchema = z.object({
  description: z.string().trim().min(1, "Descreva a compra.").max(60, "Use até 60 caracteres."),
  total_amount: cents,
  installment_count: z.number().int().min(2, "Mínimo de 2 parcelas.").max(48, "Máximo de 48 parcelas."),
  first_due_date: isoDate,
  scope: z.enum(["BUSINESS", "PERSONAL"]),
  category_id: z.string().min(1, "Escolha uma categoria."),
});

export const openingSchema = z.object({
  display_name: z.string().trim().max(60),
  opening_balance: z.number().int().min(-99_999_999_999_99).max(99_999_999_999_99),
  opening_balance_date: isoDate,
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(60, "Use até 60 caracteres."),
  transaction_type: z.enum(["INCOME", "EXPENSE"]),
  default_scope: z.enum(["BUSINESS", "PERSONAL"]),
});

/** Primeira mensagem de erro por campo. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "_");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

/** Pedido de registro: apenas o e-mail. `website` é um campo-armadilha contra robôs (deve vir vazio). */
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Informe o e-mail.").max(254, "E-mail muito longo.").email("E-mail inválido."),
  website: z.string().max(0).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Decisão do administrador sobre um pedido de registro. */
export const registrationDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500, "Use até 500 caracteres.").optional(),
});
