import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { AuthCard } from "@/components/layout";

/** Despedida exibida depois de excluir a conta (Configurações → Excluir minha conta). */
export default function ContaExcluidaPage() {
  return (
    <AuthCard title="Conta excluída">
      <div className="panel flex flex-col items-center gap-3 p-6 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-accent text-on-accent">
          <HeartHandshake size={28} aria-hidden />
        </span>
        <p className="font-semibold">Sua conta e todos os seus dados foram apagados do Monerpy.</p>
        <p className="text-sm text-ink-2">
          Movimentações, categorias, cobranças, lembretes e dados de perfil não ficam mais guardados. Obrigado por usar o Monerpy! Se quiser voltar, é só pedir
          acesso de novo.
        </p>
      </div>
      <Link href="/login" className="btn-ghost">
        Ir para o início
      </Link>
    </AuthCard>
  );
}
