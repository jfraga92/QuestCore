/* "A Tua Rota" — painel de administração */
(function () {
  const DATA = window.QUIZ_DATA;
  const root = document.getElementById("root");
  const KEY = "rota_admin_token";
  const ORDER = ["PIONEIRO", "CURIOSO", "GUARDIAO", "OBSERVADOR"];
  let token = localStorage.getItem(KEY) || "";
  let timer = null;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function pct(n, total) {
    return total ? Math.round((n / total) * 100) : 0;
  }

  // ---- gate -----------------------------------------------------------------
  function renderGate(msg) {
    if (timer) { clearInterval(timer); timer = null; }
    root.innerHTML = `
      <div class="gate">
        <div class="box card">
          <div class="brand" style="justify-content:center"><img src="/logo.webp" alt="inCentea"/><span class="brand-txt">A Tua Rota</span></div>
          <h2>Painel de respostas</h2>
          <p>Introduz o token de administração para veres as estatísticas.</p>
          <div class="err">${msg ? esc(msg) : ""}</div>
          <input id="tk" type="password" placeholder="ADMIN_TOKEN" value="${esc(token)}" />
          <button class="btn btn-primary" id="enter" style="width:100%">Entrar</button>
        </div>
      </div>`;
    const input = document.getElementById("tk");
    input.focus();
    const go = () => {
      token = input.value.trim();
      localStorage.setItem(KEY, token);
      load();
    };
    document.getElementById("enter").onclick = go;
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  // ---- load -----------------------------------------------------------------
  async function load() {
    if (!token) return renderGate();
    let res;
    try {
      res = await fetch("/api/rota/stats?token=" + encodeURIComponent(token));
    } catch (e) {
      return renderGate("Erro de ligação.");
    }
    if (res.status === 401) return renderGate("Token inválido.");
    if (!res.ok) return renderGate("Erro ao carregar (" + res.status + ").");
    const stats = await res.json();
    render(stats);
    if (!timer) timer = setInterval(load, 15000);
  }

  // ---- coordenadas do mapa --------------------------------------------------
  function coord(abN, acN) {
    const S = 260, P = 34;
    return {
      x: P + Math.min(Math.max(abN, 0), 1) * S,
      y: P + (1 - Math.min(Math.max(acN, 0), 1)) * S,
      W: S + P * 2, S, P,
    };
  }

  function scatterSVG(pontos) {
    const g = coord(0, 0);
    const S = g.S, P = g.P, W = g.W;
    const dx = P + 0.55 * S, dy = P + 0.5 * S;
    const lbl = (tx, ty, t, c, a) =>
      `<text x="${tx}" y="${ty}" fill="${c}" font-family="DM Mono, monospace" font-size="11" letter-spacing="1.1" text-anchor="${a}" opacity="0.85">${t}</text>`;
    const dots = pontos
      .map((p) => {
        const c = coord(p.abN, p.acN);
        const cor = (DATA.perfis[p.profile] || {}).cor || "#9db2c7";
        return `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="5" fill="${cor}" fill-opacity="0.55" stroke="${cor}" stroke-opacity="0.9"/>`;
      })
      .join("");
    return `
      <svg class="map" viewBox="0 0 ${W} ${W}" role="img" aria-label="Distribuição de perfis">
        <rect x="${P}" y="${P}" width="${S}" height="${S}" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.10)" rx="14"/>
        <line x1="${dx}" y1="${P}" x2="${dx}" y2="${P + S}" stroke="rgba(255,255,255,0.10)" stroke-dasharray="4 5"/>
        <line x1="${P}" y1="${dy}" x2="${P + S}" y2="${dy}" stroke="rgba(255,255,255,0.10)" stroke-dasharray="4 5"/>
        ${lbl(P + 10, P + 22, "GUARDIÃO/Ã", "#FFB454", "start")}
        ${lbl(P + S - 10, P + 22, "PIONEIRO/A", "#A6CE39", "end")}
        ${lbl(P + 10, P + S - 12, "OBSERVADOR/A", "#9DB2C7", "start")}
        ${lbl(P + S - 10, P + S - 12, "CURIOSO/A", "#4FD8EB", "end")}
        ${lbl(P + S / 2, W - 8, "ABERTURA →", "#5c6b7d", "middle")}
        <g transform="translate(14 ${P + S / 2}) rotate(-90)">${lbl(0, 0, "AÇÃO →", "#5c6b7d", "middle")}</g>
        ${dots}
      </svg>`;
  }

  // ---- render ---------------------------------------------------------------
  function render(s) {
    const total = s.total;

    const kpis =
      `<div class="kpi card">
        <div class="n" style="color:var(--lime)">${total}</div>
        <div class="t">Respostas</div>
      </div>` +
      ORDER.map((k) => {
        const p = DATA.perfis[k];
        const n = s.porPerfil[k] || 0;
        return `<div class="kpi card">
          <div class="n" style="color:${p.cor}">${n}</div>
          <div class="t">${p.simbolo} ${esc(p.nome)}</div>
          <div class="pct">${pct(n, total)}%</div>
        </div>`;
      }).join("");

    const distro = ORDER.map((k) => {
      const p = DATA.perfis[k];
      const n = s.porPerfil[k] || 0;
      return `<div class="r">
        <div class="top">
          <span class="name"><span class="sym" style="color:${p.cor}">${p.simbolo}</span>${esc(p.nome)}</span>
          <span class="val">${n} · ${pct(n, total)}%</span>
        </div>
        <div class="track"><span style="width:${pct(n, total)}%;background:${p.cor}"></span></div>
      </div>`;
    }).join("");

    const abV = Math.round(s.mediaAbN * 10);
    const acV = Math.round(s.mediaAcN * 10);

    const questions = DATA.questions.map((q, i) => {
      const counts = s.perguntas[i] || [0, 0, 0, 0];
      const qTotal = counts.reduce((a, b) => a + b, 0);
      const obars = q.opcoes.map((o, k) => {
        const c = counts[k] || 0;
        return `<div class="o">
          <div class="l"><span>${esc(o.t)}</span><span class="c">${c} · ${pct(c, qTotal)}%</span></div>
          <div class="tk"><span style="width:${pct(c, qTotal)}%"></span></div>
        </div>`;
      }).join("");
      return `<div class="qcard card">
        <div class="qn">SINAL ${String(q.n).padStart(2, "0")}/10</div>
        <div class="qt">${esc(q.pergunta)}</div>
        <div class="obar">${obars}</div>
      </div>`;
    }).join("");

    const recent = s.recentes.length
      ? `<table>
          <thead><tr><th>Nome</th><th>Perfil</th><th>Abertura</th><th>Ação</th><th>Quando</th></tr></thead>
          <tbody>
          ${s.recentes.map((r) => {
            const p = DATA.perfis[r.profile] || { cor: "#9db2c7", simbolo: "", nome: r.profile };
            const d = new Date(r.created_at);
            const when = isNaN(d) ? "" : d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            return `<tr>
              <td>${esc(r.name)}</td>
              <td><span class="badge" style="color:${p.cor}">${p.simbolo} ${esc(p.nome)}</span></td>
              <td class="mono">${Math.round(r.abN * 10)}/10</td>
              <td class="mono">${Math.round(r.acN * 10)}/10</td>
              <td class="mono">${when}</td>
            </tr>`;
          }).join("")}
          </tbody>
        </table>`
      : `<div class="empty">Ainda não há respostas. Partilha o QR code para começar.</div>`;

    root.innerHTML = `
      <div class="dash">
        <div class="head">
          <div>
            <div class="brand" style="margin-bottom:8px"><img src="/logo.webp" alt="inCentea"/><span class="brand-txt">inCentea Core</span></div>
            <h1>A Tua Rota · Painel</h1>
            <div class="sub">Respostas e estatísticas em tempo real</div>
          </div>
          <div class="tools">
            <span class="chip live">● ao vivo · atualiza 15s</span>
            <button class="icon-btn" id="refresh">Atualizar</button>
            <button class="icon-btn" id="logout">Sair</button>
          </div>
        </div>

        <div class="grid kpis">${kpis}</div>

        <div class="section-title">Mapa &amp; distribuição</div>
        <div class="grid cols">
          <div class="card panel-c"><h3>Mapa de perfis · cada ponto é uma pessoa</h3>${scatterSVG(s.pontos)}</div>
          <div class="card panel-c">
            <h3>Distribuição de perfis</h3>
            <div class="distro">${distro}</div>
            <h3 style="margin-top:24px">Médias da equipa</h3>
            <div class="avg">
              <div class="a"><div class="lab"><span>Abertura</span><b>${abV}/10</b></div><div class="track"><span style="width:${s.mediaAbN * 100}%;background:var(--lime)"></span></div></div>
              <div class="a"><div class="lab"><span>Ação</span><b style="color:var(--cyan)">${acV}/10</b></div><div class="track"><span style="width:${s.mediaAcN * 100}%;background:var(--cyan)"></span></div></div>
            </div>
          </div>
        </div>

        <div class="section-title">Respostas por sinal</div>
        <div class="questions">${questions}</div>

        <div class="section-title">Últimas respostas</div>
        <div class="card panel-c">${recent}</div>
      </div>`;

    document.getElementById("refresh").onclick = load;
    document.getElementById("logout").onclick = () => {
      localStorage.removeItem(KEY);
      token = "";
      renderGate();
    };
  }

  // ---- arranque -------------------------------------------------------------
  if (token) load();
  else renderGate();
})();
