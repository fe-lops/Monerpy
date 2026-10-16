"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { Empty, Field, PageHeader, Screen, Seg, Sheet } from "@/components/ui";
import type { RegistrationRequest, RegistrationStatus } from "@/lib/domain/types";
import { useReady } from "@/providers/DataProvider";
import { useToast } from "@/providers/ToastProvider";

type Decision = { req: RegistrationRequest; action: "approve" | "reject" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/** Administração dos pedidos de registro: aprovar (envia link de criar senha) ou recusar (envia e-mail de recusa). */
export default function RegistrosPage() {
  const { profile, repo } = useReady();
  const toast = useToast();
  const [tab, setTab] = useState<RegistrationStatus>("PENDING");
  const [list, setList] = useState<RegistrationRequest[] | null>(null);
  const [smtp, setSmtp] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  /** Chama as rotas /api/admin com o token da sessão. */
  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await repo.getAccessToken();
      const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Erro ao falar com o servidor.");
      return body;
    },
    [repo],
  );

  const load = useCallback(async () => {
    try {
      const body = await api("/api/admin/registros");
      setList(body.requests);
      setSmtp(body.smtp);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar.");
    }
  }, [api]);

  useEffect(() => {
    if (profile.is_admin) load();
  }, [profile.is_admin, load]);

  if (!profile.is_admin) {
    return (
      <Screen>
        <PageHeader title="Registros" back="/mais" />
        <Empty>Esta área é apenas para administradores.</Empty>
      </Screen>
    );
  }

  async function confirm() {
    if (!decision || busy) return;
    setBusy(true);
    try {
      const body = await api(`/api/admin/registros/${decision.req.id}`, {
        method: "POST",
        body: JSON.stringify({ action: decision.action, note: note.trim() || undefined }),
      });
      const who = decision.req.email;
      if (decision.action === "approve") {
        toast(`Aprovado: ${who} recebeu o link para criar a senha.`);
        if (decision.req.status === "REJECTED") setTab("APPROVED"); // o pedido foi movido para Aprovados
      }
      else toast(body.emailSent ? `Recusado: ${who} foi avisada por e-mail.` : `Recusado: ${who}. E-mail não enviado (SMTP não configurado).`);
      setDecision(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível concluir.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  const count = (s: RegistrationStatus) => list?.filter((r) => r.status === s).length ?? 0;
  const shown = list?.filter((r) => r.status === tab) ?? [];
  const resend = decision?.action === "approve" && decision.req.status === "APPROVED";
  const fromRejected = decision?.action === "approve" && decision.req.status === "REJECTED";

  return (
    <Screen>
      <PageHeader
        title="Registros"
        back="/mais"
        right={
          <button type="button" className="icon-btn" aria-label="Atualizar" onClick={load}>
            <RefreshCw size={20} />
          </button>
        }
      />
      <p className="cap -mt-2">Pedidos de acesso de novas usuárias. Aprovar envia um link para criar a senha; recusar envia um aviso por e-mail.</p>

      {!smtp && (
        <div className="panel p-4 text-sm" role="note">
          <strong>SMTP não configurado.</strong>
          <span className="text-ink-2">
            {" "}
            Aprovações usam o convite padrão do Supabase (limite de 2 e-mails por hora) e recusas não enviam e-mail. Veja “Configurar SMTP” no README.
          </span>
        </div>
      )}

      <Seg
        label="Situação"
        small
        value={tab}
        onChange={setTab}
        options={[
          ["PENDING", `Pendentes (${count("PENDING")})`],
          ["APPROVED", `Aprovados (${count("APPROVED")})`],
          ["REJECTED", `Recusados (${count("REJECTED")})`],
        ]}
      />

      {loadError && (
        <p className="error" role="alert">
          {loadError}
        </p>
      )}
      {list === null && !loadError && <Empty>Carregando…</Empty>}
      {list && shown.length === 0 && <Empty>{tab === "PENDING" ? "Nenhum pedido aguardando aprovação." : "Nada por aqui."}</Empty>}

      {shown.length > 0 && (
        <ul className="list panel">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col">
                <span className="row-name">{r.email}</span>
                <span className="row-sub">
                  Pedido em {when(r.created_at)}
                  {r.decided_at && ` · decidido em ${when(r.decided_at)}`}
                </span>
                {r.note && <span className="row-sub">Motivo: {r.note}</span>}
              </div>
              <div className="flex flex-none gap-2">
                {r.status === "PENDING" && (
                  <>
                    <button type="button" className="chip" style={{ background: "var(--income-solid)", borderColor: "var(--income-solid)", color: "#fff" }} onClick={() => setDecision({ req: r, action: "approve" })}>
                      <Check size={16} aria-hidden /> Aprovar
                    </button>
                    <button type="button" className="chip" style={{ color: "var(--neg-ink)" }} onClick={() => (setNote(""), setDecision({ req: r, action: "reject" }))}>
                      <X size={16} aria-hidden /> Recusar
                    </button>
                  </>
                )}
                {r.status === "REJECTED" && (
                  <button type="button" className="chip" onClick={() => setDecision({ req: r, action: "approve" })}>
                    <Check size={16} aria-hidden /> Aprovar cadastro
                  </button>
                )}
                {r.status === "APPROVED" && (
                  <button type="button" className="chip" onClick={() => setDecision({ req: r, action: "approve" })}>
                    <RefreshCw size={16} aria-hidden /> Reenviar link
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision?.action === "reject" ? "Recusar registro?" : resend ? "Reenviar link?" : fromRejected ? "Aprovar cadastro recusado?" : "Aprovar registro?"}
      >
        {decision && (
          <>
            <div className="panel p-4">
              <span className="row-name">{decision.req.email}</span>
            </div>
            {decision.action === "approve" ? (
              <p className="text-ink-2">
                {resend
                  ? "Um novo link para criar a senha será enviado. O anterior deixa de valer."
                  : fromRejected
                    ? "O pedido sai de Recusados e vai para Aprovados. A conta será criada e a pessoa receberá um e-mail com o link para criar a senha."
                    : "A conta será criada e a pessoa receberá um e-mail com o link para criar a senha."}
              </p>
            ) : (
              <>
                <p className="text-ink-2">A pessoa receberá um e-mail informando que o registro foi recusado.</p>
                <Field label="Motivo (opcional, vai no e-mail)">
                  {(id) => <textarea id={id} className="field" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}
                </Field>
              </>
            )}
            <button
              type="button"
              className="cta"
              style={{ background: decision.action === "reject" ? "var(--expense-solid)" : "var(--income-solid)", color: "#fff" }}
              disabled={busy}
              onClick={confirm}
            >
              {busy ? "Enviando…" : decision.action === "reject" ? "Recusar registro" : resend ? "Reenviar link" : fromRejected ? "Aprovar cadastro" : "Aprovar e enviar link"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setDecision(null)}>
              Cancelar
            </button>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
