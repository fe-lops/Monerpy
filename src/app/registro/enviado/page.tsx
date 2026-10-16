import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/layout";

/** Confirmação exibida depois de enviar o pedido de registro. */
export default function RegistroEnviadoPage() {
  return (
    <AuthCard title="Pedido enviado">
      <div className="panel flex flex-col items-center gap-3 p-6 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-accent text-on-accent">
          <MailCheck size={28} aria-hidden />
        </span>
        <p className="font-semibold">Seu registro foi enviado para aprovação dos administradores do sistema.</p>
        <p className="text-sm text-ink-2">
          Aguarde novidades no seu e-mail: se o pedido for aprovado, você receberá um link para criar sua senha. Confira também a caixa de spam.
        </p>
      </div>
      <Link href="/login" className="btn-ghost">
        Voltar para o login
      </Link>
    </AuthCard>
  );
}
