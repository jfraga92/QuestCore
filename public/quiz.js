/* "A Tua Rota" — motor da experiência */
(function () {
  const DATA = window.QUIZ_DATA;
  const $stage = document.getElementById("stage");
  const $counter = document.getElementById("counter");
  const $sala = document.getElementById("sala");

  const state = { name: "", answers: [], idx: 0, result: null };

  // ---- utils ----------------------------------------------------------------
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  // **negrito** -> <strong>
  function md(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }
  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  function setStage(html, cls) {
    $stage.className = "screen " + (cls || "");
    $stage.innerHTML = html;
  }

  // ---- pontuação ------------------------------------------------------------
  function compute() {
    let ab = 0,
      ac = 0;
    state.answers.forEach((opt, i) => {
      const o = DATA.questions[i].opcoes[opt - 1];
      ab += o.ab;
      ac += o.ac;
    });
    const abN = ab / DATA.eixos.abMax;
    const acN = ac / DATA.eixos.acMax;
    let key;
    if (abN >= 0.55 && acN >= 0.5) key = "PIONEIRO";
    else if (abN >= 0.55 && acN < 0.5) key = "CURIOSO";
    else if (abN < 0.55 && acN >= 0.5) key = "GUARDIAO";
    else key = "OBSERVADOR";
    return { ab, ac, abN, acN, key };
  }

  function buildSwot(key) {
    const p = DATA.perfis[key].swot;
    const quad = { S: [p.S], W: [p.W], O: [p.O], T: [p.T] };
    state.answers.forEach((opt, i) => {
      const o = DATA.questions[i].opcoes[opt - 1];
      (o.swot || []).forEach(([axis, text]) => {
        if (!quad[axis].includes(text) && quad[axis].length < 4)
          quad[axis].push(text);
      });
    });
    return quad;
  }

  // ---- ecrãs ----------------------------------------------------------------
  function renderCover() {
    $counter.textContent = "";
    setStage(
      `
      <div class="screen cover">
        <h1>A TUA ROTA</h1>
        <p>A inCentea Core está a traçar a sua rota para a era da IA. E há uma coisa que nenhum plano, por melhor que seja, consegue garantir: <strong>o teu lugar nela</strong>. Esse, só tu o defines.</p>
        <p class="lead">10 sinais do terreno. 10 escolhas tuas. No fim: o teu lugar no mapa, com a tua SWOT pessoal.</p>
        <div class="note">sem respostas certas · uso interno inCentea Core</div>
        <div class="cta"><button class="btn btn-primary" id="start">Começar</button></div>
      </div>`,
      "cover"
    );
    document.getElementById("start").onclick = renderName;
  }

  function renderName() {
    $counter.textContent = "";
    setStage(
      `
      <div class="screen name-screen">
        <div class="label">Antes de começar</div>
        <h2>Como te chamas?</h2>
        <input id="nome" type="text" autocomplete="name" placeholder="O teu nome" value="${esc(
          state.name
        )}" maxlength="120" />
        <div class="name-hint">O teu nome fica com a tua resposta (uso interno da equipa).</div>
        <div class="cta"><button class="btn btn-primary" id="go">Continuar</button></div>
      </div>`,
      "name-screen"
    );
    const input = document.getElementById("nome");
    const go = document.getElementById("go");
    input.focus();
    const submit = () => {
      const v = input.value.trim();
      if (!v) {
        input.style.borderColor = "#ff7a7a";
        input.focus();
        return;
      }
      state.name = v;
      state.idx = 0;
      renderQuestion();
    };
    go.onclick = submit;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  }

  function renderQuestion() {
    const i = state.idx;
    const q = DATA.questions[i];
    const pct = ((i) / DATA.questions.length) * 100;
    $counter.textContent = `Sinal ${pad2(q.n)}/10`;

    setStage(
      `
      <div class="screen q">
        <div class="progress">
          <div class="label">${pad2(q.n)} / 10</div>
          <div class="bar"><span style="width:${pct}%"></span></div>
        </div>
        <div class="sinal">
          <div class="label k">Sinal</div>
          <p>${md(q.sinal)}</p>
        </div>
        <div class="pergunta">${md(q.pergunta)}</div>
        <div class="opts" id="opts">
          ${q.opcoes
            .map(
              (o, k) => `
            <button class="opt" data-k="${k}">
              <span class="dot"></span>
              <span>${md(o.t)}</span>
            </button>`
            )
            .join("")}
        </div>
        <div class="panel hidden" id="panel"></div>
        <div class="continue hidden" id="cont">
          <button class="btn btn-primary" id="continue">Continuar</button>
        </div>
      </div>`,
      "q"
    );

    const opts = document.getElementById("opts");
    opts.querySelectorAll(".opt").forEach((btn) => {
      btn.onclick = () => choose(parseInt(btn.dataset.k, 10));
    });
  }

  function choose(k) {
    const i = state.idx;
    const q = DATA.questions[i];
    const o = q.opcoes[k];
    state.answers[i] = k + 1; // 1..4

    const opts = document.getElementById("opts");
    opts.classList.add("answered");
    opts.querySelectorAll(".opt").forEach((btn, idx) => {
      if (idx === k) btn.classList.add("sel");
    });

    const panel = document.getElementById("panel");
    panel.innerHTML = `
      <div class="eco">
        <div class="label k">Eco</div>
        <p>${md(o.eco)}</p>
      </div>
      <div class="facto">
        <span class="tag">Facto</span>
        <p>${md(o.facto)}</p>
      </div>`;
    panel.classList.remove("hidden");

    const cont = document.getElementById("cont");
    cont.classList.remove("hidden");
    document.getElementById("continue").onclick = next;
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function next() {
    if (state.idx < DATA.questions.length - 1) {
      state.idx++;
      window.scrollTo({ top: 0 });
      renderQuestion();
    } else {
      finish();
    }
  }

  function finish() {
    const r = compute();
    state.result = r;
    renderFinal(r);
    save(r); // grava em segundo plano
  }

  async function save(r) {
    try {
      await fetch("/api/rota/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.name, answers: state.answers }),
      });
    } catch (e) {
      /* silencioso — o resultado individual já foi mostrado */
    }
  }

  // ---- mapa (SVG) -----------------------------------------------------------
  function mapSVG(r) {
    const S = 260,
      P = 34,
      W = S + P * 2;
    const x = (v) => P + v * S;
    const y = (v) => P + (1 - v) * S;
    const dx = x(0.55),
      dy = y(0.5);
    const px = x(Math.min(Math.max(r.abN, 0), 1));
    const py = y(Math.min(Math.max(r.acN, 0), 1));
    const cor = DATA.perfis[r.key].cor;
    const lbl = (tx, ty, t, c, anchor) =>
      `<text x="${tx}" y="${ty}" fill="${c}" font-family="DM Mono, monospace" font-size="11" letter-spacing="1.2" text-anchor="${anchor}" opacity="0.85">${t}</text>`;
    return `
    <svg class="map" viewBox="0 0 ${W} ${W}" role="img" aria-label="Mapa de perfis">
      <rect x="${P}" y="${P}" width="${S}" height="${S}" fill="#f7faff" stroke="#d7e3f5" rx="14"/>
      <line x1="${dx}" y1="${P}" x2="${dx}" y2="${P + S}" stroke="#c6d7ee" stroke-dasharray="4 5"/>
      <line x1="${P}" y1="${dy}" x2="${P + S}" y2="${dy}" stroke="#c6d7ee" stroke-dasharray="4 5"/>
      ${lbl(P + 10, P + 22, "GUARDIÃO/Ã", "#e08a1e", "start")}
      ${lbl(P + S - 10, P + 22, "PIONEIRO/A", "#5f9e00", "end")}
      ${lbl(P + 10, P + S - 12, "OBSERVADOR/A", "#6b7f97", "start")}
      ${lbl(P + S - 10, P + S - 12, "CURIOSO/A", "#0a97b0", "end")}
      ${lbl(P + S / 2, W - 8, "ABERTURA →", "#9aa7b6", "middle")}
      <g transform="translate(14 ${P + S / 2}) rotate(-90)">${lbl(0, 0, "AÇÃO →", "#9aa7b6", "middle")}</g>
      <circle cx="${px}" cy="${py}" r="16" fill="${cor}" opacity="0.28">
        <animate attributeName="r" values="12;24;12" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2.4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="${px}" cy="${py}" r="7.5" fill="${cor}" stroke="#fff" stroke-width="2.5"/>
      <text x="${px}" y="${py - 18}" fill="${cor}" font-family="Titillium Web, sans-serif" font-weight="700" font-size="12" text-anchor="middle">estás aqui</text>
    </svg>`;
  }

  function renderFinal(r) {
    const perfil = DATA.perfis[r.key];
    const swot = buildSwot(r.key);
    const abV = Math.round(r.abN * 10);
    const acV = Math.round(r.acN * 10);
    const swotBlock = (cls, titulo, arr) => `
      <div class="quad ${cls}">
        <h4>${titulo}</h4>
        <ul>${arr.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      </div>`;

    $counter.textContent = "Resultado";
    setStage(
      `
      <div class="screen final">
        <div class="result-head">
          <div class="label">O teu lugar no mapa</div>
          <div class="sym" style="color:${perfil.cor}">${perfil.simbolo}</div>
          <div class="pname" style="color:${perfil.cor}">${esc(perfil.nome)}</div>
          <div class="pdesc">${md(perfil.descricao)}</div>
        </div>

        <div class="card map-wrap">${mapSVG(r)}</div>

        <div>
          <div class="block-title">Os teus eixos</div>
          <div class="axes card">
            <div class="axis">
              <div class="row"><span>Abertura</span><span class="v" id="val-ab">0/10</span></div>
              <div class="track"><span id="bar-ab" style="background:linear-gradient(90deg,var(--brand-2),var(--brand))"></span></div>
            </div>
            <div class="axis">
              <div class="row"><span>Ação</span><span class="v" id="val-ac" style="color:var(--cyan)">0/10</span></div>
              <div class="track"><span id="bar-ac" style="background:var(--cyan)"></span></div>
            </div>
          </div>
        </div>

        <div>
          <div class="block-title">A tua SWOT pessoal</div>
          <div class="swot">
            ${swotBlock("s", "O que trazes", swot.S)}
            ${swotBlock("w", "O que te trava", swot.W)}
            ${swotBlock("o", "O que se abre para ti", swot.O)}
            ${swotBlock("t", "O risco de ficares parado/a", swot.T)}
          </div>
        </div>

        <div>
          <div class="block-title">O próximo passo</div>
          <div class="next-step"><p>${md(perfil.proximo)}</p></div>
        </div>

        <div class="closing">A rota está definida.<br/><strong>O teu lugar nela és tu que o escolhes.</strong></div>

        <div class="final-actions">
          <div class="row-actions">
            <button class="btn btn-ghost" id="sala-btn">Modo Sala</button>
            <button class="btn btn-ghost" id="share-btn">Partilhar</button>
          </div>
          <button class="btn btn-primary" id="redo">Refazer a rota</button>
        </div>

        <div class="foot">A TUA ROTA · uso interno inCentea Core</div>
      </div>`,
      "final"
    );

    document.getElementById("redo").onclick = () => {
      state.answers = [];
      state.idx = 0;
      state.result = null;
      window.scrollTo({ top: 0 });
      renderCover();
    };
    document.getElementById("sala-btn").onclick = () => openSala(r);
    document.getElementById("share-btn").onclick = () => share(r);

    // animação: barras crescem de 0 e números contam
    requestAnimationFrame(() => {
      const ab = document.getElementById("bar-ab");
      const ac = document.getElementById("bar-ac");
      if (ab) ab.style.width = r.abN * 100 + "%";
      if (ac) ac.style.width = r.acN * 100 + "%";
      countUp(document.getElementById("val-ab"), abV);
      countUp(document.getElementById("val-ac"), acV);
    });
  }

  function countUp(el, target) {
    if (!el) return;
    const dur = 900;
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + "/10";
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---- Modo Sala ------------------------------------------------------------
  function openSala(r) {
    const perfil = DATA.perfis[r.key];
    $sala.style.background = perfil.cor;
    const dark = "#050a13";
    $sala.innerHTML = `
      <div class="sym" style="color:${dark};opacity:0.9">${perfil.simbolo}</div>
      <div class="pname" style="color:${dark}">${esc(perfil.nome)}</div>
      <div class="hint" style="color:${dark}">levanta o telemóvel · toca para fechar</div>`;
    $sala.classList.remove("hidden");
    $sala.onclick = () => $sala.classList.add("hidden");
  }

  // ---- Partilhar ------------------------------------------------------------
  function share(r) {
    const perfil = DATA.perfis[r.key];
    const abV = Math.round(r.abN * 10);
    const acV = Math.round(r.acN * 10);
    const txt = `A Tua Rota — o meu perfil: ${perfil.nome} ${perfil.simbolo}\nAbertura ${abV}/10 · Ação ${acV}/10\ninCentea Core`;
    if (navigator.share) {
      navigator.share({ title: "A Tua Rota", text: txt }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(() => {
        const b = document.getElementById("share-btn");
        if (b) {
          b.textContent = "Copiado ✓";
          setTimeout(() => (b.textContent = "Partilhar"), 1800);
        }
      });
    }
  }

  // ---- arranque -------------------------------------------------------------
  renderCover();
})();
