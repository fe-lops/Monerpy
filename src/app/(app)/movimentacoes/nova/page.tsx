"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TransactionForm } from "@/components/TransactionForm";
import { PageHeader, Screen } from "@/components/ui";

function NovaInner() {
  const tipo = useSearchParams().get("tipo");
  return (
    <Screen size="narrow">
      <PageHeader title="Novo lançamento" back={true} />
      <TransactionForm initialType={tipo === "entrada" ? "INCOME" : "EXPENSE"} />
    </Screen>
  );
}

export default function NovaMovimentacaoPage() {
  return (
    <Suspense>
      <NovaInner />
    </Suspense>
  );
}
