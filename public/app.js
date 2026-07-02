// Constrói o formulário dinamicamente a partir de /api/questions e envia
// as respostas para /api/submit.

const el = (id) => document.getElementById(id);
const state = { questions: [] };

async function load() {
  try {
    const res = await fetch("/api/questions");
    const data = await res.json();
    state.questions = data.questions;
    el("title").textContent = data.title;
    el("description").textContent = data.description || "";
    renderQuestions(data.questions);
    el("form").hidden = false;
  } catch (err) {
    el("title").textContent = "Erro ao carregar o questionário";
    console.error(err);
  }
}

function renderQuestions(questions) {
  const container = el("questions");
  container.innerHTML = "";

  for (const q of questions) {
    const wrap = document.createElement("div");
    wrap.className = "question";

    const label = document.createElement("label");
    label.className = "q-label";
    label.textContent = q.label;
    if (q.required) {
      const star = document.createElement("span");
      star.className = "required";
      star.textContent = " *";
      label.appendChild(star);
    }
    wrap.appendChild(label);

    wrap.appendChild(renderInput(q));
    container.appendChild(wrap);
  }
}

function renderInput(q) {
  switch (q.type) {
    case "text":
    case "email": {
      const input = document.createElement("input");
      input.type = q.type;
      input.name = q.id;
      input.dataset.qid = q.id;
      return input;
    }
    case "textarea": {
      const ta = document.createElement("textarea");
      ta.name = q.id;
      ta.dataset.qid = q.id;
      return ta;
    }
    case "radio":
      return renderChoices(q, "radio");
    case "checkbox":
      return renderChoices(q, "checkbox");
    case "rating":
      return renderRating(q);
    default: {
      const span = document.createElement("span");
      span.textContent = "(tipo desconhecido)";
      return span;
    }
  }
}

function renderChoices(q, type) {
  const box = document.createElement("div");
  box.className = "options";
  for (const opt of q.options) {
    const lbl = document.createElement("label");
    lbl.className = "option";
    const input = document.createElement("input");
    input.type = type;
    input.name = q.id;
    input.value = opt;
    input.dataset.qid = q.id;
    lbl.appendChild(input);
    lbl.appendChild(document.createTextNode(opt));
    box.appendChild(lbl);
  }
  return box;
}

function renderRating(q) {
  const box = document.createElement("div");
  box.className = "rating";
  box.dataset.qid = q.id;
  box.dataset.value = "";
  for (let i = q.min; i <= q.max; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = i;
    btn.addEventListener("click", () => {
      box.dataset.value = String(i);
      [...box.children].forEach((c) => c.classList.remove("selected"));
      btn.classList.add("selected");
    });
    box.appendChild(btn);
  }
  return box;
}

function collectAnswers() {
  const answers = {};
  for (const q of state.questions) {
    if (q.type === "text" || q.type === "email" || q.type === "textarea") {
      const input = document.querySelector(`[data-qid="${q.id}"]`);
      const v = input.value.trim();
      if (v) answers[q.id] = v;
    } else if (q.type === "radio") {
      const checked = document.querySelector(`input[name="${q.id}"]:checked`);
      if (checked) answers[q.id] = checked.value;
    } else if (q.type === "checkbox") {
      const checked = [
        ...document.querySelectorAll(`input[name="${q.id}"]:checked`),
      ].map((c) => c.value);
      if (checked.length) answers[q.id] = checked;
    } else if (q.type === "rating") {
      const box = document.querySelector(`.rating[data-qid="${q.id}"]`);
      if (box.dataset.value) answers[q.id] = Number(box.dataset.value);
    }
  }
  return answers;
}

async function onSubmit(e) {
  e.preventDefault();
  const errorEl = el("error");
  errorEl.hidden = true;

  const submit = el("submit");
  submit.disabled = true;
  submit.textContent = "A enviar…";

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: collectAnswers() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao enviar.");

    el("form").hidden = true;
    el("thanks").hidden = false;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = "Enviar respostas";
  }
}

el("form").addEventListener("submit", onSubmit);
el("again").addEventListener("click", () => {
  el("thanks").hidden = true;
  el("form").hidden = false;
  el("form").reset();
  renderQuestions(state.questions);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

load();
