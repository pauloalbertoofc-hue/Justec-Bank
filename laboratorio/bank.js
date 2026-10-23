"use strict";
// Apresentação do participante; todo dado financeiro continua vindo da API.
function bankIcon(name, parent) {
  const paths = {
    bank: "M3 9h18L12 3 3 9Zm2 3v7m5-7v7m4-7v7m5-7v7M3 22h18M2 10h20",
    shield: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm0 4v12",
    home: "m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z",
    pix: "m3 10 18-7-7 18-3-8-8-3Zm8 3 10-10",
    statement: "M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 5h6M9 11h6m-6 4h6",
    key: "M14 3a7 7 0 0 0-6 10l-6 6v3h4v-3h3l3-3a7 7 0 1 0 2-13Z",
    review: "M5 3h9l5 5v12H5V3Zm9 0v6h5M8 16l3 2 8-8",
    lock: "M5 10h14v12H5V10Zm3 0V6a4 4 0 0 1 8 0v4",
    search: "M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm6 14 6 6M8 7v6m4-8v8",
    warning: "m12 2 10 19H2L12 2Zm0 6v6m0 3v1",
    rights: "M5 2h14v20H5V2Zm4 0v8l3-2 3 2V2",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
    hidden:
      "m2 2 20 20M9 5a12 12 0 0 1 3 0c6 0 10 7 10 7a17 17 0 0 1-3 4M6 6a21 21 0 0 0-4 6s4 7 10 7a13 13 0 0 0 5-1",
    arrow: "m9 5 7 7-7 7",
  };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const [key, value] of Object.entries({
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  }))
    svg.setAttribute(key, value);
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", paths[name] || paths.shield);
  svg.append(path);
  parent.append(svg);
  return svg;
}
function canManage() {
  return state.user?.globalRole === "admin" || isResearch();
}
function syncBankShell() {
  const logged = !!state.user,
    admin = logged && state.mode === "admin" && canManage();
  document.body.dataset.mode = admin ? "admin" : "bank";
  $("#bank-nav").hidden = !logged || admin;
  $("#admin-nav").hidden = !admin;
  $("#admin-switch").hidden = !logged || !canManage();
  $("#admin-switch").textContent = admin ? "Voltar ao banco" : "Administração";
  $("#security-shortcut").hidden = !logged;
  $("#session-toolbar label").firstChild.textContent = admin
    ? "Sessão experimental"
    : "Ambiente";
  $("#session-select").setAttribute(
    "aria-label",
    admin ? "Sessão experimental" : "Ambiente",
  );
  $("#session-toolbar").hidden =
    !logged || (!admin && state.sessions.length <= 1);
  for (const button of document.querySelectorAll("[data-bank-view]")) {
    if (button.dataset.bankView === state.view)
      button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
}
function bankLink(parent, title, icon, view, cls = "") {
  const button = action(parent, "", () => setView(view), cls);
  bankIcon(icon, button);
  node("span", title, button);
  return button;
}
function bankViewHeading(w, title) {
  const row = node("header", null, w, "bank-view-heading");
  action(row, "←", () => setView("home")).setAttribute(
    "aria-label",
    "Voltar ao início",
  );
  node("h2", title, row);
}
async function renderBankHome(w) {
  await refreshAccounts();
  const home = node("div", null, w, "bank-home");
  const education = node(
    "section",
    null,
    home,
    "security-prompt bank-security",
  );
  education.id = "home-security";
  const heading = node("div", null, education, "security-prompt-heading");
  bankIcon("shield", node("span", null, heading, "security-prompt-icon"));
  const text = node("div", null, heading);
  const title = node("h2", "Antes de transferir, confira.", text);
  title.id = "lab-education-title";
  node("p", "Um minuto de atenção pode fazer diferença.", text);
  const buttons = node("div", null, education, "security-prompt-actions");
  bankLink(
    buttons,
    "Tenho dúvida",
    "search",
    "screening",
    "security-mini security-mini-prevention",
  );
  bankLink(
    buttons,
    "Sofri um golpe",
    "warning",
    "action-post",
    "security-mini security-mini-emergency",
  );
  if (!state.session) {
    const empty = card(home, "Vamos começar");
    node(
      "p",
      "Entre no ambiente da sua equipe para acessar suas contas.",
      empty,
    );
    bankLink(empty, "Tenho um convite", "key", "sessions", "primary");
    if (canManage())
      action(empty, "Configurar ambiente", () => $("#admin-switch").click());
    return;
  }
  const a = activeAccount();
  if (!a) {
    const empty = card(home, "Sua conta JUSTEC");
    node("p", "Você ainda não criou uma conta neste ambiente.", empty);
    bankLink(empty, "Criar minha conta", "bank", "accounts", "primary");
  } else {
    const balance = node("section", null, home, "bank-balance lab-card");
    balance.id = "bank-balance-card";
    const line = node("div", null, balance, "bank-balance-heading");
    node("h2", `Olá, ${a.name}!`, line);
    node(
      "span",
      a.status === "active" ? "● Proteção demo" : "● " + displayLabel(a.status),
      line,
      "bank-protection-badge",
    );
    const values = node("div", null, balance, "bank-balance-values");
    const amount = node("div", null, values);
    node("p", "Saldo disponível", amount, "muted");
    const value = node(
      "strong",
      state.balanceVisible ? money(a.balanceCents) : "R$ ••••••",
      amount,
      "money",
    );
    value.id = "bank-balance";
    const toggle = action(
      values,
      "",
      () => {
        state.balanceVisible = !state.balanceVisible;
        value.textContent = state.balanceVisible
          ? money(a.balanceCents)
          : "R$ ••••••";
        clear(toggle);
        bankIcon(state.balanceVisible ? "eye" : "hidden", toggle);
        toggle.setAttribute(
          "aria-label",
          state.balanceVisible ? "Ocultar saldo" : "Exibir saldo",
        );
        toggle.setAttribute("aria-pressed", String(!state.balanceVisible));
      },
      "bank-eye",
    );
    toggle.id = "bank-balance-toggle";
    toggle.setAttribute("aria-controls", "bank-balance");
    toggle.setAttribute(
      "aria-label",
      state.balanceVisible ? "Ocultar saldo" : "Exibir saldo",
    );
    toggle.setAttribute("aria-pressed", String(!state.balanceVisible));
    bankIcon(state.balanceVisible ? "eye" : "hidden", toggle);
    bankLink(
      balance,
      "Ver extrato ›",
      "statement",
      "statement",
      "bank-text-link",
    );
  }
  const services = card(home, "Serviços Bancários", "bank-services");
  services.id = "home-services";
  const grid = node("div", null, services, "bank-services-grid");
  for (const [label, icon, view] of [
    ["Fazer Pix", "pix", "pix"],
    ["Consultar movimentações", "statement", "statement"],
    ["Verificar chave Pix", "key", "protection"],
    ["Bloqueios preventivos", "shield", "security"],
    ["Contestações", "review", "reviews"],
    ["Central de segurança", "lock", "security"],
  ])
    bankLink(grid, label, icon, view);
  const accountActions = node("div", null, home, "bank-account-actions");
  bankLink(accountActions, "Minhas contas e chaves", "bank", "accounts");
  bankLink(accountActions, "Convites e ambientes", "key", "sessions");
}
async function renderBankProtection(w) {
  if (!state.session) return renderSessions(w);
  if (!activeAccount()) return renderAccounts(w);
  needAccount();
  bankViewHeading(w, "Proteção de chaves Pix");
  const f = form(w, "bank-key-form", "Verificar chave Pix", async (form) => {
    const found = await api(`/sessions/${state.session.id}/lookup`, {
      method: "POST",
      body: { key: data(form).key },
    });
    clear(result);
    summary(result, [
      ["Destinatário", found.name],
      ["Instituição", found.institution],
      ["Situação", displayLabel(found.status)],
      ["Chave", found.maskedKey],
    ]);
    node(
      "p",
      "Uma conta ativa não comprova que o pedido de pagamento é legítimo. Confira por um canal independente.",
      result,
    );
  });
  field(f, "Chave fictícia", "key", { required: true });
  submit(f, "Verificar chave");
  const result = node("div", null, f);
  bankLink(w, "Receber Pix e administrar minhas chaves", "key", "accounts");
  node(
    "p",
    "Consulta interna à simulação. Nenhuma chave real é consultada ou bloqueada no DICT.",
    w,
    "muted",
  );
}
async function renderBankSecurity(w) {
  bankViewHeading(w, "Central de segurança");
  for (const [label, icon, view] of [
    ["Verificar chave Pix", "key", "protection"],
    ["Contestações e revisões", "review", "reviews"],
    ["Tenho dúvida", "search", "screening"],
    ["Sofri um golpe", "warning", "action-post"],
    ["Meus direitos", "rights", "rights"],
    ["Centro educativo", "rights", "edu-center"],
  ])
    bankLink(w, label, icon, view, "bank-security-link");
  const section = card(w, "Tentativas interrompidas");
  node(
    "p",
    "O Guard pode interromper uma tentativa sem debitar saldo. Isso não bloqueia contas reais nem comprova fraude. Uma restrição operacional vigente é verificada novamente antes do envio.",
    section,
  );
  if (!state.session) return;
  const drafts = await api(`/sessions/${state.session.id}/drafts`);
  const attempts = drafts.filter((d) =>
    ["blocked", "cancelled"].includes(d.status),
  );
  if (!attempts.length)
    node(
      "p",
      "Nenhuma tentativa interrompida ou reconsiderada.",
      section,
      "muted",
    );
  for (const d of attempts) {
    const row = card(section, `${d.recipient} · ${displayLabel(d.status)}`);
    node("p", money(d.amountCents), row);
    action(row, "Ver tentativa", async () => {
      state.draft = d;
      state.selectedAccount = d.sourceId;
      await setView("pix");
    });
  }
}
let educationSource;
async function renderBankEducation(w, view) {
  // Reutiliza textos originais sem executar scripts nem handlers inline da demonstração.
  if (!educationSource) {
    const response = await fetch("/demonstracao.html");
    if (!response.ok) throw new Error("Não foi possível abrir as orientações.");
    educationSource = await response.text();
  }
  const doc = new DOMParser().parseFromString(educationSource, "text/html");
  const source = doc.getElementById("screen-" + view);
  if (!source) throw new Error("Conteúdo educativo indisponível.");
  const content = document.importNode(source, true);
  content.classList.remove("hidden");
  content.classList.add("bank-education");
  for (const el of [content, ...content.querySelectorAll("*")]) {
    const handler = el.getAttribute("onclick");
    for (const attr of [...el.attributes])
      if (attr.name.startsWith("on") || attr.name === "style")
        el.removeAttribute(attr.name);
    if (handler) {
      const destination = /^navigateTo\('([a-z-]+)'\)$/.exec(handler);
      const diagnosis = /^showDiagnosis\('(bank_call|whatsapp|offer)'\)$/.exec(
        handler,
      );
      if (destination)
        el.addEventListener("click", () => safe(() => setView(destination[1])));
      else if (diagnosis)
        el.addEventListener("click", () => bankDiagnosis(diagnosis[1]));
      else if (handler === "openMedWizard()")
        el.addEventListener("click", bankMedDialog);
      else if (handler === "resumePix()") el.remove();
    }
  }
  for (const el of content.querySelectorAll(
    "script,iframe,object,embed,style,link",
  ))
    el.remove();
  for (const icon of content.querySelectorAll("i")) {
    const replacement = document.createElement("span");
    bankIcon(
      icon.className.includes("arrow") ? "arrow" : "shield",
      replacement,
    );
    icon.replaceWith(replacement);
  }
  // Orientação de revisão sempre aponta ao fluxo persistente disponível.
  const guide = content.querySelector("#guard-operation-guide");
  if (guide) {
    const note = node(
      "p",
      "Neste ambiente, solicite revisão na tentativa interrompida. A equipe registra a decisão sem apagar a avaliação original; nenhuma restrição operacional ativa é ignorada.",
      guide,
      "muted",
    );
    note.id = "persistent-review-note";
  }
  w.append(content);
  focusWorkspace();
}
function bankDialog(title, paragraphs) {
  const dialog = $("#bank-dialog");
  clear(dialog);
  const heading = node("h2", title, dialog);
  heading.id = "bank-dialog-title";
  for (const paragraph of paragraphs) node("p", paragraph, dialog);
  action(dialog, "Fechar", () => dialog.close(), "primary");
  dialog.showModal();
}
function bankDiagnosis(type) {
  const messages = {
    bank_call: [
      "Falsa central do banco",
      "Desligue se pedirem senha, token ou transferência de teste. Procure o banco pelo aplicativo ou telefone oficial, sem usar o contato recebido.",
    ],
    whatsapp: [
      "Pare e confirme a identidade",
      "Ligue para o número que você já conhecia do familiar. Foto e nome no aplicativo de mensagens não confirmam identidade; não transfira sob pressão.",
    ],
    offer: [
      "Verifique a oferta antes de pagar",
      "Preço muito abaixo do mercado, pressa e Pix direto exigem atenção. Confira a loja e o destinatário por fontes independentes; se houver dúvida, não prossiga.",
    ],
  };
  const [title, text] = messages[type];
  bankDialog(title, [
    text,
    "Orientação educativa. Não informe senhas ou dados bancários reais.",
  ]);
}
function bankMedDialog() {
  bankDialog("Roteiro de texto para o banco", [
    "Informo uma movimentação Pix que suspeito estar relacionada a um golpe. Solicito avaliação do ocorrido, orientação sobre o MED quando cabível e um número de protocolo. Tenho comprovantes e outras evidências para apresentar pelo canal oficial.",
    "Nenhum pedido foi enviado pelo JUSTEC. A devolução não é garantida.",
  ]);
}
function initializeBankUI() {
  const logo = $(".bank-logo");
  clear(logo);
  bankIcon("bank", logo);
  const icons = {
    home: "home",
    pix: "pix",
    screening: "search",
    "action-post": "warning",
    rights: "rights",
  };
  for (const b of document.querySelectorAll("#bank-nav [data-bank-view]")) {
    const label = b.textContent;
    clear(b);
    bankIcon(icons[b.dataset.bankView], b);
    node("span", label, b);
  }
}
