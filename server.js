import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { questionnaire } from "./questions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_TOKEN,
  PORT = 3000,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "\n[ERRO] Faltam variáveis de ambiente. Define SUPABASE_URL e " +
      "SUPABASE_SERVICE_ROLE_KEY (vê o ficheiro .env.example).\n"
  );
  process.exit(1);
}

// O service_role key só vive no servidor — nunca é enviado ao browser.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Devolve a definição do questionário para o frontend construir o formulário.
app.get("/api/questions", (_req, res) => {
  res.json(questionnaire);
});

// Valida uma submissão contra a definição do questionário.
function validate(answers) {
  const errors = [];
  for (const q of questionnaire.questions) {
    const value = answers[q.id];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (q.required && isEmpty) {
      errors.push(`A pergunta "${q.label}" é obrigatória.`);
      continue;
    }
    if (isEmpty) continue;

    if (q.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push("O email indicado não é válido.");
    }
    if (q.type === "rating") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < q.min || n > q.max) {
        errors.push(`A resposta a "${q.label}" está fora do intervalo.`);
      }
    }
    if (q.type === "radio" && !q.options.includes(value)) {
      errors.push(`Resposta inválida em "${q.label}".`);
    }
    if (q.type === "checkbox") {
      const vals = Array.isArray(value) ? value : [value];
      if (!vals.every((v) => q.options.includes(v))) {
        errors.push(`Resposta inválida em "${q.label}".`);
      }
    }
  }
  return errors;
}

// Recebe uma submissão e guarda no Supabase.
app.post("/api/submit", async (req, res) => {
  const answers = req.body?.answers;
  if (!answers || typeof answers !== "object") {
    return res.status(400).json({ error: "Payload inválido." });
  }

  const errors = validate(answers);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  const { error } = await supabase.from("responses").insert({ answers });
  if (error) {
    console.error("Erro ao gravar no Supabase:", error);
    return res.status(500).json({ error: "Não foi possível guardar a resposta." });
  }

  res.status(201).json({ ok: true });
});

// Endpoint de administração para ver as respostas (protegido por token).
// Ex.: GET /api/responses  com header  "Authorization: Bearer <ADMIN_TOKEN>"
app.get("/api/responses", async (req, res) => {
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ error: "ADMIN_TOKEN não configurado." });
  }
  const auth = req.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.query.token;
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const { data, error } = await supabase
    .from("responses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Erro ao ler do Supabase:", error);
    return res.status(500).json({ error: "Não foi possível ler as respostas." });
  }
  res.json({ count: data.length, responses: data });
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});
