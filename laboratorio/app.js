"use strict";
const $ = (selector) => document.querySelector(selector);
const state = {
  user: null,
  csrf: null,
  sessions: [],
  session: null,
  accounts: [],
  selectedAccount: null,
  view: "home",
  mode: "bank",
  balanceVisible: true,
  draft: null,
  timer: null,
  scripted: null,
  idempotency: new Map(),
};
const money = (c) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    c / 100,
  );
const date = (t) => new Date(t).toLocaleString("pt-BR");
function node(tag, text, parent, cls = "") {
  const el = document.createElement(tag);
  if (text !== null && text !== undefined) el.textContent = text;
  el.className = cls;
  if (parent) parent.append(el);
  return el;
}
function displayLabel(value) {
  return (
    {
      participant: "Participante",
      researcher: "Pesquisador",
      admin: "Administrador",
      active: "Ativa",
      archived: "Arquivada",
      closed: "Encerrada",
      person: "Pessoa física fictícia",
      business: "Pessoa jurídica fictícia",
      new: "Conta nova",
      established: "Perfil consolidado",
      restricted: "Restrição interna",
      review: "Conferência",
      verification: "Verificação",
      pause: "Pausa educativa",
      blocked: "Interrompida",
      completed: "Concluída",
      cancelled: "Reconsiderada",
    }[value] || value
  );
}
function clear(el) {
  el.replaceChildren();
}
function feedback(message) {
  $("#lab-feedback").textContent = message;
}
function action(parent, label, fn, cls = "") {
  const b = node("button", label, parent, cls);
  b.type = "button";
  b.addEventListener("click", () => safe(fn));
  return b;
}
function field(
  parent,
  label,
  name,
  {
    type = "text",
    value = "",
    required = false,
    options,
    placeholder,
    min,
    max,
    step,
  } = {},
) {
  const wrapper = node("label", label, parent);
  let el;
  if (options) {
    el = node("select", null, wrapper);
    for (const [v, t] of options) {
      const o = node("option", t, el);
      o.value = v;
    }
  } else el = node(type === "textarea" ? "textarea" : "input", null, wrapper);
  el.name = name;
  if (!options && type !== "textarea") el.type = type;
  if (type === "checkbox") wrapper.className = "check";
  if (type === "checkbox") el.checked = !!value;
  else
    el.value = String(options ? value || options[0]?.[0] || "" : (value ?? ""));
  if (required) el.required = true;
  if (placeholder) el.placeholder = placeholder;
  if (min !== undefined) el.min = String(min);
  if (max !== undefined) el.max = String(max);
  if (step !== undefined) el.step = String(step);
  if (type === "password") {
    el.autocomplete = "off";
    el.maxLength = 128;
  }
  return el;
}
function form(parent, id, title, handler) {
  const f = node("form", null, parent, "lab-card");
  f.id = id;
  if (title) node("h2", title, f);
  f.addEventListener("submit", (event) => {
    event.preventDefault();
    safe(() => handler(f));
  });
  return f;
}
function data(form) {
  const body = Object.fromEntries(new FormData(form));
  for (const checkbox of form.querySelectorAll("input[type=checkbox]"))
    body[checkbox.name] = checkbox.checked;
  return body;
}
function submit(form, label) {
  const b = node("button", label, form, "primary");
  b.type = "submit";
  return b;
}
function details(parent, title) {
  const d = node("details", null, parent);
  node("summary", title, d);
  return d;
}
function card(parent, title, cls = "") {
  const c = node("section", null, parent, `lab-card ${cls}`);
  if (title) node("h2", title, c);
  return c;
}
function summary(parent, rows) {
  const dl = node("dl", null, parent);
  for (const [title, value] of rows) {
    const row = node("div", null, dl);
    node("dt", title, row);
    node("dd", value, row);
  }
  return dl;
}
function parseCents(value) {
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value.trim()))
    throw new Error("Use um valor como 250,00.");
  const [whole, fraction = ""] = value.replaceAll(".", "").split(",");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result <= 0 || result > 1000000000)
    throw new Error("Valor virtual inválido.");
  return result;
}
async function api(path, { method = "GET", body, idem } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (state.csrf) headers["X-CSRF-Token"] = state.csrf;
  if (idem) headers["Idempotency-Key"] = idem;
  const response = await fetch("/api" + path, {
    method,
    headers,
    credentials: "same-origin",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response.json().catch(() => ({
    error: {
      message:
        "Servidor persistente indisponível. Inicie npm start; o Live Server serve apenas a demonstração original.",
    },
  }));
  if (!response.ok) {
    const e = new Error(value.error?.message || "Falha na operação.");
    e.status = response.status;
    e.code = value.error?.code;
    throw e;
  }
  return value;
}
async function safe(fn) {
  try {
    await fn();
  } catch (e) {
    feedback(e.message || "Falha na operação.");
    if (e.status === 401) {
      stopTimer();
      state.user = null;
      showAuth();
    }
  }
}
function stopTimer() {
  if (state.timer !== null) clearInterval(state.timer);
  state.timer = null;
}
function focusWorkspace() {
  const title = $("#workspace h2");
  if (title) {
    title.tabIndex = -1;
    title.focus();
  }
}
function showAuth() {
  stopTimer();
  state.user = null;
  state.csrf = null;
  state.session = null;
  state.accounts = [];
  state.selectedAccount = null;
  state.draft = null;
  state.scripted = null;
  state.idempotency.clear();
  state.mode = "bank";
  state.balanceVisible = true;
  clear($("#workspace"));
  document.body.dataset.access = "login";
  syncBankShell();
  $("#auth-view").hidden = false;
  $("#bank-view").hidden = true;
  $("#logout").hidden = true;
  $("#identity").textContent = "";
}
async function refreshSessions(selectId) {
  state.sessions = await api("/sessions");
  const picker = $("#session-select");
  clear(picker);
  if (!state.sessions.length) {
    const empty = node("option", "Nenhuma sessão — aceite um convite", picker);
    empty.value = "";
    state.session = null;
  } else {
    for (const s of state.sessions) {
      const o = node(
        "option",
        `${s.name} · ${displayLabel(s.role)}${s.status !== "active" ? " · " + displayLabel(s.status) : ""}`,
        picker,
      );
      o.value = s.id;
    }
    picker.value = state.sessions.some((s) => s.id === selectId)
      ? selectId
      : state.sessions[0].id;
    state.session = await api("/sessions/" + picker.value);
  }
  await refreshAccounts();
  $("#session-status").textContent = state.session
    ? `${displayLabel(state.session.status)} · ${displayLabel(state.session.role)}`
    : "";
  $("#research-nav").hidden = !isResearch();
  syncBankShell();
}
async function refreshAccounts() {
  state.accounts = state.session
    ? await api(`/sessions/${state.session.id}/accounts`)
    : [];
  if (!state.accounts.some((a) => a.id === state.selectedAccount))
    state.selectedAccount = state.accounts[0]?.id || null;
}
async function authenticated() {
  const me = await api("/auth/me");
  state.user = me.user;
  state.csrf = me.csrf;
  $("#auth-view").hidden = true;
  $("#bank-view").hidden = false;
  $("#logout").hidden = false;
  $("#identity").textContent = state.user.alias;
  document.body.dataset.access = "authenticated";
  state.mode = "bank";
  await refreshSessions(state.session?.id);
  const requested = new URLSearchParams(location.search).get("screen");
  await renderView(
    ["screening", "action-post", "rights", "edu-center"].includes(requested)
      ? requested
      : "home",
  );
}
function isResearch() {
  return ["admin", "researcher"].includes(state.session?.role);
}
function activeAccount() {
  return state.accounts.find((a) => a.id === state.selectedAccount);
}
function needSession() {
  if (!state.session)
    throw new Error("Selecione uma sessão ou aceite um convite.");
}
function needAccount() {
  needSession();
  const a = activeAccount();
  if (!a) throw new Error("Crie uma conta fictícia nesta sessão.");
  return a;
}
async function setView(view) {
  if (
    state.view === "pix" &&
    view !== "pix" &&
    state.draft &&
    ["review", "verification", "pause"].includes(state.draft.status)
  ) {
    state.draft = await api(`/drafts/${state.draft.id}/cancel`, {
      method: "POST",
      body: { reason: "Abandono da jornada por navegação; nenhum débito." },
    });
  }
  stopTimer();
  await renderView(view);
  focusWorkspace();
}
async function renderView(view) {
  state.view = view;
  for (const b of document.querySelectorAll("[data-view]")) {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  }
  if (view === "research" && (!isResearch() || state.mode !== "admin"))
    throw new Error("Área restrita à equipe autorizada.");
  syncBankShell();
  const w = $("#workspace");
  clear(w);
  if (view === "home") return renderBankHome(w);
  if (["screening", "action-post", "rights", "edu-center"].includes(view))
    return renderBankEducation(w, view);
  if (view === "security") return renderBankSecurity(w);
  if (view === "protection") return renderBankProtection(w);
  if (view === "sessions") return renderSessions(w);
  if (!state.session) return renderSessions(w);
  if (
    state.mode === "bank" &&
    !activeAccount() &&
    ["pix", "statement", "protection"].includes(view)
  ) {
    node("p", "Crie sua conta simulada para começar.", w);
    return renderAccounts(w);
  }
  needSession();
  if (view === "accounts") return renderAccounts(w);
  if (view === "statement") return renderStatement(w);
  if (view === "reviews") return renderReviews(w);
  if (view === "research") return renderResearch(w);
  if (view === "pix") {
    if (state.draft && state.draft.sessionId === state.session.id)
      return renderDraft(w, state.draft);
    return renderPixStart(w);
  }
}
function sessionActions(w) {
  if (state.session) node("p", state.session.config.consentNotice, w, "muted");
}
async function renderSessions(w) {
  const grid = node("div", null, w, "lab-grid");
  const join = form(grid, "join-form", "Aceitar convite", async (f) => {
    const joined = await api("/join", {
      method: "POST",
      body: { code: data(f).code },
    });
    await refreshSessions(joined.id);
    feedback("Convite aceito.");
    await renderView("accounts");
  });
  field(join, "Código de convite da equipe", "code", { required: true });
  submit(join, "Entrar na sessão");
  if (state.mode === "admin" && state.user.globalRole === "admin") {
    const create = form(
      grid,
      "create-session-form",
      "Criar sessão acadêmica",
      async (f) => {
        const created = await api("/sessions", {
          method: "POST",
          body: { name: data(f).name },
        });
        await refreshSessions(created.id);
        feedback("Sessão persistente criada.");
        await renderView("accounts");
      },
    );
    field(create, "Nome da sessão", "name", { required: true });
    submit(create, "Criar sessão");
  }
  const list = card(w, "Sessões autorizadas");
  for (const s of state.sessions) {
    const row = node("div", null, list, "lab-card");
    node("h3", s.name, row);
    node("p", `${displayLabel(s.status)} · ${displayLabel(s.role)}`, row);
    action(row, "Abrir sessão", async () => {
      state.draft = null;
      await refreshSessions(s.id);
      await renderView("accounts");
    });
  }
  if (!state.sessions.length)
    node(
      "p",
      "A equipe deve criar e fornecer um convite. Não há acesso automático a outras sessões.",
      list,
    );
}
async function renderAccounts(w) {
  if (state.mode === "bank") bankViewHeading(w, "Minhas contas");
  else sessionActions(w);
  await refreshAccounts();
  const grid = node("div", null, w, "lab-grid");
  for (const a of state.accounts) {
    const c = card(grid, a.name);
    node(
      "span",
      displayLabel(a.profile) + " · " + displayLabel(a.status),
      c,
      "badge",
    );
    node("strong", money(a.balanceCents), c, "money");
    node("p", `Limite por Pix: ${money(a.limitCents)}`, c, "muted");
    const actions = node("div", null, c, "actions");
    action(
      actions,
      "Fazer Pix",
      async () => {
        state.selectedAccount = a.id;
        state.draft = null;
        await renderView("pix");
      },
      "primary",
    );
    action(actions, "Extrato", async () => {
      state.selectedAccount = a.id;
      await renderView("statement");
    });
    const keys = details(c, "Receber Pix e administrar chaves fictícias");
    for (const k of a.keys) {
      const row = node("div", null, keys);
      node("code", k.value, row);
      node("p", k.active ? "Ativa" : "Desativada", row, "muted");
      if (k.active) {
        const buttons = node("div", null, row, "actions");
        action(buttons, "Copiar chave", async () => {
          await navigator.clipboard.writeText(k.value);
          feedback("Chave fictícia copiada.");
        });
        action(buttons, "Substituir chave", async () => {
          await api("/keys/" + k.id, { method: "PATCH", body: {} });
          await renderView("accounts");
        });
        action(buttons, "Excluir chave", async () => {
          await api("/keys/" + k.id, { method: "DELETE", body: {} });
          await renderView("accounts");
        });
      }
    }
    action(keys, "Gerar outra chave fictícia", async () => {
      await api(`/accounts/${a.id}/keys`, { method: "POST", body: {} });
      await renderView("accounts");
    });
  }
  const create = form(
    w,
    "create-account-form",
    state.mode === "admin"
      ? "Criar conta fictícia"
      : "Adicionar conta simulada",
    async (f) => {
      const body = data(f);
      await api(`/sessions/${state.session.id}/accounts`, {
        method: "POST",
        body,
      });
      await renderView("accounts");
      feedback("Conta e alocação virtual registradas no livro-razão.");
    },
  );
  field(
    create,
    state.mode === "admin"
      ? "Nome fictício do titular"
      : "Nome da conta (fictício)",
    "name",
    { required: true },
  );
  field(
    create,
    state.mode === "admin"
      ? "Perfil experimental (não é sinal de fraude)"
      : "Tipo de conta",
    "profile",
    {
      options: state.session.config.profiles.map((profile) => [
        profile,
        displayLabel(profile),
      ]),
    },
  );
  submit(create, "Criar conta");
  node(
    "p",
    state.mode === "admin"
      ? `Alocação por conta: ${money(state.session.config.initialCents)}. Limite: ${state.session.config.maxAccounts} contas. O participante não edita o saldo.`
      : `Cada conta começa com ${money(state.session.config.initialCents)} em valores virtuais.`,
    create,
    "muted",
  );
  const drafts = await api(`/sessions/${state.session.id}/drafts`);
  if (drafts.length) {
    const section = card(
      w,
      state.mode === "admin"
        ? "Jornadas e tentativas desta sessão"
        : "Minhas operações",
    );
    for (const d of drafts) {
      const row = node("div", null, section, "lab-card");
      node(
        "p",
        `${d.recipient} · ${money(d.amountCents)} · ${displayLabel(d.status)}`,
        row,
      );
      action(
        row,
        d.status === "completed" ? "Ver comprovante" : "Abrir jornada",
        async () => {
          state.draft = d;
          state.selectedAccount = d.sourceId;
          await renderView("pix");
        },
      );
    }
  }
  const tasks = await api(`/sessions/${state.session.id}/tasks`);
  if (tasks.length) {
    const c = card(
      w,
      state.mode === "admin"
        ? "Operações experimentais atribuídas"
        : "Tarefas da sua equipe",
    );
    const taskContext = field(
      c,
      "Quero verificar uma suspeita ao abrir a tarefa",
      "taskContext",
      { type: "checkbox" },
    );
    for (const task of tasks) {
      node(
        "p",
        `${task.source} → ${task.destination} · ${money(task.amountCents)} · ${task.status ? displayLabel(task.status) : "não iniciada"}`,
        c,
      );
      action(c, "Abrir operação atribuída", async () => {
        state.draft = await api(`/tasks/${task.id}/draft`, {
          method: "POST",
          body: { requestContext: taskContext.checked },
        });
        state.selectedAccount = task.sourceId;
        await renderView("pix");
      });
    }
  }
}
function accountPicker(parent, change) {
  const select = field(parent, "Conta de origem", "source", {
    options: state.accounts.map((a) => [
      a.id,
      `${a.name} · ${state.balanceVisible ? money(a.balanceCents) : "saldo oculto"}`,
    ]),
    value: state.selectedAccount,
  });
  select.addEventListener("change", () =>
    safe(async () => {
      state.selectedAccount = select.value;
      state.draft = null;
      if (change) await change();
    }),
  );
  return select;
}
function renderPixStart(w) {
  const a = needAccount(),
    c = card(w, "Fazer Pix", "journey");
  accountPicker(c, () => renderView("pix"));
  node(
    "p",
    "Escolha como deseja transferir. Todas as contas são fictícias.",
    c,
  );
  action(
    c,
    "Transferir por chave fictícia",
    () => renderRecipient(w, "key"),
    "primary wide",
  );
  action(
    c,
    "Minhas contas e contatos",
    () => renderRecipient(w, "contacts"),
    "secondary wide",
  );
  for (const name of [
    "Ler QR Code — indisponível",
    "Pix Copia e Cola — indisponível",
  ]) {
    const b = action(c, name, () => {}, "wide");
    b.disabled = true;
  }
  node("p", `Saldo de origem: ${money(a.balanceCents)}`, c, "muted");
}
async function renderRecipient(w, method) {
  clear(w);
  const c = card(
    w,
    method === "key" ? "Qual é a chave Pix?" : "Destinatário",
    "journey",
  );
  const input = field(c, "Chave fictícia da sessão", "key", {
    placeholder: "sim-…@pix.justec.invalid",
  });
  let found = null;
  const result = node("div", null, c);
  const lookup = action(
    c,
    "Conferir destinatário",
    async () => {
      found = await api(`/sessions/${state.session.id}/lookup`, {
        method: "POST",
        body: { key: input.value },
      });
      clear(result);
      summary(result, [
        ["Destinatário", found.name],
        ["Instituição", found.institution],
        ["Chave", found.maskedKey],
        ["Situação", displayLabel(found.status)],
      ]);
      next.disabled = false;
    },
    "primary wide",
  );
  const next = action(
    c,
    "Continuar para valor",
    () => renderValue(w, found),
    "secondary wide",
  );
  next.disabled = true;
  input.addEventListener("input", () => {
    found = null;
    next.disabled = true;
    clear(result);
  });
  if (method === "contacts") {
    const choices = state.accounts.filter(
      (a) => a.id !== state.selectedAccount && a.keys.some((k) => k.active),
    );
    if (!choices.length)
      node(
        "p",
        "Nenhuma outra conta própria com chave. Peça a chave fictícia a outro participante da mesma sessão.",
        c,
      );
    for (const a of choices)
      action(c, a.name, async () => {
        input.value = a.keys.find((k) => k.active).value;
        lookup.click();
      });
  }
  action(c, "Voltar", () => renderView("pix"));
  focusWorkspace();
}
function renderValue(w, recipient) {
  if (!recipient) throw new Error("Confira o destinatário.");
  clear(w);
  const c = card(w, "Qual é o valor?", "journey");
  node("p", `Para ${recipient.name}`, c);
  node(
    "p",
    `Saldo fictício disponível: ${money(needAccount().balanceCents)}`,
    c,
  );
  const f = node("form", null, c);
  f.id = "lab-value-form";
  const amount = field(f, "Valor em reais", "amount", {
    placeholder: "250,00",
    required: true,
  });
  amount.inputMode = "decimal";
  field(f, "Quero verificar uma suspeita ou pressão", "requestContext", {
    type: "checkbox",
  });
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    safe(async () => {
      state.draft = await api(`/sessions/${state.session.id}/drafts`, {
        method: "POST",
        body: {
          sourceId: state.selectedAccount,
          key: recipient.key,
          amountCents: parseCents(amount.value),
          requestContext: data(f).requestContext,
        },
      });
      state.scripted = null;
      await renderView("pix");
    });
  });
  submit(f, "Continuar para conferência");
  action(c, "Alterar destinatário", () => renderRecipient(w, "key"));
  focusWorkspace();
}
async function renderDraft(w, draft) {
  stopTimer();
  clear(w);
  if (draft.status === "completed") {
    const receipt = await api("/transfers/" + draft.transferId);
    return renderReceipt(w, receipt);
  }
  if (draft.status === "review") return renderReview(w, draft);
  if (draft.status === "verification") return renderVerification(w, draft);
  if (draft.status === "pause") return renderPause(w, draft);
  const c = card(
    w,
    draft.status === "blocked" ? "Pix interrompido" : "Operação reconsiderada",
    "journey",
  );
  summary(c, [
    ["Destinatário", draft.recipient],
    ["Valor", money(draft.amountCents)],
    ["Situação", displayLabel(draft.status)],
  ]);
  node(
    "p",
    draft.evaluation?.decision.justification || "Nenhum saldo foi alterado.",
    c,
  );
  node(
    "p",
    "Sem débito. Uma interrupção não significa restrição permanente da conta.",
    c,
    "muted",
  );
  if (draft.status === "blocked") {
    const f = form(
      c,
      "review-request",
      "Solicitar revisão simulada",
      async (el) => {
        await api(`/drafts/${draft.id}/reviews`, {
          method: "POST",
          body: { reason: data(el).reason },
        });
        feedback("Revisão registrada. A decisão original foi preservada.");
        await renderView("reviews");
      },
    );
    field(f, "Esclarecimento fictício (10–500 caracteres)", "reason", {
      required: true,
    });
    submit(f, "Solicitar revisão");
  } else
    action(
      c,
      "Conferir novamente os mesmos dados",
      async () => {
        state.draft = await api(`/drafts/${draft.id}/revise`, {
          method: "POST",
          body: {},
        });
        await renderView("pix");
      },
      "primary wide",
    );
  action(c, "Nova operação", () => {
    state.draft = null;
    return renderView("pix");
  });
  if (["blocked", "cancelled"].includes(draft.status))
    participantFeedback(c, draft.id);
}
function renderReview(w, d) {
  const c = card(w, "Conferir Pix", "journey");
  node(
    "p",
    "Confira os dados; a autorização e o débito ainda não ocorreram.",
    c,
  );
  summary(c, [
    ["Destinatário", d.recipient],
    ["Instituição", d.institution],
    ["Chave", d.maskedKey],
    ["Valor", money(d.amountCents)],
  ]);
  const checked = field(c, "Conferi os dados fictícios", "checked", {
    type: "checkbox",
  });
  action(
    c,
    "Continuar com JUSTEC Guard",
    async () => {
      if (!checked.checked) throw new Error("Confira e confirme os dados.");
      state.draft = await api(`/drafts/${d.id}/evaluate`, {
        method: "POST",
        body: {},
      });
      await renderView("pix");
    },
    "primary wide",
  );
  action(c, "Corrigir dados", async () => {
    await api(`/drafts/${d.id}/cancel`, {
      method: "POST",
      body: { reason: "Correção dos dados; autorização anterior invalidada." },
    });
    state.draft = null;
    await renderRecipient(w, "key");
  });
  focusWorkspace();
}
function evaluationDetails(parent, d) {
  const info = details(parent, "Justificativa e indicadores do Guard");
  node("p", d.evaluation?.decision.justification || "", info);
  if (state.mode === "admin" && isResearch())
    node("pre", JSON.stringify(d.evaluation, null, 2), info);
}
function renderVerification(w, d) {
  const c = card(w, "Verificação adicional", "journey");
  node("p", d.evaluation.decision.justification, c);
  const f = node("form", null, c);
  f.id = "lab-context-form";
  for (const [key, label] of d.evaluation.contextualEnabled
    ? [
        ["identity", "Você confirmou a identidade?"],
        ["urgency", "Há pressão para transferir imediatamente?"],
        [
          "advance",
          "Pediram pagamento para liberar prêmio, empréstimo ou recuperar valores?",
        ],
        ["ignore", "Orientaram ignorar alertas do banco?"],
      ]
    : [])
    field(f, label, key, {
      options: [
        ["unknown", "Não sei"],
        ["yes", "Sim"],
        ["no", "Não"],
      ],
      value: state.scripted?.[key] || "unknown",
    });
  field(
    f,
    "Entendi os alertas e verifiquei por canal independente",
    "acknowledged",
    { type: "checkbox" },
  );
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    safe(async () => {
      const values = data(f),
        { acknowledged, ...answers } = values;
      state.draft = await api(`/drafts/${d.id}/evaluate`, {
        method: "POST",
        body: { answers, acknowledged },
      });
      await renderView("pix");
    });
  });
  submit(f, "Avaliar minhas respostas");
  node(
    "p",
    d.evaluation.contextualEnabled
      ? "Respostas negativas não garantem segurança. “Não sei” mantém a verificação inconclusiva."
      : "Nesta condição, somente o reconhecimento do alerta é solicitado; perguntas contextuais estão desativadas.",
    c,
    "muted",
  );
  evaluationDetails(c, d);
  action(c, "Reconsiderar", () => cancelJourney(d));
  focusWorkspace();
}
function renderPause(w, d) {
  const c = card(w, null, "pause");
  node("p", "◈ JUSTEC GUARD", c, "guard-label");
  node("h2", "Antes de autorizar seu Pix...", c);
  node("p", "Este é um momento para conferir e reconsiderar.", c);
  node("p", d.evaluation.tip.text, c, "tip");
  summary(c, [
    ["Para", d.recipient],
    ["Valor", money(d.amountCents)],
  ]);
  const label = node("label", "Tempo de reflexão educativa", c);
  const progress = node("progress", null, label);
  progress.max = 100;
  progress.value = 0;
  const status = node("p", "Pausa educativa; não é processamento bancário.", c);
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  action(
    c,
    "Reconsiderar ou verificar",
    () => cancelJourney(d),
    "primary wide",
  );
  const next = action(
    c,
    "Continuar para senha demonstrativa",
    async () => {
      const fresh = await api("/drafts/" + d.id);
      if (fresh.serverNow < fresh.readyAt)
        throw new Error("A pausa do servidor ainda não terminou.");
      state.draft = fresh;
      renderAuthorization(w, fresh);
    },
    "secondary wide",
  );
  next.id = "lab-pause-next";
  next.disabled = true;
  const remainingAtStart = Math.max(0, d.readyAt - d.serverNow),
    end = Date.now() + remainingAtStart,
    total = Math.max(1, d.evaluation.pauseMs);
  const tick = () => {
    const remaining = Math.max(0, end - Date.now());
    progress.value = Math.max(0, 100 * (1 - remaining / total));
    if (!remaining) {
      stopTimer();
      next.disabled = false;
      status.textContent = "Pausa concluída. Você decide se deseja continuar.";
    }
  };
  state.timer = setInterval(tick, 200);
  tick();
  node(
    "p",
    "O intervalo é experimental, sem duração cientificamente validada. Nada será enviado automaticamente.",
    c,
    "muted",
  );
  focusWorkspace();
}
async function cancelJourney(d) {
  stopTimer();
  state.draft = await api(`/drafts/${d.id}/cancel`, {
    method: "POST",
    body: { reason: "Reconsideração voluntária durante a jornada." },
  });
  await renderView("pix");
  const w = $("#workspace");
  const a = node("a", "Abrir triagem preventiva ↗", w, "action");
  a.href = "/?screen=screening";
  a.target = "_blank";
  a.rel = "noopener";
}
function renderAuthorization(w, d) {
  stopTimer();
  clear(w);
  const c = card(w, "Digite sua senha demonstrativa", "journey");
  node(
    "p",
    "Use somente 0000. Não informe senha bancária real; o acesso já foi autenticado no servidor.",
    c,
  );
  const code = field(c, "Código demonstrativo 0000", "demoCode", {
    type: "password",
  });
  code.inputMode = "numeric";
  code.maxLength = 4;
  code.className = "credential";
  const keys = node("div", null, c, "keypad");
  for (const k of [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    null,
    "0",
    "⌫",
  ]) {
    if (k === null) {
      node("span", "", keys);
      continue;
    }
    action(keys, k, () => {
      code.value =
        k === "⌫" ? code.value.slice(0, -1) : (code.value + k).slice(0, 4);
      update();
    });
  }
  const confirm = field(
    c,
    "Confirmo apenas esta operação fictícia",
    "confirm",
    { type: "checkbox" },
  );
  const button = action(
    c,
    "Confirmar Pix fictício",
    async () => {
      button.disabled = true;
      const demoCode = code.value;
      code.value = "";
      confirm.checked = false;
      try {
        const idem = state.idempotency.get(d.id) || crypto.randomUUID();
        state.idempotency.set(d.id, idem);
        const result = await api(`/drafts/${d.id}/authorize`, {
          method: "POST",
          body: { demoCode },
          idem,
        });
        if (result.interrupted) {
          state.draft = result.draft;
          await renderView("pix");
        } else {
          state.draft = { ...d, status: "completed", transferId: result.id };
          await refreshAccounts();
          clear(w);
          renderReceipt(w, result);
        }
      } finally {
        update();
      }
    },
    "primary wide",
  );
  button.id = "lab-authorize";
  function update() {
    button.disabled = code.value.length !== 4 || !confirm.checked;
  }
  code.addEventListener("input", update);
  confirm.addEventListener("change", update);
  update();
  action(c, "Voltar à conferência", async () => {
    state.draft = await api(`/drafts/${d.id}/revise`, {
      method: "POST",
      body: {},
    });
    await renderView("pix");
  });
  focusWorkspace();
}
function participantFeedback(parent, draftId) {
  const section = details(
    parent,
    "Avaliação opcional da experiência (autorreporte)",
  );
  const f = node("form", null, section);
  field(f, "Você compreendeu o motivo da orientação?", "understanding", {
    options: [
      ["unknown", "Não sei"],
      ["yes", "Sim"],
      ["no", "Não"],
    ],
  });
  field(f, "Após o alerta, qual foi sua intenção?", "intention", {
    options: [
      ["unknown", "Não sei / não se aplica"],
      ["continue", "Continuar"],
      ["reconsider", "Reconsiderar ou verificar"],
    ],
  });
  const button = submit(f, "Registrar avaliação opcional");
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    safe(async () => {
      await api(`/drafts/${draftId}/feedback`, {
        method: "POST",
        body: data(f),
      });
      button.disabled = true;
      feedback("Autorreporte registrado; não é prova de eficácia.");
    });
  });
}
function renderReceipt(w, r) {
  clear(w);
  const c = card(w, "Pix realizado no laboratório", "receipt");
  node("p", "✓ Transferência virtual registrada no servidor.", c, "success");
  summary(c, [
    ["Valor", money(r.amountCents)],
    ["Origem", r.source],
    ["Destino", r.destination],
    ["Instituição", r.institution],
    ["Chave", r.maskedKey || "Alocação virtual"],
    ["Data", date(r.createdAt)],
    ["ID", r.id],
    ["Tipo", r.kind],
  ]);
  node("p", r.disclaimer, c, "lab-notice");
  if (r.evaluationId)
    action(c, "Ver avaliação do Guard", async () => {
      const e = await api("/evaluations/" + r.evaluationId);
      evaluationDetails(c, { evaluation: e });
    });
  action(
    c,
    "Copiar comprovante fictício",
    async () => {
      await navigator.clipboard.writeText(JSON.stringify(r, null, 2));
      feedback("Comprovante de simulação copiado.");
    },
    "primary wide",
  );
  action(
    c,
    "Voltar às contas",
    async () => {
      state.draft = null;
      await renderView("accounts");
    },
    "secondary wide",
  );
  if (state.draft?.transferId === r.id) participantFeedback(c, state.draft.id);
  focusWorkspace();
}
async function renderStatement(w) {
  needAccount();
  const c = card(w, "Extrato virtual");
  accountPicker(c, () => renderView("statement"));
  const f = node("form", null, c);
  const filters = node("div", null, f, "lab-grid");
  field(filters, "Período", "days", {
    options: [
      ["7", "7 dias"],
      ["30", "30 dias"],
      ["90", "90 dias"],
      ["365", "1 ano"],
      ["3650", "Todo o laboratório (até 10 anos)"],
    ],
    value: "90",
  });
  field(filters, "Tipo", "type", {
    options: [
      ["all", "Todos"],
      ["in", "Entradas"],
      ["out", "Saídas"],
      ["pix", "Pix"],
      ["allocation", "Alocação inicial"],
      ["adjustment", "Ajuste administrativo"],
      ["restoration", "Restauração"],
    ],
  });
  field(filters, "Situação", "status", {
    options: [
      ["all", "Todas"],
      ["completed", "Concluídas"],
      ["blocked", "Interrompidas"],
      ["cancelled", "Reconsideradas"],
    ],
  });
  submit(f, "Aplicar filtros");
  const result = node("div", null, c);
  async function load() {
    clear(result);
    const query = new URLSearchParams(data(f));
    const s = await api(
      `/accounts/${state.selectedAccount}/statement?${query}`,
    );
    node(
      "strong",
      state.balanceVisible ? money(s.balanceCents) : "R$ ••••••",
      result,
      "money",
    );
    if (!s.entries.length)
      node("p", "Nenhum lançamento financeiro para este filtro.", result);
    for (const e of s.entries) {
      const row = card(result, e.kind);
      node("p", `${e.counterparty} · ${date(e.createdAt)}`, row);
      node(
        "strong",
        money(e.deltaCents),
        row,
        e.deltaCents > 0 ? "success" : "",
      );
      node(
        "p",
        `Saldo após lançamento: ${money(e.balanceAfterCents)}`,
        row,
        "muted",
      );
      action(row, "Detalhes / comprovante", async () =>
        renderReceipt(w, await api("/transfers/" + e.transferId)),
      );
    }
    if (s.attempts.length) {
      const attempts = details(
        result,
        "Tentativas interrompidas / reconsideradas — sem lançamento",
      );
      for (const a of s.attempts)
        node(
          "p",
          `${date(a.createdAt)} · ${money(a.amountCents)} · ${a.status}`,
          attempts,
        );
    }
  }
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    safe(load);
  });
  await load();
}
async function renderReviews(w) {
  const c = card(w, "Revisões simuladas");
  const reviews = await api(`/sessions/${state.session.id}/reviews`);
  if (!reviews.length) node("p", "Nenhuma revisão nesta sessão.", c);
  for (const r of reviews) {
    const row = card(c, r.decision ? "Revisão decidida" : "Revisão solicitada");
    node("p", r.reason, row);
    node(
      "p",
      r.decision
        ? `${r.decision}: ${r.decision_reason}`
        : "Aguardando pesquisador autorizado.",
      row,
    );
    if (r.decision === "release" && r.requester_id === state.user.id)
      action(
        row,
        "Abrir nova conferência após revisão",
        async () => {
          state.draft = await api(`/reviews/${r.id}/followup`, {
            method: "POST",
            body: {},
          });
          await renderView("pix");
        },
        "primary",
      );
    if (!r.decision && isResearch()) {
      const f = node("form", null, row);
      field(f, "Decisão", "decision", {
        options: [
          ["uphold", "Manter interrupção"],
          [
            "release",
            "Liberar nova conferência (sem remover restrição de conta)",
          ],
        ],
      });
      field(f, "Fundamento (10–500 caracteres)", "reason", { required: true });
      submit(f, "Registrar decisão");
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        safe(async () => {
          await api(`/reviews/${r.id}/resolve`, {
            method: "POST",
            body: data(f),
          });
          await renderView("reviews");
        });
      });
    }
  }
}
function table(parent, headers, rows) {
  const wrap = node("div", null, parent, "table-wrap");
  wrap.tabIndex = 0;
  wrap.setAttribute("role", "region");
  wrap.setAttribute("aria-label", "Tabela: " + headers.join(", "));
  const t = node("table", null, wrap);
  const head = node("tr", null, node("thead", null, t));
  for (const h of headers) node("th", h, head);
  const body = node("tbody", null, t);
  for (const row of rows) {
    const tr = node("tr", null, body);
    for (const value of row) node("td", value, tr);
  }
  return t;
}
async function downloadExport(format) {
  const response = await fetch(
    `/api/sessions/${state.session.id}/export?format=${format}`,
    { credentials: "same-origin" },
  );
  if (!response.ok) throw new Error("Exportação não autorizada.");
  const blob = await response.blob(),
    url = URL.createObjectURL(blob),
    a = node("a", null, document.body);
  a.href = url;
  a.download = `justec-pesquisa.${format}`;
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function renderResearch(w) {
  if (!isResearch())
    throw new Error("Área exclusiva de pesquisadores autorizados.");
  const sid = state.session.id;
  const overview = await api(`/sessions/${sid}/research`);
  const head = card(w, "Painel de pesquisa");
  node(
    "p",
    "Dados restritos a esta sessão. Rótulos verdadeiros dos cenários não são entradas do Guard.",
    head,
  );
  table(
    head,
    ["Operações financeiras", "Jornadas", "Participantes", "Contas"],
    [
      [
        overview.operations.length,
        overview.drafts.length,
        overview.members.length,
        overview.accounts.length,
      ],
    ],
  );
  const buttons = node("div", null, head, "actions");
  action(buttons, "Exportar JSON", () => downloadExport("json"));
  action(buttons, "Exportar CSV", () => downloadExport("csv"));
  const metrics = card(w, "Comparação experimental");
  node("p", overview.metrics.definition, metrics, "muted");
  table(
    metrics,
    [
      "Condição / base",
      "N",
      "VP",
      "FP",
      "VN",
      "FN",
      "Sensibilidade observada",
      "Bloqueio indevido",
      "Tempo médio",
    ],
    overview.metrics.groups.map((g) => [
      `${g.condition} / ${g.baselineHash.slice(0, 8)}`,
      g.n,
      g.TP,
      g.FP,
      g.TN,
      g.FN,
      g.sensitivity === null
        ? "Sem dados"
        : `${(g.sensitivity * 100).toFixed(1)}%`,
      g.falsePositiveRate === null
        ? "Sem dados"
        : `${(g.falsePositiveRate * 100).toFixed(1)}%`,
      g.meanDurationMs === null
        ? "Sem dados"
        : `${Math.round(g.meanDurationMs)} ms`,
    ]),
  );
  node(
    "p",
    "Amostras experimentais; percentuais descritivos não comprovam eficácia de mercado. Pendentes/canceladas não entram na matriz.",
    metrics,
    "muted",
  );
  if (overview.participantFeedback?.length) {
    const reports = details(
      metrics,
      "Autorreporte de compreensão e reconsideração",
    );
    table(
      reports,
      ["Operação", "Compreensão", "Intenção"],
      overview.participantFeedback.map((f) => [
        f.draftId,
        f.understanding,
        f.intention,
      ]),
    );
    node(
      "p",
      "Respostas subjetivas, sem teste validado de compreensão.",
      reports,
      "muted",
    );
  }
  const distribution = details(
    metrics,
    "Indicadores por avaliação (inclui fases repetidas)",
  );
  table(
    distribution,
    ["Indicador", "Avaliações"],
    overview.indicatorDistribution.map((r) => [r.code, r.evaluations]),
  );
  if (state.session.role === "admin") {
    const grid = node("div", null, w, "lab-grid");
    const invite = form(
      grid,
      "invite-form",
      "Convidar participante / equipe",
      async (f) => {
        const result = await api(`/sessions/${sid}/invitations`, {
          method: "POST",
          body: data(f),
        });
        const out = node("div", null, f);
        node(
          "p",
          `Convite de uso único, válido até ${date(result.expiresAt)}. Compartilhe apenas com a pessoa autorizada.`,
          out,
        );
        const input = field(out, "Código do convite", "invitation", {
          value: result.code,
        });
        input.readOnly = true;
        action(out, "Copiar convite", () =>
          navigator.clipboard.writeText(result.code),
        );
      },
    );
    field(invite, "Papel na sessão", "role", {
      options: [
        ["participant", "Participante"],
        ["researcher", "Pesquisador"],
        ["admin", "Administrador"],
      ],
    });
    submit(invite, "Gerar convite");
    const conf = form(
      grid,
      "configuration-form",
      "Política e estado da sessão",
      async (f) => {
        const v = data(f);
        await api("/sessions/" + sid, {
          method: "PATCH",
          body: { status: v.status, config: JSON.parse(v.config) },
        });
        await refreshSessions(sid);
        await renderView("research");
      },
    );
    field(conf, "Estado", "status", {
      options: [
        ["active", "Ativa"],
        ["archived", "Arquivada"],
        ["closed", "Encerrada (não reabre)"],
      ],
      value: state.session.status,
    });
    field(conf, "Configuração versionada (JSON)", "config", {
      type: "textarea",
      value: JSON.stringify(state.session.config, null, 2),
    });
    submit(conf, "Registrar alteração auditada");
    const roles = details(w, "Participantes e papéis");
    for (const member of overview.members) {
      const f = form(roles, "role-" + member.id, member.alias, async (form) => {
        await api(`/sessions/${sid}/members/${member.id}`, {
          method: "PATCH",
          body: { role: data(form).role },
        });
        await refreshSessions(sid);
        await renderView("research");
      });
      field(f, "Papel", "role", {
        options: [
          ["participant", "Participante"],
          ["researcher", "Pesquisador"],
          ["admin", "Administrador"],
        ],
        value: member.role,
      });
      submit(f, "Atualizar papel");
    }
  }
  const configure = details(
    w,
    "Contas e condições operacionais (sem edição direta de saldo)",
  );
  for (const a of overview.accounts) {
    const f = form(configure, "config-" + a.id, a.name, async (form) => {
      const d = data(form);
      await api("/accounts/" + a.id, {
        method: "PATCH",
        body: {
          status: d.status,
          profile: d.profile,
          limitCents: parseCents(d.limit),
          reason: d.reason,
        },
      });
      await renderView("research");
    });
    node("p", money(a.balanceCents), f);
    field(f, "Situação", "status", {
      options: [
        ["active", "Ativa"],
        ["restricted", "Restrição interna"],
        ["closed", "Encerrada"],
      ],
      value: a.status,
    });
    field(f, "Perfil (não é rótulo de fraude)", "profile", {
      options: state.session.config.profiles.map((profile) => [
        profile,
        displayLabel(profile),
      ]),
      value: a.profile,
    });
    field(f, "Limite por operação (reais)", "limit", {
      value: (a.limitCents / 100).toFixed(2).replace(".", ","),
    });
    field(f, "Justificativa auditável", "reason", { required: true });
    submit(f, "Configurar conta");
    if (state.session.role === "admin") {
      const funding = form(
        configure,
        "fund-" + a.id,
        "Aporte virtual — " + a.name,
        async (form) => {
          const d = data(form);
          await api(`/accounts/${a.id}/allocation`, {
            method: "POST",
            body: { amountCents: parseCents(d.amount), reason: d.reason },
          });
          await renderView("research");
        },
      );
      field(funding, "Valor virtual em reais", "amount", { required: true });
      field(funding, "Justificativa (não é Pix)", "reason", { required: true });
      submit(funding, "Registrar aporte separado");
    }
  }
  const samples = await api(`/sessions/${sid}/examples`);
  const scenarioForm = form(
    w,
    "scenario-form",
    "Criar cenário versionado",
    async (f) => {
      const v = data(f);
      await api(`/sessions/${sid}/scenarios`, {
        method: "POST",
        body: { name: v.name, baseline: JSON.parse(v.baseline) },
      });
      await renderView("research");
    },
  );
  const template = field(scenarioForm, "Exemplo para edição", "template", {
    options: samples.map((s, i) => [String(i), s.name]),
  });
  const name = field(scenarioForm, "Nome do cenário", "name", {
    value: samples[0].name,
    required: true,
  });
  const baseline = field(
    scenarioForm,
    "Estado-base, operações e verdade experimental (JSON restrito)",
    "baseline",
    { type: "textarea", value: JSON.stringify(samples[0].baseline, null, 2) },
  );
  template.addEventListener("change", () => {
    name.value = samples[Number(template.value)].name;
    baseline.value = JSON.stringify(
      samples[Number(template.value)].baseline,
      null,
      2,
    );
  });
  submit(scenarioForm, "Salvar cenário");
  action(scenarioForm, "Adicionar os quatro exemplos científicos", async () => {
    for (const sample of samples)
      await api(`/sessions/${sid}/scenarios`, { method: "POST", body: sample });
    await renderView("research");
  });
  const scenarios = await api(`/sessions/${sid}/scenarios`);
  for (const scenario of scenarios) {
    const f = form(w, "run-" + scenario.id, scenario.name, async (form) => {
      const v = data(form);
      await api(`/sessions/${sid}/scenarios/${scenario.id}/runs`, {
        method: "POST",
        body: {
          condition: v.condition,
          pauseMs: Number(v.pause),
          owners: JSON.parse(v.owners),
        },
      });
      await refreshSessions(sid);
      await renderView("research");
      feedback("Execução criada com novo estado-base; anteriores preservadas.");
    });
    node("p", "Base: " + scenario.baselineHash, f, "muted");
    field(f, "Condição de proteção", "condition", {
      options: [
        ["none", "Sem intervenção adicional"],
        ["education", "Apenas educação"],
        ["context", "Educação e contexto"],
        ["behavior", "Comportamental"],
        ["integrated", "Integrada"],
      ],
      value: "integrated",
    });
    field(f, "Pausa (milissegundos, experimental)", "pause", {
      type: "number",
      value: 5000,
      min: 0,
      max: 60000,
    });
    field(
      f,
      "Vínculos slot → ID de participante (JSON; vazio = pesquisador)",
      "owners",
      { type: "textarea", value: "{}" },
    );
    submit(f, "Iniciar nova execução");
  }
  const runs = await api(`/sessions/${sid}/runs`);
  const runList = card(w, "Histórico de execuções");
  for (const r of runs) {
    const c = card(runList, `${r.name} · ${r.condition}`);
    node(
      "p",
      `${r.status} · Base ${r.baseline_hash.slice(0, 12)} · ${date(r.created_at)}`,
      c,
      "muted",
    );
    for (const op of r.operations) {
      node(
        "p",
        `${op.operation_id}: ${money(op.amount_cents)} · verdade restrita: ${op.label}`,
        c,
      );
      action(c, "Abrir roteiro " + op.operation_id, async () => {
        state.scripted = JSON.parse(op.scripted_answers);
        await refreshSessions(r.session_id);
        state.draft = await api(`/tasks/${op.id}/draft`, {
          method: "POST",
          body: { requestContext: true },
        });
        state.selectedAccount = op.source_id;
        await renderView("pix");
      });
    }
    action(c, "Repetir com a mesma base", async () => {
      await api(`/runs/${r.id}/repeat`, { method: "POST", body: {} });
      await refreshSessions(sid);
      await renderView("research");
    });
  }
  const snapForm = form(
    w,
    "snapshot-form",
    "Estado-base da sessão atual",
    async (f) => {
      await api(`/sessions/${sid}/snapshots`, {
        method: "POST",
        body: { name: data(f).name },
      });
      await renderView("research");
    },
  );
  field(snapForm, "Nome do estado-base", "name", { required: true });
  submit(snapForm, "Capturar estado-base");
  for (const snap of await api(`/sessions/${sid}/snapshots`)) {
    const f = form(w, "restore-" + snap.id, snap.name, async (form) => {
      const v = data(form);
      const result = await api(`/snapshots/${snap.id}/restore`, {
        method: "POST",
        body: { name: v.name, archiveSource: v.archiveSource },
      });
      state.draft = null;
      await refreshSessions(result.id);
      await renderView("accounts");
    });
    field(f, "Nome da nova sessão", "name", {
      value: snap.name + " — repetição",
      required: true,
    });
    if (state.session.role === "admin")
      field(
        f,
        "Arquivar a sessão original (não apaga resultados)",
        "archiveSource",
        { type: "checkbox" },
      );
    submit(f, "Clonar / reinicializar em nova sessão");
  }
  const notes = form(w, "note-form", "Observações de pesquisa", async (f) => {
    await api(`/sessions/${sid}/observations`, {
      method: "POST",
      body: { note: data(f).note },
    });
    await renderView("research");
  });
  field(notes, "Observação sem dados pessoais", "note", {
    type: "textarea",
    required: true,
  });
  submit(notes, "Registrar observação");
  for (const note of overview.notes)
    node("p", `${date(note.createdAt)} — ${note.note}`, notes);
  const audit = details(w, "Auditoria imutável desta sessão");
  for (const e of overview.audit) {
    node(
      "p",
      `${date(e.createdAt)} · ${e.action} · ${e.entityId || ""}`,
      audit,
    );
    node("pre", JSON.stringify(JSON.parse(e.payload), null, 2), audit);
  }
}
$("#login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  safe(async () => {
    const result = await api("/auth/login", {
      method: "POST",
      body: data(e.currentTarget),
    });
    state.csrf = result.csrf;
    e.target.reset();
    await authenticated();
    feedback("");
  });
});
$("#register-form").addEventListener("submit", (e) => {
  e.preventDefault();
  safe(async () => {
    await api("/auth/register", {
      method: "POST",
      body: data(e.currentTarget),
    });
    e.target.reset();
    feedback("Acesso criado. Entre com seu pseudônimo e senha exclusiva.");
  });
});
$("#logout").addEventListener("click", () =>
  safe(async () => {
    await api("/auth/logout", { method: "POST", body: {} });
    stopTimer();
    showAuth();
    feedback("Acesso encerrado; dados acadêmicos permanecem no servidor.");
  }),
);
$("#session-select").addEventListener("change", () =>
  safe(async () => {
    const sid = $("#session-select").value;
    if (
      state.draft &&
      ["review", "verification", "pause"].includes(state.draft.status)
    )
      await api(`/drafts/${state.draft.id}/cancel`, {
        method: "POST",
        body: { reason: "Troca de sessão; autorização invalidada." },
      });
    stopTimer();
    state.draft = null;
    state.scripted = null;
    state.selectedAccount = null;
    await refreshSessions(sid);
    await renderView(state.mode === "admin" ? "accounts" : "home");
  }),
);
initializeBankUI();
for (const b of document.querySelectorAll("[data-bank-view]"))
  b.addEventListener("click", () => safe(() => setView(b.dataset.bankView)));
$("#admin-switch").addEventListener("click", () =>
  safe(async () => {
    if (!canManage()) throw new Error("Área restrita à equipe autorizada.");
    state.mode = state.mode === "admin" ? "bank" : "admin";
    await setView(
      state.mode === "admin"
        ? state.session
          ? "accounts"
          : "sessions"
        : "home",
    );
  }),
);
for (const b of document.querySelectorAll("[data-view]"))
  b.addEventListener("click", () => safe(() => setView(b.dataset.view)));
safe(async () => {
  await api("/health");
  try {
    await authenticated();
  } catch (e) {
    if (e.status !== 401) throw e;
    showAuth();
  }
});
