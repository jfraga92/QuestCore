import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Limpa espaços e quebras de linha acidentais (ex.: ao colar as chaves no
// painel do Railway) — headers HTTP não podem conter estes caracteres.
const clean = (v) => (v ? v.replace(/\s+/g, "") : v);

const SUPABASE_URL = clean(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim();
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "\n[ERRO] Faltam variáveis de ambiente. Define SUPABASE_URL e " +
      "SUPABASE_SERVICE_ROLE_KEY (vê o ficheiro .env.example).\n"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// --- Pontuação (autoritativa no servidor) -----------------------------------
// SCORES[pergunta][opção] = [abertura, ação]
const SCORES = [
  [[2, 0], [1, 0], [0, 0], [2, 1]], // P1
  [[1, 3], [0, 2], [0, 1], [0, 0]], // P2
  [[1, 0], [1, 0], [0, 0], [0, 0]], // P3
  [[1, 1], [1, 0], [1, 0], [1, 0]], // P4
  [[2, 2], [2, 1], [1, 0], [0, 0]], // P5
  [[2, 1], [2, 0], [1, 0], [0, 0]], // P6
  [[2, 1], [2, 0], [0, 0], [1, 0]], // P7
  [[0, 0], [1, 0], [1, 0], [2, 1]], // P8
  [[0, 0], [2, 0], [2, 0], [2, 1]], // P9
  [[2, 2], [1, 0], [2, 1], [1, 0]], // P10
];
const AB_MAX = 17;
const AC_MAX = 13;

function scoreProfile(answers) {
  let ab = 0;
  let ac = 0;
  answers.forEach((opt, i) => {
    const [a, c] = SCORES[i][opt - 1];
    ab += a;
    ac += c;
  });
  const abN = ab / AB_MAX;
  const acN = ac / AC_MAX;
  let profile;
  if (abN >= 0.55 && acN >= 0.5) profile = "PIONEIRO";
  else if (abN >= 0.55 && acN < 0.5) profile = "CURIOSO";
  else if (abN < 0.55 && acN >= 0.5) profile = "GUARDIAO";
  else profile = "OBSERVADOR";
  return { ab, ac, abN, acN, profile };
}

// --- App --------------------------------------------------------------------
const app = express();
app.use(express.json());

app.get("/quiz", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "quiz.html"))
);
app.get("/admin", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin.html"))
);

app.use(express.static(path.join(__dirname, "public")));

// QR code (SVG) que aponta para a página do questionário deste mesmo domínio.
app.get("/api/qr.svg", async (req, res) => {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https")
    .split(",")[0]
    .trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = `${proto}://${host}/quiz`;
  try {
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 1,
      color: { dark: "#071a33", light: "#00000000" },
    });
    res.type("image/svg+xml").send(svg);
  } catch (err) {
    console.error("Erro a gerar QR:", err);
    res.status(500).send("Erro a gerar QR.");
  }
});

// Devolve o URL público do questionário (para a landing mostrar em texto).
app.get("/api/quiz-url", (req, res) => {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https")
    .split(",")[0]
    .trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  res.json({ url: `${proto}://${host}/quiz` });
});

// Recebe uma resposta completa e grava-a (com pontuação calculada no servidor).
app.post("/api/rota/submit", async (req, res) => {
  const { name, answers } = req.body || {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "O nome é obrigatório." });
  }
  if (
    !Array.isArray(answers) ||
    answers.length !== 10 ||
    !answers.every((n) => Number.isInteger(n) && n >= 1 && n <= 4)
  ) {
    return res.status(400).json({ error: "Respostas inválidas." });
  }

  const { ab, ac, abN, acN, profile } = scoreProfile(answers);

  const { error } = await supabase.from("rota_responses").insert({
    name: name.trim().slice(0, 120),
    profile,
    ab,
    ac,
    ab_n: Number(abN.toFixed(4)),
    ac_n: Number(acN.toFixed(4)),
    answers,
  });

  if (error) {
    console.error("Erro ao gravar no Supabase:", error);
    return res.status(500).json({ error: "Não foi possível guardar a resposta." });
  }

  res.status(201).json({ ok: true, profile, ab, ac, abN, acN });
});

// --- Administração (protegida por token) ------------------------------------
function checkAuth(req) {
  if (!ADMIN_TOKEN) return false;
  const auth = req.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.query.token;
  return token === ADMIN_TOKEN;
}

app.get("/api/rota/stats", async (req, res) => {
  if (!checkAuth(req)) return res.status(401).json({ error: "Não autorizado." });

  const { data, error } = await supabase
    .from("rota_responses")
    .select("id, created_at, name, profile, ab, ac, ab_n, ac_n, answers")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("Erro ao ler do Supabase:", error);
    return res.status(500).json({ error: "Não foi possível ler as respostas." });
  }

  const total = data.length;
  const porPerfil = { PIONEIRO: 0, CURIOSO: 0, GUARDIAO: 0, OBSERVADOR: 0 };
  const perguntas = Array.from({ length: 10 }, () => [0, 0, 0, 0]);
  let somaAbN = 0;
  let somaAcN = 0;

  for (const r of data) {
    if (porPerfil[r.profile] !== undefined) porPerfil[r.profile]++;
    somaAbN += Number(r.ab_n);
    somaAcN += Number(r.ac_n);
    if (Array.isArray(r.answers)) {
      r.answers.forEach((opt, i) => {
        if (i < 10 && opt >= 1 && opt <= 4) perguntas[i][opt - 1]++;
      });
    }
  }

  res.json({
    total,
    porPerfil,
    mediaAbN: total ? somaAbN / total : 0,
    mediaAcN: total ? somaAcN / total : 0,
    perguntas,
    pontos: data.map((r) => ({
      name: r.name,
      profile: r.profile,
      abN: Number(r.ab_n),
      acN: Number(r.ac_n),
    })),
    recentes: data.slice(0, 50).map((r) => ({
      name: r.name,
      profile: r.profile,
      abN: Number(r.ab_n),
      acN: Number(r.ac_n),
      created_at: r.created_at,
    })),
  });
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});
