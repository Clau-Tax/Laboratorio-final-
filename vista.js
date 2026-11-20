/* Interfaz: lee los datos, muestra la resolución paso a paso y dibuja las gráficas. */
const $ = id => document.getElementById(id);
const { fmt } = Calc;
const par = v => (v < 0 ? `(${fmt(v)})` : fmt(v));
const frac = (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`;
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
let ultimo = null; // último resultado, para redibujar las gráficas si cambia el tamaño de la ventana

/* ---------- RESOLUCIÓN (compacta: todo cabe en su recuadro) ---------- */
function columna(titulo, fondo, filas, total, suma, cols) {
  const filasGrid = Math.ceil(filas.length / cols);
  return `<div class="col flex min-h-0 flex-col overflow-hidden">
    <div class="${fondo} col-cab shrink-0">${titulo}</div>
    <div class="mate filas grid min-h-0 flex-1" style="grid-auto-flow:column;grid-template-columns:repeat(${cols},minmax(0,1fr));grid-template-rows:repeat(${filasGrid},minmax(0,1fr))">
      ${filas.map(f => `<div class="fila anim flex min-w-0 items-center overflow-hidden break-words px-3 leading-tight">${f}</div>`).join('')}
    </div>
    <div class="col-pie mate shrink-0 break-words leading-tight">A = ${suma} = <b>${fmt(total)} u²</b></div>
  </div>`;
}
const num = (q, extra = '') => `<span class="idx mr-2 shrink-0 font-sans text-[0.7em]" title="[${fmt(q.x0)}, ${fmt(q.x1)}]">${q.i + 1}${extra}</span>`;

function renderResolucion(r) {
  // Con más de 5 subintervalos se usan 2 columnas y se abrevia la fórmula (queda en el título)
  const comp = r.n > 5, cols = comp ? 2 : 1;
  const fs = r.n <= 3 ? 'clamp(13px,2.2vh,16px)' : r.n <= 5 ? 'clamp(12px,1.9vh,15px)' : 'clamp(11px,1.6vh,13px)';
  const filasT = r.trap.map(t => `${num(t)}<span>A = ${comp ? '' : `${frac('B₁ + B₂', 2)} · H = `}${frac(`${par(t.B1)} + ${par(t.B2)}`, 2)} · ${fmt(r.h)} = <b>${fmt(t.A)}</b></span>`);
  const filasR = r.rect.map(q => `${num(q, r.tipo === 'med' ? ` · m=${fmt((q.x0 + q.x1) / 2)}` : '')}<span>A = ${comp ? '' : 'B · H = '}${par(q.B)} · ${fmt(r.h)} = <b>${fmt(q.A)}</b></span>`);
  const formT = comp ? '<span class="ml-2 text-xs font-normal">A = (B₁ + B₂)/2 · H</span>' : '';
  const formR = comp ? '<span class="ml-2 text-xs font-normal">A = B · H</span>' : '';

  $('res').innerHTML = `
    <div class="caja-datos shrink-0 text-[13px]">
      <p class="mate leading-tight">f(x) = <b>${esc($('fx').value)}</b> · a = ${par(r.a)} · b = ${par(r.b)} · n = ${r.n} ·
        H = ${frac('b − a', 'n')} = ${frac(`${fmt(r.b)} − ${par(r.a)}`, r.n)} = <b>${fmt(r.h)}</b>
        <span class="suave ml-2 font-sans text-[11px]">B = altura · H = ancho${r.ref == null ? '' : ` · Referencia (Simpson) ≈ ${fmt(r.ref)}`}</span></p>
    </div>
    <div class="grid min-h-0 flex-1 grid-cols-2 gap-3" style="font-size:${fs}">
      ${columna(`Método de los trapecios${formT}`, 'cab-trap', filasT, r.At, r.trap.map(t => par(t.A)).join(' + '), cols)}
      ${columna(`Rectángulos (${Calc.TIPOS[r.tipo]})${formR}`, 'cab-rect', filasR, r.Ar, r.rect.map(q => par(q.A)).join(' + '), cols)}
    </div>`;
}

/* ---------- GRÁFICA (SVG del tamaño exacto de su recuadro; se ajusta a cualquier valor) ---------- */
function nice(lo, hi) {
  const raw = (hi - lo) / 6, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  const s = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p, t = [];
  for (let v = Math.ceil(lo / s - 1e-9) * s; v <= hi + 1e-9; v += s) t.push(+v.toPrecision(12));
  return t;
}

function grafica(r, modo, W, H) {
  W = Math.max(W, 240); H = Math.max(H, 140);
  const M = { l: 44, r: 14, t: 12, b: 26 }, N = 300, pts = [];
  for (let i = 0; i <= N; i++) { const x = r.a + (r.b - r.a) * i / N; pts.push([x, r.f(x)]); }
  const fin = pts.map(p => p[1]).filter(Number.isFinite);
  const lista = modo === 'trap' ? r.trap : r.rect, alt = modo === 'trap' ? r.ys : r.rect.map(q => q.B);
  let y0 = Math.min(0, ...fin, ...alt), y1 = Math.max(0, ...fin, ...alt);
  if (y1 - y0 < 1e-12) { y0 -= 1; y1 += 1; }
  const py = (y1 - y0) * 0.08, px = (r.b - r.a) * 0.04;
  y0 -= py; y1 += py;
  const x0 = r.a - px, x1 = r.b + px;
  const sx = x => M.l + (x - x0) / (x1 - x0) * (W - M.l - M.r);
  const sy = y => H - M.b - (y - y0) / (y1 - y0) * (H - M.t - M.b);

  const formas = lista.map(q => {
    const ya = modo === 'trap' ? q.B1 : q.B, yb = modo === 'trap' ? q.B2 : q.B;
    const clase = (modo === 'trap' ? 'f-trap' : 'f-rect') + (ya + yb < 0 ? ' f-neg' : '');
    return `<path d="M${sx(q.x0)} ${sy(0)}L${sx(q.x0)} ${sy(ya)}L${sx(q.x1)} ${sy(yb)}L${sx(q.x1)} ${sy(0)}Z" class="forma ${clase}"><title>Subintervalo ${q.i + 1}: A = ${fmt(q.A)}</title></path>`;
  }).join('');
  const rejilla = nice(x0, x1).map(v => `<line class="g-rej" x1="${sx(v)}" x2="${sx(v)}" y1="${M.t}" y2="${H - M.b}"/><text class="g-txt" x="${sx(v)}" y="${H - 8}" text-anchor="middle">${fmt(v)}</text>`).join('')
    + nice(y0, y1).map(v => `<line class="g-rej" x1="${M.l}" x2="${W - M.r}" y1="${sy(v)}" y2="${sy(v)}"/><text class="g-txt" x="${M.l - 6}" y="${sy(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join('');
  const ejes = `<line class="g-eje" x1="${M.l}" x2="${W - M.r}" y1="${sy(0)}" y2="${sy(0)}"/>`
    + (x0 < 0 && x1 > 0 ? `<line class="g-eje" x1="${sx(0)}" x2="${sx(0)}" y1="${M.t}" y2="${H - M.b}"/>` : '');
  let d = '', lapiz = false;
  for (const [x, y] of pts) {
    if (!Number.isFinite(y)) { lapiz = false; continue; }
    d += `${lapiz ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`; lapiz = true;
  }
  const puntos = r.n <= 40 ? r.xs.map((x, i) => `<circle cx="${sx(x)}" cy="${sy(r.ys[i])}" r="3.5" class="g-pto"/>`).join('') : '';
  return `<svg class="absolute inset-0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-size="12">${rejilla}${formas}${ejes}<path class="g-curva" d="${d}"/>${puntos}</svg>`;
}

function renderGraficas(r) {
  const err = v => (r.ref == null ? '' : ` · error ${fmt(Math.abs(v - r.ref))}`);
  $('graf').innerHTML = [['trap', 'Trapecios', r.At], ['rect', `Rectángulos (${Calc.TIPOS[r.tipo]})`, r.Ar]].map(([m, t, A]) =>
    `<figure class="anim flex h-64 min-h-0 flex-col sm:h-72 xl:h-auto">
      <figcaption class="mb-1 flex shrink-0 items-center justify-between gap-2 text-sm font-semibold"><span>${t}</span>
        <span class="pildora">A ≈ ${fmt(A)} u²${err(A)}</span></figcaption>
      <div class="lienzo min-h-0 flex-1" data-m="${m}"></div></figure>`).join('');
  // Se dibuja con el tamaño real de cada recuadro para que la gráfica lo llene por completo
  document.querySelectorAll('#graf .lienzo').forEach(el => { el.innerHTML = grafica(r, el.dataset.m, el.clientWidth, el.clientHeight); });
}

/* ---------- EVENTOS ---------- */
function resolver() {
  const aviso = $('error'), nota = $('nota');
  try {
    const f = Calc.compilar($('fx').value), cte = s => Calc.compilar(s)(0);
    const a = cte($('a').value), b = cte($('b').value), n = Number($('n').value);
    if (!Number.isInteger(n) || n < 1 || n > 10) throw Error('n debe ser un entero entre 1 y 10 (así todo cabe en una pantalla)');
    if (!(a < b)) throw Error('Los límites deben cumplir a < b');
    const r = Calc.calcular(f, a, b, n, $('tipo').value);
    r.f = f;
    ultimo = r;
    aviso.classList.add('hidden'); nota.classList.remove('hidden');
    renderResolucion(r);
    renderGraficas(r);
  } catch (e) {
    aviso.textContent = e.message;
    aviso.classList.remove('hidden'); nota.classList.add('hidden');
  }
}

$('form').addEventListener('submit', e => { e.preventDefault(); resolver(); });
$('tipo').addEventListener('change', resolver);
window.addEventListener('resize', () => ultimo && renderGraficas(ultimo));
document.querySelectorAll('[data-ej]').forEach(btn => btn.addEventListener('click', () => {
  const [f, a, b, n] = btn.dataset.ej.split('|');
  $('fx').value = f; $('a').value = a; $('b').value = b; $('n').value = n;
  resolver();
}));
resolver();