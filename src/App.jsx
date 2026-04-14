import { useState, useEffect } from "react";

// --- Storage ------------------------------------------------------------------
const LS_KEY = "portfolioiq_v3";
function normalizeData(d) {
  if (!d || typeof d !== "object") return d;
  // Backward compat: add new fields if missing from old JSON
  if (!d.ferramentas) d.ferramentas = [];
  if (!d.ips) d.ips = { objetivo: "", horizonte: "", tolerancia: "Moderado", regra_rebalanceamento: "", principios: "" };
  if (!d.ips.regra_rebalanceamento) d.ips.regra_rebalanceamento = "Trimestral ou quando desvio > 5%";
  if (!d.ips.tolerancia) d.ips.tolerancia = "Moderado";
  if (!Array.isArray(d.posicoes)) d.posicoes = [];
  d.posicoes = d.posicoes.map(p => {
    const base = { ...p, indexacao: p?.indexacao ?? "" };
    if (!Array.isArray(base.historico_valor)) base.historico_valor = [];
    if (base.historico_valor.length === 0 && base.valor && base.ultima_atualizacao) {
      base.historico_valor = [{ mes: base.ultima_atualizacao, valor: base.valor }];
    }
    return base;
  });
  if (!Array.isArray(d.bens)) d.bens = [];
  d.bens = d.bens.map(b => {
    const base = { ...b };
    if (!Array.isArray(base.historico_valor)) base.historico_valor = [];
    if (base.historico_valor.length === 0 && base.valor && base.ultima_atualizacao) {
      base.historico_valor = [{ mes: base.ultima_atualizacao, valor: base.valor }];
    }
    return base;
  });
  return d;
}
function loadData() {
  try {
    const r = localStorage.getItem(LS_KEY);
    if (!r) return null;
    const d = JSON.parse(r);
    return normalizeData(d);
  } catch { return null; }
}
function saveData(d) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {}
}

// --- Constants ----------------------------------------------------------------
const CLASSES = ["Renda Fixa", "Fundos / ETFs", "Cripto", "Ações", "Internacional", "FIIs", "Outro"];
const LIQUIDEZ = ["Diária", "D+30", "D+60", "No vencimento", "Sem liquidez"];
const INDEXACAO = ["", "Pós-fixado", "Inflação", "Prefixado"];
const BALDES_INV = ["Curto Prazo", "Médio Prazo", "Longo Prazo"]; // mantém "Longo Prazo" como no JSON existente
const TIPOS_RENDA = ["Fixo", "Variável", "Passivo"];
const CLASS_COLORS = {
  "Renda Fixa": "#4ade80", "Fundos / ETFs": "#60a5fa", "Cripto": "#f59e0b",
  "Ações": "#f472b6", "Internacional": "#a78bfa", "Outro": "#94a3b8",
  "FIIs": "#38bdf8",
};
const BALDE_COLORS = { "Curto Prazo": "#34d399", "Médio Prazo": "#22c55e", "Longo Prazo": "#4ade80", "Reserva de Emergência": "#60a5fa" };
const TIPO_COLORS = { "Fixo": "#4ade80", "Variável": "#f59e0b", "Passivo": "#a78bfa" };
const COLOR_BENS_IMOVEIS = "#c084fc";
const ALERTA_BENS_MESES = 12;
const MESES_RET_HIST_POSICOES = 36;
const MESES_RET_HIST_BENS = 240;
const MESES_REND_BENS = 60;

// --- Default ------------------------------------------------------------------
const DEFAULT = {
  config: {
    taxa_investimento: 25,
    reserva_emergencia_meses: 6,
    meta_patrimonio: 1000000,
    meta_ano: 2035,
  },
  fontes_renda: [
    { id: 1, nome: "Salário CLT", valor: 8000, tipo: "Fixo", icon: "💼" },
    { id: 2, nome: "Freelance", valor: 2000, tipo: "Variável", icon: "💻" },
  ],
  ips: {
    objetivo: "", horizonte: "", tolerancia: "Moderado",
    regra_rebalanceamento: "Trimestral ou quando desvio > 5%", principios: "",
  },
  alocacao_alvo: [
    { id: 1, classe: "Renda Fixa", alvo: 55, banda: 5 },
    { id: 2, classe: "Fundos / ETFs", alvo: 35, banda: 5 },
    { id: 3, classe: "Cripto", alvo: 10, banda: 3 },
  ],
  instituicoes: [
    { id: 1, nome: "Banco do Brasil", icon: "🏦" },
    { id: 2, nome: "XP Investimentos", icon: "📈" },
    { id: 3, nome: "Binance", icon: "₿" },
  ],
  posicoes: [
    { id: 1, inst_id: 1, produto: "CDB 13% a.a.", classe: "Renda Fixa", balde: "Longo Prazo", valor: 25000, liquidez: "No vencimento", vencimento: "2026-06", ultima_atualizacao: "2025-03" },
    { id: 2, inst_id: 1, produto: "Tesouro Selic 2027", classe: "Renda Fixa", balde: "Reserva de Emergência", valor: 18000, liquidez: "Diária", vencimento: "2027-03", ultima_atualizacao: "2025-03" },
    { id: 3, inst_id: 2, produto: "BOVA11", classe: "Fundos / ETFs", balde: "Longo Prazo", valor: 12000, liquidez: "Diária", vencimento: "", ultima_atualizacao: "2025-03" },
    { id: 4, inst_id: 2, produto: "Fundo Multimercado XP", classe: "Fundos / ETFs", balde: "Longo Prazo", valor: 8000, liquidez: "D+30", vencimento: "", ultima_atualizacao: "2025-03" },
    { id: 5, inst_id: 3, produto: "Bitcoin", classe: "Cripto", balde: "Longo Prazo", valor: 5000, liquidez: "Diária", vencimento: "", ultima_atualizacao: "2025-02" },
  ],
  metas: [
    { id: 1, nome: "Viagem Europa", icon: "✈️", cor: "#818cf8", valor_alvo: 15000, prazo: "2026-06", aporte_mensal_alvo: 1000, descricao: "", aportes: [] },
    { id: 2, nome: "Troca de Carro", icon: "🚗", cor: "#fb923c", valor_alvo: 60000, prazo: "2027-12", aporte_mensal_alvo: 2000, descricao: "", aportes: [] },
  ],
  budgets: [
    { id: 1, categoria: "Moradia", maximo: 3000, icon: "🏠" },
    { id: 2, categoria: "Alimentação", maximo: 1500, icon: "🍽️" },
    { id: 3, categoria: "Transporte", maximo: 800, icon: "🚗" },
    { id: 4, categoria: "Saúde", maximo: 500, icon: "💊" },
    { id: 5, categoria: "Lazer", maximo: 600, icon: "🎬" },
    { id: 6, categoria: "Educação", maximo: 400, icon: "📚" },
  ],
  ultima_revisao: null,
  revisao_em_andamento: null,
  bens: [],
  ferramentas: [
    { id: 1, nome: "Status Invest", url: "https://statusinvest.com.br" },
    { id: 2, nome: "Tesouro Direto", url: "https://www.tesourodireto.com.br" },
  ],
};

// --- Utils --------------------------------------------------------------------
const fmt = n => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);
const pct = n => `${(n || 0).toFixed(1)}%`;
const mesAtual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const mesesDesde = mes => {
  if (!mes) return 99;
  const [y, m] = mes.split("-").map(Number);
  const now = new Date();
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
};
const mesesAte = prazo => {
  if (!prazo) return null;
  const [y, m] = prazo.split("-").map(Number);
  const now = new Date();
  return (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
};
const mesLabel = mes => {
  if (!mes) return "";
  const [y, m] = mes.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[+m - 1]} ${y}`;
};

function mesAdd(ym, deltaMeses) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + deltaMeses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Append/replace snapshot do mês e poda por retenção (meses a partir de mesAtual). */
function appendHistoricoValor(hist, mes, valor, retencaoMeses) {
  const h = Array.isArray(hist) ? [...hist] : [];
  const idx = h.findIndex(x => x.mes === mes);
  if (idx >= 0) h[idx] = { mes, valor };
  else h.push({ mes, valor });
  h.sort((a, b) => a.mes.localeCompare(b.mes));
  const cut = mesAdd(mesAtual(), -retencaoMeses);
  return h.filter(x => x.mes >= cut);
}

function valorNoHistoricoEmOuAntes(hist, mesLimite) {
  const sorted = [...(hist || [])].filter(x => x.mes <= mesLimite).sort((a, b) => b.mes.localeCompare(a.mes));
  return sorted[0]?.valor;
}

/** Retorno % simples: valor atual vs referência há `mesesAtras` meses. */
function rendimentoHistorico(valorAtual, hist, mesesAtras) {
  const mesRef = mesAdd(mesAtual(), -mesesAtras);
  const vRef = valorNoHistoricoEmOuAntes(hist, mesRef);
  if (vRef == null || vRef === 0) return null;
  return ((valorAtual - vRef) / vRef) * 100;
}

function revisaoPendente(ultima_revisao) {
  if (!ultima_revisao) return true;
  const atual = mesAtual();
  return ultima_revisao < atual;
}
function diasSemRevisao(ultima_revisao) {
  if (!ultima_revisao) return 999;
  const [y, m] = ultima_revisao.split("-").map(Number);
  const ultima = new Date(y, m - 1, 1);
  return Math.floor((new Date() - ultima) / (1000 * 60 * 60 * 24));
}

// --- Export / Import — sem dependência CDN ------------------------------------
// Exporta como JSON (backup completo) + dispara download
function exportarJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PortfolioIQ_${mesAtual()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Exporta CSV legível por humanos / Excel com todas as abas como seções
function exportarCSV(data, rendaTotal) {
  const instMap = Object.fromEntries(data.instituicoes.map(i => [i.id, i.nome]));
  const investimento = rendaTotal * (data.config.taxa_investimento / 100);
  const totalMetas = data.metas.reduce((s, m) => s + (m.aporte_mensal_alvo || 0), 0);
  const totalBudget = data.budgets.reduce((s, b) => s + b.maximo, 0);

  const esc = v => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = cols => cols.map(esc).join(",");
  const sep = (title) => `\n### ${title}\n`;

  const lines = [];

  lines.push(sep("POSIÇÕES"));
  lines.push(row(["Instituição","Produto","Classe de Ativo","Indexação","Balde","Valor (R$)","Liquidez","Vencimento","Última Atualização"]));
  data.posicoes.forEach(p => lines.push(row([instMap[p.inst_id]||"",p.produto,p.classe,p.indexacao||"",p.balde,p.valor,p.liquidez,p.vencimento||"",p.ultima_atualizacao||""])));

  lines.push(sep("BENS E IMÓVEIS"));
  lines.push(row(["Tipo","Produto","Valor (R$)","Liquidez","Última Atualização"]));
  (data.bens || []).forEach(b => lines.push(row([b.tipo === "imovel" ? "Imóvel" : "Bem", b.produto, b.valor, b.liquidez, b.ultima_atualizacao || ""])));

  lines.push(sep("METAS"));
  lines.push(row(["Meta","Valor Alvo (R$)","Acumulado (R$)","Aporte Mensal Alvo (R$)","Prazo","Descrição"]));
  data.metas.forEach(m => {
    const acum = (m.aportes||[]).reduce((s,a)=>s+a.valor,0);
    lines.push(row([m.nome, m.valor_alvo, acum, m.aporte_mensal_alvo, m.prazo||"", m.descricao||""]));
    (m.aportes||[]).forEach(a => lines.push(row(["  Aporte","",a.valor,"",a.mes,""])));
  });

  lines.push(sep("FONTES DE RENDA"));
  lines.push(row(["Fonte","Tipo","Valor Mensal (R$)"]));
  data.fontes_renda.forEach(f => lines.push(row([f.nome, f.tipo, f.valor])));
  lines.push(row(["TOTAL","",rendaTotal]));

  lines.push(sep("BUDGETS"));
  lines.push(row(["Categoria","Máximo Mensal (R$)","% da Renda"]));
  data.budgets.forEach(b => lines.push(row([b.categoria, b.maximo, rendaTotal>0?(b.maximo/rendaTotal*100).toFixed(1):0])));
  lines.push(row(["Investimento", investimento, data.config.taxa_investimento]));
  lines.push(row(["Metas (aportes)", totalMetas, rendaTotal>0?(totalMetas/rendaTotal*100).toFixed(1):0]));
  lines.push(row(["LIVRE / MÊS", rendaTotal-totalBudget-investimento-totalMetas, ""]));

  lines.push(sep("ALOCAÇÃO ALVO"));
  lines.push(row(["Classe de Ativo","Alvo (%)","Banda (%)"]));
  data.alocacao_alvo.forEach(a => lines.push(row([a.classe, a.alvo, a.banda])));

  lines.push(sep("POLÍTICA (IPS)"));
  lines.push(row(["Campo","Valor"]));
  const ips = data.ips; const cfg = data.config;
  [
    ["Objetivo de Vida", ips.objetivo||""],
    ["Horizonte de Tempo", ips.horizonte||""],
    ["Perfil de Risco", ips.tolerancia||""],
    ["Regra de Rebalanceamento", ips.regra_rebalanceamento||""],
    ["Princípios e Restrições", ips.principios||""],
    ["Taxa de Investimento (%)", cfg.taxa_investimento],
    ["Reserva de Emergência (meses)", cfg.reserva_emergencia_meses],
    ["Meta de Patrimônio (R$)", cfg.meta_patrimonio],
    ["Ano da Meta", cfg.meta_ano],
    ["Última Revisão", data.ultima_revisao||"Nunca"],
  ].forEach(([k,v]) => lines.push(row([k,v])));

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PortfolioIQ_${mesAtual()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Importa JSON (backup completo)
function importarJSON(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const novo = JSON.parse(e.target.result);
      if (!novo.posicoes || !novo.metas || !novo.config) throw new Error("Arquivo inválido ou incompleto.");
      onSuccess(normalizeData(novo));
    } catch(err) { onError(err.message); }
  };
  reader.readAsText(file);
}

// --- Shared UI ----------------------------------------------------------------
const IS = {
  background: "#0b1120", border: "1px solid #1e293b", borderRadius: 8,
  color: "#e2e8f0", padding: "8px 11px", fontSize: 13,
  fontFamily: "'Syne', sans-serif", outline: "none", width: "100%", boxSizing: "border-box",
};

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      {children}
    </div>
  );
}
function Input({ label, value, onChange, type = "text", placeholder }) {
  return (
    <Field label={label}>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={IS} />
    </Field>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select value={value} onChange={e => onChange(e.target.value)} style={IS}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </Field>
  );
}
function Btn({ label, onClick, danger, ghost, disabled, small, accent }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: danger ? "#1c0a0a" : ghost ? "transparent" : accent ? "#1a2a0a" : "#0f2a1a",
      border: `1px solid ${danger ? "#7f1d1d" : ghost ? "#1e293b" : accent ? "#4ade80" : "#166534"}`,
      color: danger ? "#f87171" : ghost ? "#475569" : "#4ade80",
      borderRadius: 8, padding: small ? "4px 10px" : "7px 16px",
      fontSize: small ? 11 : 13, fontFamily: "'Syne', sans-serif",
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
      transition: "all .15s", fontWeight: accent ? 600 : 400,
    }}>{label}</button>
  );
}
function ProgressBar({ value, max, color = "#4ade80", height = 6 }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: "#1e293b", borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 99, transition: "width .5s ease" }} />
    </div>
  );
}
function Card({ title, children, accent, action, pad = 16 }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden" }}>
      {accent && <div style={{ height: 3, background: accent }} />}
      {(title || action) && (
        <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {title && <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</div>}
          {action}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}
function Tag({ label, color }) {
  return (
    <span style={{
      background: `${color}18`, border: `1px solid ${color}40`,
      color, borderRadius: 6, padding: "2px 7px", fontSize: 10, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}
function Donut({ slices, size = 140, label, sublabel }) {
  const r = 52, cx = 70, cy = 70, circ = 2 * Math.PI * r;
  let offset = 0;
  const painted = slices.map(s => {
    const dash = (s.pct / 100) * circ;
    const item = { ...s, dash, offset };
    offset += dash;
    return item;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={18} />
      {painted.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={18}
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={-s.offset + circ * 0.25}
        />
      ))}
      {label && <text x={cx} y={cy - 5} textAnchor="middle" fill="#f1f5f9" fontSize={12} fontFamily="Syne">{label}</text>}
      {sublabel && <text x={cx} y={cy + 12} textAnchor="middle" fill="#475569" fontSize={10} fontFamily="Syne">{sublabel}</text>}
    </svg>
  );
}

// --- Logo ---------------------------------------------------------------------
import logo from "./assets/logo.png";

function LogoMarca() {
  const [hasLogo, setHasLogo] = useState(true);
  return (
    <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#0f172a", border: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
      {hasLogo
        ? <img src={logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setHasLogo(false)} alt="Plano A" />
        : "🐷"
      }
    </div>
  );
}

// --- TABS ---------------------------------------------------------------------
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "posicoes", label: "Posições", icon: "◐" },
  { id: "alocacao", label: "Alocação", icon: "◎" },
  { id: "bens", label: "Bens e Imóveis", icon: "◆" },
  { id: "metas", label: "Metas", icon: "◉" },
  { id: "budgets", label: "Budgets", icon: "◧" },
  { id: "ferramentas", label: "Ferramentas", icon: "◫" },
  { id: "config", label: "Configurações", icon: "◻" },
];

// ===============================================================================
// APP ROOT
// ===============================================================================
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState(null);
  const [sessaoAberta, setSessaoAberta] = useState(false);
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem("planoa_oculto") !== "false"; } catch { return true; }
  });

  useEffect(() => {
    const d = loadData();
    setData(d || JSON.parse(JSON.stringify(DEFAULT)));
  }, []);

  useEffect(() => {
    try { localStorage.setItem("planoa_oculto", String(oculto)); } catch {}
  }, [oculto]);

  useEffect(() => {
    if (!data) return;
    saveData(data);
    // Atualiza título da aba
    const pendente = revisaoPendente(data.ultima_revisao);
    document.title = pendente ? "⚠ Plano A · Revisão pendente" : "◈ Plano A";
  }, [data]);

  if (!data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#080d18", color: "#4ade80", fontFamily: "Syne" }}>
      Carregando…
    </div>
  );

  const up = (key, val) => setData(d => ({ ...d, [key]: val }));
  const exibir = (n) => oculto ? "•••••" : fmt(n);
  const rendaTotal = data.fontes_renda.reduce((s, f) => s + f.valor, 0);
  const patrimBens = (data.bens || []).reduce((s, b) => s + (b.valor || 0), 0);
  const patrimTotal = data.posicoes.reduce((s, p) => s + (p.valor || 0), 0) + patrimBens;
  const patrimoCP = data.posicoes.filter(p => p.balde === "Curto Prazo").reduce((s, p) => s + p.valor, 0);
  const patrimoMP = data.posicoes.filter(p => p.balde === "Médio Prazo").reduce((s, p) => s + p.valor, 0);
  const patrimoLP = data.posicoes.filter(p => p.balde === "Longo Prazo").reduce((s, p) => s + p.valor, 0);
  const patrimoInv = patrimoCP + patrimoMP + patrimoLP;
  const patrimoRE = data.posicoes.filter(p => p.balde === "Reserva de Emergência").reduce((s, p) => s + p.valor, 0);
  const patrimoMetas = data.posicoes.filter(p => !BALDES_INV.includes(p.balde) && p.balde !== "Reserva de Emergência").reduce((s, p) => s + p.valor, 0);
  const alocacaoReal = CLASSES.map(c => {
    const val = data.posicoes.filter(p => BALDES_INV.includes(p.balde) && p.classe === c).reduce((s, p) => s + p.valor, 0);
    return { classe: c, valor: val, pct: patrimoInv > 0 ? (val / patrimoInv) * 100 : 0 };
  }).filter(a => a.valor > 0);
  const vencendoBreve = data.posicoes.filter(p => { const m = mesesAte(p.vencimento); return m !== null && m >= 0 && m <= 2; });
  const pendente = revisaoPendente(data.ultima_revisao);

  if (sessaoAberta) {
    return (
      <SessaoGuiada
        data={data}
        up={up}
        rendaTotal={rendaTotal}
        vencendoBreve={vencendoBreve}
        alocacaoReal={alocacaoReal}
        patrimoLP={patrimoInv}
        onClose={() => setSessaoAberta(false)}
        onConcluir={(novosDados) => { setData(novosDados); setSessaoAberta(false); }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080d18", fontFamily: "'Syne', 'Segoe UI', sans-serif", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        borderBottom: "1px solid #0f172a", padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(8,13,24,0.97)", backdropFilter: "blur(16px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMarca />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: -0.3 }}>Plano A</div>
            <div style={{ fontSize: 10, color: "#334155", letterSpacing: 0.5 }}>v0.7</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Patrimônio */}
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, color: "#4ade80", fontWeight: 500, minWidth: 80, textAlign: "right" }}>
            {exibir(patrimTotal)}
          </div>

          {/* Ocultar valores */}
          <button onClick={() => setOculto(o => !o)} style={{
            background: "transparent", border: "1px solid #1e293b",
            color: oculto ? "#475569" : "#4ade80",
            borderRadius: 8, padding: "6px 8px", fontSize: 14,
            fontFamily: "Syne", cursor: "pointer", lineHeight: 1,
          }} title={oculto ? "Mostrar valores" : "Ocultar valores"}>
            {oculto ? "👁" : "🙈"}
          </button>

          {/* Revisão */}
          <button onClick={() => setSessaoAberta(true)} style={{
            background: pendente ? "linear-gradient(135deg,#166534,#0f4620)" : "#0f172a",
            border: `1px solid ${pendente ? "#4ade80" : "#1e293b"}`,
            color: "#4ade80", borderRadius: 8, padding: "6px 14px", fontSize: 12,
            fontFamily: "Syne", cursor: "pointer", fontWeight: pendente ? 600 : 400,
            animation: pendente ? "pulse 2s infinite" : "none",
            whiteSpace: "nowrap",
          }}>
            {pendente ? "⚡ Revisão" : "◎ Revisão"}
          </button>
        </div>
      </header>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.75} }`}</style>

      {/* Banner alerta */}
      {pendente && (
        <div style={{
          background: "linear-gradient(90deg,#052e16,#0a2010)",
          borderBottom: "1px solid #166534",
          padding: "10px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 13,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <div>
              <span style={{ color: "#4ade80", fontWeight: 600 }}>Revisão de {mesLabel(mesAtual())} pendente</span>
              <span style={{ color: "#475569", marginLeft: 8 }}>
                {data.ultima_revisao
                  ? `Última: ${mesLabel(data.ultima_revisao)} · ${diasSemRevisao(data.ultima_revisao)} dias atrás`
                  : "Nenhuma revisão realizada ainda"}
              </span>
            </div>
          </div>
          <button onClick={() => setSessaoAberta(true)} style={{
            background: "#166534", border: "none", color: "#4ade80",
            borderRadius: 8, padding: "6px 14px", fontSize: 12,
            fontFamily: "Syne", cursor: "pointer", fontWeight: 600,
          }}>Iniciar agora →</button>
        </div>
      )}

      {/* Nav */}
      <nav style={{ display: "flex", gap: 2, padding: "8px 12px", borderBottom: "1px solid #0f172a", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? "#0f172a" : "transparent",
            border: `1px solid ${tab === t.id ? "#1e293b" : "transparent"}`,
            color: tab === t.id ? "#4ade80" : "#334155",
            borderRadius: 8, padding: "6px 12px", fontSize: 12,
            fontFamily: "Syne", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            whiteSpace: "nowrap", transition: "all .15s",
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      <main style={{ padding: "20px 16px", maxWidth: 920, margin: "0 auto" }}>
        {tab === "dashboard" && <Dashboard data={data} up={up} patrimTotal={patrimTotal} patrimBens={patrimBens} patrimoInv={patrimoInv} patrimoCP={patrimoCP} patrimoMP={patrimoMP} patrimoLP={patrimoLP} patrimoRE={patrimoRE} patrimoMetas={patrimoMetas} alocacaoReal={alocacaoReal} vencendoBreve={vencendoBreve} rendaTotal={rendaTotal} onIniciarRevisao={() => setSessaoAberta(true)} exibir={exibir} />}
        {tab === "posicoes" && <Posicoes data={data} up={up} exibir={exibir} />}
        {tab === "alocacao" && <Alocacao data={data} up={up} alocacaoReal={alocacaoReal} patrimoInv={patrimoInv} exibir={exibir} />}
        {tab === "bens" && <BensImoveis data={data} up={up} exibir={exibir} />}
        {tab === "metas" && <Metas data={data} up={up} exibir={exibir} />}
        {tab === "budgets" && <Budgets data={data} up={up} rendaTotal={rendaTotal} exibir={exibir} />}
        {tab === "ferramentas" && <Ferramentas data={data} up={up} />}
        {tab === "config" && <Config data={data} up={up} rendaTotal={rendaTotal} up_data={d => setData(d)} exibir={exibir} />}
      </main>
    </div>
  );
}

// ===============================================================================
// SESSÃO GUIADA
// ===============================================================================
function SessaoGuiada({ data, up, rendaTotal, vencendoBreve, alocacaoReal, patrimoLP, onClose, onConcluir }) {
  const [passo, setPasso] = useState(() => data.revisao_em_andamento?.passo || 0);

  // Estado local da sessão
  const [valoresPosicoes, setValoresPosicoes] = useState(() => {
    if (data.revisao_em_andamento?.valores_posicoes) return data.revisao_em_andamento.valores_posicoes;
    const v = {};
    data.posicoes.forEach(p => { v[p.id] = p.valor; });
    return v;
  });
  const [aportesMetas, setAportesMetas] = useState(() => {
    if (data.revisao_em_andamento?.aportes_metas) return data.revisao_em_andamento.aportes_metas;
    const a = {};
    data.metas.forEach(m => { a[m.id] = m.aporte_mensal_alvo || 0; });
    return a;
  });
  const [decisoesVenc, setDecisoesVenc] = useState(() => data.revisao_em_andamento?.decisoes_vencimentos || {});
  const [valoresBens, setValoresBens] = useState(() => {
    if (data.revisao_em_andamento?.valores_bens) return data.revisao_em_andamento.valores_bens;
    const v = {};
    (data.bens || []).forEach(b => { v[b.id] = b.valor; });
    return v;
  });

  // Salva progresso da sessão
  useEffect(() => {
    up("revisao_em_andamento", { passo, valores_posicoes: valoresPosicoes, aportes_metas: aportesMetas, decisoes_vencimentos: decisoesVenc, valores_bens: valoresBens });
  }, [passo, valoresPosicoes, aportesMetas, decisoesVenc, valoresBens]);

  function concluir() {
    const mes = mesAtual();
    // Aplica posições atualizadas + histórico
    const novasPosicoes = data.posicoes.map(p => {
      const nv = valoresPosicoes[p.id] ?? p.valor;
      let hist = p.historico_valor || [];
      if (nv !== p.valor) {
        hist = appendHistoricoValor(hist, mes, nv, MESES_RET_HIST_POSICOES);
      }
      return {
        ...p,
        valor: nv,
        ultima_atualizacao: mes,
        historico_valor: hist,
      };
    });
    const novosBens = (data.bens || []).map(b => {
      const nv = valoresBens[b.id] ?? b.valor;
      let hist = b.historico_valor || [];
      if (nv !== b.valor) {
        hist = appendHistoricoValor(hist, mes, nv, MESES_RET_HIST_BENS);
      }
      return {
        ...b,
        valor: nv,
        ultima_atualizacao: nv !== b.valor ? mes : (b.ultima_atualizacao || mes),
        historico_valor: hist,
      };
    });
    // Aplica aportes de metas
    const novasMetas = data.metas.map(m => {
      const valor = aportesMetas[m.id];
      if (!valor || valor <= 0) return m;
      const jaExiste = (m.aportes || []).find(a => a.mes === mes);
      if (jaExiste) return m;
      return { ...m, aportes: [...(m.aportes || []), { id: Date.now() + m.id, mes, valor }] };
    });
    onConcluir({
      ...data,
      posicoes: novasPosicoes,
      bens: novosBens,
      metas: novasMetas,
      ultima_revisao: mesAtual(),
      revisao_em_andamento: null,
    });
  }

  const PASSOS = ["Início", "Posições", "Vencimentos", "Metas", "Resumo"];
  const metasAtivas = data.metas.filter(m => (m.aportes || []).reduce((s, a) => s + a.valor, 0) < m.valor_alvo);
  const patrimSimulado = data.posicoes.reduce((s, p) => s + (valoresPosicoes[p.id] ?? p.valor), 0)
    + (data.bens || []).reduce((s, b) => s + (valoresBens[b.id] ?? b.valor), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#080d18", fontFamily: "'Syne', sans-serif", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header sessão */}
      <header style={{ borderBottom: "1px solid #0f172a", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080d18", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoMarca />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Revisão Mensal</div>
            <div style={{ fontSize: 10, color: "#475569" }}>{mesLabel(mesAtual())}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 13, fontFamily: "Syne" }}>← Sair sem salvar</button>
      </header>

      {/* Steps */}
      <div style={{ padding: "16px 20px 0", maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
          {PASSOS.map((p, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: "100%", height: 3,
                background: i <= passo ? "#4ade80" : "#1e293b",
                transition: "background .3s",
              }} />
              <div style={{ fontSize: 10, color: i === passo ? "#4ade80" : i < passo ? "#166534" : "#334155", fontWeight: i === passo ? 600 : 400 }}>{p}</div>
            </div>
          ))}
        </div>
      </div>

      <main style={{ padding: "0 16px 40px", maxWidth: 700, margin: "0 auto" }}>

        {/* PASSO 0 — INÍCIO */}
        {passo === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Revisão de {mesLabel(mesAtual())}</div>
              <div style={{ color: "#475569", fontSize: 13 }}>
                {data.ultima_revisao
                  ? `Última revisão: ${mesLabel(data.ultima_revisao)} · ${diasSemRevisao(data.ultima_revisao)} dias atrás`
                  : "Primeira revisão — vamos começar!"}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: "🏦", label: "Posições para atualizar", val: data.posicoes.length },
                { icon: "⚡", label: "Vencimentos próximos", val: vencendoBreve.length },
                { icon: "🎯", label: "Metas ativas", val: metasAtivas.length },
                { icon: "⏱", label: "Tempo estimado", val: `~${Math.max(3, data.posicoes.length + vencendoBreve.length + metasAtivas.length)} min` },
              ].map((k, i) => (
                <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14, display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 22 }}>{k.icon}</span>
                  <div>
                    <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase" }}>{k.label}</div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 16, color: "#e2e8f0" }}>{k.val}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn accent label="Iniciar revisão →" onClick={() => setPasso(1)} />
            </div>
          </div>
        )}

        {/* PASSO 1 — POSIÇÕES */}
        {passo === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Atualize os valores</div>
              <div style={{ fontSize: 12, color: "#475569" }}>Confira cada posição e corrija o valor atual. Deixe em branco para manter.</div>
            </div>
            {data.instituicoes.map(inst => {
              const posList = data.posicoes.filter(p => p.inst_id === inst.id);
              if (posList.length === 0) return null;
              return (
                <div key={inst.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{inst.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{inst.nome}</span>
                    <span style={{ fontSize: 12, color: "#334155" }}>· {posList.length} produto{posList.length !== 1 ? "s" : ""}</span>
                  </div>
                  {posList.map(pos => (
                    <div key={pos.id} style={{ padding: "10px 16px", borderBottom: "1px solid #0f172a", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{pos.produto}</div>
                        <div style={{ fontSize: 11, color: "#334155" }}>{pos.classe} · {pos.balde}</div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 140 }}>
                        <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>Valor atual (R$)</div>
                        <input
                          type="number"
                          value={valoresPosicoes[pos.id] ?? pos.valor}
                          onChange={e => setValoresPosicoes(v => ({ ...v, [pos.id]: +e.target.value }))}
                          style={{ ...IS, width: 140, padding: "5px 8px", textAlign: "right", fontFamily: "JetBrains Mono" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {(data.bens || []).length > 0 && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>◆</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Bens e Imóveis</span>
                  <span style={{ fontSize: 12, color: "#334155" }}>· {(data.bens || []).length} item{(data.bens || []).length !== 1 ? "s" : ""}</span>
                </div>
                {(data.bens || []).map(b => (
                  <div key={b.id} style={{ padding: "10px 16px", borderBottom: "1px solid #0f172a", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{b.produto}</div>
                      <div style={{ fontSize: 11, color: "#334155" }}>{b.tipo === "imovel" ? "Imóvel" : "Bem"} · {b.liquidez}</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 140 }}>
                      <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>Valor atual (R$)</div>
                      <input
                        type="number"
                        value={valoresBens[b.id] ?? b.valor}
                        onChange={e => setValoresBens(v => ({ ...v, [b.id]: +e.target.value }))}
                        style={{ ...IS, width: 140, padding: "5px 8px", textAlign: "right", fontFamily: "JetBrains Mono" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Btn ghost label="← Voltar" onClick={() => setPasso(0)} />
              <Btn accent label="Continuar →" onClick={() => setPasso(2)} />
            </div>
          </div>
        )}

        {/* PASSO 2 — VENCIMENTOS */}
        {passo === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Vencimentos próximos</div>
              <div style={{ fontSize: 12, color: "#475569" }}>Produtos vencendo nos próximos 60 dias. Decida o que fazer com cada um.</div>
            </div>
            {vencendoBreve.length === 0 ? (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 24, textAlign: "center", color: "#334155", fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                Nenhum vencimento nos próximos 60 dias.
              </div>
            ) : vencendoBreve.map(pos => {
              const inst = data.instituicoes.find(i => i.id === pos.inst_id);
              const m = mesesAte(pos.vencimento);
              return (
                <div key={pos.id} style={{ background: "#0f172a", border: "1px solid #713f12", borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{pos.produto}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{inst?.icon} {inst?.nome} · vence {pos.vencimento} ({m === 0 ? "este mês" : `${m}m`})</div>
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 15, color: "#fbbf24" }}>{fmt(valoresPosicoes[pos.id] ?? pos.valor)}</div>
                  </div>
                  <Field label="O que fazer com este valor?">
                    <select
                      value={decisoesVenc[pos.id] || ""}
                      onChange={e => setDecisoesVenc(d => ({ ...d, [pos.id]: e.target.value }))}
                      style={IS}
                    >
                      <option value="">Decidir depois</option>
                      <option>Reinvestir na mesma classe</option>
                      <option>Reinvestir em outra classe (rebalancear)</option>
                      <option>Mover para reserva de emergência</option>
                      <option>Usar para meta específica</option>
                      <option>Retirar</option>
                    </select>
                  </Field>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Btn ghost label="← Voltar" onClick={() => setPasso(1)} />
              <Btn accent label="Continuar →" onClick={() => setPasso(3)} />
            </div>
          </div>
        )}

        {/* PASSO 3 — METAS */}
        {passo === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Aportes nas metas</div>
              <div style={{ fontSize: 12, color: "#475569" }}>Valores pré-preenchidos com o alvo mensal. Corrija se aportou diferente.</div>
            </div>
            {metasAtivas.length === 0 ? (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 24, textAlign: "center", color: "#334155", fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                Nenhuma meta ativa no momento.
              </div>
            ) : metasAtivas.map(m => {
              const acum = (m.aportes || []).reduce((s, a) => s + a.valor, 0);
              const prog = Math.min(100, m.valor_alvo > 0 ? (acum / m.valor_alvo) * 100 : 0);
              const jaAportou = (m.aportes || []).find(a => a.mes === mesAtual());
              return (
                <div key={m.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.nome}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{fmt(acum)} / {fmt(m.valor_alvo)} · {pct(prog)}</div>
                    </div>
                  </div>
                  <ProgressBar value={acum} max={m.valor_alvo} color={m.cor} height={4} />
                  <div style={{ marginTop: 10 }}>
                    {jaAportou ? (
                      <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#4ade80" }}>
                        ✓ Aporte de {fmt(jaAportou.valor)} já registrado para {mesLabel(mesAtual())}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                          <Field label="Aporte este mês (R$)">
                            <input
                              type="number"
                              value={aportesMetas[m.id] ?? m.aporte_mensal_alvo}
                              onChange={e => setAportesMetas(a => ({ ...a, [m.id]: +e.target.value }))}
                              style={{ ...IS, fontFamily: "JetBrains Mono" }}
                            />
                          </Field>
                        </div>
                        <Btn small ghost label="Pular" onClick={() => setAportesMetas(a => ({ ...a, [m.id]: 0 }))} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Btn ghost label="← Voltar" onClick={() => setPasso(2)} />
              <Btn accent label="Ver resumo →" onClick={() => setPasso(4)} />
            </div>
          </div>
        )}

        {/* PASSO 4 — RESUMO */}
        {passo === 4 && (() => {
          const novoPatrimInv = data.posicoes.filter(p => BALDES_INV.includes(p.balde)).reduce((s, p) => s + (valoresPosicoes[p.id] ?? p.valor), 0);
          const alocSimulada = CLASSES.map(c => {
            const val = data.posicoes.filter(p => BALDES_INV.includes(p.balde) && p.classe === c).reduce((s, p) => s + (valoresPosicoes[p.id] ?? p.valor), 0);
            return { classe: c, valor: val, pct: novoPatrimInv > 0 ? (val / novoPatrimInv) * 100 : 0 };
          }).filter(a => a.valor > 0);
          const desvios = data.alocacao_alvo.map(alvo => {
            const real = alocSimulada.find(a => a.classe === alvo.classe);
            const realPct = real ? real.pct : 0;
            const desvio = realPct - alvo.alvo;
            return { ...alvo, realPct, desvio, fora: Math.abs(desvio) > alvo.banda };
          }).filter(d => d.fora);
          const totalAporteMetas = Object.values(aportesMetas).reduce((s, v) => s + (v || 0), 0);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>✓</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>Tudo pronto para salvar</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Confira o resumo antes de concluir</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", marginBottom: 4 }}>Patrimônio atualizado</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, color: "#4ade80" }}>{fmt(patrimSimulado)}</div>
                  <div style={{ fontSize: 11, color: patrimSimulado >= (data.posicoes.reduce((s,p)=>s+p.valor,0) + (data.bens||[]).reduce((s,b)=>s+b.valor,0)) ? "#4ade80" : "#f87171", marginTop: 4 }}>
                    {patrimSimulado >= (data.posicoes.reduce((s,p)=>s+p.valor,0) + (data.bens||[]).reduce((s,b)=>s+b.valor,0)) ? "▲" : "▼"} {fmt(Math.abs(patrimSimulado - (data.posicoes.reduce((s,p)=>s+p.valor,0) + (data.bens||[]).reduce((s,b)=>s+b.valor,0))))} vs. anterior
                  </div>
                </div>
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", marginBottom: 4 }}>Aportes em metas</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, color: "#fb923c" }}>{fmt(totalAporteMetas)}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{Object.values(aportesMetas).filter(v => v > 0).length} meta{Object.values(aportesMetas).filter(v => v > 0).length !== 1 ? "s" : ""} com aporte</div>
                </div>
              </div>

              {/* Alocação resumo */}
              <Card title="Alocação — Investimentos">
                {data.alocacao_alvo.map(alvo => {
                  const real = alocSimulada.find(a => a.classe === alvo.classe);
                  const realPct = real ? real.pct : 0;
                  const color = CLASS_COLORS[alvo.classe] || "#94a3b8";
                  const fora = Math.abs(realPct - alvo.alvo) > alvo.banda;
                  return (
                    <div key={alvo.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color }}>{alvo.classe} {fora ? <span style={{ color: "#f59e0b", fontSize: 10 }}>⚠ fora da banda</span> : ""}</span>
                        <span style={{ fontFamily: "JetBrains Mono", color: "#94a3b8" }}>{pct(realPct)} / {pct(alvo.alvo)}</span>
                      </div>
                      <ProgressBar value={realPct} max={100} color={fora ? "#f59e0b" : color} height={5} />
                    </div>
                  );
                })}
              </Card>

              {desvios.length > 0 && (
                <div style={{ background: "#0a0f28", border: "1px solid #1e3a8a", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: "#93c5fd", fontWeight: 600, marginBottom: 6 }}>◎ Sugestão de rebalanceamento</div>
                  {desvios.map(d => (
                    <div key={d.id} style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                      {d.desvio > 0 ? "↓ Reduzir" : "↑ Aumentar"} <strong style={{ color: "#94a3b8" }}>{d.classe}</strong>: está em {pct(d.realPct)}, alvo {pct(d.alvo)} (±{d.banda}%)
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Btn ghost label="← Voltar" onClick={() => setPasso(3)} />
                <Btn accent label="✓ Concluir revisão" onClick={concluir} />
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}

// ===============================================================================
// DASHBOARD
// ===============================================================================
function Dashboard({ data, up, patrimTotal, patrimBens, patrimoInv, patrimoCP, patrimoMP, patrimoLP, patrimoRE, patrimoMetas, alocacaoReal, vencendoBreve, rendaTotal, onIniciarRevisao, exibir }) {
  const cfg = data.config;
  const investMensal = rendaTotal * (cfg.taxa_investimento / 100);
  const reservaAlvo = rendaTotal * cfg.reserva_emergencia_meses;
  const metasAtivas = data.metas.filter(m => (m.aportes || []).reduce((s, a) => s + a.valor, 0) < m.valor_alvo);
  const progMeta = cfg.meta_patrimonio > 0 ? (patrimTotal / cfg.meta_patrimonio) * 100 : 0;
  const desvios = data.alocacao_alvo.map(alvo => {
    const real = alocacaoReal.find(a => a.classe === alvo.classe);
    const realPct = real ? real.pct : 0;
    return { ...alvo, realPct, fora: Math.abs(realPct - alvo.alvo) > alvo.banda };
  }).filter(d => d.fora);
  const baldeSlices = [
    { pct: patrimTotal > 0 ? (patrimoInv / patrimTotal) * 100 : 0, color: "#4ade80" },
    { pct: patrimTotal > 0 ? (patrimoRE / patrimTotal) * 100 : 0, color: "#60a5fa" },
    { pct: patrimTotal > 0 ? (patrimoMetas / patrimTotal) * 100 : 0, color: "#fb923c" },
    { pct: patrimTotal > 0 ? (patrimBens / patrimTotal) * 100 : 0, color: COLOR_BENS_IMOVEIS },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Alertas */}
      {(vencendoBreve.length > 0 || desvios.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {vencendoBreve.map(p => (
            <div key={p.id} style={{ background: "#1c1408", border: "1px solid #713f12", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#fbbf24" }}>
              ⚡ <strong>{p.produto}</strong> vence em {mesesAte(p.vencimento) === 0 ? "este mês" : `${mesesAte(p.vencimento)} meses`} — {fmt(p.valor)}
            </div>
          ))}
          {desvios.map(d => (
            <div key={d.id} style={{ background: "#0a0f28", border: "1px solid #1e3a8a", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#93c5fd" }}>
              ◎ <strong>{d.classe}</strong>: {pct(d.realPct)} real vs {pct(d.alvo)} alvo — fora da banda
            </div>
          ))}
        </div>
      )}

      {/* Patrimônio total — largura total, mais compacto */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 16px" }}>
        <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Patrimônio total</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, fontWeight: 600, color: "#4ade80" }}>{exibir(patrimTotal)}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Meta: {pct(progMeta)}</div>
        </div>
      </div>

      {/* KPIs — ordem: Investimentos, Reserva, Bens, Renda */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10 }}>
        {[
          { label: "Investimentos", val: exibir(patrimoInv), sub: `${pct(patrimTotal > 0 ? patrimoInv/patrimTotal*100 : 0)} do total`, c: "#4ade80" },
          { label: "Reserva", val: exibir(patrimoRE), sub: `Alvo ${exibir(reservaAlvo)}`, c: patrimoRE >= reservaAlvo ? "#4ade80" : "#f59e0b" },
          { label: "Bens e Imóveis", val: exibir(patrimBens), sub: `${pct(patrimTotal > 0 ? patrimBens/patrimTotal*100 : 0)} do total`, c: COLOR_BENS_IMOVEIS },
          { label: "Renda Mensal", val: exibir(rendaTotal), sub: `${data.fontes_renda.length} fonte${data.fontes_renda.length !== 1 ? "s" : ""}`, c: "#a78bfa" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 500, color: "#f1f5f9" }}>{k.val}</div>
            <div style={{ fontSize: 11, color: k.c, marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Baldes + Alocação */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card title="Distribuição por Balde">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flexShrink: 0, minWidth: 110 }}><Donut slices={baldeSlices} size={110} /></div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {[["Investimentos", patrimoInv, "#4ade80"], ["Reserva", patrimoRE, "#60a5fa"], ["Metas", patrimoMetas, "#fb923c"], ["Bens e Imóveis", patrimBens, COLOR_BENS_IMOVEIS]].map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: c }}>{l}</span>
                    <span style={{ fontFamily: "JetBrains Mono", color: "#64748b", fontSize: 11 }}>{exibir(v)}</span>
                  </div>
                  <ProgressBar value={v} max={patrimTotal} color={c} height={4} />
                </div>
              ))}
              <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>
                Curto {exibir(patrimoCP)} · Médio {exibir(patrimoMP)} · Longo {exibir(patrimoLP)}
              </div>
            </div>
          </div>
        </Card>
        <Card title="Alocação (Investimentos)">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flexShrink: 0, minWidth: 110 }}><Donut
              slices={alocacaoReal.length > 0
                ? alocacaoReal.map(a => ({ pct: a.pct, color: CLASS_COLORS[a.classe] || "#94a3b8" }))
                : [{ pct: 100, color: "#1e293b" }]
              }
              size={110}
            /></div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {data.alocacao_alvo.map(alvo => {
                const real = alocacaoReal.find(a => a.classe === alvo.classe);
                const realPct = real ? real.pct : 0;
                const color = CLASS_COLORS[alvo.classe] || "#94a3b8";
                return (
                  <div key={alvo.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color }}>{alvo.classe}</span>
                      <span style={{ fontFamily: "JetBrains Mono", color: "#475569" }}>{pct(realPct)} <span style={{ color: "#334155" }}>/ {pct(alvo.alvo)}</span></span>
                    </div>
                    <ProgressBar value={realPct} max={100} color={color} height={4} />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Meta patrimônio */}
      <Card title={`Meta · ${fmt(cfg.meta_patrimonio)} até ${cfg.meta_ano}`}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: "#64748b" }}>{exibir(patrimTotal)}</span>
          <span style={{ fontFamily: "JetBrains Mono", color: "#4ade80" }}>{pct(Math.min(progMeta, 100))}</span>
        </div>
        <ProgressBar value={patrimTotal} max={cfg.meta_patrimonio} color="#4ade80" height={8} />
        <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>
          {cfg.meta_ano - new Date().getFullYear()} anos restantes · Faltam {exibir(cfg.meta_patrimonio - patrimTotal)}
        </div>
      </Card>

      {/* Metas resumo */}
      {metasAtivas.length > 0 && (
        <Card title="Metas em Andamento">
          {metasAtivas.slice(0, 3).map(m => {
            const acum = (m.aportes || []).reduce((s, a) => s + a.valor, 0);
            return (
              <div key={m.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{m.icon} {m.nome}</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: m.cor, fontSize: 11 }}>{exibir(acum)} / {exibir(m.valor_alvo)}</span>
                </div>
                <ProgressBar value={acum} max={m.valor_alvo} color={m.cor} />
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ===============================================================================
// BENS E IMÓVEIS
// ===============================================================================
function BensImoveis({ data, up, exibir }) {
  const [editId, setEditId] = useState(null);
  const [expandHist, setExpandHist] = useState({});
  const bens = data.bens || [];

  function saveBem(b) {
    const prev = b.id ? bens.find(x => x.id === b.id) : null;
    const mes = b.ultima_atualizacao || mesAtual();
    let historico_valor = prev?.historico_valor || [];
    if (!prev) {
      historico_valor = appendHistoricoValor([], mes, b.valor, MESES_RET_HIST_BENS);
    } else if (b.valor !== prev.valor) {
      historico_valor = appendHistoricoValor(historico_valor, mes, b.valor, MESES_RET_HIST_BENS);
    }
    const merged = { ...b, historico_valor };
    if (merged.id && bens.find(x => x.id === merged.id)) {
      up("bens", bens.map(x => x.id === merged.id ? merged : x));
    } else {
      up("bens", [...bens, { ...merged, id: Date.now() }]);
    }
    setEditId(null);
  }
  function delBem(id) { up("bens", bens.filter(b => b.id !== id)); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Bens e Imóveis</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Patrimônio físico · fora da alocação de investimentos · atualização sugerida anual</div>
        </div>
        <Btn label="+ Bem" onClick={() => setEditId("new")} />
      </div>

      {editId === "new" && (
        <BemForm
          bem={{ tipo: "bem", produto: "", valor: 0, liquidez: LIQUIDEZ[0], ultima_atualizacao: mesAtual() }}
          onSave={saveBem} onCancel={() => setEditId(null)}
        />
      )}

      {bens.length === 0 && editId !== "new" && (
        <div style={{ textAlign: "center", padding: 40, color: "#334155", fontSize: 13 }}>Nenhum bem cadastrado.</div>
      )}

      {bens.map(bem => {
        const atraso = mesesDesde(bem.ultima_atualizacao);
        const r5 = rendimentoHistorico(bem.valor, bem.historico_valor, MESES_REND_BENS);
        const exp = expandHist[bem.id];
        const hist = [...(bem.historico_valor || [])].sort((a, x) => x.mes.localeCompare(a.mes));
        return editId === bem.id ? (
          <BemForm key={bem.id} bem={bem} onSave={saveBem} onCancel={() => setEditId(null)} />
        ) : (
          <div key={bem.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{bem.produto}</span>
                  <Tag label={bem.tipo === "imovel" ? "Imóvel" : "Bem"} color={COLOR_BENS_IMOVEIS} />
                  {atraso > ALERTA_BENS_MESES && (
                    <span style={{ background: "#1c1408", border: "1px solid #713f12", color: "#f59e0b", borderRadius: 5, padding: "1px 5px", fontSize: 10 }}>{atraso}m sem atualizar</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#475569" }}>{bem.liquidez} · atual. {bem.ultima_atualizacao || "—"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#64748b" }}>5 anos</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: r5 != null ? (r5 >= 0 ? "#4ade80" : "#f87171") : "#334155" }}>{r5 != null ? pct(r5) : "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 16, color: "#e2e8f0" }}>{exibir(bem.valor)}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button type="button" onClick={() => setEditId(bem.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer" }}>✎</button>
                  <button type="button" onClick={() => delBem(bem.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer" }}>✕</button>
                </div>
              </div>
            </div>
            {hist.length > 0 && (
              <div style={{ marginTop: 10, borderTop: "1px solid #0f172a", paddingTop: 8 }}>
                <button type="button" onClick={() => setExpandHist(e => ({ ...e, [bem.id]: !e[bem.id] }))} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 11, fontFamily: "Syne" }}>
                  {exp ? "▼" : "▶"} Histórico de valores ({hist.length})
                </button>
                {exp && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 }}>
                    {hist.map(h => (
                      <div key={h.mes} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{h.mes}</span>
                        <span style={{ fontFamily: "JetBrains Mono" }}>{exibir(h.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BemForm({ bem, onSave, onCancel }) {
  const [f, setF] = useState({ ...bem });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: "#c084fc", fontWeight: 600 }}>{f.id ? "Editar" : "Novo"} bem</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Tipo">
          <select value={f.tipo} onChange={e => u("tipo", e.target.value)} style={IS}>
            <option value="bem">Bem</option>
            <option value="imovel">Imóvel</option>
          </select>
        </Field>
        <Input label="Produto" value={f.produto} onChange={v => u("produto", v)} placeholder="Ex: Casa na Praia" />
        <Input label="Valor atual estimado (R$)" type="number" value={f.valor} onChange={v => u("valor", +v)} />
        <Select label="Liquidez" value={f.liquidez} onChange={v => u("liquidez", v)} options={LIQUIDEZ} />
        <Input label="Última atualização" type="month" value={f.ultima_atualizacao} onChange={v => u("ultima_atualizacao", v)} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn label="Salvar" onClick={() => onSave(f)} disabled={!f.produto || !f.valor} />
        <Btn label="Cancelar" danger onClick={onCancel} />
      </div>
    </div>
  );
}

function LinhaPosicao({ pos, totalGeral, exibir, onEdit, onDelete, periodoMeses, onPeriodo }) {
  const [expandHist, setExpandHist] = useState(false);
  const atraso = mesesDesde(pos.ultima_atualizacao);
  const venc = pos.vencimento ? mesesAte(pos.vencimento) : null;
  const r = rendimentoHistorico(pos.valor, pos.historico_valor, periodoMeses);
  const hist = [...(pos.historico_valor || [])].sort((a, b) => b.mes.localeCompare(a.mes));
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid #0a0f1a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{pos.produto}</span>
            {atraso > 1 && <span style={{ background: "#1c1408", border: "1px solid #713f12", color: "#f59e0b", borderRadius: 5, padding: "1px 5px", fontSize: 10 }}>{atraso}m sem atualizar</span>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag label={pos.classe} color={CLASS_COLORS[pos.classe] || "#94a3b8"} />
            <Tag label={pos.balde} color={BALDE_COLORS[pos.balde] || "#fb923c"} />
            <Tag label={pos.liquidez} color="#475569" />
            {pos.vencimento && <Tag label={`vence ${pos.vencimento}${venc !== null ? ` (${venc < 0 ? "vencido" : venc + "m"})` : ""}`} color={venc !== null && venc <= 2 ? "#f59e0b" : "#334155"} />}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select value={String(periodoMeses)} onChange={e => onPeriodo(+e.target.value)} style={{ ...IS, width: "auto", padding: "4px 8px", fontSize: 11 }}>
            <option value="1">1 m</option>
            <option value="3">3 m</option>
            <option value="6">6 m</option>
            <option value="12">12 m</option>
          </select>
          <div style={{ textAlign: "right", minWidth: 56 }}>
            <div style={{ fontSize: 10, color: "#64748b" }}>Rend.</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: r != null ? (r >= 0 ? "#4ade80" : "#f87171") : "#334155" }}>{r != null ? pct(r) : "—"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 14 }}>{exibir(pos.valor)}</div>
            <div style={{ fontSize: 10, color: "#334155" }}>{pct(totalGeral > 0 ? pos.valor / totalGeral * 100 : 0)}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" onClick={onEdit} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer" }}>✎</button>
            <button type="button" onClick={onDelete} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer" }}>✕</button>
          </div>
        </div>
      </div>
      {hist.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={() => setExpandHist(e => !e)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 11, fontFamily: "Syne" }}>
            {expandHist ? "▼" : "▶"} Histórico de valores ({hist.length})
          </button>
          {expandHist && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 3 }}>
              {hist.map(h => (
                <div key={h.mes} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{h.mes}</span>
                  <span style={{ fontFamily: "JetBrains Mono" }}>{exibir(h.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===============================================================================
// POSIÇÕES
// ===============================================================================
function Posicoes({ data, up, exibir }) {
  const [editId, setEditId] = useState(null);
  const [novaInstForm, setNovaInstForm] = useState(false);
  const [instForm, setInstForm] = useState({ nome: "", icon: "🏦" });
  const [expandInst, setExpandInst] = useState({});
  const [rendPeriod, setRendPeriod] = useState({});
  const totalGeral = data.posicoes.reduce((s, p) => s + p.valor, 0);

  function savePosicao(pos) {
    const prev = pos.id ? data.posicoes.find(p => p.id === pos.id) : null;
    const mes = pos.ultima_atualizacao || mesAtual();
    let historico_valor = prev?.historico_valor || [];
    if (!prev) {
      historico_valor = appendHistoricoValor([], mes, pos.valor, MESES_RET_HIST_POSICOES);
    } else if (pos.valor !== prev.valor) {
      historico_valor = appendHistoricoValor(historico_valor, mes, pos.valor, MESES_RET_HIST_POSICOES);
    }
    const merged = { ...pos, historico_valor };
    if (merged.id && data.posicoes.find(p => p.id === merged.id)) {
      up("posicoes", data.posicoes.map(p => p.id === merged.id ? merged : p));
    } else {
      up("posicoes", [...data.posicoes, { ...merged, id: Date.now() }]);
    }
    setEditId(null);
  }
  function delPosicao(id) { up("posicoes", data.posicoes.filter(p => p.id !== id)); }
  function saveInst(inst) {
    if (inst.id) up("instituicoes", data.instituicoes.map(i => i.id === inst.id ? inst : i));
    else up("instituicoes", [...data.instituicoes, { ...inst, id: Date.now() }]);
    setNovaInstForm(false); setInstForm({ nome: "", icon: "🏦" });
  }
  function delInst(id) {
    up("instituicoes", data.instituicoes.filter(i => i.id !== id));
    up("posicoes", data.posicoes.filter(p => p.inst_id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Posições</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Organize por instituição · valores atualizados na revisão mensal</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn ghost label="+ Instituição" onClick={() => setNovaInstForm(true)} />
          <Btn label="+ Posição" onClick={() => setEditId("new")} />
        </div>
      </div>

      {novaInstForm && (
        <Card title="Nova Instituição" accent="#4ade80">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, marginBottom: 10 }}>
            <Input label="Nome" value={instForm.nome} onChange={v => setInstForm(f => ({ ...f, nome: v }))} placeholder="Ex: Nubank" />
            <Input label="Ícone" value={instForm.icon} onChange={v => setInstForm(f => ({ ...f, icon: v }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn label="Salvar" onClick={() => saveInst(instForm)} disabled={!instForm.nome} />
            <Btn label="Cancelar" danger onClick={() => setNovaInstForm(false)} />
          </div>
        </Card>
      )}

      {editId === "new" && (
        <PosicaoForm
          pos={{ inst_id: data.instituicoes[0]?.id, produto: "", classe: CLASSES[0], indexacao: "", balde: "Longo Prazo", valor: 0, liquidez: LIQUIDEZ[0], vencimento: "", ultima_atualizacao: mesAtual() }}
          instituicoes={data.instituicoes} metas={data.metas}
          onSave={savePosicao} onCancel={() => setEditId(null)}
        />
      )}

      {data.instituicoes.map(inst => {
        const posList = data.posicoes.filter(p => p.inst_id === inst.id);
        const totalInst = posList.reduce((s, p) => s + p.valor, 0);
        const expanded = expandInst[inst.id] !== false;
        return (
          <div key={inst.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden" }}>
            <div onClick={() => setExpandInst(e => ({ ...e, [inst.id]: !expanded }))}
              style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderBottom: expanded && posList.length > 0 ? "1px solid #1e293b" : "none" }}>
              <span style={{ fontSize: 20 }}>{inst.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{inst.nome}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{posList.length} produto{posList.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, color: "#e2e8f0" }}>{exibir(totalInst)}</div>
              <span style={{ fontSize: 11, color: "#334155" }}>{expanded ? "▲" : "▼"}</span>
            </div>
            {expanded && (
              <div style={{ padding: "0 16px 12px" }}>
                {posList.map(pos => (
                  editId === pos.id ? (
                    <PosicaoForm key={pos.id} pos={pos} instituicoes={data.instituicoes} metas={data.metas} onSave={savePosicao} onCancel={() => setEditId(null)} />
                  ) : (
                    <LinhaPosicao
                      key={pos.id}
                      pos={pos}
                      totalGeral={totalGeral}
                      exibir={exibir}
                      periodoMeses={rendPeriod[pos.id] ?? 1}
                      onPeriodo={(n) => setRendPeriod(r => ({ ...r, [pos.id]: n }))}
                      onEdit={() => setEditId(pos.id)}
                      onDelete={() => delPosicao(pos.id)}
                    />
                  )
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Btn small ghost label="+ Produto" onClick={() => setEditId("new")} />
                  <Btn small danger label="Remover instituição" onClick={() => delInst(inst.id)} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PosicaoForm({ pos, instituicoes, metas, onSave, onCancel }) {
  const [f, setF] = useState({ ...pos });
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 14, margin: "10px 0", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 600 }}>{f.id ? "Editar Posição" : "Nova Posição"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Instituição">
          <select value={f.inst_id} onChange={e => up("inst_id", +e.target.value)} style={IS}>
            {instituicoes.map(i => <option key={i.id} value={i.id}>{i.icon} {i.nome}</option>)}
          </select>
        </Field>
        <Input label="Produto" value={f.produto} onChange={v => up("produto", v)} placeholder="Ex: CDB 13% a.a." />
        <Select label="Classe" value={f.classe} onChange={v => up("classe", v)} options={CLASSES} />
        <Select label="Indexação" value={f.indexacao ?? ""} onChange={v => up("indexacao", v)} options={INDEXACAO} />
        <Field label="Balde">
          <select value={f.balde} onChange={e => up("balde", e.target.value)} style={IS}>
            <option>Curto Prazo</option>
            <option>Médio Prazo</option>
            <option>Longo Prazo</option>
            <option>Reserva de Emergência</option>
            {metas.map(m => <option key={m.id} value={`Meta: ${m.nome}`}>{m.icon} Meta: {m.nome}</option>)}
          </select>
        </Field>
        <Input label="Valor Atual (R$)" type="number" value={f.valor} onChange={v => up("valor", +v)} />
        <Select label="Liquidez" value={f.liquidez} onChange={v => up("liquidez", v)} options={LIQUIDEZ} />
        <Input label="Vencimento (opcional)" type="month" value={f.vencimento} onChange={v => up("vencimento", v)} />
        <Input label="Última Atualização" type="month" value={f.ultima_atualizacao} onChange={v => up("ultima_atualizacao", v)} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn label="Salvar" onClick={() => onSave(f)} disabled={!f.produto || !f.valor} />
        <Btn label="Cancelar" danger onClick={onCancel} />
      </div>
    </div>
  );
}

// ===============================================================================
// ALOCAÇÃO
// ===============================================================================
function Alocacao({ data, up, alocacaoReal, patrimoInv, exibir }) {
  const [editId, setEditId] = useState(null);
  const [visao, setVisao] = useState("produto"); // produto | indexacao | horizonte
  const totalAlvo = data.alocacao_alvo.reduce((s, a) => s + a.alvo, 0);
  function updateAlvo(id, k, v) { up("alocacao_alvo", data.alocacao_alvo.map(a => a.id === id ? { ...a, [k]: v } : a)); }
  function delAlvo(id) { up("alocacao_alvo", data.alocacao_alvo.filter(a => a.id !== id)); }
  function addAlvo() {
    const id = Date.now();
    up("alocacao_alvo", [...data.alocacao_alvo, { id, classe: CLASSES[0], alvo: 0, banda: 5 }]);
    setEditId(id);
  }

  const posInv = data.posicoes.filter(p => BALDES_INV.includes(p.balde));
  const somaBy = (keyFn) => {
    const m = new Map();
    posInv.forEach(p => {
      const k = keyFn(p) || "Não classificado";
      m.set(k, (m.get(k) || 0) + (p.valor || 0));
    });
    const out = Array.from(m.entries()).map(([k, v]) => ({ k, v, pct: patrimoInv > 0 ? (v / patrimoInv) * 100 : 0 }));
    out.sort((a, b) => b.v - a.v);
    return out;
  };

  const produtoBucket = (p) => {
    const prod = String(p.produto || "");
    const classe = String(p.classe || "");
    if (classe === "Renda Fixa") {
      if (/(CDB|LCI|LCA)/i.test(prod)) return "Renda Fixa — CDB/LCI/LCA";
      if (/(IPCA|Deb[eê]ntur|Debenture|CRI|CRA)/i.test(prod)) return "Renda Fixa — IPCA+/Debêntures";
      if (/Tesouro/i.test(prod)) return "Renda Fixa — Tesouro";
      return "Renda Fixa — Outros";
    }
    if (classe === "Fundos / ETFs") return "Fundos";
    if (classe === "Ações") return "Ações";
    if (classe === "FIIs") return "FIIs";
    if (classe === "Internacional" || /(BDR|IVVB11|ACWI|VT|VOO|SPY)/i.test(prod)) return "Internacional";
    if (classe === "Cripto") return "Criptoativos";
    return classe || "Outro";
  };

  const visaoRows =
    visao === "indexacao" ? somaBy(p => p.indexacao) :
    visao === "horizonte" ? somaBy(p => p.balde) :
    somaBy(p => produtoBucket(p));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Política de Alocação</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Governa Curto/Médio/Longo Prazo · metas e reserva ficam fora</div>
        </div>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, color: totalAlvo === 100 ? "#4ade80" : "#f59e0b" }}>{totalAlvo}%</div>
      </div>
      {totalAlvo !== 100 && <div style={{ background: "#1c1408", border: "1px solid #713f12", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#fbbf24" }}>⚠ Soma deve ser 100%. Atual: {totalAlvo}%</div>}

      {/* Donuts: Alvo vs Real */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card title="Alocação Alvo">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Donut
              slices={data.alocacao_alvo.map(a => ({ pct: a.alvo, color: CLASS_COLORS[a.classe] || "#94a3b8" }))}
              size={110} label="Alvo" sublabel={`${totalAlvo}%`}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.alocacao_alvo.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: CLASS_COLORS[a.classe] || "#94a3b8", flexShrink: 0 }} />
                  <span style={{ color: "#94a3b8" }}>{a.classe}</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: CLASS_COLORS[a.classe] || "#94a3b8", marginLeft: "auto" }}>{a.alvo}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card title="Alocação Real (Investimentos)">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Donut
              slices={alocacaoReal.length > 0
                ? alocacaoReal.map(a => ({ pct: a.pct, color: CLASS_COLORS[a.classe] || "#94a3b8" }))
                : [{ pct: 100, color: "#1e293b" }]
              }
              size={110} label="Real" sublabel={exibir(patrimoInv).replace("R$", "")}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {alocacaoReal.length > 0 ? alocacaoReal.map(a => (
                <div key={a.classe} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: CLASS_COLORS[a.classe] || "#94a3b8", flexShrink: 0 }} />
                  <span style={{ color: "#94a3b8" }}>{a.classe}</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: CLASS_COLORS[a.classe] || "#94a3b8", marginLeft: "auto" }}>{pct(a.pct)}</span>
                </div>
              )) : <span style={{ fontSize: 11, color: "#334155" }}>Sem posições de investimento</span>}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Visões de Carteira (Investimentos)">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["produto", "Produto"],
            ["indexacao", "Indexação (pós/inflação/pré)"],
            ["horizonte", "Horizonte (curto/médio/longo)"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setVisao(id)} style={{
              background: visao === id ? "#0f172a" : "transparent",
              border: `1px solid ${visao === id ? "#1e293b" : "#0b1120"}`,
              color: visao === id ? "#4ade80" : "#334155",
              borderRadius: 10, padding: "6px 10px", fontSize: 12,
              fontFamily: "Syne", cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {visaoRows.length > 0 ? visaoRows.map(r => (
            <div key={r.k}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: "#94a3b8" }}>{r.k}</span>
                <span style={{ fontFamily: "JetBrains Mono", color: "#475569" }}>{pct(r.pct)} <span style={{ color: "#334155" }}>· {exibir(r.v)}</span></span>
              </div>
              <ProgressBar value={r.v} max={patrimoInv || 1} color="#4ade80" height={4} />
            </div>
          )) : <div style={{ fontSize: 12, color: "#334155" }}>Sem posições de investimento.</div>}
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.alocacao_alvo.map(alvo => {
          const real = alocacaoReal.find(a => a.classe === alvo.classe);
          const realPct = real ? real.pct : 0;
          const desvio = realPct - alvo.alvo;
          const fora = Math.abs(desvio) > alvo.banda;
          const color = CLASS_COLORS[alvo.classe] || "#94a3b8";
          return (
            <div key={alvo.id} style={{ background: "#0f172a", border: `1px solid ${fora ? "#1e3a8a" : "#1e293b"}`, borderRadius: 12, padding: 14 }}>
              {editId === alvo.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <Select label="Classe" value={alvo.classe} onChange={v => updateAlvo(alvo.id, "classe", v)} options={CLASSES} />
                    <Input label="Alvo %" type="number" value={alvo.alvo} onChange={v => updateAlvo(alvo.id, "alvo", +v)} />
                    <Input label="Banda %" type="number" value={alvo.banda} onChange={v => updateAlvo(alvo.id, "banda", +v)} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn label="Concluir" onClick={() => setEditId(null)} />
                    <Btn label="Remover" danger onClick={() => { delAlvo(alvo.id); setEditId(null); }} />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                      <span style={{ fontWeight: 600 }}>{alvo.classe}</span>
                      {fora && <Tag label={`desvio ${desvio > 0 ? "+" : ""}${pct(desvio)}`} color="#93c5fd" />}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 13 }}>
                        <span style={{ color }}>{pct(realPct)}</span><span style={{ color: "#334155" }}> / {pct(alvo.alvo)}</span>
                      </span>
                      <button onClick={() => setEditId(alvo.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer" }}>✎</button>
                    </div>
                  </div>
                  <div style={{ position: "relative", height: 6, background: "#1e293b", borderRadius: 99, overflow: "visible" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(100, realPct)}%`, background: fora ? "#3b82f6" : color, borderRadius: 99 }} />
                    <div style={{ position: "absolute", top: -2, left: `${Math.min(100, alvo.alvo)}%`, width: 2, height: 10, background: "#ffffff30" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#334155", marginTop: 4 }}>banda ±{alvo.banda}% · {exibir(real?.valor || 0)} em investimentos</div>
                </div>
              )}
            </div>
          );
        })}
        <button onClick={addAlvo} style={{ background: "transparent", border: "1px dashed #1e293b", borderRadius: 12, color: "#334155", padding: 10, fontSize: 12, cursor: "pointer", fontFamily: "Syne" }}>+ Adicionar classe</button>
      </div>
    </div>
  );
}

// ===============================================================================
// METAS
// ===============================================================================
function Metas({ data, up, exibir }) {
  const [editId, setEditId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [aporteForm, setAporteForm] = useState({});
  const [expandAportes, setExpandAportes] = useState({});
  const CORES = ["#4ade80", "#60a5fa", "#818cf8", "#fb923c", "#f472b6", "#facc15", "#34d399", "#f87171"];

  function saveMeta(form) {
    if (form.id && data.metas.find(m => m.id === form.id)) up("metas", data.metas.map(m => m.id === form.id ? form : m));
    else up("metas", [...data.metas, { ...form, id: Date.now(), aportes: [] }]);
    setEditId(null); setShowNew(false);
  }
  function delMeta(id) { up("metas", data.metas.filter(m => m.id !== id)); }
  function addAporte(metaId, aporte) {
    up("metas", data.metas.map(m => m.id === metaId ? { ...m, aportes: [...(m.aportes || []), aporte] } : m));
  }
  function delAporte(metaId, aid) {
    up("metas", data.metas.map(m => m.id === metaId ? { ...m, aportes: m.aportes.filter(a => a.id !== aid) } : m));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Metas Financeiras</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Separadas da carteira de longo prazo</div>
        </div>
        <Btn label="+ Nova Meta" onClick={() => { setShowNew(true); setEditId(null); }} />
      </div>
      {showNew && <MetaFormComp meta={null} cores={CORES} onSave={saveMeta} onCancel={() => setShowNew(false)} />}
      {data.metas.map(m => {
        const acum = (m.aportes || []).reduce((s, a) => s + a.valor, 0);
        const prog = Math.min(100, m.valor_alvo > 0 ? (acum / m.valor_alvo) * 100 : 0);
        const concluida = acum >= m.valor_alvo;
        const mesesR = mesesAte(m.prazo);
        const mesesProj = m.aporte_mensal_alvo > 0 && !concluida ? Math.ceil((m.valor_alvo - acum) / m.aporte_mensal_alvo) : null;
        const af = aporteForm[m.id] || { mes: mesAtual(), valor: "" };
        if (editId === m.id) return <MetaFormComp key={m.id} meta={m} cores={CORES} onSave={saveMeta} onCancel={() => setEditId(null)} />;
        return (
          <div key={m.id} style={{ background: "#0f172a", border: `1px solid ${concluida ? "#166534" : "#1e293b"}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ height: 3, background: m.cor }} />
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.nome}</div>
                    {m.descricao && <div style={{ fontSize: 11, color: "#475569" }}>{m.descricao}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setEditId(m.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer" }}>✎</button>
                  <button onClick={() => delMeta(m.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer" }}>✕</button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "#94a3b8" }}>{exibir(acum)} <span style={{ color: "#334155" }}>/ {exibir(m.valor_alvo)}</span></span>
                <span style={{ fontFamily: "JetBrains Mono", color: m.cor, fontWeight: 600 }}>{pct(prog)}</span>
              </div>
              <div style={{ background: "#1e293b", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ width: `${prog}%`, height: "100%", background: concluida ? "linear-gradient(90deg,#4ade80,#22d3ee)" : m.cor, borderRadius: 99, transition: "width .6s" }} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: "#475569", marginBottom: 10 }}>
                {m.prazo && <span>📅 {m.prazo} {mesesR !== null ? `(${mesesR < 0 ? "vencida" : mesesR + "m"})` : ""}</span>}
                {m.aporte_mensal_alvo > 0 && <span>💰 {fmt(m.aporte_mensal_alvo)}/mês</span>}
                {mesesProj !== null && <span>🎯 ~{mesesProj} meses</span>}
              </div>
              {concluida && <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#4ade80", marginBottom: 10 }}>🎉 Meta concluída!</div>}
              {(m.aportes || []).length > 0 && (() => {
                const sorted = [...(m.aportes || [])].sort((a, b) => b.mes.localeCompare(a.mes));
                const vis = sorted.slice(0, 3);
                const rest = sorted.slice(3);
                const exp = expandAportes[m.id];
                return (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: "#334155", marginBottom: 4, textTransform: "uppercase" }}>Aportes</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {vis.map(a => (
                        <div key={a.id} style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 6, padding: "3px 8px", fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ color: "#475569" }}>{a.mes}</span>
                          <span style={{ color: "#94a3b8", fontFamily: "JetBrains Mono" }}>{exibir(a.valor)}</span>
                          <button type="button" onClick={() => delAporte(m.id, a.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 10 }}>✕</button>
                        </div>
                      ))}
                    </div>
                    {rest.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <button type="button" onClick={() => setExpandAportes(x => ({ ...x, [m.id]: !exp }))} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 11, fontFamily: "Syne" }}>
                          {exp ? "▼" : "▶"} Ver anteriores ({rest.length})
                        </button>
                        {exp && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            {rest.map(a => (
                              <div key={a.id} style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 6, padding: "3px 8px", fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
                                <span style={{ color: "#475569" }}>{a.mes}</span>
                                <span style={{ color: "#94a3b8", fontFamily: "JetBrains Mono" }}>{exibir(a.valor)}</span>
                                <button type="button" onClick={() => delAporte(m.id, a.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 10 }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>Mês</div>
                  <input type="month" value={af.mes} onChange={e => setAporteForm(f => ({ ...f, [m.id]: { ...af, mes: e.target.value } }))} style={{ ...IS, width: 140, padding: "5px 8px" }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>Valor (R$)</div>
                  <input type="number" value={af.valor} onChange={e => setAporteForm(f => ({ ...f, [m.id]: { ...af, valor: e.target.value } }))}
                    placeholder={String(m.aporte_mensal_alvo || 0)} style={{ ...IS, width: 110, padding: "5px 8px" }} />
                </div>
                <Btn small label="+ Aporte" onClick={() => {
                  if (!af.valor) return;
                  addAporte(m.id, { id: Date.now(), mes: af.mes, valor: +af.valor });
                  setAporteForm(f => ({ ...f, [m.id]: { mes: mesAtual(), valor: "" } }));
                }} disabled={!af.valor} />
              </div>
            </div>
          </div>
        );
      })}
      {data.metas.length === 0 && !showNew && (
        <div style={{ textAlign: "center", padding: 48, color: "#334155", fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>Nenhuma meta criada.
        </div>
      )}
    </div>
  );
}

function MetaFormComp({ meta, cores, onSave, onCancel }) {
  const [f, setF] = useState(meta || { nome: "", icon: "🎯", cor: "#818cf8", valor_alvo: 0, prazo: "", aporte_mensal_alvo: 0, descricao: "" });
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13, color: "#38bdf8", fontWeight: 600 }}>{meta ? "Editar Meta" : "Nova Meta"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Input label="Nome" value={f.nome} onChange={v => up("nome", v)} placeholder="Ex: Viagem Europa" />
        <Input label="Ícone" value={f.icon} onChange={v => up("icon", v)} />
        <Input label="Valor Alvo (R$)" type="number" value={f.valor_alvo} onChange={v => up("valor_alvo", +v)} />
        <Input label="Prazo" type="month" value={f.prazo} onChange={v => up("prazo", v)} />
        <Input label="Aporte Mensal Alvo (R$)" type="number" value={f.aporte_mensal_alvo} onChange={v => up("aporte_mensal_alvo", +v)} />
        <div>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>Cor</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {cores.map(c => <div key={c} onClick={() => up("cor", c)} style={{ width: 22, height: 22, borderRadius: 6, background: c, cursor: "pointer", border: f.cor === c ? "2px solid white" : "2px solid transparent" }} />)}
          </div>
        </div>
      </div>
      <Input label="Descrição (opcional)" value={f.descricao} onChange={v => up("descricao", v)} />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn label={meta ? "Salvar" : "Criar Meta"} onClick={() => onSave(f)} disabled={!f.nome || !f.valor_alvo} />
        <Btn label="Cancelar" danger onClick={onCancel} />
      </div>
    </div>
  );
}

// ===============================================================================
// BUDGETS
// ===============================================================================
function Budgets({ data, up, rendaTotal, exibir }) {
  const [editId, setEditId] = useState(null);
  const cfg = data.config;
  const investimento = rendaTotal * (cfg.taxa_investimento / 100);
  const totalMetas = data.metas.reduce((s, m) => s + (m.aporte_mensal_alvo || 0), 0);
  const totalBudget = data.budgets.reduce((s, b) => s + b.maximo, 0);
  const livre = rendaTotal - investimento - totalMetas - totalBudget;

  function upB(id, k, v) { up("budgets", data.budgets.map(b => b.id === id ? { ...b, [k]: v } : b)); }
  function delB(id) { up("budgets", data.budgets.filter(b => b.id !== id)); }
  function addB() { const id = Date.now(); up("budgets", [...data.budgets, { id, categoria: "Nova", maximo: 0, icon: "📦" }]); setEditId(id); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>Budgets por Categoria</div>
      <div style={{ fontSize: 12, color: "#475569" }}>Tetos máximos mensais · investimento e metas já descontados da renda</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "Renda", val: exibir(rendaTotal), c: "#e2e8f0" },
          { label: `Investimento (${cfg.taxa_investimento}%)`, val: exibir(investimento), c: "#4ade80" },
          { label: `Metas (${data.metas.length})`, val: exibir(totalMetas), c: "#fb923c" },
          { label: "Livre / mês", val: exibir(livre), c: livre >= 0 ? "#e2e8f0" : "#f87171" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#334155", marginBottom: 4, textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, color: k.c }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 2, height: 10, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ flex: investimento, background: "#4ade80" }} />
        <div style={{ flex: totalMetas, background: "#fb923c" }} />
        {data.budgets.map((b, i) => <div key={b.id} style={{ flex: b.maximo, background: `hsl(${200 + i * 35},60%,50%)` }} />)}
        <div style={{ flex: Math.max(0, livre), background: "#1e293b" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.budgets.map((b, i) => (
          <div key={b.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
            {editId === b.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px", gap: 8 }}>
                  <Input label="Categoria" value={b.categoria} onChange={v => upB(b.id, "categoria", v)} />
                  <Input label="Máximo R$/mês" type="number" value={b.maximo} onChange={v => upB(b.id, "maximo", +v)} />
                  <Input label="Ícone" value={b.icon} onChange={v => upB(b.id, "icon", v)} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn label="Concluir" onClick={() => setEditId(null)} />
                  <Btn label="Remover" danger onClick={() => { delB(b.id); setEditId(null); }} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setEditId(b.id)}>
                <span style={{ fontSize: 20 }}>{b.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{b.categoria}</div>
                  <ProgressBar value={b.maximo} max={rendaTotal} color={`hsl(${200 + i * 35},60%,50%)`} />
                </div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, textAlign: "right" }}>
                  {exibir(b.maximo)}
                  <div style={{ fontSize: 10, color: "#334155" }}>{pct(rendaTotal > 0 ? b.maximo / rendaTotal * 100 : 0)}</div>
                </div>
                <span style={{ color: "#334155", fontSize: 12 }}>✎</span>
              </div>
            )}
          </div>
        ))}
        <button onClick={addB} style={{ background: "transparent", border: "1px dashed #1e293b", borderRadius: 10, color: "#334155", padding: 10, fontSize: 12, cursor: "pointer", fontFamily: "Syne" }}>+ Adicionar categoria</button>
      </div>
    </div>
  );
}


// ===============================================================================
// FERRAMENTAS
// ===============================================================================
function Ferramentas({ data, up }) {
  const [novoNome, setNovoNome] = useState("");
  const [novoUrl, setNovoUrl] = useState("");
  const ferramentas = data.ferramentas || [];

  function addFerramenta() {
    if (!novoNome || !novoUrl) return;
    const url = novoUrl.startsWith("http") ? novoUrl : "https://" + novoUrl;
    up("ferramentas", [...ferramentas, { id: Date.now(), nome: novoNome, url }]);
    setNovoNome(""); setNovoUrl("");
  }
  function delFerramenta(id) {
    up("ferramentas", ferramentas.filter(f => f.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Ferramentas</div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Links rápidos para ferramentas que você usa</div>
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ferramentas.length === 0 && (
          <div style={{ color: "#334155", fontSize: 13, padding: "20px 0" }}>Nenhuma ferramenta cadastrada ainda.</div>
        )}
        {ferramentas.map(f => (
          <div key={f.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <a href={f.url} target="_blank" rel="noopener noreferrer" style={{
              flex: 1, color: "#4ade80", fontSize: 14, fontWeight: 500,
              textDecoration: "none",
            }}
              onMouseEnter={e => e.target.style.textDecoration = "underline"}
              onMouseLeave={e => e.target.style.textDecoration = "none"}
            >
              {f.nome}
            </a>
            <div style={{ fontSize: 11, color: "#334155", flex: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {f.url}
            </div>
            <button onClick={() => delFerramenta(f.id)} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        ))}
      </div>

      {/* Adicionar nova */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.6 }}>Adicionar ferramenta</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>Nome</div>
            <input
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              placeholder="Ex: Status Invest"
              style={{ background: "#0b1120", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0", padding: "8px 11px", fontSize: 13, fontFamily: "Syne", outline: "none", width: "100%", boxSizing: "border-box" }}
              onKeyDown={e => e.key === "Enter" && addFerramenta()}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>URL</div>
            <input
              value={novoUrl}
              onChange={e => setNovoUrl(e.target.value)}
              placeholder="Ex: https://statusinvest.com.br"
              style={{ background: "#0b1120", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0", padding: "8px 11px", fontSize: 13, fontFamily: "Syne", outline: "none", width: "100%", boxSizing: "border-box" }}
              onKeyDown={e => e.key === "Enter" && addFerramenta()}
            />
          </div>
          <button onClick={addFerramenta} disabled={!novoNome || !novoUrl} style={{
            background: "#0f2a1a", border: "1px solid #166534", color: "#4ade80",
            borderRadius: 8, padding: "8px 16px", fontSize: 13,
            fontFamily: "Syne", cursor: !novoNome || !novoUrl ? "not-allowed" : "pointer",
            opacity: !novoNome || !novoUrl ? 0.4 : 1,
          }}>+ Adicionar</button>
        </div>
      </div>
    </div>
  );
}

// ===============================================================================
// CONFIG (IPS + Fontes de Renda + Parâmetros)
// ===============================================================================
function Config({ data, up, rendaTotal, up_data, exibir }) {
  const [editFonteId, setEditFonteId] = useState(null);
  const ips = data.ips;
  const upI = (k, v) => up("ips", { ...ips, [k]: v });
  const filled = [ips.objetivo.length > 20, ips.horizonte.length > 3, ips.tolerancia, ips.regra_rebalanceamento.length > 5].filter(Boolean).length;

  function upFonte(id, k, v) { up("fontes_renda", data.fontes_renda.map(f => f.id === id ? { ...f, [k]: v } : f)); }
  function delFonte(id) { up("fontes_renda", data.fontes_renda.filter(f => f.id !== id)); }
  function addFonte() {
    const id = Date.now();
    up("fontes_renda", [...data.fontes_renda, { id, nome: "Nova Fonte", valor: 0, tipo: "Fixo", icon: "💰" }]);
    setEditFonteId(id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* EXPORT / IMPORT */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Backup de Dados</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => exportarJSON(data)} style={{
            background: "#0f172a", border: "1px solid #1e293b",
            color: "#4ade80", borderRadius: 8, padding: "8px 14px", fontSize: 12,
            fontFamily: "Syne", cursor: "pointer",
          }}>⬇ Exportar JSON</button>
          <button onClick={() => exportarCSV(data, rendaTotal)} style={{
            background: "#0f172a", border: "1px solid #1e293b",
            color: "#4ade80", borderRadius: 8, padding: "8px 14px", fontSize: 12,
            fontFamily: "Syne", cursor: "pointer",
          }}>⬇ Exportar CSV</button>
          <label style={{
            background: "#0f172a", border: "1px solid #1e293b",
            color: "#60a5fa", borderRadius: 8, padding: "8px 14px", fontSize: 12,
            fontFamily: "Syne", cursor: "pointer",
          }}>
            ⬆ Importar JSON
            <input type="file" accept=".json" style={{ display: "none" }} onChange={e => {
              const file = e.target.files[0];
              if (!file) return;
              importarJSON(file,
                novo => { up_data(novo); alert("✓ Dados restaurados!"); },
                err => alert("Erro: " + err)
              );
              e.target.value = "";
            }} />
          </label>
        </div>
        <div style={{ fontSize: 11, color: "#334155", marginTop: 8 }}>JSON = backup completo reimportável · CSV = planilha legível no Excel/Sheets</div>
      </div>

      {/* FONTES DE RENDA */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Fontes de Renda</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Atualize quando sua renda mudar</div>
          </div>
          <Btn label="+ Adicionar" ghost onClick={addFonte} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.fontes_renda.map(f => (
            <div key={f.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
              {editFonteId === f.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 50px", gap: 8 }}>
                    <Input label="Nome" value={f.nome} onChange={v => upFonte(f.id, "nome", v)} />
                    <Input label="Valor R$/mês" type="number" value={f.valor} onChange={v => upFonte(f.id, "valor", +v)} />
                    <Select label="Tipo" value={f.tipo} onChange={v => upFonte(f.id, "tipo", v)} options={TIPOS_RENDA} />
                    <Input label="Ícone" value={f.icon} onChange={v => upFonte(f.id, "icon", v)} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn label="Concluir" onClick={() => setEditFonteId(null)} />
                    <Btn label="Remover" danger onClick={() => { delFonte(f.id); setEditFonteId(null); }} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setEditFonteId(f.id)}>
                  <span style={{ fontSize: 20 }}>{f.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{f.nome}</div>
                    <Tag label={f.tipo} color={TIPO_COLORS[f.tipo] || "#94a3b8"} />
                  </div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, color: "#e2e8f0" }}>{exibir(f.valor)}</div>
                  <span style={{ color: "#334155", fontSize: 12 }}>✎</span>
                </div>
              )}
            </div>
          ))}
          <div style={{ background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "#475569" }}>Total mensal</span>
            <span style={{ fontFamily: "JetBrains Mono", color: "#4ade80", fontWeight: 600 }}>{exibir(rendaTotal)}</span>
          </div>
        </div>
      </div>

      {/* PARÂMETROS */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Parâmetros</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Taxa de Investimento (%)" type="number" value={data.config.taxa_investimento} onChange={v => up("config", { ...data.config, taxa_investimento: +v })} />
          <Input label="Reserva de Emergência (meses)" type="number" value={data.config.reserva_emergencia_meses} onChange={v => up("config", { ...data.config, reserva_emergencia_meses: +v })} />
          <Input label="Meta de Patrimônio (R$)" type="number" value={data.config.meta_patrimonio} onChange={v => up("config", { ...data.config, meta_patrimonio: +v })} />
          <Input label="Ano da Meta" type="number" value={data.config.meta_ano} onChange={v => up("config", { ...data.config, meta_ano: +v })} />
        </div>
      </div>

      {/* IPS */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Política de Investimentos (IPS)</div>
          <span style={{ fontSize: 11, color: "#475569" }}>{filled}/4 preenchidos</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card title="Objetivo de Vida">
            <textarea value={ips.objetivo} onChange={e => upI("objetivo", e.target.value)}
              placeholder="Ex: Atingir independência financeira aos 45 anos…"
              rows={4} style={{ ...IS, resize: "vertical", lineHeight: 1.7 }} />
          </Card>
          <Card title="Horizonte de Tempo">
            <input value={ips.horizonte} onChange={e => upI("horizonte", e.target.value)} placeholder="Ex: 15 anos (até 2040)" style={IS} />
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card title="Perfil de Risco">
              <select value={ips.tolerancia} onChange={e => upI("tolerancia", e.target.value)} style={IS}>
                {["Conservador", "Moderado", "Arrojado", "Agressivo"].map(p => <option key={p}>{p}</option>)}
              </select>
            </Card>
            <Card title="Regra de Rebalanceamento">
              <input value={ips.regra_rebalanceamento} onChange={e => upI("regra_rebalanceamento", e.target.value)} placeholder="Ex: Trimestral ou desvio > 5%" style={IS} />
            </Card>
          </div>
          <Card title="Princípios e Restrições">
            <textarea value={ips.principios} onChange={e => upI("principios", e.target.value)}
              placeholder="Ex: Não usar alavancagem." rows={4} style={{ ...IS, resize: "vertical", lineHeight: 1.7 }} />
          </Card>
          <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 14 }}>
            <div style={{ color: "#38bdf8", fontWeight: 600, fontSize: 12, marginBottom: 8 }}>📋 Checklist Revisão Anual</div>
            {["Revisar objetivo e horizonte", "Atualizar alocação alvo se perfil mudou", "Rebalancear portfólio completo", "Atualizar metas e budgets", "Verificar reserva de emergência"].map((item, i) => (
              <div key={i} style={{ fontSize: 12, color: "#475569", display: "flex", gap: 8, marginBottom: 4 }}>
                <span style={{ color: "#1e3a5f" }}>○</span> {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}