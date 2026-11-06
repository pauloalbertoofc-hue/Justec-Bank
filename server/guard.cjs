const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { fail, hash } = require("./security.cjs");
const { DEFAULT_PROFILES } = require("./profiles.cjs");
const shared = vm.createContext({});
for (const file of ["pix-evidence.js", "pix-messages.js"])
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../js", file), "utf8"),
    shared,
    { filename: file },
  );
// Reaproveita os pesos existentes sem usar destinatários ou rótulos do cenário estático.
const legacy = vm.createContext({
  bankState: { restrictions: [] },
  demoId: () => "",
  demoDate: () => "",
});
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "../js/risk.js"), "utf8"),
  legacy,
);
const weights = vm.runInContext("({...riskRules})", legacy);
const MODES = ["none", "education", "context", "behavior", "integrated"];
function config(value = {}) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (k) =>
        ![
          "mode",
          "pauseMs",
          "initialCents",
          "maxAccounts",
          "consentNotice",
          "rules",
          "profiles",
        ].includes(k),
    )
  )
    fail(400, "CONFIG", "Configuração inválida.");
  const result = {
    mode: "integrated",
    profiles: [...DEFAULT_PROFILES],
    pauseMs: 5000,
    initialCents: 248050,
    maxAccounts: 5,
    consentNotice: "Simulação acadêmica. Use somente identidades fictícias.",
    ...value,
  };
  if (
    !MODES.includes(result.mode) ||
    !Number.isInteger(result.pauseMs) ||
    result.pauseMs < 0 ||
    result.pauseMs > 60000 ||
    !Number.isSafeInteger(result.initialCents) ||
    result.initialCents < 0 ||
    result.initialCents > 100000000 ||
    !Number.isInteger(result.maxAccounts) ||
    result.maxAccounts < 1 ||
    result.maxAccounts > 20 ||
    typeof result.consentNotice !== "string" ||
    result.consentNotice.length > 1000
  )
    fail(400, "CONFIG", "Modo, pausa, alocação ou limite inválido.");
  if (
    !Array.isArray(result.profiles) ||
    result.profiles.length < 1 ||
    result.profiles.length > 20 ||
    new Set(result.profiles).size !== result.profiles.length ||
    result.profiles.some(
      (p) => typeof p !== "string" || !/^[-a-z0-9_]{2,40}$/.test(p),
    )
  )
    fail(400, "PROFILES", "Perfis públicos inválidos.");
  const supplied = value.rules || {};
  if (
    !supplied ||
    typeof supplied !== "object" ||
    Array.isArray(supplied) ||
    Object.keys(supplied).some(
      (k) =>
        ![
          "newRecipient",
          "atypical",
          "repeated",
          "changes",
          "moderate",
          "high",
          "minimumHistory",
          "atypicalMultiplier",
        ].includes(k),
    )
  )
    fail(400, "RULES", "Regras inválidas.");
  result.rules = {
    newRecipient: weights.newKey,
    atypical: weights.outlier,
    repeated: weights.repeated,
    changes: weights.behaviorChange,
    moderate: weights.moderate,
    high: weights.high,
    minimumHistory: 3,
    atypicalMultiplier: 3,
    ...supplied,
  };
  if (
    Object.values(result.rules).some(
      (n) => !Number.isInteger(n) || n < 0 || n > 100,
    ) ||
    result.rules.moderate < 1 ||
    result.rules.high <= result.rules.moderate ||
    result.rules.minimumHistory < 3 ||
    result.rules.minimumHistory > 30 ||
    result.rules.atypicalMultiplier < 2 ||
    result.rules.atypicalMultiplier > 10
  )
    fail(400, "RULES", "Pesos/limiares inválidos.");
  return result;
}
function answers(value = {}) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (k) => !["identity", "urgency", "advance", "ignore"].includes(k),
    ) ||
    Object.values(value).some((v) => !["yes", "no", "unknown"].includes(v))
  )
    fail(400, "ANSWERS", "Respostas contextuais inválidas.");
  return { ...value };
}
function evaluate({
  draft,
  transactions,
  attempts,
  restricted,
  settings,
  responses = {},
  acknowledged = false,
  collectedAt,
  manualClearance = false,
}) {
  const conf = config(settings),
    reported = answers(responses);
  const behavioral = ["behavior", "integrated"].includes(conf.mode),
    contextual = ["context", "integrated"].includes(conf.mode);
  const state = {
    transactions,
    attempts,
    restrictions: restricted
      ? [{ recipientId: draft.recipient.id, status: "Restrição ativa" }]
      : [],
  };
  const evidence = shared.collectPixEvidence(
    draft,
    state,
    contextual ? reported : {},
    collectedAt,
    conf.rules,
  );
  const available = evidence.indicators
    .filter((i) => i.available && i.value === true)
    .map((i) => i.code);
  const score = behavioral
    ? (available.includes("NEW_RECIPIENT") ? conf.rules.newRecipient : 0) +
      (available.includes("ATYPICAL_AMOUNT") ? conf.rules.atypical : 0) +
      (available.includes("REPEATED_ATTEMPTS") ? conf.rules.repeated : 0) +
      (available.includes("OPERATION_CHANGED") ? conf.rules.changes : 0)
    : 0;
  const model = {
    score,
    level:
      restricted || score >= conf.rules.high
        ? "elevated"
        : score >= conf.rules.moderate
          ? "moderate"
          : "low",
    reasons: restricted ? ["Restrição interna ativa e fundamentada."] : [],
  };
  const filtered = {
    ...evidence,
    indicators: evidence.indicators.map((i) => ({
      ...i,
      available:
        i.available &&
        (i.code === "ACTIVE_RESTRICTION" ||
          ([
            "URGENCY",
            "ADVANCE_PAYMENT",
            "IDENTITY_DOUBT",
            "IGNORE_WARNINGS",
          ].includes(i.code)
            ? contextual
            : behavioral)),
    })),
  };
  const evaluation = shared.evaluatePixEvidence(filtered, model);
  const hasAnswers = Object.keys(reported).length === 4;
  let decision = shared.decidePixPolicy(evaluation, {
    triageRequired: contextual && draft.requestContext === true,
    answered: hasAnswers,
    uncertain:
      contextual && hasAnswers && Object.values(reported).includes("unknown"),
  });
  if (manualClearance && !restricted)
    decision = {
      ...decision,
      action: "ALLOWED",
      justification:
        "Liberação manual após revisão registrada; não representa comprovação de segurança.",
      manualClearance: true,
    };
  if (
    !contextual &&
    behavioral &&
    decision.action !== "BLOCKED" &&
    (score >= conf.rules.moderate ||
      available.includes("ATYPICAL_AMOUNT") ||
      available.includes("REPEATED_ATTEMPTS"))
  ) {
    decision = {
      ...decision,
      action: "NEEDS_VERIFICATION",
      justification:
        "Alerta comportamental demonstrativo: confira os dados e reconheça o alerta. Perguntas contextuais estão desativadas nesta condição.",
    };
  }
  const verification =
    decision.action === "INCONCLUSIVE" ||
    (decision.action === "NEEDS_VERIFICATION" &&
      (!acknowledged || (contextual && !hasAnswers)));
  return JSON.parse(
    JSON.stringify({
      rulesVersion:
        "justec-lab-guard/1.0.0+" +
        hash(JSON.stringify(conf.rules)).slice(0, 12),
      rules: conf.rules,
      sharedVersion: evaluation.version,
      condition: conf.mode,
      evidence: filtered,
      evaluation,
      decision,
      needsVerification: verification,
      contextualEnabled: contextual,
      pauseMs: ["education", "context", "integrated"].includes(conf.mode)
        ? conf.pauseMs
        : 0,
      tip: shared.selectPixTip(filtered),
      disclaimer:
        "Regras heurísticas experimentais. Indícios não comprovam fraude; resultados não demonstram eficácia.",
    }),
  );
}
module.exports = { config, answers, evaluate, MODES };
