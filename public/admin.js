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
      `<text x="${tx}" y="${ty}" fill="${c}" font-family="Titillium Web, sans-serif" font-weight="700" font-size="11" letter-spacing="0.6" text-anchor="${a}">${t}</text>`;
    const dots = pontos
      .map((p) => {
        const c = coord(p.abN, p.acN);
        const cor = (DATA.perfis[p.profile] || {}).cor || "#9db2c7";
        return `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="5.5" fill="${cor}" fill-opacity="0.7" stroke="#fff" stroke-width="1.2"/>`;
      })
      .join("");
    return `
      <svg class="map" viewBox="0 0 ${W} ${W}" role="img" aria-label="Distribuição de perfis">
        <rect x="${P}" y="${P}" width="${S}" height="${S}" fill="#f7faff" stroke="#d7e3f5" rx="14"/>
        <line x1="${dx}" y1="${P}" x2="${dx}" y2="${P + S}" stroke="#c6d7ee" stroke-dasharray="4 5"/>
        <line x1="${P}" y1="${dy}" x2="${P + S}" y2="${dy}" stroke="#c6d7ee" stroke-dasharray="4 5"/>
        ${lbl(P + 10, P + 22, "GUARDIÃO/Ã", "#e08a1e", "start")}
        ${lbl(P + S - 10, P + 22, "PIONEIRO/A", "#5f9e00", "end")}
        ${lbl(P + 10, P + S - 12, "OBSERVADOR/A", "#6b7f97", "start")}
        ${lbl(P + S - 10, P + S - 12, "CURIOSO/A", "#0a97b0", "end")}
        ${lbl(P + S / 2, W - 8, "ABERTURA →", "#9aa7b6", "middle")}
        <g transform="translate(14 ${P + S / 2}) rotate(-90)">${lbl(0, 0, "AÇÃO →", "#9aa7b6", "middle")}</g>
        ${dots}
      </svg>`;
  }

  // ---- render ---------------------------------------------------------------
  function render(s) {
    const total = s.total;

    const kpis =
      `<div class="kpi card">
        <div class="n" data-count="${total}" style="color:var(--brand)">0</div>
        <div class="t">Respostas</div>
      </div>` +
      ORDER.map((k) => {
        const p = DATA.perfis[k];
        const n = s.porPerfil[k] || 0;
        return `<div class="kpi card">
          <div class="n" data-count="${n}" style="color:${p.cor}">0</div>
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
        <div class="track"><span data-w="${pct(n, total)}" style="background:${p.cor}"></span></div>
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
          <div class="tk"><span data-w="${pct(c, qTotal)}"></span></div>
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
            <span class="chip live">ao vivo · atualiza 15s</span>
            <button class="icon-btn" id="fs">⛶ Ecrã inteiro</button>
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
              <div class="a"><div class="lab"><span>Abertura</span><b>${abV}/10</b></div><div class="track"><span data-w="${s.mediaAbN * 100}" style="background:linear-gradient(90deg,var(--brand-2),var(--brand))"></span></div></div>
              <div class="a"><div class="lab"><span>Ação</span><b style="color:var(--cyan)">${acV}/10</b></div><div class="track"><span data-w="${s.mediaAcN * 100}" style="background:var(--cyan)"></span></div></div>
            </div>
          </div>
        </div>

        <div class="section-title">Respostas por sinal</div>
        <div class="questions">${questions}</div>

        <div class="section-title">Últimas respostas</div>
        <div class="card panel-c">${recent}</div>
      </div>`;

    document.getElementById("fs").onclick = () => {
      if (!document.fullscreenElement) {
        (document.documentElement.requestFullscreen ||
          document.documentElement.webkitRequestFullscreen)?.call(document.documentElement);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      }
    };
    document.getElementById("refresh").onclick = load;
    document.getElementById("logout").onclick = () => {
      localStorage.removeItem(KEY);
      token = "";
      renderGate();
    };

    // animações: barras crescem, KPIs contam
    requestAnimationFrame(() => {
      document.querySelectorAll("[data-w]").forEach((sp) => {
        sp.style.width = sp.getAttribute("data-w") + "%";
      });
      document.querySelectorAll("[data-count]").forEach((el) => {
        countUp(el, +el.getAttribute("data-count"));
      });
    });
  }

  function countUp(el, target) {
    const dur = 800, start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---- arranque -------------------------------------------------------------
  if (token) load();
  else renderGate();
})();
