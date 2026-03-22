import { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { supabase, TABLES, logChange, sendNotification, SUPABASE_URL, SUPABASE_ANON } from "./supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// ─── Global Styles ──────────────────────────────────────────
const GlobalStyle = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700;800&family=Source+Sans+3:wght@300;400;500;600&family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet" />
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { height: 100%; }
      body { background: #eef2f7; overflow: hidden; font-family: 'Source Sans 3', sans-serif; }
      body.scrollable { overflow: auto; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: #e8edf3; }
      ::-webkit-scrollbar-thumb { background: #b0bec5; border-radius: 3px; }
      input, select, textarea { outline: none; font-family: 'Source Sans 3', sans-serif; }
      button { font-family: 'Source Sans 3', sans-serif; cursor: pointer; }
      @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
      @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
      @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      .nav-item:hover    { background: rgba(1,87,155,0.08) !important; color: #01579b !important; }
      .nav-item.active   { background: rgba(1,87,155,0.12) !important; color: #01579b !important; border-left: 3px solid #01579b !important; }
      .row-hover:hover   { background: #f5f8fc !important; }
      .btn-primary:hover { background: #01579b !important; }
      .btn-danger:hover  { background: #c62828 !important; }
      .btn-ghost:hover   { background: #e8edf3 !important; }
      .btn-success:hover { background: #2e7d32 !important; }
      .card { background: #fff; border-radius: 10px; border: 1px solid #dde3ea; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
      .tooltip-wrap { position: relative; cursor: pointer; }
      .tooltip-wrap .tooltip-box { display:none; position:absolute; left:0; top:100%; z-index:500; background:#1a2332; color:#fff; font-size:12px; line-height:1.5; padding:10px 14px; border-radius:8px; min-width:260px; max-width:400px; white-space:pre-wrap; box-shadow:0 4px 20px rgba(0,0,0,0.2); margin-top:4px; }
      .tooltip-wrap:hover .tooltip-box { display:block; animation:fadeIn 0.15s ease; }
    `}</style>
  </>
);

// ─── Theme ───────────────────────────────────────────────────
const T = {
  bg: "#eef2f7", surface: "#fff", card: "#fff",
  border: "#dde3ea", borderDark: "#b0bec5",
  primary: "#01579b", primaryLt: "#e3f2fd", primaryDk: "#003c71",
  green: "#2e7d32", greenLt: "#e8f5e9",
  yellow: "#e65100", yellowLt: "#fff3e0",
  red: "#c62828", redLt: "#ffebee",
  teal: "#00695c", tealLt: "#e0f2f1",
  purple: "#4527a0", purpleLt: "#ede7f6",
  sky: "#0277bd", skyLt: "#e1f5fe",
  text: "#1a2332", muted: "#5f7285", light: "#8fa0b0",
  white: "#ffffff",
};

// ─── Status meta ─────────────────────────────────────────────
const SM = {
  Open:                  { c:T.red,    bg:T.redLt    },
  "In Progress":         { c:T.yellow, bg:T.yellowLt },
  "Pending Verification":    { c:T.purple, bg:T.purpleLt },
  "Returned for Resubmission":{ c:"#b71c1c", bg:"#ffebee" },
  "Pending":             { c:T.yellow, bg:T.yellowLt },
  Overdue:               { c:T.red,    bg:T.redLt    },
  Closed:                { c:T.green,  bg:T.greenLt  },
  Approved:              { c:T.green,  bg:T.greenLt  },
  Completed:             { c:T.green,  bg:T.greenLt  },
  Valid:                 { c:T.green,  bg:T.greenLt  },
  Effective:             { c:T.green,  bg:T.greenLt  },
  Scheduled:             { c:T.teal,   bg:T.tealLt   },
  Draft:                 { c:T.muted,  bg:"#f5f5f5"  },
  "In Review":           { c:T.yellow, bg:T.yellowLt },
  Expired:               { c:T.red,    bg:T.redLt    },
  "Not Effective":       { c:T.red,    bg:T.redLt    },
  Critical:              { c:T.red,    bg:T.redLt    },
  Major:                 { c:T.yellow, bg:T.yellowLt },
  Minor:                 { c:T.teal,   bg:T.tealLt   },
  Corrective:            { c:T.primary,bg:T.primaryLt},
  Preventive:            { c:T.purple, bg:T.purpleLt },
  Internal:              { c:T.primary,bg:T.primaryLt},
  External:              { c:T.purple, bg:T.purpleLt },
  Supplier:              { c:T.teal,   bg:T.tealLt   },
  admin:                 { c:T.red,    bg:T.redLt    },
  quality_manager:       { c:T.primary,bg:T.primaryLt},
  quality_auditor:       { c:T.sky,    bg:T.skyLt    },
  manager:               { c:T.teal,   bg:T.tealLt   },
  viewer:                { c:T.muted,  bg:"#f5f5f5"  },
  "A+":{ c:T.green, bg:T.greenLt }, A:{ c:T.green, bg:T.greenLt },
  B:   { c:T.yellow,bg:T.yellowLt}, C:{ c:T.red,   bg:T.redLt   },
};

const Badge = ({ label }) => {
  if (!label) return null;
  const m = SM[label] || { c: T.muted, bg: "#f5f5f5" };
  return <span style={{ background:m.bg, color:m.c, border:`1px solid ${m.c}33`, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600, whiteSpace:"nowrap", fontFamily:"'Source Code Pro',monospace" }}>{label}</span>;
};

// ─── Helpers ─────────────────────────────────────────────────
const daysUntil    = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const isOverdue    = (d) => { const n=daysUntil(d); return n!==null&&n<0; };
const isApproaching= (d) => { const n=daysUntil(d); return n!==null&&n>=0&&n<=14; };
const fmt          = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "--";
const today        = () => new Date().toISOString().slice(0,10);

// ─── Atoms ───────────────────────────────────────────────────
const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:4 }}>{label}</label>}
    <input {...props} style={{ width:"100%", background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", color:T.text, fontSize:13, transition:"border 0.15s", ...props.style }}
      onFocus={e=>e.target.style.borderColor=T.primary} onBlur={e=>e.target.style.borderColor=T.border} />
  </div>
);

const Textarea = ({ label, rows=3, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:4 }}>{label}</label>}
    <textarea {...props} rows={rows} style={{ width:"100%", background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", color:T.text, fontSize:13, resize:"vertical", fontFamily:"inherit", ...props.style }}
      onFocus={e=>e.target.style.borderColor=T.primary} onBlur={e=>e.target.style.borderColor=T.border} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:4 }}>{label}</label>}
    <select {...props} style={{ width:"100%", background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", color:T.text, fontSize:13, ...props.style }}>
      {children}
    </select>
  </div>
);

const Btn = ({ children, variant="primary", size="md", ...props }) => {
  const variants = {
    primary: { background:T.primary, color:"#fff", border:"none" },
    danger:  { background:T.red,     color:"#fff", border:"none" },
    ghost:   { background:"transparent", color:T.muted, border:`1px solid ${T.border}` },
    success: { background:T.green,   color:"#fff", border:"none" },
    outline: { background:"transparent", color:T.primary, border:`1px solid ${T.primary}` },
  };
  const sizes = { sm:{ padding:"5px 12px", fontSize:12 }, md:{ padding:"8px 18px", fontSize:13 }, lg:{ padding:"11px 24px", fontSize:14 } };
  return (
    <button {...props} className={`btn-${variant}`}
      style={{ borderRadius:7, fontWeight:600, transition:"background 0.15s", ...variants[variant], ...sizes[size], ...(props.style||{}) }}>
      {children}
    </button>
  );
};

const Checkbox = ({ label, checked, onChange }) => (
  <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:10 }}>
    <div onClick={onChange} style={{ width:18, height:18, borderRadius:4, border:`2px solid ${checked?T.primary:T.border}`, background:checked?T.primary:"#fff", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}>
      {checked && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
    </div>
    <span style={{ fontSize:13, color:T.text }}>{label}</span>
  </label>
);

// ─── Section Header ───────────────────────────────────────────
const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
    <div>
      <h2 style={{ fontFamily:"'Oxanium',sans-serif", fontSize:22, fontWeight:700, color:T.primaryDk, letterSpacing:0.5 }}>{title}</h2>
      {subtitle && <p style={{ fontSize:13, color:T.muted, marginTop:2 }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Card ─────────────────────────────────────────────────────
const Card = ({ children, style, title, action }) => (
  <div className="card" style={{ padding:20, animation:"fadeIn 0.3s ease", ...style }}>
    {title && (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
        <span style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:15, color:T.primaryDk }}>{title}</span>
        {action}
      </div>
    )}
    {children}
  </div>
);

// ─── Toast ────────────────────────────────────────────────────
const Toast = ({ message, type, onDone }) => {
  useEffect(() => { const t=setTimeout(onDone,3500); return ()=>clearTimeout(t); },[onDone]);
  const colors = { success:T.green, error:T.red, info:T.primary, warning:T.yellow };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, background:"#fff", border:`1px solid ${colors[type]||T.border}`, borderLeft:`4px solid ${colors[type]||T.primary}`, borderRadius:8, padding:"12px 18px", color:T.text, fontSize:13, zIndex:9999, animation:"fadeIn 0.2s ease", boxShadow:"0 4px 20px rgba(0,0,0,0.12)", maxWidth:360 }}>
      {message}
    </div>
  );
};

// ─── Alert Banner ─────────────────────────────────────────────
const AlertBanner = ({ items }) => {
  const [dismissed, setDismissed] = useState(false);
  if (!items.length||dismissed) return null;
  return (
    <div style={{ background:T.yellowLt, borderBottom:`1px solid #ffb74d`, padding:"9px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexShrink:0 }}>
      <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", flex:1 }}>
        <span style={{ fontSize:16 }}>⚠️</span>
        <span style={{ color:T.yellow, fontWeight:700, fontSize:12 }}>ACTION REQUIRED:</span>
        {items.slice(0,4).map((item,i) => (
          <span key={i} style={{ fontSize:12, color:T.text }}>
            <span style={{ color:isOverdue(item.due)?T.red:T.yellow, fontFamily:"'Source Code Pro',monospace", fontWeight:600 }}>{item.id}</span>
            {" -- "}<span style={{ color:isOverdue(item.due)?T.red:T.yellow }}>{isOverdue(item.due)?`OVERDUE ${Math.abs(daysUntil(item.due))}d`:`due in ${daysUntil(item.due)}d`}</span>
            {i<Math.min(items.length,4)-1&&<span style={{ color:T.muted }}> · </span>}
          </span>
        ))}
        {items.length>4&&<span style={{ fontSize:12,color:T.muted }}>+{items.length-4} more</span>}
      </div>
      <button onClick={()=>setDismissed(true)} style={{ background:"none", border:"none", color:T.muted, fontSize:18 }}>✕</button>
    </div>
  );
};


// ─── Landing Page ─────────────────────────────────────────
// ─── LandingPage Component ─────────────────────────────────────
// Drop-in replacement for LoginScreen when !user.
// Props:
//   onShowLogin  — called when user clicks "Sign In"
//   onShowSignup — called when user clicks "Get Started" / "Request Access"
//
function LandingPage({ onShowLogin, onShowSignup }) {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [demoModal,   setDemoModal]   = useState(false);
  const [demoForm,    setDemoForm]    = useState({ name:"", company:"", email:"", phone:"", role:"", message:"" });
  const [demoSent,    setDemoSent]    = useState(false);
  const [sending,     setSending]     = useState(false);
  const heroRef = useRef(null);

  // Scroll listener for nav shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Staggered fade-in for hero on mount
  useEffect(() => {
    if (!heroRef.current) return;
    const els = heroRef.current.querySelectorAll("[data-animate]");
    els.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(18px)";
      setTimeout(() => {
        el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, 100 + i * 120);
    });
  }, []);

  // Demo form send (uses Supabase edge function or mailto fallback)
  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      // Save to access_requests table
      await supabase.from("access_requests").insert({
        name: demoForm.name,
        company: demoForm.company,
        email: demoForm.email,
        phone: demoForm.phone || null,
        message: demoForm.message || null,
        submitted_at: new Date().toISOString(),
        status: "new",
      });
      // Notify super admin via edge function
      await sendNotification({
        type: "access_request",
        record: {
          name: demoForm.name,
          company: demoForm.company,
          email: demoForm.email,
          phone: demoForm.phone || "",
          message: demoForm.message || "",
        },
        recipients: ["kmagita.pegasus@gmail.com", "aeroqualify@gmail.com"],
      });
    } catch(err) {
      console.warn("Access request notification failed:", err);
    }
    setSending(false);
    setDemoSent(true);
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  // ── Fonts injected once
  const FontLink = () => (
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Instrument+Serif:ital@0;1&display=swap"
      rel="stylesheet"
    />
  );

  const C = {
    sky: "#0ea5e9", skyDk: "#0284c7", skyLt: "#e0f2fe",
    navy: "#0c1f3f", navyMid: "#1e3a5f",
    slate: "#475569", slateLight: "#94a3b8",
    surface: "#f8fafc", white: "#ffffff",
    border: "#e2e8f0", green: "#10b981",
  };

  const shadow = {
    sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    md: "0 4px 24px rgba(12,31,63,0.10)",
    lg: "0 20px 60px rgba(12,31,63,0.15)",
  };

  // ── Small reusable button styles
  const btnPrimary = {
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.9rem",
    background: C.sky, color: "#fff", padding: "10px 22px",
    border: "none", borderRadius: 8, cursor: "pointer",
    boxShadow: "0 2px 8px rgba(14,165,233,0.35)",
    transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
    textDecoration: "none", display: "inline-block",
  };
  const btnGhost = {
    fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "0.9rem",
    background: "transparent", color: C.navy, padding: "9px 18px",
    border: "none", borderRadius: 8, cursor: "pointer",
    transition: "background 0.2s", textDecoration: "none",
    display: "inline-block",
  };
  const btnOutline = {
    ...btnPrimary, background: "transparent", color: C.sky,
    border: `1.5px solid ${C.sky}`, boxShadow: "none",
  };

  // ── Hover helpers (inline state is tricky; use CSS classes via a <style> tag)
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Instrument+Serif:ital@0;1&display=swap');
    .lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; }
    .lp-root { font-family: 'DM Sans', sans-serif; color: ${C.navy}; line-height: 1.6; }
    .lp-btn-primary:hover { background: ${C.skyDk} !important; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(14,165,233,0.4) !important; }
    .lp-btn-ghost:hover { background: ${C.skyLt} !important; }
    .lp-btn-outline:hover { background: ${C.skyLt} !important; }
    .lp-nav-link { font-size:0.9rem; font-weight:500; color:${C.slate}; text-decoration:none; transition:color 0.2s; cursor:pointer; border:none; background:none; padding:0; font-family:'DM Sans',sans-serif; }
    .lp-nav-link:hover { color: ${C.navy}; }
    .lp-feature-card { background:#fff; border:1px solid ${C.border}; border-radius:16px; padding:28px; transition:box-shadow 0.2s, transform 0.2s; }
    .lp-feature-card:hover { box-shadow:${shadow.md}; transform:translateY(-2px); }
    .lp-problem-card { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:28px; transition:background 0.2s; }
    .lp-problem-card:hover { background:rgba(255,255,255,0.1); }
    .lp-pricing-card { background:#fff; border:2px solid ${C.border}; border-radius:20px; padding:36px; transition:box-shadow 0.2s; }
    .lp-pricing-card.featured { border-color:${C.sky}; box-shadow:0 0 0 4px rgba(14,165,233,0.12); }
    .lp-pricing-card:hover { box-shadow:${shadow.md}; }
    .lp-modal-overlay { position:fixed; inset:0; background:rgba(12,31,63,0.55); backdrop-filter:blur(4px); z-index:9000; display:flex; align-items:center; justify-content:center; padding:16px; }
    .lp-modal { background:#fff; border-radius:20px; width:100%; max-width:520px; max-height:92vh; overflow-y:auto; padding:36px; box-shadow:${shadow.lg}; animation:lpFadeIn 0.25s ease; }
    .lp-input { width:100%; padding:10px 14px; border:1.5px solid ${C.border}; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:0.9rem; color:${C.navy}; outline:none; transition:border 0.15s; background:#fafcff; }
    .lp-input:focus { border-color:${C.sky}; }
    .lp-label { display:block; font-size:0.78rem; font-weight:600; color:${C.slateLight}; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:5px; }
    .lp-mobile-menu { position:fixed; inset:0; background:#fff; z-index:800; padding:24px; display:flex; flex-direction:column; gap:20px; animation:lpFadeIn 0.2s ease; }
    .lp-testimonial { background:#fff; border:1px solid ${C.border}; border-radius:16px; padding:28px; }
    @keyframes lpFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes lpFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes lpPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @media (max-width:768px) {
      .lp-hero-grid { flex-direction:column !important; }
      .lp-nav-links-wrap { display:none !important; }
      .lp-mobile-btn { display:flex !important; }
      .lp-features-grid { grid-template-columns:1fr !important; }
      .lp-problems-grid { grid-template-columns:1fr !important; }
      .lp-pricing-grid { flex-direction:column !important; align-items:stretch !important; }
      .lp-hero-visual { display:none !important; }
      .lp-stats-row { flex-wrap:wrap !important; }
    }
  `;

  const FEATURES = [
    { icon: "📋", title: "CAPA Workflow", desc: "Full Corrective Action Request to Verification cycle. Auto-status updates, overdue tracking, PDF exports with evidence." },
    { icon: "🔍", title: "Structured RCA", desc: "Ishikawa fishbone + 5 Whys methodology built-in. Generates formatted root cause summaries for your CAP." },
    { icon: "📅", title: "Audit Programme", desc: "Annual schedule builder with biannual slot tracking, ad-hoc audits, finding capture and notification PDFs." },
    { icon: "⚠️", title: "Risk Register", desc: "Inherent and residual risk scoring with 5×5 matrix, treatment tracking and CAR linkage." },
    { icon: "📄", title: "Document Control", desc: "Quality manuals, certificates and documents with expiry tracking and automated approaching-expiry alerts." },
    { icon: "📊", title: "QMS Score Dashboard", desc: "Live 100-point QMS score across 5 pillars. Real-time dashboard with 6-month CAR trend charts." },
  ];

  const PROBLEMS = [
    { icon: "📂", title: "Scattered records", desc: "CAR raised in a WhatsApp message, evidence emailed as PDF, verifier signs a printout. Nothing is traceable." },
    { icon: "⏰", title: "Missed deadlines", desc: "No one knows when critical documents expire until it's a week away. Renewal becomes an emergency." },
    { icon: "🔄", title: "No audit trail", desc: "When auditors ask 'who approved this and when?' — the answer is a shrug and a search through email." },
    { icon: "📉", title: "Reactive not proactive", desc: "Corrective actions get raised after an incident, not before. Risk management lives in one person's head." },
  ];

  const BADGES = ["Quality Management", "Aviation Safety", "Document Control", "Audit Ready"];

  // ── Dashboard mock card (hero visual)
  const DashboardMock = () => (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: shadow.lg, overflow: "hidden", width: "100%", maxWidth: 420, border: `1px solid ${C.border}` }}>
      {/* Topbar */}
      <div style={{ background: C.navy, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57","#ffbd2e","#27c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>aeroqualify.co.ke</span>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: 20 }}>
        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "QMS Score", value: "94", sub: "↑ +3 pts", color: C.green, border: C.green },
            { label: "Open CARs", value: "3", sub: "2 due this week", color: "#f59e0b", border: "#f59e0b" },
          ].map(k => (
            <div key={k.label} style={{ background: C.surface, borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${k.border}` }}>
              <div style={{ fontSize: "0.68rem", color: C.slateLight, fontWeight: 600, marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.68rem", color: k.color, marginTop: 4 }}>{k.sub}</div>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div style={{ background: C.surface, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: C.navy }}>Audit Programme</span>
            <span style={{ fontSize: "0.75rem", color: C.slateLight }}>7 / 9</span>
          </div>
          <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "78%", background: `linear-gradient(90deg,${C.sky},${C.green})`, borderRadius: 3 }} />
          </div>
        </div>
        {/* CAR items */}
        {[
          { id: "CAR-001", title: "Ground school attendance records", status: "Open", dot: "#ef4444" },
          { id: "CAR-002", title: "Simulator maintenance log gap", status: "Closed", dot: C.green },
          { id: "CAR-003", title: "Flight manual revision overdue", status: "Pending", dot: "#f59e0b" },
        ].map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.dot, flexShrink: 0 }} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "0.7rem", fontFamily: "monospace", color: C.sky, fontWeight: 600 }}>{item.id}</div>
              <div style={{ fontSize: "0.72rem", color: C.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
            </div>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: item.dot, background: item.dot + "18", padding: "2px 7px", borderRadius: 10 }}>{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="lp-root" style={{ background: "#fff", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* ── NAV ──────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 5%", height: 68,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        boxShadow: scrolled ? shadow.md : "none",
        transition: "box-shadow 0.3s",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: "1.05rem", color: C.navy }}>
          <div style={{ width: 34, height: 34, background: `linear-gradient(135deg,${C.sky},${C.skyDk})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✈</div>
          AeroQualify Pro
        </div>
        {/* Links */}
        <ul className="lp-nav-links-wrap" style={{ display: "flex", alignItems: "center", gap: 32, listStyle: "none", margin: 0, padding: 0 }}>
          {[["Features","features"],["Why Us","problems"]].map(([l,id]) => (
            <li key={id}><button className="lp-nav-link" onClick={() => scrollTo(id)}>{l}</button></li>
          ))}
        </ul>
        {/* CTAs */}
        <div className="lp-nav-links-wrap" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="lp-btn-ghost" style={btnGhost} onClick={onShowLogin}>Sign In</button>
          <button className="lp-btn-primary" style={btnPrimary} onClick={() => setDemoModal(true)}>Request Access</button>
        </div>
        {/* Mobile hamburger */}
        <button className="lp-mobile-btn" onClick={() => setMobileOpen(true)}
          style={{ display: "none", background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.navy }}>☰</button>
      </nav>

      {/* ── MOBILE MENU ──────────────────────────────── */}
      {mobileOpen && (
        <div className="lp-mobile-menu">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: C.navy }}>AeroQualify Pro</span>
            <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: C.slate }}>✕</button>
          </div>
          {[["Features","features"],["Why Us","problems"]].map(([l,id]) => (
            <button key={id} className="lp-nav-link" onClick={() => scrollTo(id)} style={{ fontSize: "1rem", textAlign: "left" }}>{l}</button>
          ))}
          <button className="lp-btn-ghost" style={{ ...btnGhost, padding: "12px 0" }} onClick={() => { setMobileOpen(false); onShowLogin(); }}>Sign In</button>
          <button className="lp-btn-primary" style={{ ...btnPrimary, textAlign: "center" }} onClick={() => { setMobileOpen(false); setDemoModal(true); }}>Request Access</button>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────── */}
      <section ref={heroRef} style={{ paddingTop: 68, minHeight: "92vh", display: "flex", alignItems: "center", background: `linear-gradient(160deg, ${C.white} 0%, #f0f9ff 50%, ${C.white} 100%)`, overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 5%", width: "100%", display: "flex", alignItems: "center", gap: 64 }} className="lp-hero-grid">
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div data-animate style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.skyLt, color: C.skyDk, fontSize: "0.8rem", fontWeight: 600, padding: "5px 14px", borderRadius: 20, marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", animation: "lpPulse 2s infinite" }} />
              Live · East African Aviation QMS
            </div>
            <h1 data-animate style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2.4rem,5vw,3.6rem)", lineHeight: 1.15, color: C.navy, marginBottom: 20 }}>
              Quality management<br />
              <em style={{ color: C.sky, fontStyle: "italic" }}>built for aviation.</em>
            </h1>
            <p data-animate style={{ fontSize: "1.05rem", color: C.slate, maxWidth: 480, marginBottom: 36, lineHeight: 1.7 }}>
              AeroQualify Pro replaces spreadsheets and email threads with a complete digital quality management system — designed for ATOs, AOCs and AMOs.
            </p>
            <div data-animate style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 40 }}>
              <button className="lp-btn-primary" style={{ ...btnPrimary, padding: "12px 28px", fontSize: "0.95rem" }} onClick={() => setDemoModal(true)}>
                Request Access →
              </button>
              <button className="lp-btn-ghost" style={{ ...btnGhost, padding: "12px 20px", fontSize: "0.95rem", color: C.sky, fontWeight: 600 }} onClick={onShowLogin}>
                Sign In
              </button>
            </div>
            {/* Quality badges */}
            <div data-animate style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {BADGES.map(c => (
                <span key={c} style={{ fontSize: "0.72rem", fontWeight: 700, color: C.slate, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", letterSpacing: 0.5 }}>{c}</span>
              ))}
            </div>
          </div>
          {/* Right — Dashboard mock */}
          <div className="lp-hero-visual" style={{ flexShrink: 0, position: "relative", animation: "lpFloat 6s ease-in-out infinite" }}>
            {/* Float badge */}
            <div style={{ position: "absolute", top: -18, left: -28, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", boxShadow: shadow.md, display: "flex", alignItems: "center", gap: 10, zIndex: 10 }}>
              <div style={{ width: 32, height: 32, background: "#dcfce7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✅</div>
              <div>
                <div style={{ fontSize: "0.68rem", color: C.slateLight, fontWeight: 600 }}>Quality</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.green }}>Managed</div>
              </div>
            </div>
            {/* Float badge — CAR closed */}
            <div style={{ position: "absolute", bottom: 10, right: -24, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", boxShadow: shadow.md, display: "flex", alignItems: "center", gap: 10, zIndex: 10 }}>
              <div style={{ width: 32, height: 32, background: C.skyLt, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔒</div>
              <div>
                <div style={{ fontSize: "0.68rem", color: C.slateLight, fontWeight: 600 }}>CAR Closed</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: C.sky }}>Verified ✓</div>
              </div>
            </div>
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────── */}
      <section style={{ background: C.navy, padding: "48px 5%" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-around", gap: 24, flexWrap: "wrap" }} className="lp-stats-row">
          {[
            { value: "100pt", label: "QMS Score" },
            { value: "Digital", label: "Paperless QMS" },
            { value: "Fast", label: "Easy Onboarding" },
            { value: "Real-time", label: "Team Sync" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "2.2rem", color: C.sky, fontWeight: 400, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEMS ─────────────────────────────────── */}
      <section id="problems" style={{ background: C.navyMid, padding: "96px 5%" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>The Problem</div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem,4vw,2.8rem)", color: "#fff", marginBottom: 16 }}>
              Aviation QMS is still<br />stuck in spreadsheets.
            </h2>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.6)", maxWidth: 520, margin: "0 auto" }}>
              Most ATOs, AOCs and AMOs manage quality with Excel, shared drives and email threads. The risk is real.
            </p>
          </div>
          <div className="lp-problems-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {PROBLEMS.map(p => (
              <div key={p.title} className="lp-problem-card">
                <div style={{ fontSize: 28, marginBottom: 14 }}>{p.icon}</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", marginBottom: 8 }}>{p.title}</div>
                <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section id="features" style={{ background: C.surface, padding: "96px 5%" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.sky, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Features</div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem,4vw,2.8rem)", color: C.navy, marginBottom: 16 }}>
              Everything your QMS team needs.<br />
              <em style={{ color: C.sky }}>Nothing it doesn't.</em>
            </h2>
            <p style={{ fontSize: "1rem", color: C.slate, maxWidth: 500, margin: "0 auto" }}>
              Built for aviation organisations — ATOs, AOCs and AMOs — one system for every approval type.
            </p>
          </div>
          <div className="lp-features-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: C.navy, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: "0.87rem", color: C.slate, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section style={{ background: "#fff", padding: "96px 5%" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.sky, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Workflow</div>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", color: C.navy }}>The full CAPA cycle, automated.</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { step: "01", title: "CAR Raised", desc: "Auditor raises a Corrective Action Request with severity, clause reference and responsible manager. Notification sent automatically.", icon: "📋" },
              { step: "02", title: "CAP Submitted", desc: "Responsible manager completes Root Cause Analysis (Ishikawa + 5 Whys) and submits Corrective Action Plan with evidence files.", icon: "📝" },
              { step: "03", title: "Verification", desc: "Quality Manager reviews against a structured checklist. Marks Effective or returns for resubmission — tracked with full history.", icon: "🔍" },
              { step: "04", title: "Closed & Archived", desc: "CAR closed, full PDF report generated with evidence attached. Risk Register updated. Change log entry recorded.", icon: "✅" },
            ].map((s, i) => (
              <div key={s.step} style={{ display: "flex", gap: 24, alignItems: "flex-start", paddingBottom: i < 3 ? 36 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg,${C.sky},${C.skyDk})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontWeight: 700, fontSize: "0.85rem", color: "#fff", boxShadow: "0 4px 16px rgba(14,165,233,0.3)" }}>{s.step}</div>
                  {i < 3 && <div style={{ width: 2, height: 36, background: C.border, marginTop: 6 }} />}
                </div>
                <div style={{ paddingTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{s.icon}</span>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: C.navy }}>{s.title}</span>
                  </div>
                  <p style={{ fontSize: "0.9rem", color: C.slate, lineHeight: 1.6, maxWidth: 560 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 100%)`, padding: "80px 5%", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>✈</div>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", color: "#fff", marginBottom: 16 }}>
            Ready to modernise your QMS?
          </h2>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.6)", marginBottom: 36 }}>
            Join aviation organisations using AeroQualify Pro to manage quality the right way.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="lp-btn-primary" style={{ ...btnPrimary, padding: "13px 32px", fontSize: "1rem" }} onClick={() => setDemoModal(true)}>
              Request Early Access
            </button>
            <button className="lp-btn-ghost" style={{ ...btnGhost, color: "rgba(255,255,255,0.8)", padding: "13px 24px", fontSize: "1rem" }} onClick={onShowLogin}>
              Sign In →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer style={{ background: C.navy, padding: "40px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: `linear-gradient(135deg,${C.sky},${C.skyDk})`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✈</div>
          <span style={{ fontWeight: 600, color: "#fff", fontSize: "0.9rem" }}>AeroQualify Pro</span>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {BADGES.map(c => (
            <span key={c} style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 }}>{c}</span>
          ))}
        </div>
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)" }}>
          © {new Date().getFullYear()} Kornelius Magita. All rights reserved.
        </div>
      </footer>

      {/* ── DEMO / REQUEST ACCESS MODAL ──────────────── */}
      {demoModal && (
        <div className="lp-modal-overlay" onClick={() => { setDemoModal(false); setDemoSent(false); }}>
          <div className="lp-modal" onClick={e => e.stopPropagation()}>
            {demoSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
                <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "1.8rem", color: C.navy, marginBottom: 12 }}>Request received!</h3>
                <p style={{ color: C.slate, marginBottom: 28, lineHeight: 1.7 }}>
                  Thank you, <strong>{demoForm.name}</strong>. We'll be in touch within 1 business day to set up your access to AeroQualify Pro.
                </p>
                <button className="lp-btn-primary" style={btnPrimary} onClick={() => { setDemoModal(false); setDemoSent(false); }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "1.7rem", color: C.navy, marginBottom: 8 }}>Request Early Access</h3>
                  <p style={{ fontSize: "0.9rem", color: C.slate }}>Tell us about your organisation and we'll be in touch.</p>
                </div>
                <form onSubmit={handleDemoSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label className="lp-label">Your Name</label>
                    <input className="lp-input" required placeholder="e.g. John Kamau" value={demoForm.name} onChange={e => setDemoForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="lp-label">Organisation Name</label>
                    <input className="lp-input" required placeholder="Your organisation name" value={demoForm.company} onChange={e => setDemoForm(p => ({ ...p, company: e.target.value }))} />
                  </div>
                  <div>
                    <label className="lp-label">Work Email</label>
                    <input className="lp-input" type="email" required placeholder="you@company.com" value={demoForm.email} onChange={e => setDemoForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="lp-label">Phone Number</label>
                    <input className="lp-input" type="tel" placeholder="e.g. +254 700 000 000" value={demoForm.phone} onChange={e => setDemoForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="lp-label">Your Role</label>
                    <select className="lp-input" value={demoForm.role} onChange={e => setDemoForm(p => ({ ...p, role: e.target.value }))}>
                      <option value="">Select your role…</option>
                      {["Quality Manager","Accountable Manager","Safety Manager","Quality Auditor","Operations Director","Other"].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="lp-label">Anything else? (optional)</label>
                    <textarea className="lp-input" rows={3} placeholder="Tell us a bit about your organisation and what you're looking for." value={demoForm.message} onChange={e => setDemoForm(p => ({ ...p, message: e.target.value }))} style={{ resize: "vertical" }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
                    <button type="button" className="lp-btn-ghost" style={btnGhost} onClick={() => setDemoModal(false)}>Cancel</button>
                    <button type="submit" className="lp-btn-primary" style={{ ...btnPrimary, opacity: sending ? 0.7 : 1 }}>
                      {sending ? "Sending…" : "Send Request →"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Pending Approval Screen ──────────────────────────────────
const PendingApprovalScreen = ({ user, onSignOut }) => (
  <div style={{ minHeight:"100vh", background:`linear-gradient(135deg, #e3f2fd 0%, #f0f4f8 50%, #e8f5e9 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
    <GlobalStyle />
    <div style={{ position:"fixed", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg,${T.primary},${T.sky},${T.teal})` }} />
    <div style={{ width:420, animation:"fadeIn 0.5s ease", textAlign:"center" }}>
      <div style={{ width:64, height:64, borderRadius:16, background:`linear-gradient(135deg,${T.primary},${T.sky})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px", boxShadow:"0 4px 20px rgba(1,87,155,0.25)" }}>✈</div>
      <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:28, fontWeight:800, color:T.primaryDk, letterSpacing:1 }}>AeroQualify Pro</div>
      <div className="card" style={{ padding:32, marginTop:24, textAlign:"left" }}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:18, color:T.primaryDk }}>Account Pending Approval</div>
        </div>
        <p style={{ fontSize:13, color:T.muted, lineHeight:1.7, textAlign:"center", marginBottom:20 }}>
          Your account <strong style={{ color:T.text }}>{user?.email}</strong> has been created and is awaiting administrator approval.<br/><br/>
          You will be able to access the system once an administrator has verified and activated your account.
        </p>
        <div style={{ background:T.primaryLt, borderRadius:8, padding:"12px 16px", marginBottom:20, fontSize:12, color:T.primary, lineHeight:1.6 }}>
          <strong>What happens next?</strong><br/>
          An administrator will review your account and assign you the appropriate role. This is to ensure the security and integrity of the quality management system.
        </div>
        <Btn variant="ghost" onClick={onSignOut} style={{ width:"100%", textAlign:"center" }}>Sign Out</Btn>
      </div>
      <div style={{ marginTop:16, fontSize:11, color:T.muted }}>AeroQualify Pro · Aviation Quality Management</div>
    </div>
  </div>
);

// ─── Login ────────────────────────────────────────────────────
// ─── Password Reset Screen ───────────────────────────────────
// ─── Terms & Disclaimer Modal (shown on first login) ─────────
const DISCLAIMER_KEY = "aq_terms_accepted_v1";
const TermsModal = ({ onAccept }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
    <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:600, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#0d1b2a,#1a3a5c)", borderRadius:"16px 16px 0 0", padding:"20px 24px", flexShrink:0 }}>
        <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:18, color:"#fff", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:24 }}>✈</span> AeroQualify Pro
        </div>
        <div style={{ fontSize:12, color:"#90b4d4", marginTop:4 }}>Terms of Use & Legal Disclaimer — Please read before continuing</div>
      </div>
      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#1a2332", marginBottom:6 }}>Legal Ownership</div>
          <div style={{ fontSize:12, color:"#5f7285", lineHeight:1.7 }}>
            Copyright © 2026 Kornelius M. Magita. All rights reserved. AeroQualify Pro and all associated software, source code, design, documentation, workflows, and data structures are the exclusive intellectual property of Kornelius M. Magita. No part of this software may be reproduced, distributed, modified, sublicensed, sold, or transferred to any third party without express written consent.
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#1a2332", marginBottom:6 }}>User Licence Terms</div>
          <div style={{ fontSize:12, color:"#5f7285", lineHeight:1.7 }}>
            <strong>Authorised Use:</strong> This software is licensed, not sold. You may use AeroQualify Pro solely for managing quality, safety, and compliance records within your organisation.<br/><br/>
            <strong>Prohibited Activities:</strong> You may not copy, decompile, reverse engineer, modify, or create derivative works. Sharing credentials or granting unauthorised access is strictly prohibited.<br/><br/>
            <strong>Data Ownership:</strong> All data you enter remains your organisation's property. Kornelius M. Magita does not claim ownership of customer data.<br/><br/>
            <strong>Confidentiality:</strong> You must treat all aspects of the software as confidential. This obligation survives termination of your licence.<br/><br/>
            <strong>Warranty Disclaimer:</strong> The software is provided in good faith with no warranties as to fitness for any specific regulatory purpose. It is your responsibility to ensure the system meets your applicable regulatory requirements.
          </div>
        </div>
        <div style={{ background:"#fff3e0", borderRadius:8, padding:"14px 16px", border:"1px solid #ffcc80", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:12, color:"#e65100", marginBottom:6 }}>LIMITATION OF LIABILITY</div>
          <div style={{ fontSize:11, color:"#795548", lineHeight:1.7 }}>
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, KORNELIUS M. MAGITA SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF THE USE OF THIS SOFTWARE, INCLUDING BUT NOT LIMITED TO: LOSS OF DATA; REGULATORY NON-COMPLIANCE OR ENFORCEMENT ACTION BY ANY CIVIL AVIATION AUTHORITY; FAILURE TO DETECT OR PREVENT SAFETY OCCURRENCES; BUSINESS INTERRUPTION; OR LOSS OF REVENUE OR PROFIT.
          </div>
          <div style={{ fontSize:11, color:"#795548", lineHeight:1.7, marginTop:8 }}>
            This software does not constitute legal, regulatory, or professional aviation advice and does not guarantee compliance with the requirements of any civil aviation authority including the KCAA or ICAO. Compliance responsibility rests solely with the licensed operator and its designated accountable manager.
          </div>
        </div>
        <div style={{ fontSize:11, color:"#8a9ab0", lineHeight:1.6 }}>
          Jurisdiction: Republic of Kenya &nbsp;·&nbsp; Licence: Proprietary &nbsp;·&nbsp; Enquiries: Contact Kornelius M. Magita — Developer & Owner, AeroQualify Pro, Nairobi, Kenya.
        </div>
      </div>
      {/* Accept button */}
      <div style={{ padding:"16px 24px", borderTop:"1px solid #dde3ea", background:"#f8fafc", borderRadius:"0 0 16px 16px", flexShrink:0 }}>
        <div style={{ fontSize:12, color:"#5f7285", marginBottom:12, textAlign:"center" }}>
          By clicking "I Accept & Continue" you confirm that you have read and agree to these terms.
        </div>
        <button onClick={onAccept}
          style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#01579b,#0288d1)", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", letterSpacing:0.3 }}>
          ✓ I Accept & Continue
        </button>
      </div>
    </div>
  </div>
);

const PasswordResetScreen = ({ onDone }) => {
  const [pw,  setPw]      = useState("");
  const [pw2, setPw2]     = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]     = useState("");
  const [done, setDone]   = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Poll for session to be established from the recovery token
    let attempts = 0;
    const check = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session){ setSessionReady(true); clearInterval(check); }
      if(++attempts > 20){ clearInterval(check); setMsg("Session expired. Please request a new password reset link."); }
    }, 500);
    return () => clearInterval(check);
  }, []);

  const handle = async(e) => {
    e.preventDefault();
    if(pw !== pw2){ setMsg("Passwords do not match."); return; }
    if(pw.length < 6){ setMsg("Password must be at least 6 characters."); return; }
    if(!sessionReady){ setMsg("Session not ready. Please wait a moment and try again."); return; }
    setLoading(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if(error){ setMsg("Error: "+error.message); setLoading(false); return; }
    setDone(true);
    setTimeout(async()=>{ await supabase.auth.signOut(); onDone(); }, 2000);
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,#e3f2fd 0%,#f0f4f8 50%,#e8f5e9 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <GlobalStyle/>
      <div style={{ position:"fixed", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg,${T.primary},${T.sky},${T.teal})` }} />
      <div style={{ width:400, animation:"fadeIn 0.5s ease" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:`linear-gradient(135deg,${T.primary},${T.sky})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px", boxShadow:"0 4px 20px rgba(1,87,155,0.25)" }}>✈</div>
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:28, fontWeight:800, color:T.primaryDk }}>AeroQualify Pro</div>
          <div style={{ fontSize:13, color:T.muted, marginTop:4 }}>Set New Password</div>
        </div>
        <div className="card" style={{ padding:32 }}>
          {done ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
              <div style={{ fontWeight:700, color:T.green, fontSize:16, marginBottom:8 }}>Password updated!</div>
              <div style={{ fontSize:13, color:T.muted }}>Redirecting to sign in…</div>
            </div>
          ) : !sessionReady && !msg ? (
            <div style={{ textAlign:"center", padding:20 }}>
              <div style={{ width:32,height:32,border:`3px solid ${T.border}`,borderTop:`3px solid ${T.primary}`,borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 12px" }}/>
              <div style={{ fontSize:13, color:T.muted }}>Establishing secure session…</div>
            </div>
          ) : (
            <>
              <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:16, color:T.primaryDk, marginBottom:22 }}>Create New Password</div>
              <form onSubmit={handle}>
                <Input label="New Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 6 characters" required />
                <Input label="Confirm Password" type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Repeat new password" required />
                {msg&&<div style={{ fontSize:12, color:msg.includes("expired")?T.red:T.red, marginBottom:14, padding:"8px 12px", background:T.redLt, borderRadius:6 }}>{msg}</div>}
                <Btn type="submit" size="lg" style={{ width:"100%", opacity:(loading||!sessionReady)?0.7:1 }}>{loading?"Updating…":"Set New Password"}</Btn>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Org Switcher Modal ──────────────────────────────────────
const OrgSwitcherModal = ({ userId, currentOrgId, onSwitch, onClose }) => {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const load = async () => {
      // Get all orgs this user belongs to via profiles + user_organisations
      const [profRes, memberRes] = await Promise.all([
        supabase.from("profiles").select("org_id").eq("id", userId).single(),
        supabase.from("user_organisations").select("org_id,role,status").eq("user_id", userId).eq("status","approved"),
      ]);
      const orgIds = new Set();
      if(profRes.data?.org_id) orgIds.add(profRes.data.org_id);
      (memberRes.data||[]).forEach(m=>orgIds.add(m.org_id));
      if(orgIds.size > 0){
        const { data: orgs } = await supabase.from("organisations").select("id,name,slug,car_prefix").in("id",[...orgIds]);
        setMemberships(orgs||[]);
      }
      setLoading(false);
    };
    load();
  },[userId]);

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:"#fff",borderRadius:16,padding:28,maxWidth:400,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:17,color:"#1a2332",marginBottom:4 }}>Switch Organisation</div>
        <div style={{ fontSize:12,color:"#8a9ab0",marginBottom:20 }}>Select the organisation dashboard to load.</div>
        {loading?(
          <div style={{ textAlign:"center",padding:20,color:"#8a9ab0" }}>Loading…</div>
        ):(
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {memberships.map(o=>(
              <button key={o.id} onClick={()=>onSwitch(o)}
                style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",border:`2px solid ${o.id===currentOrgId?"#01579b":"#dde3ea"}`,borderRadius:10,background:o.id===currentOrgId?"#e3f2fd":"#fff",cursor:"pointer",textAlign:"left",transition:"all 0.15s" }}>
                <div style={{ width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#01579b,#0288d1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>🏢</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:13,color:"#1a2332" }}>{o.name}</div>
                  <div style={{ fontSize:11,color:"#8a9ab0",fontFamily:"monospace" }}>{o.slug} · {o.car_prefix||"ORG"}</div>
                </div>
                {o.id===currentOrgId&&<span style={{ fontSize:11,color:"#01579b",fontWeight:700 }}>Current</span>}
              </button>
            ))}
            {memberships.length===0&&(
              <div style={{ textAlign:"center",padding:20,color:"#8a9ab0",fontSize:13 }}>You are only a member of one organisation.</div>
            )}
          </div>
        )}
        <button onClick={onClose} style={{ marginTop:16,width:"100%",padding:"10px",border:"1px solid #dde3ea",borderRadius:8,background:"#f5f8fc",color:"#5f7285",fontWeight:600,fontSize:13,cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
};

// ─── Password Reset Screen ───────────────────────────────────

const LoginScreen = ({ onLogin, authPopup, setAuthPopup }) => {
  const [email,   setEmail]   = useState("");
  const [pw,      setPw]      = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [fullName,setFullName]= useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const [mode,    setMode]    = useState("login");
  const [orgHint, setOrgHint] = useState(null); // {name, id} when slug is resolved
  const popup    = authPopup;
  const setPopup = setAuthPopup;

  // Live-resolve org slug as user types
  const resolveSlug = async (slug) => {
    if(!slug.trim()){ setOrgHint(null); return; }
    // Try uppercase first (new format), then exact, then lowercase
    let result = await supabase.from("organisations").select("id,name").eq("slug", slug.trim().toUpperCase()).single();
    if(!result.data) result = await supabase.from("organisations").select("id,name").eq("slug", slug.trim()).single();
    if(!result.data) result = await supabase.from("organisations").select("id,name").eq("slug", slug.trim().toLowerCase()).single();
    setOrgHint(result.data || false);
  };

  const POPUPS = {
    signup: { icon:"📧", title:"Check your email", msg:"A verification link has been sent to your email address. Click the link to verify your account, then return here to sign in.", sub:"Once verified, your account will be reviewed by an administrator before you can access AeroQualify.", color:"#01579b", bg:"#e3f2fd" },
    pending: { icon:"⏳", title:"Account pending approval", msg:"Your account has been successfully created and your email verified.", sub:"Please contact your administrator to request access to AeroQualify Pro.", color:"#e65100", bg:"#fff3e0" },
    noProfile: { icon:"⚠️", title:"Account setup incomplete", msg:"Your account was created but the profile setup did not complete.", sub:"Please contact your administrator for assistance.", color:"#c62828", bg:"#ffebee" },
    newOrgAssigned: { icon:"✅", title:"Organisation access requested", msg:"Your account has been linked to the organisation. An administrator will review and approve your access.", sub:"You will be able to sign in once approved.", color:"#2e7d32", bg:"#e8f5e9" },
  };

  const handle = async(e) => {
    e.preventDefault(); setLoading(true); setErr("");
    try {
      if(mode==="reset"){
        const{error}=await supabase.auth.resetPasswordForEmail(email);
        if(error) throw error;
        setErr("✓ Reset link sent — check your email");

      } else if(mode==="signup"){
        // Resolve org from slug if provided
        let resolvedOrgId = null;
        if(orgSlug.trim()){
          const { data: orgData } = await supabase.from("organisations").select("id,name").eq("slug", orgSlug.trim().toUpperCase()).single();
          if(!orgData){ setErr("Organisation ID not found. Please check and try again."); setLoading(false); return; }
          resolvedOrgId = orgData.id;
        }
        // Check if user already exists
        const { data: existingProf } = await supabase.from("profiles").select("id,org_id,status").eq("email", email.trim().toLowerCase()).single();
        if(existingProf){
          // User exists — add to new org via user_organisations junction table
          if(!resolvedOrgId){ setErr("Please enter an Organisation ID to join an additional organisation."); setLoading(false); return; }
          const { error: joinErr } = await supabase.from("user_organisations").upsert({
            user_id: existingProf.id, org_id: resolvedOrgId, role:"viewer", status:"pending"
          });
          if(joinErr){ setErr("Error: "+joinErr.message); setLoading(false); return; }
          await supabase.auth.signOut();
          setMode("login");
          setLoading(false);
          setPopup("newOrgAssigned");
          return;
        }
        // New user signup
        const{data:signUpData,error}=await supabase.auth.signUp({
          email, password:pw,
          options:{ data:{ full_name: fullName||email.split("@")[0], org_slug: orgSlug.trim().toLowerCase() } }
        });
        if(error){ setErr("Signup error: "+error.message); setLoading(false); return; }
        if(!signUpData?.user){ setErr("Signup failed: no user returned. Please try again."); setLoading(false); return; }
        // If org slug provided, store the intended org on the profile
        if(resolvedOrgId){
          await supabase.from("profiles").update({ org_id: resolvedOrgId }).eq("id", signUpData.user.id);
          // Notify the org admin that a new user is waiting for approval
          const { data: adminProfiles } = await supabase
            .from("profiles")
            .select("email,full_name")
            .eq("org_id", resolvedOrgId)
            .eq("role", "admin")
            .eq("status", "approved");
          const { data: orgInfo } = await supabase
            .from("organisations")
            .select("name")
            .eq("id", resolvedOrgId)
            .single();
          const adminEmails = (adminProfiles||[]).map(a=>a.email).filter(Boolean);
          if(adminEmails.length > 0){
            await sendNotification({
              type: "user_signup_request",
              record: {
                full_name: fullName || email.split("@")[0],
                email: email,
                org_name: orgInfo?.name || "",
                registered_at: new Date().toLocaleString("en-GB", {timeZone:"Africa/Nairobi"}),
              },
              recipients: adminEmails,
            });
          }
        }
        await supabase.auth.signOut();
        setMode("login");
        setLoading(false);
        setPopup("signup");
        return;

      } else {
        // ── Sign in ──
        const{data,error}=await supabase.auth.signInWithPassword({email,password:pw});
        if(error) throw error;

        // Check profile
        const { data: prof, error: profErr } = await supabase
          .from("profiles").select("status,role,org_id,is_super_admin").eq("id", data.user.id).single();
        if(profErr || !prof){ setPopup("noProfile"); setLoading(false); await supabase.auth.signOut(); return; }
        if(prof.status !== "approved"){ setPopup("pending"); setLoading(false); await supabase.auth.signOut(); return; }

        // Super admin with no org slug → platform portal
        if(prof.is_super_admin && !orgSlug.trim()){
          onLogin(data.user, null, true); // null orgId, isSuperAdminMode=true
          setLoading(false);
          return;
        }

        // Resolve org slug if provided
        if(orgSlug.trim()){
          let { data: orgData } = await supabase.from("organisations").select("id,name,status,demo_expires_at").eq("slug", orgSlug.trim().toUpperCase()).single();
          if(!orgData){ const r2 = await supabase.from("organisations").select("id,name,status,demo_expires_at").eq("slug", orgSlug.trim()).single(); orgData=r2.data; }
          if(!orgData){ const r3 = await supabase.from("organisations").select("id,name,status,demo_expires_at").eq("slug", orgSlug.trim().toLowerCase()).single(); orgData=r3.data; }
          if(!orgData){ setErr("Organisation ID not found. Please check and try again."); await supabase.auth.signOut(); setLoading(false); return; }
          if(orgData.status !== "active"){
            // Check if it's a demo expiry
            if(orgData.demo_expires_at && new Date(orgData.demo_expires_at) < new Date()){
              setErr("Your demo account has expired. Please contact AeroQualify to activate a full account.");
            } else {
              setErr("This organisation account is currently suspended. Please contact your administrator.");
            }
            await supabase.auth.signOut(); setLoading(false); return;
          }
          // Also check if demo is expired even if not yet suspended (race condition before cron runs)
          if(orgData.demo_expires_at && new Date(orgData.demo_expires_at) < new Date()){
            setErr("Your demo account has expired. Please contact AeroQualify to activate a full account.");
            await supabase.auth.signOut(); setLoading(false); return;
          }
          // Verify user belongs to this org
          if(prof.org_id !== orgData.id){
            // Check user_organisations junction table for multi-org members
            const { data: membership } = await supabase.from("user_organisations")
              .select("status,role").eq("user_id", data.user.id).eq("org_id", orgData.id).single();
            if(!membership){ setErr("You do not have access to this organisation. Contact your administrator."); await supabase.auth.signOut(); setLoading(false); return; }
            if(membership.status !== "approved"){ setErr("Your access to this organisation is pending approval."); await supabase.auth.signOut(); setLoading(false); return; }
          }
          onLogin(data.user, orgData.id, false);
          setLoading(false);
          return;
        }

        onLogin(data.user, null, false);
      }
    } catch(ex){ setErr(ex.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,#e3f2fd 0%,#f0f4f8 50%,#e8f5e9 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <GlobalStyle />
      <div style={{ position:"fixed", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg,${T.primary},${T.sky},${T.teal})` }} />

      {popup&&POPUPS[popup]&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:36, maxWidth:420, width:"100%", textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", animation:"fadeIn 0.3s ease" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>{POPUPS[popup].icon}</div>
            <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:20, color:POPUPS[popup].color, marginBottom:12 }}>{POPUPS[popup].title}</div>
            <div style={{ fontSize:14, color:T.text, lineHeight:1.6, marginBottom:8 }}>{POPUPS[popup].msg}</div>
            <div style={{ fontSize:12, color:T.muted, lineHeight:1.6, marginBottom:24, background:POPUPS[popup].bg, borderRadius:8, padding:"10px 14px" }}>{POPUPS[popup].sub}</div>
            <Btn onClick={()=>setPopup(null)} style={{ width:"100%" }}>OK, got it</Btn>
          </div>
        </div>
      )}

      <div style={{ width:420, animation:"fadeIn 0.5s ease" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:`linear-gradient(135deg,${T.primary},${T.sky})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px", boxShadow:"0 4px 20px rgba(1,87,155,0.25)" }}>✈</div>
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:28, fontWeight:800, color:T.primaryDk, letterSpacing:1 }}>AeroQualify Pro</div>
          <div style={{ fontSize:13, color:T.muted, marginTop:4 }}>Aviation Quality Management System</div>
        </div>

        <div className="card" style={{ padding:32 }}>
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:16, color:T.primaryDk, marginBottom:22 }}>
            {mode==="login"?"Sign In":mode==="signup"?"Create Account":"Reset Password"}
          </div>
          <form onSubmit={handle}>
            <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required />
            {mode!=="reset"&&<Input label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" required />}
            {mode==="signup"&&(
              <Input label="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" />
            )}
            {mode!=="reset"&&(
              <div style={{ marginBottom:16 }}>
                <Input label="Organisation ID (optional)" value={orgSlug}
                  onChange={e=>{ setOrgSlug(e.target.value); resolveSlug(e.target.value); }}
                  placeholder={mode==="login"?"Optional — leave blank if you have one organisation":"Ask your organisation admin for the code"}
                />
                {/* Live org resolution feedback */}
                {orgSlug.trim()&&orgHint===null&&<div style={{ fontSize:11, color:T.muted, marginTop:-10, marginBottom:8 }}>Checking…</div>}
                {orgSlug.trim()&&orgHint&&<div style={{ fontSize:11, color:T.green, marginTop:-10, marginBottom:8, display:"flex", alignItems:"center", gap:4 }}>✓ {orgHint.name}</div>}
                <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                  {mode==="login"
                    ? "Only required if you belong to multiple organisations."
                    : "Enter the organisation ID provided by your administrator."}
                </div>
              </div>
            )}
            {err&&<div style={{ fontSize:12, color:err.startsWith("✓")?T.green:T.red, marginBottom:14, padding:"8px 12px", background:err.startsWith("✓")?T.greenLt:T.redLt, borderRadius:6 }}>{err}</div>}
            <Btn type="submit" size="lg" style={{ width:"100%", opacity:loading?0.7:1 }}>
              {loading?"Please wait…":mode==="login"?"Sign In":mode==="signup"?"Create Account":"Send Reset Link"}
            </Btn>
          </form>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:16 }}>
            <button onClick={()=>{ setMode(mode==="login"?"signup":"login"); setErr(""); setOrgHint(null); }}
              style={{ background:"none",border:"none",color:T.primary,fontSize:12,cursor:"pointer" }}>
              {mode==="login"?"Create account":"Back to sign in"}
            </button>
            {mode==="login"&&<span style={{ fontSize:11,color:T.muted }}>Forgot password? Contact your admin.</span>}
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:T.muted }}>AS9100D · ISO 9001:2015 · AS9110</div>
      </div>
    </div>
  );
};

// ─── Dashboard Charts ─────────────────────────────────────────
const CHART_COLORS = [T.primary, T.yellow, T.green, T.teal, T.purple, T.red];

const Dashboard = ({ data }) => {
  const openCARs     = data.cars.filter(c=>["Open","Overdue"].includes(c.status)).length;
  const inProgCARs   = data.cars.filter(c=>["In Progress","Returned for Resubmission"].includes(c.status)).length;
  const pendVerif    = data.cars.filter(c=>c.status==="Pending Verification").length;
  const closedCARs   = data.cars.filter(c=>["Closed","Completed"].includes(c.status)).length;
  const upAudits     = data.audits.filter(a=>a.status==="Scheduled").length;
  const expDocs      = data.flightDocs.filter(d=>isOverdue(d.expiry_date)||isApproaching(d.expiry_date)).length;

  // ── QMS Compliance Score ─────────────────────────────────────
  // Weighted scoring across 5 pillars (total 100 points)
  const totalCARs    = data.cars.length;
  const overdueCARs  = data.cars.filter(c=>c.status==="Overdue").length;
  const criticalOpen = data.cars.filter(c=>c.severity==="Critical"&&!["Closed","Completed"].includes(c.status)).length;
  const expiredDocs  = data.flightDocs.filter(d=>isOverdue(d.expiry_date)).length;
  const totalFlDocs  = data.flightDocs.length;
  const capRate      = totalCARs>0 ? data.caps.filter(c=>c.status==="Complete").length/totalCARs : 1;
  const closeRate    = totalCARs>0 ? closedCARs/totalCARs : 1;
  const auditsDone   = data.audits.filter(a=>a.status==="Completed").length;
  const auditsTotal  = data.audits.length;
  const contractorOk = data.contractors.filter(c=>["A+","A"].includes(c.rating)).length;
  const contractorTot= data.contractors.length;

  // Pillar 1 — CAPA Closure Rate (25pts): % of CARs closed
  const p1 = Math.round(25 * Math.min(closeRate, 1));
  // Pillar 2 — CAP Compliance (20pts): % of CARs with complete CAPs
  const p2 = Math.round(20 * Math.min(capRate, 1));
  // Pillar 3 — No Overdue/Critical (25pts): deduct for each overdue or critical open
  const p3 = Math.max(0, 25 - (overdueCARs * 5) - (criticalOpen * 8));
  // Pillar 4 — Document Currency (20pts): deduct for expired docs
  const p4 = totalFlDocs>0 ? Math.max(0, Math.round(20 * (1 - expiredDocs/totalFlDocs))) : 20;
  // Pillar 5 -- Audit & Contractor Health (10pts)
  const auditScore  = auditsTotal>0 ? (auditsDone/auditsTotal)*5 : 5;
  const contScore   = contractorTot>0 ? (contractorOk/contractorTot)*5 : 5;
  const p5          = Math.round(auditScore + contScore);

  // Risk Register bonus/penalty (replaces p5 weighting when risks exist)
  const totalRisks    = (data.risks||[]).length;
  const openCritRisks = (data.risks||[]).filter(r=>r.residual_rating==="Critical"&&r.status!=="Closed").length;
  const treatedRisks  = (data.risks||[]).filter(r=>r.treatment_action&&r.status!=="Open").length;
  const riskPenalty   = Math.min(10, openCritRisks * 5);
  const riskBonus     = totalRisks>0 ? Math.round((treatedRisks/totalRisks)*5) : 0;

  const compScore   = Math.min(100, p1+p2+Math.max(0,p3-riskPenalty)+p4+p5+riskBonus);
  const scoreColor  = compScore>=90?"#2e7d32":compScore>=75?T.teal:compScore>=60?T.yellow:compScore>=40?"#e65100":T.red;
  const scoreLabel  = compScore>=90?"Excellent":compScore>=75?"Good":compScore>=60?"Satisfactory":compScore>=40?"Needs Attention":"Critical";
  const pillars     = [
    {label:"CAPA Closure",    score:p1, max:25, desc:`${closedCARs}/${totalCARs} CARs closed`},
    {label:"CAP Compliance",  score:p2, max:20, desc:`${data.caps.filter(c=>c.status==="Complete").length}/${totalCARs} CAPs complete`},
    {label:"No Overdue/Critical",score:Math.min(p3,25),max:25,desc:`${overdueCARs} overdue · ${criticalOpen} critical open`},
    {label:"Document Currency",score:p4,max:20, desc:`${totalFlDocs-expiredDocs}/${totalFlDocs} docs current`},
    {label:"Audit & Contractors",score:p5,max:10,desc:`${auditsDone} audits done · ${contractorOk} approved contractors`},
  ];

  const openOnly    = data.cars.filter(c=>c.status==="Open").length;
  const overdueOnly = data.cars.filter(c=>c.status==="Overdue").length;
  const carsByStatus = [
    {name:"Open",       value:openOnly},
    {name:"Overdue",    value:overdueOnly},
    {name:"In Progress",value:inProgCARs},
    {name:"Pend. Verif.",value:pendVerif},
    {name:"Closed",     value:closedCARs},
  ].filter(d=>d.value>0);

  const carsBySeverity = ["Critical","Major","Minor"].map(s=>({
    name:s, value:data.cars.filter(c=>c.severity===s).length
  })).filter(d=>d.value>0);

  const monthlyData = Array.from({length:6},(_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-5+i);
    const mo=d.toLocaleString("en-GB",{month:"short"});
    const yr=d.getFullYear(); const mn=d.getMonth();
    return {
      month:mo,
      Raised: data.cars.filter(c=>{ const cd=new Date(c.created_at); return cd.getFullYear()===yr&&cd.getMonth()===mn; }).length,
      Closed: data.cars.filter(c=>{ const cd=new Date(c.updated_at); return c.status==="Closed"&&cd.getFullYear()===yr&&cd.getMonth()===mn; }).length,
    };
  });

  const kpis = [
    {label:"Open CARs",     value:openCARs,   color:T.red,    icon:"📋", sub:overdueCARs>0?`${overdueCARs} overdue`:"Requires action"},
    {label:"In Progress",   value:inProgCARs, color:T.yellow, icon:"🔄", sub:"CAP being completed"},
    {label:"Pend. Verif.",  value:pendVerif,  color:T.purple, icon:"🔍", sub:"Awaiting QM review"},
    {label:"Closed",        value:closedCARs, color:T.green,  icon:"✅", sub:"Verified closed"},
    {label:"Upcoming Audits",value:upAudits,  color:T.teal,   icon:"📅", sub:"Scheduled"},
    {label:"Expiring Docs", value:expDocs,    color:T.yellow, icon:"📂", sub:"Within 14 days"},
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* KPIs */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {kpis.map(k=>(
          <div key={k.label} className="card" style={{ flex:1, minWidth:140, padding:"18px 20px", borderTop:`3px solid ${k.color}`, animation:"fadeIn 0.4s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:32, fontFamily:"'Oxanium',sans-serif", fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:12, color:T.text, fontWeight:600, marginTop:4 }}>{k.label}</div>
                <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{k.sub}</div>
              </div>
              <span style={{ fontSize:22, opacity:0.6 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* QMS Compliance Score */}
      <div className="card" style={{ padding:"20px 24px", borderTop:`4px solid ${scoreColor}`, animation:"fadeIn 0.4s ease" }}>
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:24, alignItems:"center" }}>
          {/* Score dial */}
          <div style={{ textAlign:"center", minWidth:130 }}>
            <div style={{ position:"relative", display:"inline-block" }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                {/* Background arc */}
                <circle cx="65" cy="65" r="54" fill="none" stroke="#eef2f7" strokeWidth="10"/>
                {/* Score arc -- strokeDasharray trick for partial circle */}
                <circle cx="65" cy="65" r="54" fill="none" stroke={scoreColor} strokeWidth="10"
                  strokeDasharray={`${(compScore/100)*339.3} 339.3`}
                  strokeLinecap="round"
                  transform="rotate(-90 65 65)"
                  style={{transition:"stroke-dasharray 1s ease"}}/>
                <text x="65" y="58" textAnchor="middle" style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:28,fill:scoreColor}}>{compScore}</text>
                <text x="65" y="72" textAnchor="middle" style={{fontFamily:"'Oxanium',sans-serif",fontWeight:600,fontSize:11,fill:"#5f7285"}}>/100</text>
                <text x="65" y="86" textAnchor="middle" style={{fontFamily:"'Source Sans 3',sans-serif",fontWeight:700,fontSize:10,fill:scoreColor}}>{scoreLabel.toUpperCase()}</text>
              </svg>
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:T.text, marginTop:2 }}>QMS Compliance Score</div>
            <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>AS9100D · ISO 9001:2015</div>
          </div>
          {/* Pillars */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {pillars.map(p=>{
              const pct=Math.round((p.score/p.max)*100);
              const pc=pct>=80?"#2e7d32":pct>=60?T.teal:pct>=40?T.yellow:T.red;
              return (
                <div key={p.label}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:T.text }}>{p.label}</span>
                    <span style={{ fontSize:11, color:T.muted }}>{p.score}/{p.max} pts · <span style={{color:T.muted,fontStyle:"italic"}}>{p.desc}</span></span>
                  </div>
                  <div style={{ height:7, background:"#eef2f7", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:pc, borderRadius:4, transition:"width 0.8s ease" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:16 }}>
        <Card title="CAR Trend (6 months)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="month" tick={{fontSize:11,fill:T.muted}} />
              <YAxis tick={{fontSize:11,fill:T.muted}} />
              <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:`1px solid ${T.border}`}} />
              <Bar dataKey="Raised" fill={T.primary} radius={[3,3,0,0]} />
              <Bar dataKey="Closed" fill={T.green} radius={[3,3,0,0]} />
              <Legend wrapperStyle={{fontSize:12}} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="By Status">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={carsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {carsByStatus.map((e,i)=>{
                  const clr = e.name==="Closed"?"#2e7d32":e.name==="Open"?"#f57f17":e.name==="Overdue"?"#c62828":e.name==="In Progress"?"#01579b":"#6a1b9a";
                  return <Cell key={i} fill={clr} />;
                })}
              </Pie>
              <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
              <Legend wrapperStyle={{fontSize:11}} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="By Severity">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={carsBySeverity} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {carsBySeverity.map((e,i)=>{
                  const clr = e.name==="Critical"?"#c62828":e.name==="Major"?"#e65100":"#f57f17";
                  return <Cell key={i} fill={clr} />;
                })}
              </Pie>
              <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
              <Legend wrapperStyle={{fontSize:11}} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent CARs + Upcoming Audits */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="Recent CARs">
          {data.cars.slice(0,6).map(c=>(
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
              <div>
                <div style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11, fontWeight:600 }}>{c.id}</div>
                <div style={{ fontSize:12, color:T.text, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                <div style={{ fontSize:11, color:T.muted }}>Clause: {c.qms_clause||"--"}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3, alignItems:"flex-end" }}>
                <Badge label={c.severity}/><Badge label={c.status}/>
              </div>
            </div>
          ))}
          {data.cars.length===0&&<div style={{ textAlign:"center", color:T.muted, fontSize:13, padding:20 }}>No CARs raised yet</div>}
        </Card>
        <Card title="Upcoming Audits">
          {data.audits.filter(a=>a.status==="Scheduled").map(a=>{
            const d=daysUntil(a.date);
            return (
              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11 }}>{a.id}</div>
                  <div style={{ fontSize:12, color:T.text }}>{a.title}</div>
                  <div style={{ fontSize:11, color:d!==null&&d<=7?T.red:T.muted }}>{fmt(a.date)}{d!==null?` (${d}d)`:""}</div>
                </div>
                <Badge label={a.type}/>
              </div>
            );
          })}
          {data.audits.filter(a=>a.status==="Scheduled").length===0&&<div style={{ textAlign:"center",color:T.muted,fontSize:13,padding:20 }}>No upcoming audits</div>}
        </Card>
      </div>
    </div>
  );
};

// ─── CAR Form Modal ───────────────────────────────────────────
const AREA_CODES_CAR = {
  "Ground School Training":"007","Flight Training Records":"008",
  "Company Manuals & Documents":"009","Base Training Facilities":"010",
  "Aircraft":"011","AMO":"012","Management Personnel Records":"013",
  "Personnel Records & Qualifications":"014","Quality Management":"016",
  "Safety Management Systems":"017","Fuel Supplier":"022",
};
const getAuditRef = (slot, prefix="PGF") => {
  const code = AREA_CODES_CAR[slot.area]||"000";
  const d = slot.planned_date ? new Date(slot.planned_date) : new Date(slot.year,(slot.month||1)-1,1);
  const dd=String(d.getDate()).padStart(2,"0"), mm=String(d.getMonth()+1).padStart(2,"0"), yyyy=d.getFullYear();
  return `${prefix}-QMS-${code}-${dd}${mm}${yyyy}`;
};

const CARModal = ({ car, managers, onSave, onClose, allCars, auditSchedule, orgPrefix="PGF", auditAreas, fromAudit=false }) => {
  const [selectedAuditId, setSelectedAuditId] = useState(car?.audit_ref||"");
  const auditRef = selectedAuditId || car?.audit_ref || "";

  // Count existing CARs linked to this audit ref to get next CAPA number
  const existingCount = (allCars||[]).filter(c=>c.audit_ref===auditRef && (!car || c.id!==car.id)).length;
  const nextNum = existingCount + 1;
  const autoId = auditRef
    ? `${auditRef}-CAPA-${String(nextNum).padStart(3,"0")}`
    : `CAR-${String(Date.now()).slice(-6)}`;

  const [form, setForm] = useState(car || {
    id: autoId, status:"Open",
    severity:"Minor", date_raised:today(),
    audit_ref: auditRef,
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  // When audit selection changes, update both audit_ref and id
  const handleAuditChange = (slotId) => {
    setSelectedAuditId(slotId);
    if(!slotId){ set("audit_ref",""); set("id",`CAR-${String(Date.now()).slice(-6)}`); return; }
    const slot = (auditSchedule||[]).find(s=>s.id===slotId);
    if(!slot) return;
    const ref = getAuditRef(slot, orgPrefix);
    const count = (allCars||[]).filter(c=>c.audit_ref===ref && (!car||c.id!==car.id)).length;
    const num = String(count+1).padStart(3,"0");
    set("audit_ref", ref);
    set("id", `${ref}-CAPA-${num}`);
  };

  // Sorted audit schedule for dropdown — most recent first
  // Only show completed audits for linking — incomplete audits cannot have CARs raised against them
  const auditOptions = [...(auditSchedule||[])]
    .filter(s=>s.status==="Completed")
    .sort((a,b)=>b.year-a.year||b.month-a.month);
  return (
    <ModalShell title={car?"Edit CAR":"Raise New CAR"} onClose={onClose} wide>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
        {!fromAudit&&(
          <div style={{ gridColumn:"1/-1" }}>
            <Select label="Link to Audit (optional)" value={selectedAuditId} onChange={e=>handleAuditChange(e.target.value)}>
              <option value="">— Standalone CAR (not linked to audit) —</option>
              {auditOptions.map(s=><option key={s.id} value={s.id}>{getAuditRef(s,orgPrefix)} · {s.area} · {s.year}</option>)}
            </Select>
          </div>
        )}
        <Input label="CAR Number" value={form.id||""} onChange={e=>set("id",e.target.value)} />
        <Input label="Date Raised" type="date" value={form.date_raised||""} onChange={e=>set("date_raised",e.target.value)} />
        {form.audit_ref&&<div style={{ gridColumn:"1/-1" }}><Input label="Audit Reference" value={form.audit_ref} readOnly style={{ background:"#f5f8fc",color:"#5f7285",fontFamily:"monospace" }} /></div>}
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Description of Finding" rows={4} value={form.finding_description||""} onChange={e=>set("finding_description",e.target.value)} />
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="QMS Clause Reference" rows={4} value={form.qms_clause||""} onChange={e=>set("qms_clause",e.target.value)} placeholder="e.g. Clause 8.7.1 -- Nonconforming outputs" />
        </div>
        <Select label="Severity" value={form.severity||""} onChange={e=>set("severity",e.target.value)}>
          {["Minor","Major","Critical"].map(o=><option key={o}>{o}</option>)}
        </Select>
        <Select label="Responsible Manager" value={form.responsible_manager||""} onChange={e=>set("responsible_manager",e.target.value)}>
          <option value="">Select…</option>
          {managers.map(m=><option key={m.id} value={m.role_title}>{m.role_title}{m.person_name?` - ${m.person_name}`:""}</option>)}
        </Select>
        <Select label="Department" value={form.department||""} onChange={e=>set("department",e.target.value)}>
          <option value="">Select…</option>
          {(auditAreas ? (typeof auditAreas==="string" ? JSON.parse(auditAreas) : auditAreas) : ["Flight Operations","Maintenance","Training","Safety","Quality","Administration","Engineering","Ground Operations"]).map(o=><option key={o}>{o}</option>)}
        </Select>
        <Input label="Due Date" type="date" value={form.due_date||""} onChange={e=>set("due_date",e.target.value)} />
        <div style={{ gridColumn:"1/-1" }}>
          <Input label="Additional Notification Recipients (comma separated emails)" value={form.additional_notify_text||""} onChange={e=>set("additional_notify_text",e.target.value)} placeholder="person@company.com, other@company.com" />
        </div>
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave(form)}>Save CAR</Btn>
      </div>
    </ModalShell>
  );
};


// ─── Root Cause Analysis Modal (Structured, no AI) ───────────
const ISHIKAWA_CATS = [
  { key:"Man",         icon:"👤", color:"#01579b", hint:"Consider human factors: training gaps, fatigue, skill level, awareness, communication failures" },
  { key:"Machine",     icon:"⚙️", color:"#6a1b9a", hint:"Consider equipment: aircraft condition, tooling, calibration, availability, design issues" },
  { key:"Method",      icon:"📋", color:"#e65100", hint:"Consider procedures: unclear SOPs, outdated manuals, missing checklists, process design flaws" },
  { key:"Environment", icon:"🌍", color:"#2e7d32", hint:"Consider workplace: lighting, noise, space, weather, distractions, shift patterns" },
  { key:"Management",  icon:"🏢", color:"#b71c1c", hint:"Consider oversight: supervision gaps, resource constraints, culture, accountability, prioritisation" },
  { key:"Materials",   icon:"📦", color:"#f57f17", hint:"Consider inputs: parts quality, documentation accuracy, data integrity, supplier issues" },
];

const RCAModal = ({ finding, clause, onAccept, onClose }) => {
  const [method, setMethod]       = useState(""); // "ishikawa" | "whys" | "both"
  const [step, setStep]           = useState(0);
  const [ishikawa, setIshikawa]   = useState({Man:"",Machine:"",Method:"",Environment:"",Management:"",Materials:""});
  const [whys, setWhys]           = useState(["","","","",""]);
  const [primaryCat, setPrimary]  = useState("Method");
  const [editSummary, setEdit]    = useState("");

  const setIsh  = (k,v) => setIshikawa(p=>({...p,[k]:v}));
  const setWhy  = (i,v) => setWhys(p=>{ const n=[...p]; n[i]=v; return n; });

  const ishikawaDone = Object.values(ishikawa).some(v=>v.trim().length>0);
  const whysDone     = whys[0].trim().length>0;

  const steps = method==="both" ? ["1. Ishikawa","2. 5 Whys","3. Summary"]
              : method==="ishikawa" ? ["1. Ishikawa","2. Summary"]
              : method==="whys"     ? ["1. 5 Whys","2. Summary"]
              : [];

  // Map logical step index to content type
  const stepType = () => {
    if(method==="both")     return ["ishikawa","whys","summary"][step];
    if(method==="ishikawa") return ["ishikawa","summary"][step];
    if(method==="whys")     return ["whys","summary"][step];
    return "";
  };

  const buildSummary = () => {
    const parts = [];
    if(method!=="whys") {
      const filled = ISHIKAWA_CATS.filter(c=>ishikawa[c.key].trim());
      const primary = ishikawa[primaryCat]?.trim() || ishikawa[filled[0]?.key]||"";
      if(primary) parts.push(`Ishikawa analysis — primary factor (${primaryCat}): ${primary}`);
      filled.filter(c=>c.key!==primaryCat).forEach(c=>{ if(ishikawa[c.key].trim()) parts.push(`${c.key}: ${ishikawa[c.key].trim()}`); });
    }
    if(method!=="ishikawa") {
      const chain = whys.filter(w=>w.trim()).map((w,i)=>`Why ${i+1}: ${w}`).join(" → ");
      if(chain) parts.push(`5 Whys: ${chain}`);
      const last = whys.filter(w=>w.trim()).slice(-1)[0];
      if(last) parts.push(`Systemic root cause: ${last}`);
    }
    return parts.join("\n\n");
  };

  const goToSummary = () => { setEdit(buildSummary()); setStep(steps.length-1); };
  const isLastBeforeSummary = step === steps.length - 2;

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff",borderRadius:14,width:760,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 50px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1a2332,#2d3f55)",padding:"18px 24px",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.6)",fontSize:11,textTransform:"uppercase",letterSpacing:1 }}>Structured Methodology</div>
            <div style={{ color:"#fff",fontWeight:700,fontSize:16 }}>🔍 Root Cause Analysis</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:22,cursor:"pointer" }}>✕</button>
        </div>

        {/* Step tabs — only show after method selected */}
        {method&&(
        <div style={{ display:"flex",borderBottom:"2px solid #eef2f7",background:"#fafbfc",flexShrink:0 }}>
          {steps.map((label,i)=>(
            <button key={i} onClick={()=>{ if(i<step) setStep(i); }}
              style={{ padding:"12px 20px",border:"none",borderBottom:step===i?"3px solid #01579b":"3px solid transparent",cursor:i<step?"pointer":"default",fontSize:13,fontWeight:step===i?700:400,color:step===i?"#01579b":i<step?"#5f7285":"#bcc5ce",background:"transparent",marginBottom:-2 }}>
              {label}
            </button>
          ))}
        </div>
        )}

        <div style={{ padding:24 }}>
          {/* Finding context */}
          <div style={{ background:"#eef2f7",borderRadius:8,padding:"10px 14px",marginBottom:20,fontSize:12,color:"#1a2332" }}>
            <strong>Finding:</strong> {finding}{clause&&<span> &nbsp;|&nbsp; <strong>Clause:</strong> {clause}</span>}
          </div>

          {/* ── Method selector ── */}
          {!method&&(
            <div style={{ textAlign:"center",padding:"16px 0 24px" }}>
              <div style={{ fontSize:14,fontWeight:600,color:"#1a2332",marginBottom:6 }}>Choose your RCA methodology</div>
              <div style={{ fontSize:12,color:"#5f7285",marginBottom:24 }}>You can use either method independently or run both for a thorough analysis.</div>
              <div style={{ display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap" }}>
                {[
                  {id:"ishikawa", icon:"🐟", label:"Ishikawa Only", desc:"Fishbone analysis across 6 causal categories"},
                  {id:"whys",     icon:"❓", label:"5 Whys Only",   desc:"Drill down to systemic root cause step by step"},
                  {id:"both",     icon:"🔍", label:"Both Methods",  desc:"Full analysis — Ishikawa then 5 Whys"},
                ].map(m=>(
                  <div key={m.id} onClick={()=>{ setMethod(m.id); setStep(0); }}
                    style={{ width:180,padding:"20px 16px",border:"2px solid #dde3ea",borderRadius:12,cursor:"pointer",background:"#fafbfc",transition:"all 0.15s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor="#01579b"; e.currentTarget.style.background="#eef2f7"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor="#dde3ea"; e.currentTarget.style.background="#fafbfc"; }}>
                    <div style={{ fontSize:28,marginBottom:8 }}>{m.icon}</div>
                    <div style={{ fontSize:13,fontWeight:700,color:"#1a2332",marginBottom:4 }}>{m.label}</div>
                    <div style={{ fontSize:11,color:"#5f7285",lineHeight:1.4 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step content: Ishikawa ── */}
          {method&&stepType()==="ishikawa"&&(
            <>
              <div style={{ fontSize:12,color:"#5f7285",marginBottom:16,lineHeight:1.6 }}>
                For each category below, describe how it may have contributed to this finding. Leave blank if not applicable — but consider each one carefully before moving on.
              </div>
              {ISHIKAWA_CATS.map(cat=>(
                <div key={cat.key} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
                    <span style={{ fontSize:16 }}>{cat.icon}</span>
                    <label style={{ fontSize:12,fontWeight:700,color:cat.color,textTransform:"uppercase",letterSpacing:0.5 }}>{cat.key}</label>
                    <span style={{ fontSize:11,color:"#5f7285",fontStyle:"italic" }}>{cat.hint}</span>
                  </div>
                  <textarea rows={2} value={ishikawa[cat.key]} onChange={e=>setIsh(cat.key,e.target.value)}
                    placeholder={`What ${cat.key.toLowerCase()} factors contributed?`}
                    style={{ width:"100%",padding:"8px 12px",border:`1.5px solid ${ishikawa[cat.key]?cat.color+"66":"#dde3ea"}`,borderRadius:8,fontSize:13,boxSizing:"border-box",resize:"vertical",lineHeight:1.5 }}/>
                </div>
              ))}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11,fontWeight:700,color:"#5f7285",textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:6 }}>Primary Contributing Category</label>
                <select value={primaryCat} onChange={e=>setPrimary(e.target.value)}
                  style={{ padding:"8px 10px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13 }}>
                  {ISHIKAWA_CATS.map(c=><option key={c.key}>{c.key}</option>)}
                </select>
              </div>
              <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
                <Btn variant="ghost" onClick={()=>setMethod("")}>← Change Method</Btn>
                {method==="both"
                  ? <Btn onClick={()=>setStep(1)} disabled={!ishikawaDone}>Next: 5 Whys →</Btn>
                  : <Btn onClick={goToSummary} disabled={!ishikawaDone}>Next: Summary →</Btn>
                }
              </div>
            </>
          )}

          {/* ── Step: 5 Whys ── */}
          {method&&stepType()==="whys"&&(
            <>
              <div style={{ fontSize:12,color:"#5f7285",marginBottom:16,lineHeight:1.6 }}>
                Starting from the finding, ask "Why?" repeatedly until you reach the systemic root cause. Each answer becomes the input for the next Why.
              </div>
              {whys.map((w,i)=>(
                <div key={i} style={{ display:"flex",gap:12,marginBottom:12,alignItems:"flex-start" }}>
                  <div style={{ width:32,height:32,borderRadius:"50%",background:w.trim()?"#01579b":"#dde3ea",color:w.trim()?"#fff":"#5f7285",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0,marginTop:2 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11,color:"#5f7285",marginBottom:4 }}>
                      {i===0 ? `Why did this finding occur?` : `Why did "${whys[i-1].slice(0,60)||"..."}" happen?`}
                    </div>
                    <textarea rows={2} value={w} onChange={e=>setWhy(i,e.target.value)}
                      placeholder={i===0?"Start here — why did the finding occur?":"Because..."}
                      style={{ width:"100%",padding:"8px 12px",border:`1.5px solid ${w.trim()?"#01579b66":"#dde3ea"}`,borderRadius:8,fontSize:13,boxSizing:"border-box",resize:"vertical" }}/>
                  </div>
                </div>
              ))}
              <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
                {method==="both"
                  ? <Btn variant="ghost" onClick={()=>setStep(0)}>← Back</Btn>
                  : <Btn variant="ghost" onClick={()=>setMethod("")}>← Change Method</Btn>
                }
                <Btn onClick={goToSummary} disabled={!whysDone}>Next: Summary →</Btn>
              </div>
            </>
          )}

          {/* ── Step: Summary ── */}
          {method&&stepType()==="summary"&&(
            <>
              <div style={{ fontSize:12,color:"#5f7285",marginBottom:16 }}>
                Review and edit the generated summary below before inserting it into the CAP.
              </div>
              <textarea rows={8} value={editSummary} onChange={e=>setEdit(e.target.value)}
                style={{ width:"100%",padding:"10px 12px",border:"1.5px solid #0288d1",borderRadius:8,fontSize:13,boxSizing:"border-box",resize:"vertical",lineHeight:1.7 }}/>
              <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:16 }}>
                <Btn variant="ghost" onClick={()=>setStep(step-1)}>← Back</Btn>
                <Btn onClick={()=>onAccept(editSummary)}>✓ Insert into CAP</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Standalone RCA View ───────────────────────────────────────
const RCAView = ({ data, user, profile }) => {
  const [finding,  setFinding]  = useState("");
  const [clause,   setClause]   = useState("");
  const [showTool, setShowTool] = useState(false);
  const [lastResult, setResult] = useState("");

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:22,color:T.primaryDk,marginBottom:4 }}>Root Cause Analysis</div>
        <div style={{ color:T.muted,fontSize:13 }}>Structured Ishikawa + 5 Whys methodology for quality findings</div>
      </div>

      <div className="card" style={{ padding:24,maxWidth:680 }}>
        <div style={{ fontSize:13,color:T.muted,marginBottom:20,lineHeight:1.6 }}>
          Enter a finding below and run a structured root cause analysis using the Ishikawa (fishbone) methodology across 6 causal categories, followed by a 5 Whys drill-down to identify the systemic root cause.
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:6 }}>Finding / Non-Conformance</label>
          <textarea value={finding} onChange={e=>setFinding(e.target.value)} rows={4}
            placeholder="Describe the finding in detail — what was observed, where, and when..."
            style={{ width:"100%",padding:"10px 12px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13,boxSizing:"border-box",resize:"vertical" }}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:6 }}>QMS Clause (optional)</label>
          <input value={clause} onChange={e=>setClause(e.target.value)} placeholder="e.g. 8.7.1 — Control of nonconforming outputs"
            style={{ width:"100%",padding:"8px 10px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13,boxSizing:"border-box" }}/>
        </div>
        <Btn onClick={()=>setShowTool(true)} disabled={!finding.trim()}>🔍 Run Root Cause Analysis</Btn>
      </div>

      {lastResult&&(
        <div className="card" style={{ padding:24,maxWidth:680,marginTop:16 }}>
          <div style={{ fontSize:12,fontWeight:700,color:T.primary,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8 }}>Last RCA Result</div>
          <div style={{ fontSize:13,color:"#1a2332",whiteSpace:"pre-wrap",lineHeight:1.7 }}>{lastResult}</div>
        </div>
      )}

      {showTool&&(
        <RCAModal finding={finding} clause={clause}
          onAccept={(summary)=>{ setResult(summary); setShowTool(false); }}
          onClose={()=>setShowTool(false)}/>
      )}
    </div>
  );
};

// ─── Risk Assessment Modal (from CAP) ─────────────────────────
const RiskAssessmentModal = ({ car, managers, data, user, profile, showToast, onAccept, onClose }) => {
  const [severity,   setSeverity]   = useState(3);
  const [likelihood, setLikelihood] = useState(3);
  const [category,   setCategory]   = useState("Training");
  const [mitigation, setMitigation] = useState("");
  const [saving,     setSaving]     = useState(false);

  const rating  = riskRating(severity, likelihood);
  const riskId  = `RSK-CAP-${car?.id?.slice(-8)||String(Date.now()).slice(-6)}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const riskEntry = {
        id: riskId,
        category,
        hazard_description: car?.finding_description||"",
        severity,
        likelihood,
        inherent_index: severity * likelihood,
        inherent_rating: rating.label,
        residual_severity: severity,
        residual_likelihood: Math.max(1, likelihood - 1),
        residual_index: severity * Math.max(1, likelihood - 1),
        residual_rating: riskRating(severity, Math.max(1, likelihood-1)).label,
        mitigation_measures: mitigation,
        linked_car_id: car?.id,
        responsible_person: car?.responsible_manager||"",
        status: "Open",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from(TABLES.risks).insert(riskEntry);
      if(error) throw new Error(error.message);
      await logChange({ user, action:"created", table:"risk_register", recordId:riskId, recordTitle:riskEntry.hazard_description?.slice(0,60), newData:riskEntry });
      showToast?.(`Risk entry ${riskId} created in Risk Register`,"success");
      const summary = `Risk Assessment — ${rating.label} Risk (Score: ${severity*likelihood})\nSeverity: ${RISK_SEVERITY.find(s=>s.value===severity)?.label} | Likelihood: ${RISK_LIKELIHOOD.find(l=>l.value===likelihood)?.label}\nCategory: ${category}\nMitigation: ${mitigation}\nRisk Register Entry: ${riskId}`;
      onAccept(summary, riskId);
    } catch(e) {
      showToast?.(`Error: ${e.message}`,"error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff",borderRadius:14,width:700,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 50px rgba(0,0,0,0.3)" }} onClick={e=>e.stopPropagation()}>

        <div style={{ background:"linear-gradient(135deg,#b71c1c,#c62828)",padding:"18px 24px",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.6)",fontSize:11,textTransform:"uppercase",letterSpacing:1 }}>ICAO Annex 19</div>
            <div style={{ color:"#fff",fontWeight:700,fontSize:16 }}>⚠️ Risk Assessment</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:22,cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ padding:24 }}>
          <div style={{ background:"#ffebee",borderRadius:8,padding:"10px 14px",marginBottom:20,fontSize:12,color:"#b71c1c" }}>
            <strong>Finding:</strong> {car?.finding_description}
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11,fontWeight:700,color:"#5f7285",textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:6 }}>Risk Category</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={{ width:"100%",padding:"8px 10px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13 }}>
              {RISK_CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>

          <RiskMatrix severity={severity} likelihood={likelihood} onSelect={(s,l)=>{setSeverity(s);setLikelihood(l);}}/>

          <div style={{ background:rating.bg,border:`2px solid ${rating.color}`,borderRadius:8,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:16 }}>
            <div style={{ fontSize:28,fontWeight:900,color:rating.color }}>{severity*likelihood}</div>
            <div>
              <div style={{ fontSize:14,fontWeight:700,color:rating.color }}>{rating.label} Risk</div>
              <div style={{ fontSize:12,color:"#5f7285" }}>
                {RISK_SEVERITY.find(s=>s.value===severity)?.label} severity × {RISK_LIKELIHOOD.find(l=>l.value===likelihood)?.label} likelihood
              </div>
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11,fontWeight:700,color:"#5f7285",textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:6 }}>Mitigation Measures</label>
            <textarea value={mitigation} onChange={e=>setMitigation(e.target.value)} rows={3}
              placeholder="Describe controls or mitigations to reduce this risk..."
              style={{ width:"100%",padding:"10px 12px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13,boxSizing:"border-box",resize:"vertical" }}/>
          </div>

          <div style={{ background:"#e8f5e9",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#2e7d32" }}>
            ✓ A Risk Register entry <strong>{riskId}</strong> will be created and linked to CAR <strong>{car?.id}</strong>.
          </div>

          <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ background:"#b71c1c",border:"none" }}>
              {saving?"Saving…":"⚠️ Save & Link to Risk Register"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CAP Form Modal ───────────────────────────────────────────
const CAPModal = ({ car, cap, onSave, onClose, data, user, profile, managers, showToast }) => {
  const [form, setForm] = useState(cap || { id:`CAP-${String(Date.now()).slice(-6)}`, car_id:car?.id, status:"Pending" });
  const [newFiles, setNewFiles] = useState([]); // files staged for upload
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const [showRCA,  setShowRCA]  = useState(false);
  const [showRisk, setShowRisk] = useState(false);

  // Existing saved files (array stored as JSON in evidence_files, or legacy single file)
  const savedFiles = (() => {
    try { return JSON.parse(form.evidence_files||"[]"); } catch{ return []; }
  })();
  const legacyFile = !form.evidence_files && form.evidence_filename
    ? [{name:form.evidence_filename, url:form.evidence_url}] : [];
  const allSaved = [...savedFiles, ...legacyFile];

  const hasEvidence = allSaved.length>0 || newFiles.length>0;
  const allFilled = form.immediate_action&&form.root_cause_analysis&&form.corrective_action&&form.preventive_action&&hasEvidence;

  const addFiles = (e) => {
    const picked = Array.from(e.target.files||[]);
    setNewFiles(prev=>[...prev, ...picked]);
    e.target.value=""; // allow re-selecting same file
  };
  const removeNew = (i) => setNewFiles(prev=>prev.filter((_,idx)=>idx!==i));
  const removeSaved = (i) => {
    const updated = allSaved.filter((_,idx)=>idx!==i);
    set("evidence_files", JSON.stringify(updated));
    if(updated.length===0){ set("evidence_filename",""); set("evidence_url",""); }
  };

  return (
    <ModalShell title={`CAP Form - ${car?.id}`} onClose={onClose} wide>
      <div style={{ background:T.primaryLt, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:T.primaryDk }}>
        <strong>Finding:</strong> {car?.finding_description} &nbsp;|&nbsp; <strong>Clause:</strong> {car?.qms_clause}
      </div>
      <Textarea label="Immediate Corrective Action" rows={3} value={form.immediate_action||""} onChange={e=>set("immediate_action",e.target.value)} />
      {/* Root Cause Analysis — AI powered */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
          <label style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8 }}>Root Cause Analysis</label>
          <button onClick={()=>setShowRCA(true)} style={{ fontSize:11,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#1a2332,#2d3f55)",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
            🔍 RCA Tool
          </button>
        </div>
        <textarea rows={4} value={form.root_cause_analysis||""} onChange={e=>set("root_cause_analysis",e.target.value)}
          placeholder="Click 'RCA Tool' to run structured Ishikawa + 5 Whys analysis, or type manually..."
          style={{ width:"100%",padding:"10px 12px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13,boxSizing:"border-box",resize:"vertical",lineHeight:1.6 }}/>
      </div>

      {/* Risk Assessment */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
          <label style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.8 }}>Risk Assessment</label>
          <button onClick={()=>setShowRisk(true)} style={{ fontSize:11,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#b71c1c,#c62828)",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
            ⚠️ Run Assessment
          </button>
        </div>
        {form.risk_assessment
          ? <div style={{ background:"#fff3e0",border:"1px solid #e65100",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#1a2332",whiteSpace:"pre-wrap" }}>{form.risk_assessment}</div>
          : <div style={{ background:"#f5f8fc",border:"1px dashed #dde3ea",borderRadius:8,padding:"10px 12px",fontSize:12,color:T.muted }}>No risk assessment yet — click "Run Assessment" to evaluate and log to Risk Register.</div>
        }
      </div>
      <Textarea label="Corrective Action" rows={3} value={form.corrective_action||""} onChange={e=>set("corrective_action",e.target.value)} />
      <Textarea label="Preventive Action" rows={3} value={form.preventive_action||""} onChange={e=>set("preventive_action",e.target.value)} />

      {/* Evidence upload */}
      <div style={{ marginBottom:14 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:6 }}>Evidence of Closure</label>

        {/* Already-saved files */}
        {allSaved.length>0&&(
          <div style={{ marginBottom:8 }}>
            {allSaved.map((f,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:T.greenLt, border:`1px solid #a5d6a7`, borderRadius:6, padding:"6px 10px", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14 }}>📎</span>
                  <div>
                    <div style={{ fontSize:12, color:T.green, fontWeight:600 }}>{f.name}</div>
                    {f.url&&<a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:T.primary }}>View file</a>}
                  </div>
                </div>
                <button onClick={()=>removeSaved(i)} style={{ background:"none", border:"none", color:T.red, fontSize:16, cursor:"pointer", padding:"0 4px" }} title="Remove">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Newly staged files (not yet uploaded) */}
        {newFiles.length>0&&(
          <div style={{ marginBottom:8 }}>
            {newFiles.map((f,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:T.primaryLt, border:`1px solid #90caf9`, borderRadius:6, padding:"6px 10px", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14 }}>🔄</span>
                  <div>
                    <div style={{ fontSize:12, color:T.primary, fontWeight:600 }}>{f.name}</div>
                    <div style={{ fontSize:11, color:T.muted }}>{(f.size/1024).toFixed(1)} KB -- ready to upload</div>
                  </div>
                </div>
                <button onClick={()=>removeNew(i)} style={{ background:"none", border:"none", color:T.red, fontSize:16, cursor:"pointer", padding:"0 4px" }} title="Remove">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* File picker */}
        <label style={{ display:"flex", alignItems:"center", gap:8, background:T.bg, border:`2px dashed ${T.border}`, borderRadius:8, padding:"10px 14px", cursor:"pointer", fontSize:12, color:T.muted }}>
          <span style={{ fontSize:18 }}>📁</span>
          <span>Click to add files &nbsp;<span style={{ color:T.light }}>— images, PDF, Word, Excel (multiple allowed)</span></span>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={addFiles} style={{ display:"none" }} />
        </label>
        {!hasEvidence&&<div style={{ fontSize:11, color:T.red, marginTop:4 }}>⚠ At least one evidence file is required to complete the CAP.</div>}
      </div>

      {allFilled&&<div style={{ background:T.greenLt, borderRadius:8, padding:"10px 14px", fontSize:12, color:T.green, marginBottom:14 }}>✓ All fields complete -- CAR will be set to <strong>Pending Verification</strong> upon save.</div>}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave(form, newFiles)}>Submit CAP</Btn>
      </div>

      {showRCA&&(
        <RCAModal
          finding={car?.finding_description||""}
          clause={car?.qms_clause||""}
          onAccept={(summary)=>{ set("root_cause_analysis", summary); setShowRCA(false); }}
          onClose={()=>setShowRCA(false)}
        />
      )}
      {showRisk&&(
        <RiskAssessmentModal
          car={car}
          managers={managers}
          data={data}
          user={user}
          profile={profile}
          showToast={showToast}
          onAccept={(summary, riskId)=>{ set("risk_assessment", summary); set("linked_risk_id", riskId); setShowRisk(false); }}
          onClose={()=>setShowRisk(false)}
        />
      )}
    </ModalShell>
  );
};

// ─── Verification Form Modal ──────────────────────────────────
const VerificationModal = ({ car, cap, verif, onSave, onClose }) => {
  const [form, setForm] = useState(verif ? {...verif} : {
    id:`VRF-${String(Date.now()).slice(-6)}`, car_id:car?.id,
    immediate_action_ok:false, root_cause_ok:false,
    corrective_action_ok:false, preventive_action_ok:false,
    evidence_ok:false, recurrence_prevented:false,
    effectiveness_rating:"Pending", status:"Pending",
  });
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const allChecked = form.immediate_action_ok&&form.root_cause_ok&&form.corrective_action_ok&&form.preventive_action_ok&&form.evidence_ok;
  const checks = [
    {key:"immediate_action_ok",   label:"Immediate action was adequate and implemented"},
    {key:"root_cause_ok",         label:"Root cause has been correctly identified"},
    {key:"corrective_action_ok",  label:"Corrective action addresses the root cause"},
    {key:"preventive_action_ok",  label:"Preventive action prevents recurrence"},
    {key:"evidence_ok",           label:"Evidence of closure is satisfactory"},
    {key:"recurrence_prevented",  label:"Recurrence of the finding is prevented"},
  ];
  return (
    <ModalShell title={`CAPA Verification - ${car?.id}`} onClose={onClose} wide>
      <div style={{ background:T.primaryLt, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:T.primaryDk }}>
        <strong>Finding:</strong> {car?.finding_description} &nbsp;|&nbsp; <strong>Clause:</strong> {car?.qms_clause}
      </div>
      {cap&&(
        <div style={{ background:"#f8fafc", borderRadius:8, padding:"12px 14px", marginBottom:16, fontSize:12 }}>
          <div style={{ fontWeight:600, color:T.text, marginBottom:8 }}>CAP Summary</div>
          <div><strong>Immediate Action:</strong> {cap.immediate_action}</div>
          <div style={{ marginTop:4 }}><strong>Root Cause:</strong> {cap.root_cause_analysis}</div>
          <div style={{ marginTop:4 }}><strong>Corrective Action:</strong> {cap.corrective_action}</div>
          <div style={{ marginTop:4 }}><strong>Preventive Action:</strong> {cap.preventive_action}</div>
          {(()=>{
            let fs=[];try{fs=JSON.parse(cap.evidence_files||"[]");}catch{}
            if(!cap.evidence_files&&cap.evidence_filename) fs=[{name:cap.evidence_filename}];
            return fs.length>0&&<div style={{ marginTop:4, color:T.green }}>
              <strong>Evidence ({fs.length} file{fs.length!==1?"s":""}):</strong> {fs.map(f=>f.name).join(", ")}
            </div>;
          })()}
        </div>
      )}
      <div style={{ fontWeight:600, fontSize:13, color:T.text, marginBottom:10 }}>Verification Checklist</div>
      {checks.map(c=><Checkbox key={c.key} label={c.label} checked={!!form[c.key]} onChange={()=>set(c.key,!form[c.key])} />)}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px", marginTop:8 }}>
        <Select label="Effectiveness Rating" value={form.effectiveness_rating||""} onChange={e=>set("effectiveness_rating",e.target.value)}>
          {["Pending","Effective","Not Effective"].map(o=><option key={o}>{o}</option>)}
        </Select>
        <Select label="Final Status" value={form.status||""} onChange={e=>set("status",e.target.value)}>
          {["Pending","Closed","Overdue"].map(o=><option key={o}>{o}</option>)}
        </Select>
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Verifier Comments" value={form.verifier_comments||""} onChange={e=>set("verifier_comments",e.target.value)} />
        </div>
      </div>
      {allChecked&&form.status==="Closed"&&<div style={{ background:T.greenLt, borderRadius:8, padding:"10px 14px", fontSize:12, color:T.green, marginBottom:14 }}>✓ All checklist items verified -- CAR will be marked <strong>Closed</strong>.</div>}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="success" onClick={()=>onSave(form)}>Submit Verification</Btn>
      </div>
    </ModalShell>
  );
};

// ─── Generic Modal Shell ──────────────────────────────────────
const ModalShell = ({ title, children, onClose, wide }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:2100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
    <div style={{ background:"#fff", borderRadius:14, padding:28, width:wide?680:480, maxHeight:"90vh", overflowY:"auto", animation:"fadeIn 0.2s ease", boxShadow:"0 8px 40px rgba(0,0,0,0.15)" }} onClick={e=>e.stopPropagation()}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Oxanium',sans-serif", fontSize:18, fontWeight:700, color:T.primaryDk }}>{title}</h2>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, color:T.muted, cursor:"pointer" }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);


// ─── Pegasus Letterhead ───────────────────────────────────────
const PegasusLetterhead = () => (
  <div style={{ borderBottom:`2px solid #01579b`, paddingBottom:14, marginBottom:18, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
    <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:22, color:"#01579b", letterSpacing:1 }}>✈ Pegasus Flyers (E.A.) Ltd.</div>
    <div style={{ textAlign:"right" }}>
      <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:13, color:"#01579b" }}>CORRECTIVE ACTION REQUEST</div>
      <div style={{ fontSize:10, color:"#5f7285", marginTop:2 }}>P.O Box 3341-00100 Wilson Airport, Nairobi Kenya</div>
      <div style={{ fontSize:10, color:"#5f7285" }}>Tel: +254206001467/8 · Email: pegasus@africaonline.co.ke</div>
    </div>
  </div>
);

// ─── CAPA Detail / Progress Modal ────────────────────────────
const CAPADetailModal = ({ car, cap, verif, allCaps, allVerifs, onPDF, onClose }) => {
  const steps = [
    { label:"CAR Raised",           done:true,                                  active:car.status==="Open" },
    { label:"In Progress",          done:["In Progress","Pending Verification","Closed","Overdue"].includes(car.status), active:car.status==="In Progress" },
    { label:"Pending Verification", done:["Pending Verification","Closed","Returned for Resubmission"].includes(car.status), active:car.status==="Pending Verification" },
    { label:"Returned for Resubmission", done:["Returned for Resubmission"].includes(car.status), active:car.status==="Returned for Resubmission", warn:true },
    { label:"Closed",               done:car.status==="Closed",                 active:car.status==="Closed" },
  ];
  const checkItem = (ok, label) => (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
      <div style={{ width:18,height:18,borderRadius:"50%",background:ok?"#e8f5e9":"#fff",border:`2px solid ${ok?"#2e7d32":"#dde3ea"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        {ok&&<span style={{ color:"#2e7d32",fontSize:10,fontWeight:700 }}>✓</span>}
      </div>
      <span style={{ fontSize:12,color:ok?"#2e7d32":"#8fa0b0" }}>{label}</span>
    </div>
  );
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff",borderRadius:14,width:780,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 50px rgba(0,0,0,0.2)",animation:"fadeIn 0.2s ease" }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,#01579b,#0277bd)`,padding:"18px 24px",borderRadius:"14px 14px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"'Source Code Pro',monospace",color:"rgba(255,255,255,0.7)",fontSize:11 }}>CAPA PROGRESS REPORT</div>
            <div style={{ fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:20,color:"#fff",letterSpacing:0.5 }}>{car.id}</div>
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
            <Btn size="sm" onClick={onPDF} style={{ background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)" }}>📄 Export PDF</Btn>
            <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:22,cursor:"pointer" }}>✕</button>
          </div>
        </div>

        <div style={{ padding:24 }}>
          {/* Letterhead */}
          <PegasusLetterhead />

          {/* Progress tracker */}
          {(()=>{
            const isReturned = car.status==="Returned for Resubmission";
            // Steps: CAR Raised -> In Progress -> Pending Verification -> Closed
            // When returned: Pending Verification bullet goes red, connector between
            // In Progress and Pending Verification turns red with backward arrows
            const trackerSteps = [
              { label:"CAR Raised",           done:true,          color:"#01579b" },
              { label:"In Progress",          done:["In Progress","Pending Verification","Closed","Returned for Resubmission"].includes(car.status), color:"#01579b" },
              { label:"Pending Verification", done:["Pending Verification","Closed","Returned for Resubmission"].includes(car.status), color:isReturned?"#c62828":"#01579b" },
              { label:"Closed",               done:car.status==="Closed", color:"#2e7d32" },
            ];
            return (
              <div style={{ marginBottom:24, background:"#f5f8fc", borderRadius:10, padding:"14px 20px" }}>
                <div style={{ display:"flex", alignItems:"center" }}>
                  {trackerSteps.map((s,i)=>(
                    <div key={s.label} style={{ display:"flex", alignItems:"center", flex:i<trackerSteps.length-1?1:"auto" }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <div style={{ width:32,height:32,borderRadius:"50%",
                          background:s.done?s.color:"#eef2f7",
                          border:`2px solid ${s.done?s.color:"#dde3ea"}`,
                          display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {s.done
                            ? <span style={{ color:"#fff",fontSize:14,fontWeight:700 }}>{(isReturned&&s.label==="Pending Verification")?"✕":"✓"}</span>
                            : <span style={{ width:8,height:8,borderRadius:"50%",background:"#dde3ea",display:"block" }}/>}
                        </div>
                        <div style={{ fontSize:10,fontWeight:600,color:s.done?s.color:T.muted,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:0.5 }}>{s.label}</div>
                      </div>
                      {i<trackerSteps.length-1&&(()=>{
                        // Connector between In Progress (i=1) and Pending Verification (i=2) goes red when returned
                        const isReturnConnector = isReturned && i===1;
                        const lineColor = isReturnConnector ? "#c62828" : (s.done ? "#01579b" : "#dde3ea");
                        return (
                          <div style={{ flex:1, margin:"0 8px", marginBottom:18, position:"relative" }}>
                            <div style={{ height:3, background:lineColor, borderRadius:2, position:"relative" }}>
                              {isReturnConnector&&(
                                <>
                                  {/* Backward arrows on the line */}
                                  <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:14, color:"#c62828", lineHeight:1 }}>
                                    &#8678;&#8678;
                                  </div>
                                  {/* Label below the line */}
                                  <div style={{ position:"absolute", top:8, left:0, right:0, textAlign:"center", fontSize:9, fontWeight:700, color:"#c62828", textTransform:"uppercase", letterSpacing:0.5, whiteSpace:"nowrap" }}>
                                    CAP Returned
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
                {isReturned&&(
                  <div style={{ marginTop:16, padding:"8px 14px", background:"#ffebee", borderRadius:6, border:"1px solid #ffcdd2", fontSize:12, color:"#c62828", fontWeight:600, textAlign:"center" }}>
                    ✕ CAP reviewed and returned for resubmission — awaiting revised CAP from responsible manager
                  </div>
                )}
              </div>
            );
          })()}

          {/* CAR Details */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20 }}>
            <div style={{ background:"#f5f8fc",borderRadius:10,padding:16,gridColumn:"1/-1" }}>
              <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>Description of Finding</div>
              <div style={{ fontSize:13,color:T.text,lineHeight:1.6 }}>{car.finding_description||"—"}</div>
            </div>
            <div style={{ background:"#f5f8fc",borderRadius:10,padding:16,gridColumn:"1/-1" }}>
              <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>QMS Clause Reference</div>
              <div style={{ fontSize:13,color:T.text,lineHeight:1.6,fontFamily:"'Source Code Pro',monospace" }}>{car.qms_clause||"—"}</div>
            </div>
            {[
              ["CAR Number",car.id,true],["Date Raised",fmt(car.date_raised),false],
              ["Severity",null,false,car.severity],["Status",null,false,car.status],
              ["Department",car.department,false],["Due Date",fmt(car.due_date),false],
              ["Responsible Manager",car.responsible_manager,false],["Raised By",car.raised_by_name,false],
            ].map(([label,val,mono,badge])=>(
              <div key={label} style={{ background:"#f5f8fc",borderRadius:8,padding:"10px 14px" }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:4 }}>{label}</div>
                {badge ? <Badge label={badge}/> : <div style={{ fontSize:13,color:T.text,fontFamily:mono?"'Source Code Pro',monospace":"inherit",fontWeight:mono?600:400 }}>{val||"--"}</div>}
              </div>
            ))}
          </div>

          {/* CAP History */}
          {(()=>{
            const caps = allCaps&&allCaps.length>0 ? allCaps : (cap?[cap]:[]);
            return (
              <div style={{ borderTop:`2px solid ${T.border}`,paddingTop:18,marginBottom:18 }}>
                <div style={{ fontFamily:"'Oxanium',sans-serif",fontWeight:700,fontSize:16,color:T.primaryDk,marginBottom:14 }}>
                  Corrective Action Plan History {caps.length>1&&<span style={{ fontSize:12,fontWeight:400,color:T.muted,marginLeft:8 }}>({caps.length} submissions)</span>}
                </div>
                {caps.length===0
                  ? <div style={{ background:"#fff3e0",borderRadius:8,padding:"14px 18px",fontSize:13,color:T.yellow }}>⏳ CAP not yet submitted by the responsible manager.</div>
                  : caps.map((c,idx)=>{
                    let files=[]; try{files=JSON.parse(c.evidence_files||"[]");}catch{}
                    if(!c.evidence_files&&c.evidence_filename) files=[{name:c.evidence_filename,url:c.evidence_url}];
                    const isRejected = idx < caps.length-1; // all but last are rejected
                    return (
                      <div key={c.id||idx} style={{ marginBottom:16,border:`2px solid ${isRejected?"#ffcdd2":"#c8e6c9"}`,borderRadius:10,overflow:"hidden" }}>
                        <div style={{ padding:"8px 14px",background:isRejected?"#ffebee":"#e8f5e9",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                          <div style={{ fontSize:12,fontWeight:700,color:isRejected?"#c62828":"#2e7d32",textTransform:"uppercase",letterSpacing:0.5 }}>
                            {caps.length>1?`Submission ${idx+1} of ${caps.length}`:"CAP Submission"} {isRejected&&"— Returned for Resubmission"}
                          </div>
                          <div style={{ fontSize:11,color:T.muted }}>{c.submitted_at?new Date(c.submitted_at).toLocaleString():""} · {c.submitted_by_name||"--"}</div>
                        </div>
                        <div style={{ padding:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                          {[["Immediate Corrective Action",c.immediate_action,true],["Root Cause Analysis",c.root_cause_analysis,true],["Corrective Action",c.corrective_action,true],["Preventive Action",c.preventive_action,true]].map(([label,val,full])=>(
                            <div key={label} style={{ background:"#f5f8fc",borderRadius:8,padding:"10px 12px",gridColumn:full?"1/-1":"auto" }}>
                              <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:4 }}>{label}</div>
                              <div style={{ fontSize:13,color:T.text,lineHeight:1.6 }}>{val||"--"}</div>
                            </div>
                          ))}
                          <div style={{ background:"#f5f8fc",borderRadius:8,padding:"10px 12px",gridColumn:"1/-1" }}>
                            <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8 }}>Evidence of Closure</div>
                            {files.length>0
                              ? <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                                  {files.map((f,fi)=>(
                                    <div key={fi} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:isRejected?"#ffebee":"#e8f5e9",borderRadius:6,padding:"7px 12px" }}>
                                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                                        <span>📎</span>
                                        <span style={{ fontSize:13,color:isRejected?"#c62828":T.green,fontWeight:600 }}>{f.name}</span>
                                      </div>
                                      <div style={{ display:"flex",gap:6 }}>
                                        {f.url&&f.url.startsWith("data:")&&(
                                          <a href={f.url} download={f.name}
                                            style={{ fontSize:12,color:"#fff",fontWeight:600,background:T.primary,borderRadius:5,padding:"3px 10px",textDecoration:"none" }}>
                                            ⬇ Download
                                          </a>
                                        )}
                                        {f.url&&!f.url.startsWith("data:")&&(
                                          <a href={f.url} target="_blank" rel="noreferrer"
                                            style={{ fontSize:12,color:T.primary,fontWeight:600 }}>
                                            🔗 View
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              : <div style={{ fontSize:13,color:T.muted }}>-- No evidence uploaded</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            );
          })()}

          {/* Verification History */}
          {(()=>{
            const verifs = allVerifs&&allVerifs.length>0 ? allVerifs : (verif?[verif]:[]);
            return (
              <div style={{ borderTop:`2px solid ${T.border}`,paddingTop:18 }}>
                <div style={{ fontFamily:"'Oxanium',sans-serif",fontWeight:700,fontSize:16,color:T.primaryDk,marginBottom:14 }}>
                  CAPA Verification History {verifs.length>1&&<span style={{ fontSize:12,fontWeight:400,color:T.muted,marginLeft:8 }}>({verifs.length} reviews)</span>}
                </div>
                {verifs.length===0
                  ? <div style={{ background:"#e3f2fd",borderRadius:8,padding:"14px 18px",fontSize:13,color:T.primary }}>⏳ Verification not yet completed by the Quality Manager.</div>
                  : verifs.map((v,idx)=>{
                    const isRejection = v.effectiveness_rating==="Not Effective";
                    return (
                      <div key={v.id||idx} style={{ marginBottom:16,border:`2px solid ${isRejection?"#ffcdd2":"#c8e6c9"}`,borderRadius:10,overflow:"hidden" }}>
                        <div style={{ padding:"8px 14px",background:isRejection?"#ffebee":"#e8f5e9",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                          <div style={{ fontSize:12,fontWeight:700,color:isRejection?"#c62828":"#2e7d32",textTransform:"uppercase",letterSpacing:0.5 }}>
                            {verifs.length>1?`Review ${idx+1} of ${verifs.length}`:"Verification"} — {isRejection?"Returned for Resubmission":"Effective"}
                          </div>
                          <div style={{ fontSize:11,color:T.muted }}>{v.verified_at?new Date(v.verified_at).toLocaleString():""} · {v.verified_by_name||"--"}</div>
                        </div>
                        <div style={{ padding:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                          <div style={{ background:"#f5f8fc",borderRadius:8,padding:"10px 12px",gridColumn:"1/-1" }}>
                            <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8 }}>Verification Checklist</div>
                            {checkItem(v.immediate_action_ok,"Immediate action adequate")}
                            {checkItem(v.root_cause_ok,"Root cause correctly identified")}
                            {checkItem(v.corrective_action_ok,"Corrective action addresses root cause")}
                            {checkItem(v.preventive_action_ok,"Preventive action prevents recurrence")}
                            {checkItem(v.evidence_ok,"Evidence of closure satisfactory")}
                            {checkItem(v.recurrence_prevented,"Recurrence prevented")}
                          </div>
                          <div style={{ background:"#f5f8fc",borderRadius:8,padding:"10px 12px" }}>
                            <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6 }}>Effectiveness Rating</div>
                            <Badge label={v.effectiveness_rating}/>
                          </div>
                          <div style={{ background:"#f5f8fc",borderRadius:8,padding:"10px 12px" }}>
                            <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6 }}>Verified By</div>
                            <div style={{ fontSize:13,color:T.text }}>{v.verified_by_name||"--"}</div>
                          </div>
                          {v.verifier_comments&&(
                            <div style={{ background:"#f5f8fc",borderRadius:8,padding:"10px 12px",gridColumn:"1/-1" }}>
                              <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6 }}>Comments</div>
                              <div style={{ fontSize:13,color:T.text,lineHeight:1.6 }}>{v.verifier_comments}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            );
          })()}

          {/* Footer */}
          <div style={{ marginTop:20,paddingTop:14,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ fontSize:11,color:T.muted }}>Pegasus Flyers (E.A.) Ltd. · QMS Document · {new Date().toLocaleDateString("en-GB")}</div>
            <Btn size="sm" onClick={onPDF}>📄 Export PDF Report</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── CARs Table View ──────────────────────────────────────────
const CARsView = ({ data, user, profile, managers, onRefresh, showToast, org }) => {
  const [modal, setModal]   = useState(null); // null | 'car' | 'cap' | 'verify'
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = data.cars
    .filter(c => filter==="all"||c.status===filter)
    .filter(c => !search || JSON.stringify(c).toLowerCase().includes(search.toLowerCase()));

  const canRaiseCAR = ["admin","quality_manager","quality_auditor"].includes(profile?.role);

  const saveCar = async(form) => {
    const isNew = !data.cars.find(c=>c.id===form.id);
    const payload = {...form, title: form.finding_description?.slice(0,80)||form.id, updated_at:new Date().toISOString()};
    delete payload.additional_notify_text;
    if(isNew) {
      payload.raised_by=user.id; payload.raised_by_name=profile?.full_name||user.email;
      const{error}=await supabase.from(TABLES.cars).insert(payload);
      if(error){showToast(`Error: ${error.message}`,"error");return;}
      await logChange({user,action:"created",table:"cars",recordId:form.id,recordTitle:form.title||form.id,newData:form});
      const carRm=managers.find(m=>m.role_title===form.responsible_manager); const extraEmails=(form.additional_notify_text||"").split(",").map(s=>s.trim()).filter(Boolean); await sendNotification({type:"car_raised",record:{...form,raised_by_name:profile?.full_name||user.email},recipients:[carRm?.email,...extraEmails].filter(Boolean)});
      showToast("CAR raised -- responsible manager notified","success");
    } else {
      const{error}=await supabase.from(TABLES.cars).update(payload).eq("id",form.id);
      if(error){showToast(`Error: ${error.message}`,"error");return;}
      await logChange({user,action:"updated",table:"cars",recordId:form.id,recordTitle:form.title||form.id,newData:form});
      showToast("CAR updated","success");
    }
    setModal(null); onRefresh();
  };

  const saveCap = async(form, newFiles) => {
    // Upload helper -- tries Supabase storage, falls back to base64
    const uploadOne = async(file) => {
      try {
        await supabase.storage.createBucket("capa-evidence",{public:true}).catch(()=>{});
        const path=`evidence/${selected.id}/${Date.now()}_${file.name}`;
        const{error:ue}=await supabase.storage.from("capa-evidence").upload(path,file,{upsert:true,contentType:file.type});
        if(!ue){
          const{data:urlData}=supabase.storage.from("capa-evidence").getPublicUrl(path);
          return {name:file.name, url:urlData.publicUrl, size:file.size, type:file.type};
        }
        // fallback: base64
        const reader=new FileReader();
        const dataUrl=await new Promise((res,rej)=>{reader.onload=e=>res(e.target.result);reader.onerror=rej;reader.readAsDataURL(file);});
        return {name:file.name, url:dataUrl, size:file.size, type:file.type, inline:true};
      } catch(e){
        console.warn("Upload failed for",file.name,e);
        return null;
      }
    };

    // Start from existing saved files
    let existingFiles = [];
    try { existingFiles=JSON.parse(form.evidence_files||"[]"); } catch{}
    // Also migrate any legacy single-file evidence
    if(!form.evidence_files && form.evidence_filename){
      existingFiles=[{name:form.evidence_filename, url:form.evidence_url}];
    }

    // Upload all new files in parallel
    if(newFiles && newFiles.length>0){
      showToast(`Uploading ${newFiles.length} file(s)…`,"success");
      const results = await Promise.all(newFiles.map(uploadOne));
      const uploaded = results.filter(Boolean);
      existingFiles = [...existingFiles, ...uploaded];
      showToast(`${uploaded.length} file(s) uploaded`,"success");
    }

    const evidence_files = JSON.stringify(existingFiles);
    // Keep legacy fields populated from first file for backwards compat
    const firstFile = existingFiles[0];
    const evidence_url      = firstFile?.url || "";
    const evidence_filename = firstFile?.name || "";

    const hasEvidence = existingFiles.length>0;
    const allFilled = form.immediate_action&&form.root_cause_analysis&&form.corrective_action&&form.preventive_action&&hasEvidence;
    const isResubmission = selected.status==="Returned for Resubmission";
    const capId = isResubmission ? `${selected.id}-cap-${Date.now()}` : form.id;
    const capPayload={...form,id:capId,evidence_files,evidence_url,evidence_filename,submitted_by:user.id,submitted_by_name:profile?.full_name||user.email,submitted_at:new Date().toISOString(),status:allFilled?"Complete":"Pending"};
    const{error}=await supabase.from(TABLES.caps).upsert(capPayload);
    if(error){showToast(`Error saving CAP: ${error.message}`,"error");return;}
    if(allFilled){
      await supabase.from(TABLES.cars).update({status:"Pending Verification",updated_at:new Date().toISOString()}).eq("id",selected.id);
      const qm=managers.find(m=>m.role_title==="Quality Manager");
      await sendNotification({type:"cap_submitted",record:{...selected,...form},recipients:[qm?.email].filter(Boolean)});
      showToast("CAP submitted -- Quality Manager notified","success");
    } else {
      await supabase.from(TABLES.cars).update({status:"In Progress",updated_at:new Date().toISOString()}).eq("id",selected.id);
      showToast("CAP saved","success");
    }
    await logChange({user,action:"submitted CAP",table:"caps",recordId:form.id,recordTitle:selected.id,newData:form});
    setModal(null); onRefresh();
  };

  const saveVerification = async(form) => {
    // If QM marks Not Effective, return CAR for resubmission rather than closing
    const carStatus = form.effectiveness_rating==="Not Effective"
      ? "Returned for Resubmission"
      : form.status;
    const verifId = `${selected.id}-verif-${Date.now()}`;
    const payload={...form,id:verifId,verified_by:user.id,verified_by_name:profile?.full_name||user.email,verified_at:new Date().toISOString()};
    const{error}=await supabase.from(TABLES.verifications).insert(payload);
    if(error){showToast(`Error: ${error.message}`,"error");return;}
    await supabase.from(TABLES.cars).update({status:carStatus,updated_at:new Date().toISOString()}).eq("id",selected.id);
    const rm=managers.find(m=>m.role_title===selected.responsible_manager);
    await logChange({user,action:"verified CAPA",table:"capa_verifications",recordId:form.id,recordTitle:selected.id,newData:form});
    const toastMsg = form.effectiveness_rating==="Not Effective"
      ? "CAP returned for resubmission -- responsible manager notified"
      : "Verification submitted -- CAR closed";
    const notifType = form.effectiveness_rating==="Not Effective" ? "returned_for_resubmission" : "verification_submitted";
    await sendNotification({type:notifType,record:{...selected,...form},recipients:[rm?.email].filter(Boolean)});
    showToast(toastMsg, form.effectiveness_rating==="Not Effective"?"error":"success");
    setModal(null); onRefresh();
  };

  const getCAP      = (carId) => data.caps?.find(c=>c.car_id===carId); // latest
  const getVerif    = (carId) => data.verifications?.find(v=>v.car_id===carId); // latest
  const getAllCAPs   = (carId) => (data.caps?.filter(c=>c.car_id===carId)||[]).sort((a,b)=>new Date(a.submitted_at||a.created_at)-new Date(b.submitted_at||b.created_at));
  const getAllVerifs = (carId) => (data.verifications?.filter(v=>v.car_id===carId)||[]).sort((a,b)=>new Date(a.verified_at||a.created_at)-new Date(b.verified_at||b.created_at));

  const generateReport = async(car) => {
    const{jsPDF}=await import("jspdf");
    const{default:autoTable}=await import("jspdf-autotable");
    const cap=getCAP(car.id); const verif=getVerif(car.id);
    const allCapsForCar=getAllCAPs(car.id);
    const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const W=210; const margin=14; const col=W-margin*2;

    // ── helpers ──
    const LINE_H=4.5; // line height for 9pt text
    const LABEL_SZ=6.5; const BODY_SZ=9;

    const sectionTitle=(text,y,color=[1,87,155])=>{
      doc.setFillColor(...color); doc.rect(margin,y,col,7,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ+1); doc.setTextColor(255,255,255);
      doc.text(text,margin+3,y+4.8); doc.setTextColor(0,0,0);
      return y+9;
    };

    // Draws a labelled box that auto-sizes to its content. Returns bottom y.
    const box=(label,value,x,y,w)=>{
      doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ);
      const lines=doc.splitTextToSize(String(value||"—"),w-5);
      const textH=lines.length*LINE_H;
      const h=5+4+textH+3; // top-pad + label + text + bottom-pad
      doc.setFillColor(245,248,252); doc.rect(x,y,w,h,"F");
      doc.setDrawColor(221,227,234); doc.rect(x,y,w,h,"S");
      doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
      doc.text(label.toUpperCase(),x+2.5,y+4);
      doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ); doc.setTextColor(26,35,50);
      doc.text(lines,x+2.5,y+4+LINE_H+1);
      return y+h+2;
    };

    // Draws a pair of equal-width boxes on the same row. Returns bottom y.
    const boxRow=(pairs,x,y,totalW)=>{
      const gap=2; const n=pairs.length; const w=(totalW-(n-1)*gap)/n;
      // Calculate the max height needed across all boxes in this row
      let maxH=0;
      pairs.forEach(([,val])=>{
        doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ);
        const lines=doc.splitTextToSize(String(val||"—"),w-5);
        const h=5+4+lines.length*LINE_H+3;
        if(h>maxH) maxH=h;
      });
      pairs.forEach(([label,val],i)=>{
        const bx=x+i*(w+gap);
        doc.setFillColor(245,248,252); doc.rect(bx,y,w,maxH,"F");
        doc.setDrawColor(221,227,234); doc.rect(bx,y,w,maxH,"S");
        doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
        doc.text(label.toUpperCase(),bx+2.5,y+4);
        doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ); doc.setTextColor(26,35,50);
        const lines=doc.splitTextToSize(String(val||"—"),w-5);
        doc.text(lines,bx+2.5,y+4+LINE_H+1);
      });
      return y+maxH+2;
    };

    // ── Page overflow guard ──
    // jsPDF doesn't auto-paginate — we must check before every draw call.
    // usable page height = 287 (leaving room for footer)
    const FOOTER_Y=287; const NEW_PAGE_Y=20;
    const needPage=(currentY,neededH=20)=>{
      if(currentY+neededH>FOOTER_Y){ doc.addPage(); return NEW_PAGE_Y; }
      return currentY;
    };

    const checkRow=(label,ok,x,y,w)=>{
      const bgR=ok?232:245; const bgG=ok?245:248; const bgB=ok?233:252;
      doc.setFillColor(bgR,bgG,bgB); doc.rect(x,y,w,7,"F");
      doc.setDrawColor(221,227,234); doc.rect(x,y,w,7,"S");
      // Use text marker instead of unicode to avoid encoding issues
      doc.setFont("helvetica","bold"); doc.setFontSize(9);
      doc.setTextColor(ok?46:180,ok?125:180,ok?50:180);
      doc.text(ok?"[x]":"[ ]",x+2.5,y+5);
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(26,35,50);
      doc.text(label,x+14,y+5);
      return y+8;
    };

    let y=margin;

    // ── Letterhead ──
    doc.setFillColor(1,87,155); doc.rect(0,0,W,18,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(255,255,255);
    doc.text("AeroQualify Pro",margin,12);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(200,220,255);
    doc.text("CAPA PROGRESS REPORT",margin+52,12);
    doc.text("Pegasus Flyers (E.A.) Ltd.  |  Wilson Airport, Nairobi  |  +254206001467/8",W-margin,9,{align:"right"});
    doc.text("Generated: "+new Date().toLocaleDateString("en-GB"),W-margin,14,{align:"right"});
    y=24;

    // ── CAR Header bar ──
    doc.setFillColor(0,60,113); doc.rect(margin,y,col,10,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
    doc.text("CAR: "+car.id,margin+4,y+7);
    // status pill — right aligned, text only (avoid roundedRect encoding issues)
    const sc={Open:[198,40,40],"In Progress":[230,81,0],"Pending Verification":[69,39,160],Closed:[46,125,50],Overdue:[198,40,40],"Returned for Resubmission":[183,28,28]};
    const sCol=sc[car.status]||[95,114,133];
    doc.setFillColor(...sCol); doc.rect(W-margin-34,y+2,32,6,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(255,255,255);
    doc.text(car.status,W-margin-34+16,y+6.2,{align:"center"});
    y+=14;

    // ── Progress Tracker ──
    doc.setFillColor(245,248,252); doc.rect(margin,y,col,16,"F");
    doc.setDrawColor(221,227,234); doc.rect(margin,y,col,16,"S");
    const isReturned = car.status==="Returned for Resubmission";
    const steps=[
      {label:"CAR RAISED",     done:true,  rejected:false},
      {label:"IN PROGRESS",    done:["In Progress","Pending Verification","Closed","Overdue","Returned for Resubmission"].includes(car.status), rejected:false},
      {label:"PEND. VERIF.",   done:["Pending Verification","Closed","Returned for Resubmission"].includes(car.status), rejected:isReturned},
      {label:"CLOSED",         done:car.status==="Closed", rejected:false},
    ];
    const stepW=col/steps.length;
    steps.forEach((s,i)=>{
      const cx=margin+stepW*i+stepW/2; const cy=y+7;
      // connector line
      if(i<steps.length-1){
        // Connector between IN PROGRESS (i=1) and PEND. VERIF. (i=2) is red when returned
        const isReturnConnector = isReturned && i===1;
        doc.setLineWidth(isReturnConnector?2:1.5);
        if(isReturnConnector){
          doc.setDrawColor(198,40,40);
          doc.line(cx+5,cy,cx+stepW-5,cy);
          // backward arrow text above line
          doc.setFont("helvetica","bold"); doc.setFontSize(6);
          doc.setTextColor(198,40,40);
          doc.text("<< CAP RETURNED",cx+stepW/2,cy-3,{align:"center"});
        } else {
          doc.setDrawColor(s.done?1:210, s.done?87:210, s.done?155:210);
          doc.line(cx+5,cy,cx+stepW-5,cy);
        }
      }
      // circle fill — red if rejected step, blue if done, grey if pending
      if(s.rejected){
        doc.setFillColor(198,40,40);
      } else {
        doc.setFillColor(s.done?1:220, s.done?87:230, s.done?155:240);
      }
      doc.circle(cx,cy,4,"F");
      if(s.rejected){
        doc.setDrawColor(183,28,28);
      } else {
        doc.setDrawColor(s.done?1:200, s.done?87:210, s.done?155:220);
      }
      doc.setLineWidth(0.5); doc.circle(cx,cy,4,"S");
      // marker inside circle
      doc.setFont("helvetica","bold"); doc.setFontSize(6);
      doc.setTextColor(s.done||s.rejected?255:150, 255, s.done&&!s.rejected?255:s.rejected?255:170);
      doc.text(s.rejected?"X":s.done?"OK":"--",cx,cy+2,{align:"center"});
      // label below — red if rejected
      doc.setFont("helvetica","bold"); doc.setFontSize(5.5);
      if(s.rejected){ doc.setTextColor(198,40,40); }
      else { doc.setTextColor(s.done?1:140, s.done?87:150, s.done?155:160); }
      doc.text(s.label,cx,y+15,{align:"center"});
      // extra label under rejected step
      if(s.rejected){
        doc.setFontSize(4.5); doc.setTextColor(198,40,40);
        doc.text("RETURNED",cx,y+19,{align:"center"});
      }
    });
    y+=22;

    // Helper: estimate box height without drawing (used for page overflow checks)
    const estBoxH=(value,w)=>{
      doc.setFont("helvetica","normal"); doc.setFontSize(9);
      const lines=doc.splitTextToSize(String(value||"—"),w-5);
      return Math.max(14,5+4+lines.length*LINE_H+3+2);
    };

    // ── Section 1: CAR Details ──
    y=needPage(y,12);
    y=sectionTitle("SECTION 1 — CORRECTIVE ACTION REQUEST (CAR)",y);
    y=needPage(y,estBoxH(car.finding_description,col)); y=box("Description of Finding",car.finding_description,margin,y,col);
    y=needPage(y,estBoxH(car.qms_clause,col));          y=box("QMS Clause Reference",car.qms_clause,margin,y,col);
    y=needPage(y,14); y=boxRow([["CAR Number",car.id],["Date Raised",fmt(car.date_raised)]],margin,y,col);
    y=needPage(y,14); y=boxRow([["Severity",car.severity],["Status",car.status]],margin,y,col);
    y=needPage(y,14); y=boxRow([["Department",car.department],["Due Date",fmt(car.due_date)]],margin,y,col);
    y=needPage(y,14); y=boxRow([["Responsible Manager",car.responsible_manager],["Raised By",car.raised_by_name]],margin,y,col);
    y+=4;

    // ── Sections 2+3: Loop through ALL CAP submissions and their verifications ──
    // This handles resubmission cycles — each CAP round gets its own section pair.
    if(allCapsForCar.length===0){
      y=needPage(y,12);
      y=sectionTitle("SECTION 2 — CORRECTIVE ACTION PLAN (CAP)",y,[0,105,92]);
      y=needPage(y,14);
      doc.setFillColor(255,243,224); doc.rect(margin,y,col,10,"F");
      doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(230,81,0);
      doc.text("CAP not yet submitted by the responsible manager.",margin+4,y+6.5); y+=12;
      y+=4;
      y=needPage(y,12);
      y=sectionTitle("SECTION 3 — CAPA VERIFICATION",y,[69,39,160]);
      y=needPage(y,14);
      doc.setFillColor(227,242,253); doc.rect(margin,y,col,10,"F");
      doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(1,87,155);
      doc.text("Verification not yet completed by the Quality Manager.",margin+4,y+6.5); y+=12;
      y+=8;
    }

    for(let ci=0;ci<allCapsForCar.length;ci++){
      const thisCap=allCapsForCar[ci];
      const roundNum=ci+1;
      const isLastRound=ci===allCapsForCar.length-1;
      // Find the verification that corresponds to this CAP round
      const allVerifsForCar=getAllVerifs(car.id);
      const thisVerif=allVerifsForCar[ci]||null;

      // Was this CAP returned? Check if there's a next CAP (meaning this one was rejected)
      const wasReturned=!isLastRound;

      // Force a new page before each round after the first — ensures nothing gets clipped
      if(ci>0){ doc.addPage(); y=20; }

      // ── Section 2.N: CAP Submission ──
      y=needPage(y,12);
      const capSectionColor=wasReturned?[183,28,28]:[0,105,92];
      const capSectionLabel=allCapsForCar.length>1
        ?`SECTION 2.${roundNum} — CORRECTIVE ACTION PLAN (SUBMISSION ${roundNum} OF ${allCapsForCar.length})${wasReturned?" — RETURNED FOR RESUBMISSION":""}`
        :"SECTION 2 — CORRECTIVE ACTION PLAN (CAP)";
      y=sectionTitle(capSectionLabel,y,capSectionColor);

      // If returned, show a banner
      if(wasReturned){
        y=needPage(y,12);
        doc.setFillColor(255,235,238); doc.rect(margin,y,col,10,"F");
        doc.setDrawColor(198,40,40); doc.rect(margin,y,col,10,"S");
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(198,40,40);
        doc.text("! This CAP submission was reviewed and RETURNED FOR RESUBMISSION by the Quality Manager.",margin+4,y+6.5);
        y+=12;
      }

      const cap2Fields=[
        ["Immediate Corrective Action",thisCap.immediate_action],
        ["Root Cause Analysis",thisCap.root_cause_analysis],
        ["Corrective Action",thisCap.corrective_action],
        ["Preventive Action",thisCap.preventive_action],
      ];
      // eslint-disable-next-line no-loop-func
      cap2Fields.forEach(([label,val])=>{
        y=needPage(y,estBoxH(val,col));
        y=box(label,val,margin,y,col);
      });

      // Evidence files for this CAP submission
      let evFiles2=[];
      try{evFiles2=JSON.parse(thisCap.evidence_files||"[]");}catch{}
      if(!thisCap.evidence_files&&thisCap.evidence_filename) evFiles2=[{name:thisCap.evidence_filename,url:thisCap.evidence_url}];
      const evVal=evFiles2.length>0
        ?evFiles2.map((f,i)=>`${i+1}. ${f.name}`).join("\n")
        :"— No evidence uploaded";
      y=needPage(y,estBoxH(evVal,col)+4);
      y=box(`Evidence Files (${evFiles2.length} file${evFiles2.length!==1?"s":""})`,evVal,margin,y,col);
      // eslint-disable-next-line no-loop-func
      evFiles2.forEach(f=>{
        if(f.url&&!f.url.startsWith("data:")){
          y=needPage(y,6);
          doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(1,87,155);
          doc.textWithLink("  Open: "+f.name,margin+2.5,y-1,{url:f.url});
          doc.setTextColor(0,0,0); y+=4;
        }
      });
      y=needPage(y,14);
      y=boxRow([["Submitted By",thisCap.submitted_by_name||"—"],["Submitted At",thisCap.submitted_at?new Date(thisCap.submitted_at).toLocaleString():"—"]],margin,y,col);
      y+=4;

      // ── Section 3.N: Verification for this round ──
      y=needPage(y,12);
      const verifSectionLabel=allCapsForCar.length>1
        ?`SECTION 3.${roundNum} — VERIFICATION OF SUBMISSION ${roundNum}${wasReturned?" (CAP RETURNED)":""}`
        :"SECTION 3 — CAPA VERIFICATION";
      const verifColor=wasReturned?[183,28,28]:[69,39,160];
      y=sectionTitle(verifSectionLabel,y,verifColor);

      if(thisVerif){
        // If this verif resulted in a return, show banner
        if(wasReturned){
          y=needPage(y,12);
          doc.setFillColor(255,235,238); doc.rect(margin,y,col,10,"F");
          doc.setDrawColor(198,40,40); doc.rect(margin,y,col,10,"S");
          doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(198,40,40);
          doc.text("Quality Manager reviewed this submission and returned it for resubmission.",margin+4,y+6.5);
          y+=12;
        }
        const checks=[
          ["Immediate action was adequate and implemented",thisVerif.immediate_action_ok],
          ["Root cause has been correctly identified",thisVerif.root_cause_ok],
          ["Corrective action addresses the root cause",thisVerif.corrective_action_ok],
          ["Preventive action prevents recurrence",thisVerif.preventive_action_ok],
          ["Evidence of closure is satisfactory",thisVerif.evidence_ok],
          ["Recurrence of the finding is prevented",thisVerif.recurrence_prevented],
        ];
        // eslint-disable-next-line no-loop-func
        checks.forEach(([label,ok])=>{ y=needPage(y,9); y=checkRow(label,ok,margin,y,col); });
        y+=2;
        y=needPage(y,14); y=boxRow([["Effectiveness Rating",thisVerif.effectiveness_rating||"—"],["Final Status",thisVerif.status||"—"]],margin,y,col);
        y=needPage(y,14); y=boxRow([["Verified By",thisVerif.verified_by_name||"—"],["Verified At",thisVerif.verified_at?new Date(thisVerif.verified_at).toLocaleString():"—"]],margin,y,col);
        if(thisVerif.verifier_comments){ y=needPage(y,estBoxH(thisVerif.verifier_comments,col)); y=box("Verifier Comments",thisVerif.verifier_comments,margin,y,col); }
      } else if(!isLastRound){
        // No verif yet for this round but there's a next round (shouldn't happen but handle gracefully)
        y=needPage(y,14);
        doc.setFillColor(227,242,253); doc.rect(margin,y,col,10,"F");
        doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(1,87,155);
        doc.text("Verification record not found for this submission.",margin+4,y+6.5); y+=12;
      } else {
        y=needPage(y,14);
        doc.setFillColor(227,242,253); doc.rect(margin,y,col,10,"F");
        doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(1,87,155);
        doc.text("Verification not yet completed by the Quality Manager.",margin+4,y+6.5); y+=12;
      }
      y+=8;
    }

    // ── Signature Section ──
    y=needPage(y,50);
    y=sectionTitle("SIGNATURES",y,[26,35,50]);
    const sigW=(col-6)/2;
    const qm=managers?.find(m=>m.role_title==="Quality Manager");
    const am=managers?.find(m=>m.role_title==="Accountable Manager");
    [[margin,"QUALITY MANAGER",qm?.person_name],[margin+sigW+6,"ACCOUNTABLE MANAGER",am?.person_name]].forEach(([sx,role,name])=>{
      doc.setFillColor(255,255,255); doc.rect(sx,y,sigW,34,"F");
      doc.setDrawColor(221,227,234); doc.rect(sx,y,sigW,34,"S");
      doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
      doc.text(role,sx+3,y+5);
      doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(26,35,50);
      doc.text(name||"",sx+3,y+12);
      doc.setDrawColor(180,190,200); doc.setLineWidth(0.3);
      doc.line(sx+3,y+22,sx+sigW-4,y+22);
      doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
      doc.text("Signature",sx+3,y+26);
      doc.line(sx+3,y+30,sx+sigW-4,y+30);
      doc.text("Date",sx+3,y+33.5);
    });
    y+=40;

    // ── Attach all evidence files as final pages ──────────────────
    // Collect from ALL cap submissions (resubmissions included), deduplicated by name
    let pdfEvidenceFiles=[];
    const seenKeys=new Set();
    for(const c of allCapsForCar){
      let files=[];
      try{files=JSON.parse(c.evidence_files||"[]");}catch{}
      if(!c.evidence_files&&c.evidence_filename) files=[{name:c.evidence_filename,url:c.evidence_url}];
      console.log("[PDF EVIDENCE] CAP",c.id,"has",files.length,"files:",files.map(f=>f.name));
      for(const f of files){
        const key=f.name||f.url||"";
        if(!seenKeys.has(key)&&(f.url||f.name)){seenKeys.add(key);pdfEvidenceFiles.push(f);}
      }
    }
    console.log("[PDF EVIDENCE] Total evidence files to attach:",pdfEvidenceFiles.length, pdfEvidenceFiles.map(f=>({name:f.name,hasUrl:!!f.url})));
    // fallback: if no allCaps data, try single cap
    if(pdfEvidenceFiles.length===0){
      try{pdfEvidenceFiles=JSON.parse(cap?.evidence_files||"[]");}catch{}
      if(!cap?.evidence_files&&cap?.evidence_filename) pdfEvidenceFiles=[{name:cap.evidence_filename,url:cap.evidence_url}];
    }

    // Track which jsPDF page numbers are evidence pages (for footer labelling)
    const reportPageCount = doc.getNumberOfPages(); // pages before any evidence
    const evidencePageMap = {}; // pageNum → {fileIndex, fileName, fileTotal}

    for(let fi=0;fi<pdfEvidenceFiles.length;fi++){
      const evFile=pdfEvidenceFiles[fi];
      if(!evFile?.url&&!evFile?.name) continue;
      try{
        const ext=(evFile.name.split(".").pop()||"").toLowerCase();
        const isImage=["jpg","jpeg","png","gif","webp"].includes(ext);
        const isInline=evFile.url&&evFile.url.startsWith("data:");
        const isPDF=ext==="pdf";

        // Helper to draw the standard evidence page header
        const drawEvHeader=()=>{
          doc.addPage();
          const pg=doc.getNumberOfPages();
          evidencePageMap[pg]={fileIndex:fi+1,fileName:evFile.name,fileTotal:pdfEvidenceFiles.length};
          doc.setFillColor(26,35,50); doc.rect(0,0,W,18,"F");
          doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
          doc.text(`EVIDENCE OF CLOSURE — File ${fi+1} of ${pdfEvidenceFiles.length}`,margin,8);
          doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(200,210,220);
          doc.text(evFile.name,W-margin,8,{align:"right"});
          doc.setFontSize(7); doc.setTextColor(160,180,200);
          doc.text(`CAR: ${car.id}  |  Evidence of Closure`,margin,14);
          return doc.getNumberOfPages();
        };

        if(isImage){
          // ── Images: embed directly (works for both inline data: and remote URLs) ──
          let dataUrl=evFile.url;
          if(!isInline){
            const resp=await fetch(evFile.url);
            if(!resp.ok) throw new Error("fetch failed");
            const blob=await resp.blob();
            dataUrl=await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsDataURL(blob);});
          }
          drawEvHeader();
        const imgTop=22; const imgBottom=284;
          const maxW=W-margin*2; const maxH=imgBottom-imgTop;
          const imgProps=doc.getImageProperties(dataUrl);
          let iw=imgProps.width; let ih=imgProps.height;
          const scale=Math.min(maxW/iw,maxH/ih,1);
          iw*=scale; ih*=scale;
          doc.addImage(dataUrl,ext==="png"?"PNG":"JPEG",margin+(maxW-iw)/2,imgTop+(maxH-ih)/2,iw,ih);

        } else if(isPDF){
          // ── PDF files: merge using pdf-lib (works for both inline and remote) ──
          try{
            if(!window._pdfMergeQueue) window._pdfMergeQueue=[];
            let bytes;
            if(isInline){
              // Convert base64 data URL to ArrayBuffer
              const base64=evFile.url.split(",")[1];
              const binary=atob(base64);
              bytes=new Uint8Array(binary.length);
              for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
              bytes=bytes.buffer;
            } else {
              const resp=await fetch(evFile.url);
              if(!resp.ok) throw new Error("fetch failed");
              bytes=await resp.arrayBuffer();
            }
            window._pdfMergeQueue.push({
              name:evFile.name, bytes,
              index:fi+1, total:pdfEvidenceFiles.length, carId:car.id
            });
          } catch(e){
            // Fallback: reference page with note
            drawEvHeader();
            doc.setFillColor(245,248,252); doc.rect(margin,24,col,40,"F");
            doc.setDrawColor(221,227,234); doc.rect(margin,24,col,40,"S");
            doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(26,35,50);
            doc.text("PDF Evidence: "+evFile.name,margin+4,36);
            doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(95,114,133);
            doc.text("This PDF evidence file could not be embedded automatically.",margin+4,46);
            doc.text("Please retrieve it from AeroQualify Pro to view the full document.",margin+4,54);
          }

        } else {
          // ── Other files (docx, xlsx, txt etc): show a formatted evidence page ──
          // We cannot render Word/Excel inside a PDF, so we show a clear evidence record page
          drawEvHeader();
          // Evidence record box
          doc.setFillColor(245,248,252); doc.rect(margin,24,col,80,"F");
          doc.setDrawColor(221,227,234); doc.rect(margin,24,col,80,"S");
          // File type badge
          const badgeColors={"docx":[0,120,215],"doc":[0,120,215],"xlsx":[33,115,70],"xls":[33,115,70],"txt":[95,114,133]};
          const bc=badgeColors[ext]||[95,114,133];
          doc.setFillColor(...bc); doc.rect(margin+4,28,18,8,"F");
          doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(255,255,255);
          doc.text(ext.toUpperCase(),margin+13,33.5,{align:"center"});
          // File name
          doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(26,35,50);
          doc.text(evFile.name,margin+26,34);
          // Divider
          doc.setDrawColor(221,227,234); doc.setLineWidth(0.3);
          doc.line(margin+4,40,margin+col-4,40);
          // Details
          doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(55,71,79);
          doc.text("File Type:",margin+4,50); doc.setFont("helvetica","bold"); doc.text(ext.toUpperCase()+" Document",margin+40,50);
          doc.setFont("helvetica","normal");
          doc.text("Evidence For:",margin+4,60); doc.setFont("helvetica","bold"); doc.text("CAR: "+car.id,margin+40,60);
          doc.setFont("helvetica","normal");
          doc.text("Submission:",margin+4,70); doc.setFont("helvetica","bold");
          const capForFile=allCapsForCar.find(c=>{
            let fs=[];try{fs=JSON.parse(c.evidence_files||"[]");}catch{}
            if(!c.evidence_files&&c.evidence_filename) fs=[{name:c.evidence_filename}];
            return fs.some(f=>f.name===evFile.name);
          });
          doc.text(capForFile?`CAP submitted ${new Date(capForFile.submitted_at).toLocaleDateString("en-GB")} by ${capForFile.submitted_by_name||"—"}`:"—",margin+40,70);
          doc.setFont("helvetica","normal");
          // Note about file type
          doc.setFillColor(255,243,224); doc.rect(margin+4,78,col-8,18,"F");
          doc.setDrawColor(255,152,0); doc.rect(margin+4,78,col-8,18,"S");
          doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(230,81,0);
          doc.text("Note:",margin+8,86);
          doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(55,71,79);
          doc.text(`This ${ext.toUpperCase()} file cannot be rendered inside a PDF. The document has been logged as evidence.`,margin+22,86);
          doc.text("Access the original file through AeroQualify Pro CAPA module for full document review.",margin+8,92);
          // If it has a remote URL, add a clickable link
          if(evFile.url&&!isInline){
            doc.setTextColor(1,87,155);
            doc.textWithLink("Click here to open the original file",margin+4,106,{url:evFile.url});
          }
        }
      } catch(evErr){ console.warn("Evidence page failed for",evFile.name,evErr); }
    }

    // ── Footer on every page — evidence pages get special labelling ──
    const totalPagesBeforeMerge=doc.getNumberOfPages();
    for(let p=1;p<=totalPagesBeforeMerge;p++){
      doc.setPage(p);
      const isEvPage=p>reportPageCount;
      const evInfo=evidencePageMap[p];
      // Footer bar
      doc.setFillColor(isEvPage?26:245, isEvPage?35:248, isEvPage?50:252);
      doc.rect(0,287,W,10,"F");
      doc.setDrawColor(isEvPage?60:221, isEvPage?80:227, isEvPage?100:234);
      doc.setLineWidth(0.3); doc.line(0,287,W,287);
      doc.setFont("helvetica","normal"); doc.setFontSize(7);
      doc.setTextColor(isEvPage?200:95, isEvPage?210:114, isEvPage?220:133);
      if(isEvPage&&evInfo){
        // Evidence page footer -- clearly labelled
        doc.setFont("helvetica","bold");
        doc.text(`EVIDENCE OF CLOSURE  |  File ${evInfo.fileIndex} of ${evInfo.fileTotal}  |  ${evInfo.fileName}`,margin,293);
        doc.setFont("helvetica","normal");
      } else {
        doc.text("Pegasus Flyers (E.A.) Ltd.  |  Confidential QMS Document  |  AS9100D / ISO 9001:2015",margin,293);
      }
      doc.text("Page "+p+" of "+totalPagesBeforeMerge,W-margin,293,{align:"right"});
    }

    // ── Merge queued PDF evidence files via pdf-lib ──
    if(window._pdfMergeQueue?.length>0){
      try{
        const{PDFDocument}=await import("pdf-lib");
        const{rgb,StandardFonts}=await import("pdf-lib");
        const mainBytes=doc.output("arraybuffer");
        const mainPdf=await PDFDocument.load(mainBytes);
        const boldFont=await mainPdf.embedFont(StandardFonts.HelveticaBold);
        const normFont=await mainPdf.embedFont(StandardFonts.Helvetica);
        const dark=rgb(0.1,0.14,0.2);
        const white=rgb(1,1,1);
        const light=rgb(0.78,0.82,0.86);
        const muted=rgb(0.63,0.71,0.78);

        // ── Pass 1: add all pages to mainPdf, track page ranges ──
        // Structure: [{pageIndex, fileIndex, fileTotal, fileName, carId, evPageNum, evPageTotal}]
        const evidencePageMeta=[];

        for(const q of window._pdfMergeQueue){
          // Divider page
          mainPdf.addPage([595,842]);
          evidencePageMeta.push({pageIndex:mainPdf.getPageCount()-1,isDivider:true,
            fileIndex:q.index,fileTotal:q.total,fileName:q.name,carId:q.carId});

          // Evidence pages
          const evPdf=await PDFDocument.load(q.bytes);
          const evPageCount=evPdf.getPageCount();
          const copied=await mainPdf.copyPages(evPdf,Array.from({length:evPageCount},(_,i)=>i));
          copied.forEach((pg,pi)=>{
            mainPdf.addPage(pg);
            evidencePageMeta.push({pageIndex:mainPdf.getPageCount()-1,isDivider:false,
              fileIndex:q.index,fileTotal:q.total,fileName:q.name,carId:q.carId,
              evPageNum:pi+1,evPageTotal:evPageCount});
          });
        }
        window._pdfMergeQueue=[];

        // ── Pass 2: now we know total page count -- stamp every evidence page ──
        const totalPages=mainPdf.getPageCount();
        const pages=mainPdf.getPages();

        evidencePageMeta.forEach(meta=>{
          const pg=pages[meta.pageIndex];
          const {width,height}=pg.getSize();
          const docPageNum=meta.pageIndex+1; // 1-based

          if(meta.isDivider){
            // Full dark divider page
            pg.drawRectangle({x:0,y:0,width,height,color:rgb(0.08,0.11,0.17)});
            // Centre label
            pg.drawRectangle({x:40,y:height/2-30,width:width-80,height:60,color:dark,borderRadius:4});
            pg.drawText("EVIDENCE OF CLOSURE",{x:width/2-100,y:height/2+12,size:16,font:boldFont,color:white});
            pg.drawText(`File ${meta.fileIndex} of ${meta.fileTotal}  —  ${meta.fileName}`,
              {x:width/2-100,y:height/2-4,size:9,font:normFont,color:light,maxWidth:width-80});
            pg.drawText(`CAR: ${meta.carId}`,{x:width/2-100,y:height/2-18,size:8,font:normFont,color:muted});
            // Footer
            pg.drawRectangle({x:0,y:0,width,height:18,color:dark});
            pg.drawText(`EVIDENCE OF CLOSURE  |  File ${meta.fileIndex} of ${meta.fileTotal}  |  ${meta.fileName}`,
              {x:14,y:6,size:6,font:boldFont,color:light,maxWidth:width-80});
            pg.drawText(`Page ${docPageNum} of ${totalPages}`,{x:width-60,y:6,size:6,font:normFont,color:light});
          } else {
            // Evidence content page -- stamp header + footer over existing content
            // Header bar
            pg.drawRectangle({x:0,y:height-16,width,height:16,color:dark});
            pg.drawText(`EVIDENCE OF CLOSURE  —  File ${meta.fileIndex} of ${meta.fileTotal}`,
              {x:8,y:height-10,size:8,font:boldFont,color:white});
            // Filename right-aligned (truncate if long)
            const fname=meta.fileName.length>40?meta.fileName.slice(0,37)+"…":meta.fileName;
            pg.drawText(fname,{x:width-8-fname.length*4.2,y:height-10,size:7,font:normFont,color:light});
            pg.drawText(`CAR: ${meta.carId}  |  Evidence page ${meta.evPageNum} of ${meta.evPageTotal}`,
              {x:8,y:height-15,size:5.5,font:normFont,color:muted});
            // Footer bar
            pg.drawRectangle({x:0,y:0,width,height:14,color:dark});
            pg.drawText(`EVIDENCE OF CLOSURE  |  File ${meta.fileIndex} of ${meta.fileTotal}  |  ${meta.fileName}`,
              {x:8,y:5,size:6,font:boldFont,color:light,maxWidth:width-80});
            pg.drawText(`Page ${docPageNum} of ${totalPages}`,{x:width-60,y:5,size:6,font:normFont,color:light});
          }
        });

        const merged=await mainPdf.save();
        const url=URL.createObjectURL(new Blob([merged],{type:"application/pdf"}));
        const a=document.createElement("a"); a.href=url; a.download=`CAPA-Report-${car.id}.pdf`;
        a.click(); URL.revokeObjectURL(url);
        showToast("PDF report with all evidence generated","success");
        return;
      } catch(mergeErr){
        console.warn("PDF merge failed:",mergeErr);
        window._pdfMergeQueue=[];
        // Fall through to doc.save() below
      }
    }

    doc.save(`CAPA-Report-${car.id}.pdf`);
    showToast("PDF report generated","success");
  };

  const generateStatusReport = async() => {
    const{jsPDF}=await import("jspdf");
    const{default:autoTable}=await import("jspdf-autotable");
    const doc=new jsPDF("landscape");

    doc.setDrawColor(1,87,155); doc.setLineWidth(0.8); doc.line(14,30,270,30);
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(1,87,155);
    doc.text("CAPA STATUS REPORT",14,38);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(100,100,100);
    doc.text("Pegasus Flyers (E.A.) Ltd. · "+`Generated: ${new Date().toLocaleDateString("en-GB")}  |  Total CARs: ${data.cars.length}`,14,44);
    doc.setTextColor(0,0,0);
    autoTable(doc,{startY:50,head:[["CAR #","Severity","Status","Department","Raised","Due","Resp. Manager"]],
      body:data.cars.map(c=>[c.id,c.severity,c.status,c.department||"—",fmt(c.date_raised),fmt(c.due_date),c.responsible_manager||"--"]),
      styles:{fontSize:9},headStyles:{fillColor:[1,87,155]},
      alternateRowStyles:{fillColor:[245,248,252]},
    });
    doc.save(`CAPA-Status-Report-${new Date().toISOString().slice(0,10)}.pdf`);
    showToast("Status report generated","success");
  };

  return (
    <div>
      <SectionHeader
        title="Corrective Action Requests"
        subtitle="CARs raised by Quality Manager or Quality Auditor"
        action={
          <div style={{ display:"flex", gap:10 }}>
            <Btn variant="outline" size="sm" onClick={generateStatusReport}>📊 Status Report</Btn>
            {canRaiseCAR&&<Btn size="sm" onClick={()=>{setSelected(null);setModal("car")}}>+ Raise CAR</Btn>}
          </div>
        }
      />
      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {["all","Open","In Progress","Pending Verification","Returned for Resubmission","Closed","Overdue"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:"5px 14px", borderRadius:20, border:`1px solid ${filter===f?T.primary:T.border}`, background:filter===f?T.primary:"#fff", color:filter===f?"#fff":T.muted, fontSize:12, fontWeight:filter===f?600:400, cursor:"pointer" }}>
            {f==="all"?"All":f}
          </button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search CARs…"
          style={{ marginLeft:"auto", background:"#fff", border:`1px solid ${T.border}`, borderRadius:7, padding:"6px 14px", fontSize:12, width:220, color:T.text }} />
      </div>

      {/* Table */}
      <div className="card" style={{ overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f5f8fc" }}>
              {["CAR #","Finding","Clause","Severity","Status","Dept","Due Date","Resp. Manager","Actions"].map(h=>(
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:T.muted, fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0
              ? <tr><td colSpan={9} style={{ padding:32, textAlign:"center", color:T.muted }}>No CARs found</td></tr>
              : filtered.map(c=>{
                const od=isOverdue(c.due_date)&&!["Closed","Completed"].includes(c.status); const cap=getCAP(c.id); const verif=getVerif(c.id);
                return (
                  <tr key={c.id} className="row-hover" style={{ borderBottom:`1px solid ${T.border}`, background:od&&c.status!=="Closed"?"#fff8f8":"" }}>
                    <td style={{ padding:"10px 14px", fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11, fontWeight:600 }}>{c.id}</td>
                    <td style={{ padding:"10px 14px", maxWidth:220 }}>
                      <div className="tooltip-wrap">
                        <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:T.text, maxWidth:210 }}>{c.finding_description}</div>
                        <div className="tooltip-box"><strong style={{color:"#90caf9"}}>Finding:</strong><br/>{c.finding_description}</div>
                      </div>
                    </td>
                    <td style={{ padding:"10px 14px", maxWidth:160 }}>
                      <div className="tooltip-wrap">
                        <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"'Source Code Pro',monospace", fontSize:11, color:T.muted, maxWidth:150 }}>{c.qms_clause||"—"}</div>
                        {c.qms_clause&&<div className="tooltip-box"><strong style={{color:"#90caf9"}}>QMS Clause:</strong><br/>{c.qms_clause}</div>}
                      </div>
                    </td>
                    <td style={{ padding:"10px 14px" }}><Badge label={c.severity}/></td>
                    <td style={{ padding:"10px 14px" }}><Badge label={c.status}/></td>
                    <td style={{ padding:"10px 14px", color:T.muted, fontSize:12 }}>{c.department||"--"}</td>
                    <td style={{ padding:"10px 14px", color:od?T.red:T.text, fontSize:12, fontWeight:od?600:400 }}>{fmt(c.due_date)}{od?` ⚠`:""}</td>
                    <td style={{ padding:"10px 14px", color:T.muted, fontSize:12 }}>{c.responsible_manager||"--"}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        {canRaiseCAR&&<Btn size="sm" variant="ghost" onClick={()=>{setSelected(c);setModal("car")}}>Edit</Btn>}
                        <Btn size="sm" variant="outline" onClick={()=>{setSelected(c);setModal("detail")}} style={{color:T.teal,borderColor:T.teal}}>View</Btn>
                        {c.status!=="Closed"&&<Btn size="sm" variant="outline" onClick={()=>{setSelected(c);setModal("cap")}}>CAP</Btn>}
                        {c.status==="Pending Verification"&&["admin","quality_manager"].includes(profile?.role)&&
                          <Btn size="sm" variant="success" onClick={()=>{setSelected(c);setModal("verify")}}>Verify</Btn>}
                        {(cap||verif)&&<Btn size="sm" variant="ghost" onClick={()=>generateReport(c)}>📄 PDF</Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {modal==="car"&&<CARModal car={selected} managers={managers} onSave={saveCar} onClose={()=>setModal(null)} allCars={data.cars||[]} auditSchedule={data.auditSchedule||[]} orgPrefix={org?.car_prefix||"ORG"} auditAreas={org?.audit_areas||null} />}
      {modal==="cap"&&selected&&<CAPModal car={selected} cap={getCAP(selected.id)} onSave={saveCap} onClose={()=>setModal(null)} data={data} user={user} profile={profile} managers={managers} showToast={showToast}/>}
      {modal==="verify"&&selected&&<VerificationModal car={selected} cap={getCAP(selected.id)} verif={getVerif(selected.id)} onSave={saveVerification} onClose={()=>setModal(null)} />}
      {modal==="detail"&&selected&&<CAPADetailModal car={selected} cap={getCAP(selected.id)} verif={getVerif(selected.id)} allCaps={getAllCAPs(selected.id)} allVerifs={getAllVerifs(selected.id)} onPDF={()=>generateReport(selected)} onClose={()=>setModal(null)} />}
    </div>
  );
};

// ─── Generic Table Page ───────────────────────────────────────
const GenericPage = ({ title, subtitle, table, columns, modalFields, modalTitle, modalDefaults, data, canEdit, canDelete, user, profile, onRefresh, showToast, extraActions }) => {
  const [modal,  setModal]  = useState(false);
  const [editing,setEditing]= useState(null);
  const [search, setSearch] = useState("");
  const rows = (data[table]||[]).filter(r=>!search||JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  const save = async(form) => {
    const isNew = !data[table]?.find(r=>r.id===form.id);
    const payload={...form,updated_at:new Date().toISOString()};
    if(isNew){
      payload.created_by=user.id; payload.updated_by=user.id;
      const{error}=await supabase.from(table).insert(payload);
      if(error){showToast(`Error: ${error.message}`,"error");return;}
      await logChange({user,action:"created",table,recordId:form.id,recordTitle:form.title||form.name||form.id,newData:form});
      showToast("Record created","success");
    } else {
      payload.updated_by=user.id;
      const{error}=await supabase.from(table).update(payload).eq("id",form.id);
      if(error){showToast(`Error: ${error.message}`,"error");return;}
      await logChange({user,action:"updated",table,recordId:form.id,recordTitle:form.title||form.name||form.id,newData:form});
      showToast("Record updated","success");
    }
    setModal(false); setEditing(null); onRefresh();
  };

  const del = async(row) => {
    if(!window.confirm(`Delete ${row.id}?`)) return;
    const{error}=await supabase.from(table).delete().eq("id",row.id);
    if(error){showToast(`Error: ${error.message}`,"error");return;}
    await logChange({user,action:"deleted",table,recordId:row.id,recordTitle:row.title||row.name||row.id,oldData:row});
    showToast("Record deleted","info"); onRefresh();
  };

  return (
    <div>
      <SectionHeader title={title} subtitle={subtitle}
        action={
          <div style={{ display:"flex", gap:10 }}>
            {extraActions}
            {canEdit&&<Btn size="sm" onClick={()=>{setEditing(null);setModal(true)}}>+ Add New</Btn>}
          </div>
        }
      />
      <div style={{ marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`}
          style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:7, padding:"7px 14px", fontSize:12, width:280, color:T.text }} />
      </div>
      <div className="card" style={{ overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f5f8fc" }}>
              {columns.map(c=><th key={c.key} style={{ padding:"10px 14px", textAlign:"left", color:T.muted, fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>{c.label}</th>)}
              {(canEdit||canDelete)&&<th style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}`, width:100 }} />}
            </tr>
          </thead>
          <tbody>
            {rows.length===0
              ? <tr><td colSpan={columns.length+1} style={{ padding:32, textAlign:"center", color:T.muted }}>No records found</td></tr>
              : rows.map((row,i)=>{
                const due=row.due_date||row.expiry_date||row.next_audit||row.date;
                const DONE=["Closed","Approved","Completed","Cancelled","Expired"]; const od=isOverdue(due)&&!DONE.includes(row.status);
                return (
                  <tr key={row.id||i} className="row-hover" style={{ borderBottom:`1px solid ${T.border}`, background:od?"#fff8f8":"" }}>
                    {columns.map(c=>(
                      <td key={c.key} style={{ padding:"10px 14px", color:T.text, verticalAlign:"middle" }}>
                        {c.badge ? <Badge label={row[c.key]} /> :
                         c.mono  ? <span style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11, fontWeight:600 }}>{row[c.key]}</span> :
                         c.due   ? <span style={{ color:od?T.red:(isApproaching(due)&&!DONE.includes(row.status))?T.yellow:T.text, fontWeight:od||(isApproaching(due)&&!DONE.includes(row.status))?600:400 }}>{fmt(row[c.key])}{od?" ⚠":""}</span> :
                         <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:c.wrap?"normal":"nowrap", maxWidth:240 }}>{row[c.key]||"--"}</span>}
                      </td>
                    ))}
                    {(canEdit||canDelete)&&(
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", gap:5 }}>
                          {canEdit&&<Btn size="sm" variant="ghost" onClick={()=>{setEditing(row);setModal(true)}}>Edit</Btn>}
                          {canDelete&&<Btn size="sm" variant="danger" onClick={()=>del(row)} style={{ padding:"4px 10px", fontSize:11 }}>✕</Btn>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {modal&&(
        <GenericModal title={(editing?"Edit ":"New ")+modalTitle} fields={modalFields} defaults={editing||modalDefaults||{}} onSave={save} onClose={()=>{setModal(false);setEditing(null);}} />
      )}
    </div>
  );
};

// ─── Generic Modal ────────────────────────────────────────────
const GenericModal = ({ title, fields, defaults, onSave, onClose }) => {
  const [form, setForm] = useState(defaults||{});
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  return (
    <ModalShell title={title} onClose={onClose} wide>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
        {fields.map(f=>(
          <div key={f.key} style={{ gridColumn:f.full?"1/-1":"auto" }}>
            {f.type==="select"
              ? <Select label={f.label} value={form[f.key]||""} onChange={e=>set(f.key,e.target.value)}><option value="">Select…</option>{f.options.map(o=><option key={o}>{o}</option>)}</Select>
              : f.type==="textarea"
              ? <Textarea label={f.label} value={form[f.key]||""} onChange={e=>set(f.key,e.target.value)} />
              : <Input label={f.label} type={f.type||"text"} value={form[f.key]||""} onChange={e=>set(f.key,e.target.value)} />
            }
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{onSave(form);onClose();}}>Save</Btn>
      </div>
    </ModalShell>
  );
};

// ─── Managers Settings Page ───────────────────────────────────
const ManagersPage = ({ managers, onRefresh, showToast, isAdmin }) => {
  const [editing, setEditing] = useState(null);
  const save = async(mgr) => {
    const{error}=await supabase.from(TABLES.managers).update({person_name:mgr.person_name,email:mgr.email,updated_at:new Date().toISOString()}).eq("id",mgr.id);
    if(error){showToast(`Error: ${error.message}`,"error");return;}
    showToast("Manager updated","success"); setEditing(null); onRefresh();
  };
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [usersTab, setUsersTab] = useState("pending");

  useEffect(()=>{
    if(!isAdmin) return;
    supabase.from("profiles").select("*").order("created_at",{ascending:false}).then(({data})=>{
      if(data){ setPendingUsers(data.filter(u=>u.status==="pending"||!u.status)); setAllUsers(data); }
    });
  },[isAdmin]);

  const approveUser = async(userId, role="viewer") => {
    const{error}=await supabase.from("profiles").update({status:"approved",role}).eq("id",userId);
    if(error){showToast("Error: "+error.message,"error");return;}
    // Send approval email to the user
    const approvedU = [...pendingUsers,...allUsers].find(u=>u.id===userId);
    if(approvedU?.email){
      // Fetch org details using the user's org_id
      const { data: orgInfo } = await supabase
        .from("organisations")
        .select("name,slug")
        .eq("id", approvedU.org_id)
        .single();
      await sendNotification({
        type: "user_approved",
        record: {
          full_name: approvedU.full_name || approvedU.email.split("@")[0],
          email: approvedU.email,
          org_name: orgInfo?.name || "",
          org_id: orgInfo?.slug || "",
          role: role.replace(/_/g," "),
          app_url: "https://aeroqualify.co.ke",
        },
        recipients: [approvedU.email],
      });
    }
    showToast("User approved — confirmation email sent","success");
    setPendingUsers(p=>p.filter(u=>u.id!==userId));
    setAllUsers(p=>p.map(u=>u.id===userId?{...u,status:"approved",role}:u));
  };

  const revokeUser = async(userId) => {
    const{error}=await supabase.from("profiles").update({status:"pending"}).eq("id",userId);
    if(error){showToast("Error: "+error.message,"error");return;}
    showToast("User access revoked","success");
    setAllUsers(p=>p.map(u=>u.id===userId?{...u,status:"pending"}:u));
    setPendingUsers(p=>[...p,allUsers.find(u=>u.id===userId)].filter(Boolean));
  };

  return (
    <div>
      <SectionHeader title="Responsible Managers" subtitle="Assign names and email addresses to each role" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {managers.map(m=>(
          <Card key={m.id}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:14, color:T.primaryDk }}>{m.role_title}</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{m.department}</div>
              </div>
              {isAdmin&&<Btn size="sm" variant="ghost" onClick={()=>setEditing({...m})}>Edit</Btn>}
            </div>
            <div style={{ marginTop:12, borderTop:`1px solid ${T.border}`, paddingTop:12 }}>
              <div style={{ fontSize:13, color:m.person_name?T.text:T.muted }}>{m.person_name||"— Name not set —"}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>{m.email||"— Email not set --"}</div>
            </div>
          </Card>
        ))}
      </div>
      {isAdmin&&(
        <div style={{ marginTop:32 }}>
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:18, color:T.primaryDk, marginBottom:4 }}>User Access Management</div>
          <div style={{ fontSize:13, color:T.muted, marginBottom:16 }}>Approve or revoke access for registered users</div>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {["pending","all"].map(tab=>(
              <button key={tab} onClick={()=>setUsersTab(tab)}
                style={{ padding:"7px 18px", borderRadius:7, border:`1px solid ${usersTab===tab?T.primary:T.border}`, background:usersTab===tab?T.primary:"#fff", color:usersTab===tab?"#fff":T.muted, fontWeight:600, fontSize:12, cursor:"pointer" }}>
                {tab==="pending"?`Pending Approval${pendingUsers.length>0?` (${pendingUsers.length})`:""}` : "All Users"}
              </button>
            ))}
          </div>
          <div className="card" style={{ padding:0, overflow:"hidden" }}>
            {(usersTab==="pending"?pendingUsers:allUsers).length===0?(
              <div style={{ padding:24, textAlign:"center", color:T.muted, fontSize:13 }}>
                {usersTab==="pending"?"No accounts pending approval":"No users registered yet"}
              </div>
            ):(
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Email","Name","Role","Status","Joined","Actions"].map(h=>(
                      <th key={h} style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}`, textAlign:"left", fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(usersTab==="pending"?pendingUsers:allUsers).map(u=>(
                    <tr key={u.id} className="row-hover">
                      <td style={{ padding:"10px 14px", fontSize:13, color:T.text, borderBottom:`1px solid ${T.border}` }}>{u.email||"—"}</td>
                      <td style={{ padding:"10px 14px", fontSize:13, color:T.text, borderBottom:`1px solid ${T.border}` }}>{u.full_name||"—"}</td>
                      <td style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}` }}><Badge label={u.role||"—"}/></td>
                      <td style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}` }}>
                        <span style={{ background:u.status==="approved"?T.greenLt:T.yellowLt, color:u.status==="approved"?T.green:T.yellow, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600 }}>
                          {u.status==="approved"?"Approved":"Pending"}
                        </span>
                      </td>
                      <td style={{ padding:"10px 14px", fontSize:12, color:T.muted, borderBottom:`1px solid ${T.border}` }}>{fmt(u.created_at)}</td>
                      <td style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}` }}>
                        {(u.status!=="approved")&&(
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            {["viewer","manager","quality_auditor","quality_manager"].map(role=>(
                              <Btn key={role} size="sm" variant="outline" onClick={()=>approveUser(u.id,role)} style={{ fontSize:10, padding:"3px 8px" }}>
                                ✓ {role.replace("_"," ")}
                              </Btn>
                            ))}
                          </div>
                        )}
                        {u.status==="approved"&&u.role!=="admin"&&(
                          <Btn size="sm" variant="danger" onClick={()=>revokeUser(u.id)} style={{ fontSize:11 }}>Revoke</Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {editing&&(
        <ModalShell title={`Edit: ${editing.role_title}`} onClose={()=>setEditing(null)}>
          <Input label="Person's Name" value={editing.person_name||""} onChange={e=>setEditing(p=>({...p,person_name:e.target.value}))} placeholder="e.g. John Smith" />
          <Input label="Email Address" type="email" value={editing.email||""} onChange={e=>setEditing(p=>({...p,email:e.target.value}))} placeholder="manager@company.com" />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setEditing(null)}>Cancel</Btn>
            <Btn onClick={()=>save(editing)}>Save</Btn>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

// ─── About View ───────────────────────────────────────────────
const AboutView = () => {
  const year = new Date().getFullYear();

  const COMPLIANCE_DATA = [
    { std:"AS9100D / ISO 9001:2015", color:"#01579b", bg:"#e3f2fd", items:[
      { clause:"10.2.1", text:"Nonconformity & corrective action — full CAR/CAP workflow", ok:true },
      { clause:"10.2.2", text:"Evidence of corrective action effectiveness", ok:true },
      { clause:"10.2.3", text:"Review of corrective actions and trends", ok:true },
      { clause:"7.5",    text:"Control of documented information", ok:true },
      { clause:"7.5.3",  text:"Audit trail — full change log", ok:true },
      { clause:"8.4",    text:"Control of externally provided processes — contractor register", ok:true },
      { clause:"9.2",    text:"Internal audit programme", ok:true },
      { clause:"6.1",    text:"Actions to address risks and opportunities — Risk Register", ok:true },
      { clause:"9.3",    text:"Management review inputs (dashboard)", ok:"partial" },
      { clause:"4.1",    text:"Context of the organisation", ok:"partial" },
      { clause:"6.2",    text:"Quality objectives register", ok:false },
      { clause:"7.1.5",  text:"Calibration and measurement resources register", ok:false },
    ]},
    { std:"Regulatory Document Compliance", color:"#2e7d32", bg:"#e8f5e9", items:[
      { clause:"CAP Tracking",  text:"System for tracking internal and KCAA-issued CAPs", ok:true },
      { clause:"Doc Control",   text:"Quality Manual and associated document control", ok:true },
      { clause:"Cert Tracking", text:"Certificates, approvals and regulatory document expiry tracking", ok:true },
      { clause:"Contractors",   text:"Approved maintenance and service provider register", ok:true },
      { clause:"Audit Trail",   text:"Record of all quality-related actions and decisions", ok:true },
      { clause:"QM Amendment",  text:"System referenced in Quality Manual — amendment pending", ok:"partial" },
      { clause:"Training Rec.", text:"Instructor and student training records", ok:"planned" },
      { clause:"Occurrence",    text:"Mandatory occurrence reporting system", ok:"planned" },
      { clause:"Maintenance",   text:"Aircraft maintenance tracking and tech log", ok:"planned" },
    ]},
    { std:"ICAO Annex 19 — SMS Framework", color:"#e65100", bg:"#fff3e0", items:[
      { clause:"2.1", text:"Hazard identification — 7-category risk register", ok:true },
      { clause:"2.2", text:"Safety risk assessment — ICAO 5x5 matrix", ok:true },
      { clause:"2.3", text:"Safety risk mitigation and treatment tracking", ok:true },
      { clause:"3.1", text:"Safety performance monitoring -- QMS compliance score", ok:true },
      { clause:"1.1", text:"Safety management commitment and responsibility", ok:"partial" },
      { clause:"1.4", text:"Safety Performance Indicators (SPIs) and targets", ok:false },
      { clause:"3.2", text:"Management of change workflow", ok:false },
      { clause:"4.1", text:"Training and education records", ok:"planned" },
      { clause:"4.2", text:"Safety communication and promotion log", ok:false },
    ]},
  ];

  const si = (ok) => ok===true?{icon:"✓",bg:"#e8f5e9",color:"#2e7d32"}:ok==="partial"?{icon:"~",bg:"#fff8e1",color:"#f57f17"}:ok==="planned"?{icon:"~",bg:"#e8eaf6",color:"#3949ab"}:{icon:"x",bg:"#ffebee",color:"#c62828"};
  const st = (ok) => ok===true?{label:"Compliant",bg:"#e8f5e9",color:"#2e7d32"}:ok==="partial"?{label:"Partial",bg:"#fff8e1",color:"#f57f17"}:ok==="planned"?{label:"Planned",bg:"#e8eaf6",color:"#3949ab"}:{label:"Gap",bg:"#ffebee",color:"#c62828"};

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:900 }}>

      {/* Hero */}
      <div className="card" style={{ background:`linear-gradient(135deg,${T.navy} 0%,#0d3060 100%)`, padding:"32px 36px", borderRadius:12, color:"#fff", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-40,right:-40,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,0.03)" }}/>
        <div style={{ position:"absolute",bottom:-60,right:60,width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,0.02)" }}/>
        <div style={{ position:"relative", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:32, fontWeight:800, letterSpacing:0.5, lineHeight:1 }}>
              AeroQualify <span style={{ color:T.sky }}>Pro</span>
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginTop:6, fontWeight:300 }}>Aviation Quality Management System</div>
            <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
              {["AS9100D","ISO 9001:2015","ICAO Annex 19","KCAA"].map(b=>(
                <span key={b} style={{ fontSize:10, fontWeight:700, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:4, padding:"3px 9px", letterSpacing:0.5 }}>{b}</span>
              ))}
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontFamily:"'Source Code Pro',monospace", fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>VERSION</div>
            <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:28, fontWeight:800, color:T.sky }}>3.0</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{year}</div>
          </div>
        </div>
      </div>

      {/* Legal Ownership */}
      <div className="card" style={{ padding:"24px 28px", borderLeft:`4px solid ${T.primary}` }}>
        <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:14, fontWeight:700, color:T.primaryDk, marginBottom:16 }}>Legal Ownership &amp; Copyright</div>
        <div style={{ background:T.primaryLt, borderRadius:8, padding:"16px 18px", marginBottom:16, border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.primaryDk, marginBottom:8 }}>Copyright Notice</div>
          <div style={{ fontSize:13, color:T.text, lineHeight:1.8 }}>
            Copyright &copy; {year} Kornelius Magita. All rights reserved.
          </div>
          <div style={{ fontSize:12, color:T.muted, marginTop:10, lineHeight:1.8 }}>
            AeroQualify Pro and all associated software, source code, design, documentation, workflows, and data structures — including all current and future versions and editions — are the exclusive intellectual property of Kornelius Magita No part of this software may be reproduced, distributed, modified, sublicensed, sold, or transferred to any third party without the express written consent of Kornelius Magita.
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            { label:"Software Owner",   value:"Kornelius Magita" },
            { label:"Rights",           value:"All rights reserved — full copyright" },
            { label:"Jurisdiction",     value:"Republic of Kenya" },
            { label:"Licence Type",     value:"Proprietary -- not open source" },
            { label:"Covers",           value:"This and all future editions" },
            { label:"Unauthorised Use", value:"Strictly prohibited" },
          ].map(r=>(
            <div key={r.label} style={{ background:"#f8fafc", borderRadius:6, padding:"10px 14px", border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:3 }}>{r.label}</div>
              <div style={{ fontSize:13, color:T.text, fontWeight:600 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="card" style={{ padding:"24px 28px" }}>
        <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:14, fontWeight:700, color:T.primaryDk, marginBottom:16 }}>System Information</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {[
            { label:"Platform",   value:"Web / Cloud (Vercel)" },
            { label:"Database",   value:"Supabase (PostgreSQL)" },
            { label:"Version",    value:"3.0.0" },
            { label:"Framework",  value:"React 18" },
            { label:"Auth",       value:"Supabase Auth (JWT)" },
            { label:"Backup",     value:"Daily -- Google Drive" },
          ].map(r=>(
            <div key={r.label} style={{ background:"#f8fafc", borderRadius:6, padding:"10px 14px", border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:3 }}>{r.label}</div>
              <div style={{ fontFamily:"'Source Code Pro',monospace", fontSize:12, color:T.primary, fontWeight:600 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="card" style={{ padding:"24px 28px" }}>
        <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:14, fontWeight:700, color:T.primaryDk, marginBottom:6 }}>Standards Compliance Checklist</div>
        <div style={{ fontSize:12, color:T.muted, marginBottom:16 }}>
          AeroQualify Pro is designed to support compliance with the standards below. This checklist reflects the current state of the system and is updated as new modules are developed.
        </div>
        {/* Legend */}
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:20, padding:"10px 14px", background:"#f8fafc", borderRadius:8, border:`1px solid ${T.border}` }}>
          {[{l:"Compliant",c:"#2e7d32"},{l:"Partial",c:"#f57f17"},{l:"Planned",c:"#3949ab"},{l:"Gap",c:"#c62828"}].map(x=>(
            <div key={x.l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
              <div style={{ width:10,height:10,borderRadius:"50%",background:x.c }}/>
              <span style={{ color:T.muted }}>{x.l}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {COMPLIANCE_DATA.map(std=>(
            <div key={std.std} style={{ border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
              <div style={{ background:std.bg, padding:"12px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${T.border}`, flexWrap:"wrap", gap:8 }}>
                <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:13, fontWeight:700, color:std.color }}>{std.std}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {[{ok:true,label:"compliant"},{ok:"partial",label:"partial"},{ok:false,label:"gaps"},{ok:"planned",label:"planned"}].map(b=>{
                    const cnt=std.items.filter(i=>i.ok===b.ok).length;
                    if(!cnt) return null;
                    const s=st(b.ok);
                    return <span key={b.label} style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:s.bg,color:s.color }}>{cnt} {b.label}</span>;
                  })}
                </div>
              </div>
              {std.items.map((item,idx)=>{
                const s=si(item.ok); const tag=st(item.ok);
                return (
                  <div key={item.clause} style={{ display:"grid", gridTemplateColumns:"28px 100px 1fr 90px", alignItems:"center", gap:12, padding:"10px 18px", borderBottom:idx<std.items.length-1?`1px solid #f0f3f7`:"none" }}>
                    <div style={{ width:22,height:22,borderRadius:"50%",background:s.bg,color:s.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>{s.icon}</div>
                    <span style={{ fontFamily:"'Source Code Pro',monospace",fontSize:10,fontWeight:600,color:T.primary,background:"#e3f2fd",padding:"3px 8px",borderRadius:4,whiteSpace:"nowrap" }}>{item.clause}</span>
                    <span style={{ fontSize:12,color:T.text }}>{item.text}</span>
                    <span style={{ fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:10,textAlign:"center",background:tag.bg,color:tag.color,whiteSpace:"nowrap" }}>{tag.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legal Disclaimer Section */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #dde3ea", padding:28, marginBottom:16 }}>
        <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:16, color:"#1a2332", marginBottom:4 }}>Legal Ownership & Disclaimer</div>
        <div style={{ fontSize:11, color:T.muted, marginBottom:16 }}>Copyright © 2026 Kornelius M. Magita. All rights reserved.</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[
            ["Software Owner", "Kornelius M. Magita"],
            ["Jurisdiction", "Republic of Kenya"],
            ["Licence Type", "Proprietary — not open source"],
          ].map(([k,v])=>(
            <div key={k} style={{ display:"flex", gap:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#5f7285", minWidth:160 }}>{k}</div>
              <div style={{ fontSize:12, color:"#1a2332" }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:20, background:"#f8fafc", borderRadius:8, padding:"16px 18px", maxHeight:320, overflowY:"auto", border:"1px solid #eef2f7" }}>
          {[
            ["User Licence Terms", "Authorised Use: This software is licensed, not sold. Authorised users may access and use AeroQualify Pro solely for the purpose of managing quality, safety, and compliance records within their organisation, as agreed in writing with Kornelius M. Magita."],
            ["Prohibited Activities", "Users may not copy, decompile, reverse engineer, disassemble, modify, or create derivative works based on this software. Sharing access credentials or granting unauthorised third-party access is strictly prohibited."],
            ["Data Ownership", "All data entered into the system by the licensed organisation remains the property of that organisation. Kornelius M. Magita does not claim ownership of customer data."],
            ["Confidentiality", "Users must treat all aspects of the software — including its workflows, design, and features — as confidential. This obligation survives termination of the licence agreement."],
            ["Warranty Disclaimer", "The software is provided in good faith. Kornelius M. Magita makes no warranties as to fitness for any specific regulatory purpose. It is the operator's responsibility to ensure the system meets applicable regulatory requirements in their jurisdiction."],
          ].map(([title, text])=>(
            <div key={title} style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#1a2332", marginBottom:3 }}>{title}</div>
              <div style={{ fontSize:12, color:"#5f7285", lineHeight:1.6 }}>{text}</div>
            </div>
          ))}
          <div style={{ marginTop:8, padding:"12px 14px", background:"#fff3e0", borderRadius:6, border:"1px solid #ffcc80" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#e65100", marginBottom:4 }}>LIMITATION OF LIABILITY</div>
            <div style={{ fontSize:11, color:"#795548", lineHeight:1.6 }}>
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, KORNELIUS M. MAGITA SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR IN CONNECTION WITH THE USE OF THIS SOFTWARE, INCLUDING BUT NOT LIMITED TO: LOSS OF DATA; REGULATORY NON-COMPLIANCE; FAILURE TO DETECT SAFETY OCCURRENCES; BUSINESS INTERRUPTION; OR LOSS OF REVENUE. Compliance responsibility rests solely with the licensed operator and its designated accountable manager.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign:"center", fontSize:11, color:T.muted, paddingBottom:8 }}>
        AeroQualify Pro &nbsp;&middot;&nbsp; Copyright &copy; {year} Kornelius Magita. All rights reserved. &nbsp;&middot;&nbsp; v3.0.0
      </div>
    </div>
  );
};

// ─── Change Log View ──────────────────────────────────────────
const ChangeLogView = ({ logs }) => (
  <div>
    <SectionHeader title="Change Log" subtitle="Full audit trail of all system changes" />
    <Card>
      <div style={{ overflowY:"auto", maxHeight:"calc(100vh - 240px)" }}>
        {logs.length===0
          ? <div style={{ textAlign:"center", color:T.muted, padding:32 }}>No changes recorded yet</div>
          : logs.map((log,i)=>(
            <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}`, alignItems:"flex-start" }}>
              <div style={{ width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${T.primary},${T.sky})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0 }}>
                {(log.user_name||"?")[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:T.text }}>
                  <span style={{ color:T.primary, fontWeight:600 }}>{log.user_name}</span>
                  {" "}<span style={{ color:log.action?.includes("delet")?T.red:log.action?.includes("creat")?T.green:T.yellow, fontWeight:500 }}>{log.action}</span>
                  {" "}<span style={{ fontFamily:"'Source Code Pro',monospace", color:T.muted, fontSize:11 }}>{log.table_name}/{log.record_id}</span>
                </div>
                {log.record_title&&<div style={{ fontSize:12, color:T.muted, marginTop:1 }}>{log.record_title}</div>}
                <div style={{ fontSize:11, color:T.light, marginTop:1 }}>{new Date(log.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
      </div>
    </Card>
  </div>
);

// ─── Column configs ───────────────────────────────────────────
const DOC_COLS = [
  {key:"id",label:"ID",mono:true},{key:"title",label:"Title",wrap:true},{key:"rev",label:"Rev"},{key:"doc_section",label:"Section"},
  {key:"category",label:"Category"},{key:"status",label:"Status",badge:true},{key:"owner",label:"Owner"},
  {key:"date",label:"Date"},{key:"expiry_date",label:"Expiry",due:true},{key:"approved_by",label:"Approved By"},
];
const FLIGHT_DOC_COLS = [
  {key:"id",label:"ID",mono:true},{key:"title",label:"Title",wrap:true},{key:"doc_type",label:"Type",badge:true},
  {key:"issuing_body",label:"Issuing Body"},{key:"issue_date",label:"Issue Date"},{key:"expiry_date",label:"Expiry",due:true},{key:"status",label:"Status",badge:true},
];
const AUDIT_COLS = [
  {key:"id",label:"ID",mono:true},{key:"title",label:"Title",wrap:true},{key:"type",label:"Type",badge:true},
  {key:"status",label:"Status",badge:true},{key:"lead",label:"Lead"},{key:"scope",label:"Scope"},
  {key:"date",label:"Date",due:true},{key:"findings",label:"Findings"},{key:"obs",label:"Obs."},
];
const CONTRACTOR_COLS = [
  {key:"id",label:"ID",mono:true},{key:"name",label:"Contractor"},{key:"category",label:"Category"},
  {key:"status",label:"Status",badge:true},{key:"rating",label:"Rating",badge:true},
  {key:"contact",label:"Contact"},{key:"country",label:"Country"},
  {key:"last_audit",label:"Last Audit"},{key:"next_audit",label:"Next Audit",due:true},
];

const DOC_FIELDS = [
  {key:"id",label:"Document ID"},{key:"title",label:"Title",full:true},
  {key:"rev",label:"Revision"},{key:"status",label:"Status",type:"select",options:["Draft","In Review","Approved","Obsolete"]},
  {key:"doc_section",label:"Section",type:"select",options:["Operations Manual","Training Manual","Safety Manual","Maintenance Manual","Quality Manual","SOPs","Checklists","Forms","Policies","Other"]},
  {key:"category",label:"Category",type:"select",options:["Core QMS","Engineering","Procurement","Equipment","Audit","Risk","HR","Production","Training","Safety","Maintenance"]},
  {key:"owner",label:"Owner"},{key:"date",label:"Date",type:"date"},{key:"expiry_date",label:"Expiry Date",type:"date"},{key:"approved_by",label:"Approved By"},
];
const FLIGHT_DOC_FIELDS = [
  {key:"id",label:"Document ID"},{key:"title",label:"Title",full:true},
  {key:"doc_type",label:"Type",type:"select",options:["Air Operator Certificate","Approved Training Organisation","Aircraft Registration","Certificate of Airworthiness","Radio License","Insurance Certificate","Aerodrome Approval","Air Traffic Service Agreement","Dangerous Goods Approval","Other Approval","Other Certificate"]},
  {key:"issuing_body",label:"Issuing Authority"},{key:"issue_date",label:"Issue Date",type:"date"},
  {key:"expiry_date",label:"Expiry Date",type:"date"},
  {key:"status",label:"Status",type:"select",options:["Valid","Expired","Pending Renewal","Suspended"]},
  {key:"notes",label:"Notes",full:true,type:"textarea"},
];
const AUDIT_FIELDS = [
  {key:"id",label:"Audit ID"},{key:"title",label:"Title",full:true},
  {key:"type",label:"Type",type:"select",options:["Internal","Supplier","External","Regulatory","Surveillance"]},
  {key:"status",label:"Status",type:"select",options:["Scheduled","In Progress","Completed"]},
  {key:"lead",label:"Lead Auditor"},{key:"scope",label:"Scope"},{key:"date",label:"Date",type:"date"},
  {key:"findings",label:"Findings #",type:"number"},{key:"obs",label:"Observations #",type:"number"},
];
const CONTRACTOR_FIELDS = [
  {key:"id",label:"Contractor ID"},{key:"name",label:"Company Name",full:true},
  {key:"category",label:"Category",type:"select",options:["Aircraft Maintenance Organisation (AMO)","Avionics & Instruments","Fuel Supplier","Ground Handling","Aircraft Parts & Supplies","Simulator Provider","Medical Examiner (AME)","Meteorological Services","Air Traffic Services","Insurance Provider","Catering & Facilities","IT & Software Services","Training Device Maintenance","Security Services"]},
  {key:"status",label:"Status",type:"select",options:["Approved","Conditional","Probation","Disqualified"]},
  {key:"rating",label:"Rating",type:"select",options:["A+","A","B","C","F"]},
  {key:"contact",label:"Contact Email"},{key:"country",label:"Country"},
  {key:"last_audit",label:"Last Audit Date",type:"date"},{key:"next_audit",label:"Next Audit Date",type:"date"},
];


// ─── Risk Register ────────────────────────────────────────────
// ICAO SMS Annex 19 -- 5×5 Risk Matrix
// Severity: Catastrophic(5) / Hazardous(4) / Major(3) / Minor(2) / Negligible(1)
// Likelihood: Frequent(5) / Occasional(4) / Remote(3) / Improbable(2) / Extremely Improbable(1)
// Risk Index = Severity × Likelihood
// Critical ≥15 | High 10–14 | Medium 5-9 | Low ≤4

const RISK_SEVERITY = [
  {value:5,label:"Catastrophic",desc:"Hull loss, multiple fatalities"},
  {value:4,label:"Hazardous",   desc:"Serious injury, major damage"},
  {value:3,label:"Major",       desc:"Serious incident, injury"},
  {value:2,label:"Minor",       desc:"Incident, minor injury"},
  {value:1,label:"Negligible",  desc:"Nuisance, little consequence"},
];
const RISK_LIKELIHOOD = [
  {value:5,label:"Frequent",              desc:"Likely to occur many times"},
  {value:4,label:"Occasional",            desc:"Likely to occur sometimes"},
  {value:3,label:"Remote",                desc:"Unlikely but possible"},
  {value:2,label:"Improbable",            desc:"Very unlikely to occur"},
  {value:1,label:"Extremely Improbable",  desc:"Almost inconceivable"},
];
const RISK_CATEGORIES = ["Flight Operations","Ground Operations","Maintenance","Training","Safety","Security","Environmental","Organisational","Engineering","Regulatory Compliance"];

const riskRating=(s,l)=>{
  const idx=s*l;
  if(idx>=15) return {label:"Critical",color:"#b71c1c",bg:"#ffebee"};
  if(idx>=10) return {label:"High",    color:"#e65100",bg:"#fff3e0"};
  if(idx>=5)  return {label:"Medium",  color:"#f57f17",bg:"#fffde7"};
  return              {label:"Low",    color:"#2e7d32",bg:"#e8f5e9"};
};

const RiskMatrix = ({ severity, likelihood, onSelect }) => {
  const sev=[5,4,3,2,1]; const lik=[1,2,3,4,5];
  const cellColor=(s,l)=>{
    const r=riskRating(s,l);
    const isSelected=s===severity&&l===likelihood;
    return {background:isSelected?r.color:r.bg, color:isSelected?"#fff":r.color,
      border:isSelected?`2px solid ${r.color}`:`1px solid ${r.color}33`,
      fontWeight:isSelected?700:400, transform:isSelected?"scale(1.08)":"scale(1)", transition:"all 0.15s"};
  };
  return (
    <div style={{ overflowX:"auto", marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>
        Risk Matrix -- click to select Severity × Likelihood
      </div>
      <table style={{ borderCollapse:"collapse", fontSize:11 }}>
        <thead>
          <tr>
            <th style={{ padding:"6px 10px", background:"#f5f8fc", border:`1px solid ${T.border}`, fontSize:10, color:T.muted, whiteSpace:"nowrap" }}>Severity ↓ / Likelihood →</th>
            {lik.map(l=><th key={l} style={{ padding:"6px 10px", background:"#f5f8fc", border:`1px solid ${T.border}`, textAlign:"center", minWidth:70, fontSize:10, color:T.muted }}>
              {RISK_LIKELIHOOD.find(x=>x.value===l)?.label}
            </th>)}
          </tr>
        </thead>
        <tbody>
          {sev.map(s=>(
            <tr key={s}>
              <td style={{ padding:"6px 10px", background:"#f5f8fc", border:`1px solid ${T.border}`, fontWeight:600, fontSize:11, color:T.text, whiteSpace:"nowrap" }}>
                {RISK_SEVERITY.find(x=>x.value===s)?.label}
              </td>
              {lik.map(l=>{
                const r=riskRating(s,l); const cs=cellColor(s,l);
                return (
                  <td key={l} onClick={()=>onSelect&&onSelect(s,l)}
                    style={{ padding:"8px 6px", border:`1px solid ${T.border}`, textAlign:"center", cursor:onSelect?"pointer":"default", ...cs, userSelect:"none", borderRadius:4 }}>
                    <div style={{ fontSize:12, fontWeight:cs.fontWeight }}>{s*l}</div>
                    <div style={{ fontSize:9, marginTop:1 }}>{r.label}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display:"flex", gap:12, marginTop:8, flexWrap:"wrap" }}>
        {[{label:"Critical",color:"#b71c1c"},{label:"High",color:"#e65100"},{label:"Medium",color:"#f57f17"},{label:"Low",color:"#2e7d32"}].map(r=>(
          <div key={r.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11 }}>
            <div style={{ width:12,height:12,borderRadius:2,background:r.color }}/>
            <span style={{ color:T.muted }}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RiskModal = ({ risk, cars, onSave, onClose }) => {
  const genId=()=>`RSK-${String(Date.now()).slice(-6)}`;
  const [form, setForm] = useState(risk || { id:genId(), status:"Open", severity:3, likelihood:3 });
  const [showMatrix, setShowMatrix] = useState(false);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const inherentRating = riskRating(Number(form.severity)||1, Number(form.likelihood)||1);
  const residualRating = riskRating(Number(form.residual_severity||form.severity)||1, Number(form.residual_likelihood||form.likelihood)||1);

  return (
    <ModalShell title={(risk?"Edit":"New")+" Hazard / Risk"} onClose={onClose} wide>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
        {/* Identification */}
        <div style={{ gridColumn:"1/-1", fontSize:11, fontWeight:700, color:T.primary, letterSpacing:1, textTransform:"uppercase", marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>1. Hazard Identification</div>
        <div style={{ gridColumn:"1/-1" }}>
          <Input label="Hazard ID" value={form.id} onChange={e=>set("id",e.target.value)} />
        </div>
        <Select label="Category" value={form.category||""} onChange={e=>set("category",e.target.value)}>
          <option value="">Select…</option>
          {RISK_CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </Select>
        <Input label="Date Identified" type="date" value={form.date_identified||""} onChange={e=>set("date_identified",e.target.value)} />
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Hazard Description" value={form.hazard_description||""} onChange={e=>set("hazard_description",e.target.value)} rows={2}/>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Potential Consequence" value={form.consequence||""} onChange={e=>set("consequence",e.target.value)} rows={2}/>
        </div>
        <Input label="Identified By" value={form.identified_by||""} onChange={e=>set("identified_by",e.target.value)} />
        <Select label="Linked CAR (optional)" value={form.linked_car_id||""} onChange={e=>set("linked_car_id",e.target.value)}>
          <option value="">None</option>
          {cars.map(c=><option key={c.id} value={c.id}>{c.id}</option>)}
        </Select>

        {/* Inherent Risk */}
        <div style={{ gridColumn:"1/-1", fontSize:11, fontWeight:700, color:T.yellow, letterSpacing:1, textTransform:"uppercase", marginTop:8, marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>2. Inherent Risk (Before Controls)</div>
        <div style={{ gridColumn:"1/-1" }}>
          <button onClick={()=>setShowMatrix(p=>!p)} style={{ background:T.primaryLt, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 14px", fontSize:12, color:T.primary, cursor:"pointer", marginBottom:8 }}>
            {showMatrix?"Hide":"Show"} 5×5 Risk Matrix
          </button>
          {showMatrix&&<RiskMatrix severity={Number(form.severity)} likelihood={Number(form.likelihood)} onSelect={(s,l)=>{set("severity",s);set("likelihood",l);}} />}
        </div>
        <Select label="Severity" value={String(form.severity||3)} onChange={e=>set("severity",Number(e.target.value))}>
          {RISK_SEVERITY.map(s=><option key={s.value} value={s.value}>{s.value} — {s.label}</option>)}
        </Select>
        <Select label="Likelihood" value={String(form.likelihood||3)} onChange={e=>set("likelihood",Number(e.target.value))}>
          {RISK_LIKELIHOOD.map(l=><option key={l.value} value={l.value}>{l.value} -- {l.label}</option>)}
        </Select>
        <div style={{ gridColumn:"1/-1", background:inherentRating.bg, border:`1px solid ${inherentRating.color}44`, borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontWeight:700, color:inherentRating.color, fontSize:22, fontFamily:"'Oxanium',sans-serif" }}>{(Number(form.severity)||1)*(Number(form.likelihood)||1)}</div>
          <div>
            <div style={{ fontWeight:700, color:inherentRating.color, fontSize:13 }}>Inherent Risk: {inherentRating.label}</div>
            <div style={{ fontSize:11, color:T.muted }}>Severity {form.severity} × Likelihood {form.likelihood}</div>
          </div>
        </div>

        {/* Controls & Treatment */}
        <div style={{ gridColumn:"1/-1", fontSize:11, fontWeight:700, color:T.teal, letterSpacing:1, textTransform:"uppercase", marginTop:8, marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>3. Risk Controls & Treatment</div>
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Existing Controls" value={form.existing_controls||""} onChange={e=>set("existing_controls",e.target.value)} rows={2}/>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Treatment Action" value={form.treatment_action||""} onChange={e=>set("treatment_action",e.target.value)} rows={2}/>
        </div>
        <Input label="Responsible Person" value={form.responsible_person||""} onChange={e=>set("responsible_person",e.target.value)} />
        <Input label="Target Date" type="date" value={form.target_date||""} onChange={e=>set("target_date",e.target.value)} />

        {/* Residual Risk */}
        <div style={{ gridColumn:"1/-1", fontSize:11, fontWeight:700, color:T.green, letterSpacing:1, textTransform:"uppercase", marginTop:8, marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>4. Residual Risk (After Controls)</div>
        <Select label="Residual Severity" value={String(form.residual_severity||form.severity||3)} onChange={e=>set("residual_severity",Number(e.target.value))}>
          {RISK_SEVERITY.map(s=><option key={s.value} value={s.value}>{s.value} — {s.label}</option>)}
        </Select>
        <Select label="Residual Likelihood" value={String(form.residual_likelihood||form.likelihood||3)} onChange={e=>set("residual_likelihood",Number(e.target.value))}>
          {RISK_LIKELIHOOD.map(l=><option key={l.value} value={l.value}>{l.value} -- {l.label}</option>)}
        </Select>
        <div style={{ gridColumn:"1/-1", background:residualRating.bg, border:`1px solid ${residualRating.color}44`, borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontWeight:700, color:residualRating.color, fontSize:22, fontFamily:"'Oxanium',sans-serif" }}>{(Number(form.residual_severity||form.severity)||1)*(Number(form.residual_likelihood||form.likelihood)||1)}</div>
          <div>
            <div style={{ fontWeight:700, color:residualRating.color, fontSize:13 }}>Residual Risk: {residualRating.label}</div>
            <div style={{ fontSize:11, color:T.muted }}>After controls applied</div>
          </div>
        </div>

        {/* Status */}
        <div style={{ gridColumn:"1/-1", fontSize:11, fontWeight:700, color:T.muted, letterSpacing:1, textTransform:"uppercase", marginTop:8, marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>5. Review & Status</div>
        <Select label="Status" value={form.status||"Open"} onChange={e=>set("status",e.target.value)}>
          {["Open","Under Treatment","Monitoring","Closed"].map(s=><option key={s}>{s}</option>)}
        </Select>
        <Input label="Review Date" type="date" value={form.review_date||""} onChange={e=>set("review_date",e.target.value)} />
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Review Notes" value={form.review_notes||""} onChange={e=>set("review_notes",e.target.value)} rows={2}/>
        </div>
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:12 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{
          const rs=Number(form.residual_severity||form.severity)||1;
          const rl=Number(form.residual_likelihood||form.likelihood)||1;
          const is=Number(form.severity)||1; const il=Number(form.likelihood)||1;
          onSave({...form,
            inherent_index:is*il, inherent_rating:riskRating(is,il).label,
            residual_index:rs*rl, residual_rating:riskRating(rs,rl).label,
          });
          onClose();
        }}>Save Risk</Btn>
      </div>
    </ModalShell>
  );
};

const RiskRegisterView = ({ data, user, profile, managers, onRefresh, showToast }) => {
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter]   = useState("all");
  const [catFilter, setCat]   = useState("all");
  const [search, setSearch]   = useState("");
  const [showMatrix, setShowMatrix] = useState(false);

  const canEdit   = ["admin","quality_manager","quality_auditor"].includes(profile?.role);
  const isAdmin   = profile?.role==="admin";

  const risks = (data.risks||[])
    .filter(r=>filter==="all"||r.residual_rating===filter)
    .filter(r=>catFilter==="all"||r.category===catFilter)
    .filter(r=>!search||JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total:    (data.risks||[]).length,
    critical: (data.risks||[]).filter(r=>r.residual_rating==="Critical"&&r.status!=="Closed").length,
    high:     (data.risks||[]).filter(r=>r.residual_rating==="High"&&r.status!=="Closed").length,
    open:     (data.risks||[]).filter(r=>r.status==="Open").length,
    closed:   (data.risks||[]).filter(r=>r.status==="Closed").length,
  };

  const save = async(form) => {
    const isNew=!(data.risks||[]).find(r=>r.id===form.id);
    const payload={...form, updated_at:new Date().toISOString()};
    if(isNew) payload.created_at=new Date().toISOString();
    const{error}=await supabase.from(TABLES.risks).upsert(payload);
    if(error){showToast(`Error: ${error.message}`,"error");return;}
    await logChange({user,action:isNew?"created risk":"updated risk",table:"risk_register",recordId:form.id,recordTitle:form.hazard_description?.slice(0,60)||form.id,newData:form});
    showToast(isNew?"Risk added":"Risk updated","success");
    onRefresh();
  };

  const del = async(r) => {
    if(!window.confirm(`Delete risk ${r.id}?`)) return;
    await supabase.from(TABLES.risks).delete().eq("id",r.id);
    showToast("Risk deleted","success"); onRefresh();
  };

  const ratingColors={Critical:"#b71c1c",High:"#e65100",Medium:"#f57f17",Low:"#2e7d32"};

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* KPI strip */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {[
          {label:"Total Hazards",  value:stats.total,    color:T.primary, icon:"⚠️"},
          {label:"Critical Risks", value:stats.critical, color:"#b71c1c",  icon:"🔴"},
          {label:"High Risks",     value:stats.high,     color:"#e65100",  icon:"🟠"},
          {label:"Open",           value:stats.open,     color:T.yellow,   icon:"📋"},
          {label:"Closed",         value:stats.closed,   color:T.green,    icon:"✅"},
        ].map(k=>(
          <div key={k.label} className="card" style={{ flex:1, minWidth:120, padding:"16px 18px", borderTop:`3px solid ${k.color}` }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:28, fontFamily:"'Oxanium',sans-serif", fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:11, color:T.text, fontWeight:600, marginTop:4 }}>{k.label}</div>
              </div>
              <span style={{ fontSize:20, opacity:0.6 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 5×5 Matrix toggle */}
      <div className="card" style={{ padding:"14px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:showMatrix?14:0 }}>
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:14, color:T.primaryDk }}>ICAO SMS 5×5 Risk Matrix</div>
          <Btn size="sm" variant="ghost" onClick={()=>setShowMatrix(p=>!p)}>{showMatrix?"Hide Matrix":"Show Matrix"}</Btn>
        </div>
        {showMatrix&&<RiskMatrix />}
      </div>

      {/* Toolbar */}
      <SectionHeader title="Hazard & Risk Register" subtitle="ICAO SMS Annex 19 -- Identify, assess and treat operational hazards"
        action={canEdit&&<Btn size="sm" onClick={()=>{setEditing(null);setModal(true)}}>+ Add Hazard</Btn>}
      />
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:4 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search risks…"
          style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:7, padding:"7px 14px", fontSize:12, width:220, color:T.text }} />
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:7, padding:"7px 12px", fontSize:12, color:T.text }}>
          <option value="all">All Ratings</option>
          {["Critical","High","Medium","Low"].map(r=><option key={r}>{r}</option>)}
        </select>
        <select value={catFilter} onChange={e=>setCat(e.target.value)}
          style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:7, padding:"7px 12px", fontSize:12, color:T.text }}>
          <option value="all">All Categories</option>
          {RISK_CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Risk table */}
      <div className="card" style={{ overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f5f8fc" }}>
              {[["Risk ID","mono"],["Category",""],["Hazard Description","wrap"],["Inherent",""],["Residual",""],["Status",""],["Responsible",""],["Target Date","due"],["Linked CAR",""]].map(([label])=>(
                <th key={label} style={{ padding:"10px 14px", textAlign:"left", color:T.muted, fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>{label}</th>
              ))}
              {(canEdit||isAdmin)&&<th style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}`, width:100 }}/>}
            </tr>
          </thead>
          <tbody>
            {risks.length===0
              ? <tr><td colSpan={10} style={{ padding:32, textAlign:"center", color:T.muted }}>No risks found -- click "+ Add Hazard" to begin</td></tr>
              : risks.map(r=>{
                const ir=riskRating(r.inherent_index?Math.round(Math.sqrt(r.inherent_index)):Number(r.severity)||1, r.inherent_index?Math.round(r.inherent_index/(Math.round(Math.sqrt(r.inherent_index))||1)):Number(r.likelihood)||1);
                const rr={label:r.residual_rating||"Low",color:ratingColors[r.residual_rating]||T.green,bg:(riskRating(Number(r.residual_severity||r.severity)||1,Number(r.residual_likelihood||r.likelihood)||1)).bg};
                const od=r.target_date&&!["Closed","Monitoring","Completed"].includes(r.status)&&isOverdue(r.target_date);
                return (
                  <tr key={r.id} className="row-hover" style={{ borderBottom:`1px solid ${T.border}`, background:od?"#fff8f8":"" }}>
                    <td style={{ padding:"10px 14px" }}><span style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11, fontWeight:600 }}>{r.id}</span></td>
                    <td style={{ padding:"10px 14px", fontSize:12, color:T.muted }}>{r.category||"—"}</td>
                    <td style={{ padding:"10px 14px", maxWidth:220 }}><span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.hazard_description}>{r.hazard_description||"—"}</span></td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ background:(riskRating(Number(r.severity)||1,Number(r.likelihood)||1)).bg, color:(riskRating(Number(r.severity)||1,Number(r.likelihood)||1)).color, padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:600 }}>
                        {r.inherent_index||((Number(r.severity)||1)*(Number(r.likelihood)||1))} — {r.inherent_rating||(riskRating(Number(r.severity)||1,Number(r.likelihood)||1)).label}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ background:rr.bg, color:rr.color, padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:600 }}>
                        {r.residual_index||((Number(r.residual_severity||r.severity)||1)*(Number(r.residual_likelihood||r.likelihood)||1))} — {r.residual_rating||"—"}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px" }}><Badge label={r.status||"Open"}/></td>
                    <td style={{ padding:"10px 14px", fontSize:12, color:T.muted }}>{r.responsible_person||"—"}</td>
                    <td style={{ padding:"10px 14px" }}><span style={{ color:od?T.red:T.muted, fontWeight:od?600:400, fontSize:12 }}>{fmt(r.target_date)}{od?" ⚠":""}</span></td>
                    <td style={{ padding:"10px 14px" }}>
                      {r.linked_car_id
                        ? <span style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11 }}>{r.linked_car_id}</span>
                        : <span style={{ color:T.light, fontSize:11 }}>—</span>}
                    </td>
                    {(canEdit||isAdmin)&&(
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", gap:5 }}>
                          {canEdit&&<Btn size="sm" variant="ghost" onClick={()=>{setEditing(r);setModal(true)}}>Edit</Btn>}
                          {isAdmin&&<Btn size="sm" variant="danger" onClick={()=>del(r)} style={{ padding:"4px 10px", fontSize:11 }}>✕</Btn>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {modal&&<RiskModal risk={editing} cars={data.cars||[]} onSave={save} onClose={()=>{setModal(false);setEditing(null);}}/>}
    </div>
  );
};


// ─── Annual Audit Schedule Builder ────────────────────────────
const AUDIT_AREAS = [
  "Management Personnel Records",
  "Ground & Flight Instructor Records",
  "Ground School Training Records",
  "Flight Training Records",
  "Company Manuals and Relevant Documents",
  "Classrooms and Facilities",
  "Aircraft",
  "AMO",
  "Fuel Supplier",
  "Safety Management Systems",
  "Quality Management Systems",
];
// Helper: get org-specific audit areas, falling back to defaults
const getAuditAreas = (org) => {
  if(!org?.audit_areas) return AUDIT_AREAS;
  try {
    const parsed = JSON.parse(org.audit_areas);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : AUDIT_AREAS;
  } catch { return AUDIT_AREAS; }
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const AUDIT_TYPES = ["Internal","Supplier","External","Regulatory","Surveillance"];

const FINDING_LEVELS = ["Level 1 - Critical NC","Level 2 - Major NC","Level 3 - Minor NC","Observation","Repeat Finding","Regulatory"];

const AuditScheduleModal = ({ slot, onSave, onClose, managers, data, user, profile, showToast, onRefresh, org }) => {
  const [tab, setTab] = useState("details");
  const [form, setForm] = useState({
    lead_auditor:     slot.lead_auditor||"",
    auditee:          slot.auditee||"",
    planned_date:     slot.planned_date||"",
    actual_date:      slot.actual_date||"",
    status:           slot.status||"Scheduled",
    findings:         slot.findings||0,
    observations:     slot.observations||0,
    notes:            slot.notes||"",
    audit_type:       slot.audit_type||"Internal",
    // Report fields
    audit_criteria:   slot.audit_criteria||"AS9100D / KCAA ANO / Quality Manual",
    opening_brief:    slot.opening_brief||"",
    closing_brief:    slot.closing_brief||"",
    exec_summary:     slot.exec_summary||"",
    positive_findings:slot.positive_findings||"",
    distribution:     slot.distribution||"Accountable Manager, Quality Manager",
    prepared_by:      slot.prepared_by||"",
    approved_by:      slot.approved_by||"",
    finding_items:    slot.finding_items||"[]",
    deferred_from:    slot.deferred_from||"",   // original planned date before deferral
    deferred_reason:  slot.deferred_reason||"",  // reason for deferral
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const [showDefer, setShowDefer] = useState(false);

  // Finding items management
  const [findingItems, setFindingItems] = useState(()=>{
    try { return JSON.parse(slot.finding_items||"[]"); } catch { return []; }
  });
  const [attachments, setAttachments] = useState(()=>{
    try { return JSON.parse(slot.attachments||"[]"); } catch { return []; }
  });
  const addAttachment = async(files) => {
    const readFile = (f) => new Promise((res) => {
      const reader = new FileReader();
      reader.onload = (e) => res({ name:f.name, size:f.size, type:f.type, addedAt:new Date().toISOString(), dataUrl:e.target.result });
      reader.readAsDataURL(f);
    });
    const newFiles = await Promise.all(Array.from(files).map(readFile));
    setAttachments(p=>[...p,...newFiles]);
  };
  const removeAttachment = (idx) => setAttachments(p=>p.filter((_,i)=>i!==idx));
  const addFinding = () => setFindingItems(p=>[...p,{id:Date.now(),ref:"",level:"Level 2 - Major NC",description:"",clause:"",requirement:"",evidence:"",car_raised:false,car_id:""}]);
  const updateFinding = (id,k,v) => setFindingItems(p=>p.map(f=>f.id===id?{...f,[k]:v}:f));
  const removeFinding = (id) => setFindingItems(p=>p.filter(f=>f.id!==id));

  // ── CAR raising from findings ──────────────────────────────
  const [carModal, setCarModal] = useState(null); // { finding } | null

  const auditRef = (() => {
    const AREA_CODES_AM = {
      "Ground School Training":"007","Flight Training Records":"008",
      "Company Manuals & Documents":"009","Base Training Facilities":"010",
      "Aircraft":"011","AMO":"012","Management Personnel Records":"013",
      "Ground & Flight Instructor Records":"014","Quality Management":"016",
      "Safety Management Systems":"017","Fuel Supplier":"022",
    };
    const code = AREA_CODES_AM[slot.area]||"000";
    const d = slot.planned_date ? new Date(slot.planned_date) : new Date(slot.year,(slot.month||1)-1,1);
    const dd=String(d.getDate()).padStart(2,"0"), mm=String(d.getMonth()+1).padStart(2,"0"), yyyy=d.getFullYear();
    return `PGF-QMS-${code}-${dd}${mm}${yyyy}`;
  })();

  const saveCarFromFinding = async (carForm, findingId) => {
    const payload = {
      ...carForm,
      title: carForm.finding_description?.slice(0,80)||carForm.id,
      raised_by: user?.id,
      raised_by_name: profile?.full_name||user?.email,
      updated_at: new Date().toISOString(),
    };
    const extraEmails = (carForm.additional_notify_text||"").split(",").map(s=>s.trim()).filter(Boolean);
    delete payload.additional_notify_text;
    const { error } = await supabase.from(TABLES.cars).insert(payload);
    if(error){ showToast?.(`Error: ${error.message}`,"error"); return; }
    // Log to change log
    await logChange({ user, action:"created", table:"cars", recordId:carForm.id, recordTitle:payload.title, newData:carForm });
    // Send notification to responsible manager — same as standalone CAR
    const carRm = managers.find(m=>m.role_title===carForm.responsible_manager);
    await sendNotification({
      type: "car_raised",
      record: { ...carForm, raised_by_name: profile?.full_name||user?.email },
      recipients: [carRm?.email, ...extraEmails].filter(Boolean),
    });
    // Mark finding as CAR raised and store the CAR id
    updateFinding(findingId, "car_raised", true);
    updateFinding(findingId, "car_id", carForm.id);
    showToast?.(`CAR ${carForm.id} raised — responsible manager notified`,"success");
    setCarModal(null);
    // Auto-save the audit record so car_raised flag is persisted to the database
    // We need to use the updated findingItems — use a small delay to let state update
    setTimeout(() => {
      const updatedItems = findingItems.map(f =>
        f.id === findingId ? { ...f, car_raised: true, car_id: carForm.id } : f
      );
      onSave({
        ...slot, ...form,
        finding_items: JSON.stringify(updatedItems),
        attachments: JSON.stringify(attachments),
        findings: updatedItems.filter(f=>f.level.includes("Level 1")||f.level.includes("Level 2")||f.level.includes("Level 3")||f.level==="Regulatory").length,
        observations: updatedItems.filter(f=>f.level==="Observation").length,
      });
    }, 100);
    onRefresh?.();
  };

  const handleSave = () => {
    const items = JSON.stringify(findingItems);
    const atts  = JSON.stringify(attachments);
    const level1 = findingItems.filter(f=>f.level.includes("Level 1")||f.level==="Regulatory").length;
    const level2 = findingItems.filter(f=>f.level.includes("Level 2")).length;
    const level3 = findingItems.filter(f=>f.level.includes("Level 3")).length;
    const obs    = findingItems.filter(f=>f.level==="Observation").length;
    onSave({
      ...slot,...form,
      finding_items: items,
      attachments: atts,
      findings: level1+level2+level3,
      observations: obs,
    });
  };

  const inputStyle = { width:"100%",padding:"8px 10px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13,boxSizing:"border-box",background:"#fff" };
  const labelStyle = { fontSize:11,fontWeight:700,color:"#5f7285",textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4 };
  const sectionStyle = { borderTop:"2px solid #eef2f7",paddingTop:16,marginTop:4 };

  return (
    <>
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff",borderRadius:14,width:720,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 50px rgba(0,0,0,0.2)",display:"flex",flexDirection:"column" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#01579b,#0277bd)",padding:"18px 24px",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.7)",fontSize:11,textTransform:"uppercase",letterSpacing:1 }}>Audit Record</div>
            <div style={{ color:"#fff",fontWeight:700,fontSize:16 }}>{slot.area} — {auditRef} ({MONTHS[(slot.month||1)-1]} {slot.year})</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:22,cursor:"pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex",borderBottom:"2px solid #eef2f7",background:"#fafbfc",flexShrink:0 }}>
          {[["details","📋 Details"],["report","📄 Audit Report"],["findings","🔍 Findings ("+findingItems.length+")"],["attachments","📎 Attachments ("+attachments.length+")"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ padding:"12px 20px",border:"none",borderBottom:tab===id?"3px solid #01579b":"3px solid transparent",cursor:"pointer",fontSize:13,fontWeight:tab===id?700:400,color:tab===id?"#01579b":"#5f7285",background:"transparent",marginBottom:-2 }}>{label}</button>
          ))}
        </div>

        <div style={{ padding:24,overflowY:"auto",flex:1 }}>

          {/* ── DETAILS TAB ── */}
          {tab==="details" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div><label style={labelStyle}>Audit Type</label>
                  <select value={form.audit_type} onChange={e=>set("audit_type",e.target.value)} style={inputStyle}>
                    {AUDIT_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={e=>set("status",e.target.value)} style={inputStyle}>
                    {["Scheduled","In Progress","Completed","Cancelled","Overdue"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Lead Auditor</label>
                  <input value={form.lead_auditor} onChange={e=>set("lead_auditor",e.target.value)} placeholder="Name" style={inputStyle}/>
                </div>
                <div><label style={labelStyle}>Auditee / Department</label>
                  <input value={form.auditee} onChange={e=>set("auditee",e.target.value)} placeholder="Dept or person" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Planned Date</label>
                  <input type="date" value={form.planned_date} onChange={e=>set("planned_date",e.target.value)} style={inputStyle}/>
                  {/* Show deferred badge if this was deferred */}
                  {form.deferred_from&&(
                    <div style={{ marginTop:4, fontSize:11, color:"#e65100", background:"#fff3e0", borderRadius:4, padding:"2px 7px", display:"inline-block" }}>
                      ⏱ Deferred from {form.deferred_from}
                    </div>
                  )}
                </div>
                <div><label style={labelStyle}>Actual Date</label>
                  <input type="date" value={form.actual_date} onChange={e=>set("actual_date",e.target.value)} style={inputStyle}/>
                </div>
                {/* Defer audit button */}
                {!["Completed","Cancelled"].includes(form.status)&&(
                  <div style={{ gridColumn:"1/-1" }}>
                    {!showDefer?(
                      <button type="button" onClick={()=>setShowDefer(true)}
                        style={{ background:"#fff3e0",color:"#e65100",border:"1px solid #ffcc80",borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                        ⏱ Defer Audit to Another Date
                      </button>
                    ):(
                      <div style={{ background:"#fff3e0",borderRadius:8,padding:"12px 14px",border:"1px solid #ffcc80" }}>
                        <div style={{ fontWeight:700,fontSize:13,color:"#e65100",marginBottom:10 }}>⏱ Defer Audit</div>
                        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                          <div>
                            <label style={labelStyle}>New Planned Date</label>
                            <input type="date" style={inputStyle}
                              onChange={e=>{
                                // Save original date before overwriting
                                if(!form.deferred_from) set("deferred_from", form.planned_date);
                                set("planned_date", e.target.value);
                              }}/>
                          </div>
                          <div>
                            <label style={labelStyle}>Reason for Deferral</label>
                            <input value={form.deferred_reason} onChange={e=>set("deferred_reason",e.target.value)}
                              placeholder="e.g. Key personnel unavailable" style={inputStyle}/>
                          </div>
                        </div>
                        <div style={{ display:"flex",gap:8,marginTop:10 }}>
                          <button type="button" onClick={()=>setShowDefer(false)}
                            style={{ background:"#e65100",color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                            Confirm Deferral
                          </button>
                          <button type="button" onClick={()=>setShowDefer(false)}
                            style={{ background:"none",border:"1px solid #ffcc80",borderRadius:6,padding:"5px 14px",fontSize:12,color:"#e65100",cursor:"pointer" }}>
                            Cancel
                          </button>
                        </div>
                        <div style={{ fontSize:11,color:"#bf360c",marginTop:8 }}>
                          The audit ID and reference number will remain unchanged. Only the planned date will be updated.
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {form.deferred_from&&(
                  <div style={{ gridColumn:"1/-1",background:"#fff8e1",borderRadius:7,padding:"8px 12px",border:"1px solid #ffe082",fontSize:12,color:"#795548" }}>
                    <strong>Deferral record:</strong> Originally planned for <strong>{form.deferred_from}</strong>
                    {form.deferred_reason&&<span> — Reason: {form.deferred_reason}</span>}
                  </div>
                )}
                <div><label style={labelStyle}>Opening Brief Time</label>
                  <input value={form.opening_brief} onChange={e=>set("opening_brief",e.target.value)} placeholder="e.g. 09:00" style={inputStyle}/>
                </div>
                <div><label style={labelStyle}>Closing Brief Time</label>
                  <input value={form.closing_brief} onChange={e=>set("closing_brief",e.target.value)} placeholder="e.g. 15:00" style={inputStyle}/>
                </div>
              </div>
              <div><label style={labelStyle}>Audit Criteria / Reference Documents</label>
                <input value={form.audit_criteria} onChange={e=>set("audit_criteria",e.target.value)} style={inputStyle}/>
              </div>
              <div><label style={labelStyle}>Notes / Scope</label>
                <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="Scope, methodology, areas covered..." style={{...inputStyle,resize:"vertical"}}/>
              </div>
            </div>
          )}

          {/* ── REPORT TAB ── */}
          {tab==="report" && (
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div style={{ padding:"10px 14px",background:"#e3f2fd",borderRadius:8,fontSize:12,color:"#01579b",borderLeft:"4px solid #01579b" }}>
                Complete this section after the audit is conducted. This forms the official audit report.
              </div>
              <div><label style={labelStyle}>Executive Summary</label>
                <textarea value={form.exec_summary} onChange={e=>set("exec_summary",e.target.value)} rows={5} placeholder="Provide an overall assessment of the audit area. Summarise the general level of compliance, key strengths and areas requiring improvement..." style={{...inputStyle,resize:"vertical"}}/>
              </div>
              <div style={sectionStyle}>
                <div style={{ fontSize:12,fontWeight:700,color:T.primaryDk,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5 }}>Summary of Results</div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12 }}>
                  {[
                    {label:"Level 1 / Critical NCs",val:findingItems.filter(f=>f.level.includes("Level 1")||f.level==="Regulatory").length,color:"#c62828",bg:"#ffebee"},
                    {label:"Level 2 / Major NCs",val:findingItems.filter(f=>f.level.includes("Level 2")).length,color:"#e65100",bg:"#fff3e0"},
                    {label:"Level 3 NCs",val:findingItems.filter(f=>f.level.includes("Level 3")).length,color:"#2e7d32",bg:"#e8f5e9"},
                    {label:"Observations",val:findingItems.filter(f=>f.level==="Observation").length,color:"#01579b",bg:"#e3f2fd"},
                  ].map(s=>(
                    <div key={s.label} style={{ background:s.bg,borderRadius:8,padding:"12px 14px",textAlign:"center" }}>
                      <div style={{ fontSize:28,fontWeight:800,color:s.color }}>{s.val}</div>
                      <div style={{ fontSize:11,color:s.color,fontWeight:600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={sectionStyle}>
                <div style={{ fontSize:12,fontWeight:700,color:T.primaryDk,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5 }}>Positive Findings / Commendations</div>
                <textarea value={form.positive_findings} onChange={e=>set("positive_findings",e.target.value)} rows={3} placeholder="Record any areas of good practice, compliance excellence or commendations noted during the audit..." style={{...inputStyle,resize:"vertical"}}/>
              </div>
              <div style={sectionStyle}>
                <div style={{ fontSize:12,fontWeight:700,color:T.primaryDk,marginBottom:12,textTransform:"uppercase",letterSpacing:0.5 }}>Report Administration</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <div><label style={labelStyle}>Prepared By</label>
                    <input value={form.prepared_by} onChange={e=>set("prepared_by",e.target.value)} placeholder="Lead Auditor name" style={inputStyle}/>
                  </div>
                  <div><label style={labelStyle}>Approved By</label>
                    <input value={form.approved_by} onChange={e=>set("approved_by",e.target.value)} placeholder="Quality Manager name" style={inputStyle}/>
                  </div>
                  <div style={{ gridColumn:"1/-1" }}><label style={labelStyle}>Distribution List</label>
                    <input value={form.distribution} onChange={e=>set("distribution",e.target.value)} placeholder="e.g. Accountable Manager, Quality Manager, Auditee" style={inputStyle}/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── FINDINGS TAB ── */}
          {tab==="findings" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ fontSize:13,color:T.muted }}>Record each individual finding. Findings will auto-populate the report summary.</div>
                <Btn size="sm" onClick={addFinding}>+ Add Finding</Btn>
              </div>
              {findingItems.length===0 && (
                <div style={{ padding:40,textAlign:"center",background:"#f5f8fc",borderRadius:10,border:"2px dashed #dde3ea" }}>
                  <div style={{ fontSize:32,marginBottom:8 }}>🔍</div>
                  <div style={{ fontSize:14,fontWeight:600,color:T.muted,marginBottom:4 }}>No findings recorded</div>
                  <div style={{ fontSize:12,color:T.muted,marginBottom:16 }}>Add findings, observations and non-conformances from this audit</div>
                  <Btn size="sm" onClick={addFinding}>+ Add First Finding</Btn>
                </div>
              )}
              {findingItems.map((f,i)=>{
                const levelColors = {
                  "Level 1 - Critical NC":{bg:"#ffebee",border:"#ef9a9a",text:"#c62828"},
                  "Level 2 - Major NC":   {bg:"#fff3e0",border:"#ffcc80",text:"#e65100"},
                  "Level 3 - Minor NC":{bg:"#e8f5e9",border:"#a5d6a7",text:"#2e7d32"},"Observation":{bg:"#e3f2fd",border:"#90caf9",text:"#01579b"},
                  "Repeat Finding":       {bg:"#fce4ec",border:"#f48fb1",text:"#880e4f"},
                  "Regulatory":           {bg:"#ffebee",border:"#ef9a9a",text:"#b71c1c"},
                };
                const lc = levelColors[f.level]||levelColors["Level 2 - Major NC"];
                return (
                  <div key={f.id} style={{ border:`2px solid ${lc.border}`,borderRadius:10,overflow:"hidden" }}>
                    <div style={{ padding:"8px 14px",background:lc.bg,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <span style={{ fontSize:12,fontWeight:700,color:lc.text }}>Finding #{i+1}</span>
                        <select value={f.level} onChange={e=>updateFinding(f.id,"level",e.target.value)} style={{ fontSize:11,fontWeight:700,color:lc.text,background:lc.bg,border:`1px solid ${lc.border}`,borderRadius:6,padding:"2px 6px",cursor:"pointer" }}>
                          {FINDING_LEVELS.map(l=><option key={l}>{l}</option>)}
                        </select>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        {f.level==="Observation"
                          ? <span style={{ fontSize:10,fontWeight:700,background:"#e3f2fd",color:"#0288d1",border:"1px solid #90caf9",borderRadius:5,padding:"2px 8px" }}>ℹ No CAR Required</span>
                          : f.car_raised && f.car_id
                            ? <span style={{ fontFamily:"monospace",fontSize:10,fontWeight:700,background:"#e8f5e9",color:"#2e7d32",border:"1px solid #a5d6a7",borderRadius:5,padding:"2px 7px" }}>✓ {f.car_id}</span>
                            : <button onClick={()=>setCarModal({finding:f})} style={{ fontSize:11,fontWeight:700,color:"#01579b",background:"#e3f2fd",border:"1px solid #90caf9",borderRadius:6,padding:"3px 10px",cursor:"pointer" }}>+ Raise CAR</button>
                        }
                        <button onClick={()=>removeFinding(f.id)} style={{ background:"none",border:"none",color:lc.text,cursor:"pointer",fontSize:16,fontWeight:700 }}>✕</button>
                      </div>
                    </div>
                    <div style={{ padding:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,background:"#fff" }}>
                      <div><label style={labelStyle}>Finding Reference</label>
                        <input value={f.ref} onChange={e=>updateFinding(f.id,"ref",e.target.value)} placeholder="e.g. F-001" style={inputStyle}/>
                      </div>
                      <div><label style={labelStyle}>QMS Clause / Reference</label>
                        <input value={f.clause} onChange={e=>updateFinding(f.id,"clause",e.target.value)} placeholder="e.g. 8.5.2" style={inputStyle}/>
                      </div>
                      <div style={{ gridColumn:"1/-1" }}><label style={labelStyle}>Finding Description</label>
                        <textarea value={f.description} onChange={e=>updateFinding(f.id,"description",e.target.value)} rows={3} placeholder="Describe the non-conformance or observation in detail. State what was found, where, and when..." style={{...inputStyle,resize:"vertical"}}/>
                      </div>
                      <div style={{ gridColumn:"1/-1" }}><label style={labelStyle}>Requirement / Standard</label>
                        <textarea value={f.requirement} onChange={e=>updateFinding(f.id,"requirement",e.target.value)} rows={2} placeholder="State the specific requirement that is not being met..." style={{...inputStyle,resize:"vertical"}}/>
                      </div>
                      <div style={{ gridColumn:"1/-1" }}><label style={labelStyle}>Objective Evidence</label>
                        <textarea value={f.evidence} onChange={e=>updateFinding(f.id,"evidence",e.target.value)} rows={2} placeholder="Describe the objective evidence observed (documents reviewed, records sighted, personnel interviewed)..." style={{...inputStyle,resize:"vertical"}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ATTACHMENTS TAB ── */}
          {tab==="attachments" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ fontSize:13,color:T.muted }}>Attach checklists, reference documents or supporting materials to this audit.</div>
                <label style={{ cursor:"pointer" }}>
                  <input type="file" multiple style={{ display:"none" }} onChange={e=>addAttachment(e.target.files)}/>
                  <span style={{ background:T.primary,color:"#fff",padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:600 }}>+ Add Files</span>
                </label>
              </div>
              {attachments.length===0 ? (
                <label style={{ cursor:"pointer",display:"block" }}>
                  <input type="file" multiple style={{ display:"none" }} onChange={e=>addAttachment(e.target.files)}/>
                  <div style={{ padding:40,textAlign:"center",background:"#f5f8fc",borderRadius:10,border:"2px dashed #dde3ea" }}>
                    <div style={{ fontSize:32,marginBottom:8 }}>📎</div>
                    <div style={{ fontSize:14,fontWeight:600,color:T.muted,marginBottom:4 }}>No attachments yet</div>
                    <div style={{ fontSize:12,color:T.muted }}>Click to attach checklists, reference documents or supporting materials</div>
                  </div>
                </label>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {attachments.map((f,i)=>(
                    <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f5f8fc",border:"1px solid #dde3ea",borderRadius:8,padding:"10px 14px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <span style={{ fontSize:20 }}>
                          {f.name&&f.name.endsWith(".pdf")?"📄":f.name&&f.name.match(/\.(doc|docx)$/)?"📝":f.name&&f.name.match(/\.(xls|xlsx)$/)?"📊":"📎"}
                        </span>
                        <div>
                          <div style={{ fontSize:13,fontWeight:600,color:T.primaryDk }}>{f.name}</div>
                          <div style={{ fontSize:11,color:T.muted }}>{f.size?Math.round(f.size/1024)+"KB":""}{f.addedAt?" · Added "+new Date(f.addedAt).toLocaleDateString("en-GB"):""}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                        {(f.dataUrl||f.url)&&(
                          <a href={f.dataUrl||f.url} download={f.name}
                            style={{ background:T.primary,color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,textDecoration:"none" }}>
                            ⬇ Download
                          </a>
                        )}
                        <button onClick={()=>removeAttachment(i)} style={{ background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:18,fontWeight:700,lineHeight:1 }}>✕</button>
                      </div>
                    </div>
                  ))}
                  <label style={{ cursor:"pointer",display:"block" }}>
                    <input type="file" multiple style={{ display:"none" }} onChange={e=>addAttachment(e.target.files)}/>
                    <div style={{ padding:"10px 14px",textAlign:"center",background:"#f5f8fc",borderRadius:8,border:"1.5px dashed #dde3ea",fontSize:12,color:T.muted,fontWeight:600 }}>
                      + Add more files
                    </div>
                  </label>
                </div>
              )}
              <div style={{ padding:"10px 14px",background:"#e3f2fd",borderRadius:8,fontSize:12,color:"#01579b",borderLeft:"4px solid #01579b" }}>
                Attachment names are listed on the printed Audit Notification Form (QMS 002). Save the record to retain the attachment list.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:"flex",gap:10,justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #eef2f7",background:"#fafbfc",flexShrink:0,flexWrap:"wrap" }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="ghost" onClick={()=>generateNotificationPDF({...slot,...form,attachments})}>🔔 Notification Form</Btn>
          {slot.status==="Completed"&&<Btn variant="ghost" onClick={()=>generateAuditReport({...slot,...form,finding_items:JSON.stringify(findingItems),org_prefix:org?.car_prefix||"ORG"})}>📄 Audit Report PDF</Btn>}
          <Btn onClick={handleSave}>💾 Save Audit Record</Btn>
        </div>
      </div>
    </div>
    {carModal&&(()=>{
      const f = carModal.finding;
      const existing = (data?.cars||[]).filter(c=>c.audit_ref===auditRef).length;
      const nextN = String(existing+1).padStart(3,"0");
      const levelSeverity = f.level.includes("Level 1")||f.level==="Regulatory" ? "Major" : "Minor";
      const preFilled = {
        id: `${auditRef}-CAPA-${nextN}`,
        audit_ref: auditRef,
        status: "Open",
        severity: levelSeverity,
        date_raised: today(),
        finding_description: f.description,
        qms_clause: f.clause||"",
      };
      return (
        <CARModal
          car={preFilled}
          managers={managers}
          allCars={data?.cars||[]}
          auditSchedule={data?.auditSchedule||[]}
          orgPrefix={org?.car_prefix||"ORG"}
          auditAreas={org?.audit_areas||null}
          fromAudit={true}
          onSave={(carForm)=>saveCarFromFinding(carForm, f.id)}
          onClose={()=>setCarModal(null)}
        />
      );
    })()}
  </>
  );
};

// ─── Audit Report PDF Generator ───────────────────────────────
const generateAuditReport = async (slot) => {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W=210; const M=14; const col=W-M*2;
  const LINE_H=4.5; const LABEL_SZ=6.5; const BODY_SZ=9;

  let findingItems = [];
  try { findingItems = JSON.parse(slot.finding_items||"[]"); } catch {}

  // ── helpers (same pattern as CAPA PDF) ──
  const sectionTitle = (text, y, color=[1,87,155]) => {
    doc.setFillColor(...color); doc.rect(M,y,col,7,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
    doc.text(text, M+3, y+4.8); doc.setTextColor(0,0,0);
    return y+9;
  };
  const box = (label, value, x, y, w) => {
    doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ);
    const lines = doc.splitTextToSize(String(value||"—"), w-5);
    const h = 5+4+lines.length*LINE_H+3;
    doc.setFillColor(245,248,252); doc.rect(x,y,w,h,"F");
    doc.setDrawColor(221,227,234); doc.rect(x,y,w,h,"S");
    doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
    doc.text(label.toUpperCase(), x+2.5, y+4);
    doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ); doc.setTextColor(26,35,50);
    doc.text(lines, x+2.5, y+4+LINE_H+1);
    return y+h+2;
  };
  const boxRow = (pairs, x, y, totalW) => {
    const gap=2; const n=pairs.length; const w=(totalW-(n-1)*gap)/n;
    let maxH=0;
    pairs.forEach(([,val])=>{
      doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ);
      const lines=doc.splitTextToSize(String(val||"—"),w-5);
      const h=5+4+lines.length*LINE_H+3; if(h>maxH) maxH=h;
    });
    pairs.forEach(([label,val],i)=>{
      const bx=x+i*(w+gap);
      doc.setFillColor(245,248,252); doc.rect(bx,y,w,maxH,"F");
      doc.setDrawColor(221,227,234); doc.rect(bx,y,w,maxH,"S");
      doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
      doc.text(label.toUpperCase(), bx+2.5, y+4);
      doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ); doc.setTextColor(26,35,50);
      const lines=doc.splitTextToSize(String(val||"—"),w-5);
      doc.text(lines, bx+2.5, y+4+LINE_H+1);
    });
    return y+maxH+2;
  };
  const FOOTER_Y=287; const NEW_PAGE_Y=20;
  const needPage = (cy, need=20) => { if(cy+need>FOOTER_Y){ doc.addPage(); return NEW_PAGE_Y; } return cy; };
  const addFooter = () => {
    const pages = doc.getNumberOfPages();
    for(let i=1;i<=pages;i++){
      doc.setPage(i);
      doc.setDrawColor(221,227,234); doc.setLineWidth(0.3); doc.line(M,286,W-M,286);
      doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(140,160,180);
      doc.text("AeroQualify Pro · Quality Management System · Audit Report  |  QMS 004  |  CONTROLLED DOCUMENT", M, 290);
      doc.text(`Page ${i} of ${pages}`, W-M, 290, {align:"right"});
    }
  };

  // ── HEADER ──────────────────────────────────────────────────
  doc.setFillColor(26,35,50); doc.rect(0,0,W,28,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(255,255,255);
  doc.text("AeroQualify Pro", M, 11);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(160,185,210);
  doc.text("AUDIT REPORT — QMS 004", M, 17);
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(160,185,210);
  doc.text(`Issued: ${new Date().toLocaleDateString("en-GB")}`, W-M, 17, {align:"right"});

  let y = 34;

  // ── AUDIT IDENTITY BAR ───────────────────────────────────────
  const AREA_CODES_PDF = {
    "Ground School Training":"007","Flight Training Records":"008",
    "Company Manuals & Documents":"009","Base Training Facilities":"010",
    "Aircraft":"011","AMO":"012","Management Personnel Records":"013",
    "Ground & Flight Instructor Records":"014","Quality Management":"016",
    "Safety Management Systems":"017","Fuel Supplier":"022",
  };
  const _aCode = AREA_CODES_PDF[slot.area]||"000";
  const _aDate = slot.planned_date ? new Date(slot.planned_date) : new Date(slot.year,(slot.month||1)-1,1);
  const _dd=String(_aDate.getDate()).padStart(2,"0"),_mm=String(_aDate.getMonth()+1).padStart(2,"0"),_yyyy=_aDate.getFullYear();
  const auditRefNum = `${slot.org_prefix||"ORG"}-QMS-${_aCode}-${_dd}${_mm}${_yyyy}`;
  const statusColors = {
    Completed:[46,125,50], "In Progress":[1,87,155],
    Scheduled:[245,127,23], Overdue:[198,40,40], Cancelled:[117,117,117]
  };
  const sc = statusColors[slot.status]||[1,87,155];
  doc.setFillColor(245,248,252); doc.rect(M,y,col,16,"F");
  doc.setDrawColor(221,227,234); doc.rect(M,y,col,16,"S");
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(26,35,50);
  const areaTitle = `${slot.area} — ${auditRefNum}`;
  doc.text(doc.splitTextToSize(areaTitle, col-40)[0], M+4, y+7);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(95,114,133);
  doc.text(`${MONTHS[(slot.month||1)-1]} ${slot.year}  ·  ${slot.audit_type||"Internal"}`, M+4, y+13);
  // Status badge
  doc.setFillColor(...sc); doc.roundedRect(W-M-28, y+4, 26, 8, 2, 2, "F");
  doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(255,255,255);
  doc.text((slot.status||"Scheduled").toUpperCase(), W-M-15, y+9.2, {align:"center"});
  y += 20;

  // ── SECTION 1: AUDIT DETAILS ─────────────────────────────────
  y = needPage(y,12); y = sectionTitle("SECTION 1 — AUDIT DETAILS", y);
  y = boxRow([["Lead Auditor", slot.lead_auditor||"—"],["Auditee / Department", slot.auditee||"—"]], M, y, col);
  y = boxRow([["Planned Date", slot.planned_date||"—"],["Actual Date", slot.actual_date||"—"]], M, y, col);
  y = boxRow([["Opening Brief", slot.opening_brief||"—"],["Closing Brief", slot.closing_brief||"—"]], M, y, col);
  y = needPage(y,20); y = box("Audit Criteria / Reference Documents", slot.audit_criteria||"—", M, y, col);
  y = needPage(y,20); y = box("Scope / Areas Covered", slot.notes||"—", M, y, col);
  y += 4;

  // ── SECTION 2: EXECUTIVE SUMMARY ────────────────────────────
  y = needPage(y,12); y = sectionTitle("SECTION 2 — EXECUTIVE SUMMARY", y, [0,105,92]);
  y = needPage(y,20); y = box("Executive Summary", slot.exec_summary||"—", M, y, col);

  // Results summary boxes
  y = needPage(y,22);
  const level1 = findingItems.filter(f=>f.level.includes("Level 1")||f.level==="Regulatory").length;
  const level2 = findingItems.filter(f=>f.level.includes("Level 2")).length;
  const level3 = findingItems.filter(f=>f.level.includes("Level 3")).length;
  const obs    = findingItems.filter(f=>f.level==="Observation").length;
  const repeat = findingItems.filter(f=>f.level==="Repeat Finding").length;
  const resultW = (col-8)/5;
  [
    ["Level 1 / Critical NCs", level1, [198,40,40]],
    ["Level 2 / Major NCs", level2, [230,81,0]],
    ["Level 3 / Minor NCs", level3, [46,125,50]],
    ["Observations",        obs,    [1,87,155]],
    ["Repeat Findings",     repeat, [136,14,79]],
  ].forEach(([label, val, color], i) => {
    const bx = M + i*(resultW+2);
    doc.setFillColor(color[0],color[1],color[2]); doc.rect(bx,y,resultW,18,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(16); doc.setTextColor(255,255,255);
    doc.text(String(val), bx+resultW/2, y+11, {align:"center"});
    doc.setFontSize(6); doc.text(label.toUpperCase(), bx+resultW/2, y+16, {align:"center"});
  });
  y += 22;

  if(slot.positive_findings){
    y = needPage(y,20); y = box("Positive Findings / Commendations", slot.positive_findings, M, y, col);
  }
  y += 4;

  // ── SECTION 3: FINDINGS DETAIL ───────────────────────────────
  if(findingItems.length > 0){
    y = needPage(y,12); y = sectionTitle("SECTION 3 — DETAILED FINDINGS", y, [183,28,28]);
    findingItems.forEach((f, fi) => {
      y = needPage(y, 50);
      const levelC = f.level.includes("Level 1")||f.level==="Regulatory" ? [198,40,40] :
                     f.level.includes("Level 2") ? [230,81,0] :
                     f.level.includes("Level 3") ? [46,125,50] :
                     f.level==="Observation"     ? [1,87,155] :
                     f.level==="Repeat Finding"  ? [136,14,79] : [95,114,133];
      // Finding header bar
      doc.setFillColor(...levelC); doc.rect(M,y,col,7,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
      doc.text(`Finding #${fi+1}  —  ${f.level}${f.ref?" ("+f.ref+")":""}`, M+3, y+4.8);
      if((f.car_raised||f.car_id) && f.level!=="Observation"){ doc.text("CAR RAISED ✓", W-M-3, y+4.8, {align:"right"}); }
      y += 9;
      if(f.clause){ y = boxRow([["QMS Clause / Reference", f.clause],["Car Raised", f.level==="Observation"?"N/A — Observation":(f.car_raised||f.car_id)?`Yes — ${f.car_id||""}`.trim():"No"]], M, y, col); }
      y = needPage(y,20); y = box("Finding Description", f.description||"—", M, y, col);
      if(f.requirement){ y = needPage(y,20); y = box("Requirement / Standard Not Met", f.requirement, M, y, col); }
      if(f.evidence){ y = needPage(y,20); y = box("Objective Evidence", f.evidence, M, y, col); }
      y += 4;
    });
  } else {
    y = needPage(y,12); y = sectionTitle("SECTION 3 — DETAILED FINDINGS", y, [183,28,28]);
    y = needPage(y,14); y = box("Findings", "No findings or non-conformances recorded for this audit.", M, y, col);
    y += 4;
  }

  // ── SECTION 4: REPORT ADMINISTRATION ─────────────────────────
  // Force new page if less than 80mm remaining — prevents content bleeding into footer
  if(y > 210) { doc.addPage(); y = NEW_PAGE_Y; }
  y = sectionTitle("SECTION 4 — REPORT ADMINISTRATION", y, [69,39,160]);
  y = boxRow([["Prepared By", slot.prepared_by||"—"],["Approved By", slot.approved_by||"—"]], M, y, col);
  y = needPage(y,20); y = box("Distribution List", slot.distribution||"—", M, y, col);
  y += 4;

  // ── SIGNATURE BLOCK ───────────────────────────────────────────
  y = needPage(y, 45);
  doc.setDrawColor(221,227,234); doc.setLineWidth(0.3);
  const sigW3 = (col-8)/3;
  [["Lead Auditor Signature", slot.lead_auditor||""], ["Quality Manager Signature", slot.approved_by||""], ["Accountable Manager Signature", ""]].forEach(([label, name], i) => {
    const bx = M + i*(sigW3+4);
    doc.setFillColor(245,248,252); doc.rect(bx,y,sigW3,30,"F");
    doc.setDrawColor(221,227,234); doc.rect(bx,y,sigW3,30,"S");
    doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
    doc.text(label.toUpperCase(), bx+3, y+5);
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(26,35,50);
    if(name) doc.text(name, bx+3, y+13);
    doc.setDrawColor(170,190,210); doc.line(bx+3, y+22, bx+sigW3-3, y+22);
    doc.setFontSize(7); doc.setTextColor(140,160,180);
    doc.text("Signature", bx+3, y+26);
    doc.line(bx+3, y+29, bx+sigW3-3, y+29);
  });
  y += 34;

  // ── Attached Evidence Files ──────────────────────────────────
  let auditEvidenceFiles = [];
  try { auditEvidenceFiles = JSON.parse(slot.attachments||"[]"); } catch {}
  if(!slot.attachments && slot.attachment_url) auditEvidenceFiles = [{name:slot.attachment_name||"attachment",url:slot.attachment_url}];

  const reportPageCount = doc.getNumberOfPages();
  // eslint-disable-next-line no-loop-func
  const drawAuditEvidenceHeader = (evFile, fi, total) => {
    doc.addPage();
    doc.setFillColor(26,35,50); doc.rect(0,0,W,18,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
    doc.text(`AUDIT EVIDENCE — File ${fi+1} of ${total}`, M, 8);
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(200,210,220);
    doc.text(evFile.name, W-M, 8, {align:"right"});
    doc.setFontSize(7); doc.setTextColor(160,180,200);
    doc.text(`Audit: ${slot.area} — ${auditRefNum}`, M, 14);
  };
  for(let fi=0; fi<auditEvidenceFiles.length; fi++){
    const evFile = auditEvidenceFiles[fi];
    if(!evFile?.url && !evFile?.name) continue;
    try {
      const ext = (evFile.name.split(".").pop()||"").toLowerCase();
      const isImage = ["jpg","jpeg","png","gif","webp"].includes(ext);
      const fileData = evFile.dataUrl || evFile.url || "";
      const isInline = fileData.startsWith("data:");


      if(isImage){
        drawAuditEvidenceHeader(evFile, fi, auditEvidenceFiles.length);
        let dataUrl = fileData;
        if(!isInline){
          const resp = await fetch(evFile.url);
          if(!resp.ok) throw new Error("fetch failed");
          const blob = await resp.blob();
          dataUrl = await new Promise(res=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(blob); });
        }
        const imgTop=22; const imgBottom=284;
        const maxW=W-M*2; const maxH=imgBottom-imgTop;
        const imgProps = doc.getImageProperties(dataUrl);
        let iw=imgProps.width; let ih=imgProps.height;
        const scale = Math.min(maxW/iw, maxH/ih, 1);
        iw*=scale; ih*=scale;
        doc.addImage(dataUrl, ext==="png"?"PNG":"JPEG", M+(maxW-iw)/2, imgTop+(maxH-ih)/2, iw, ih);
      } else if(ext==="pdf"){
        // PDF files — use pdf-lib to merge (already imported at top of app)
        try{
          const { PDFDocument } = await import("pdf-lib");
          let pdfBytes;
          if(isInline){
            const base64 = fileData.split(",")[1];
            const binary = atob(base64);
            const arr = new Uint8Array(binary.length);
            for(let bi=0;bi<binary.length;bi++) arr[bi]=binary.charCodeAt(bi);
            pdfBytes = arr.buffer;
          } else {
            const resp = await fetch(evFile.url);
            if(!resp.ok) throw new Error("fetch failed");
            pdfBytes = await resp.arrayBuffer();
          }
          // Queue for merging after jsPDF is saved — no placeholder page needed
          if(!window._auditMergeQueue) window._auditMergeQueue = [];
          window._auditMergeQueue.push({ name: evFile.name, bytes: pdfBytes, index: fi+1, total: auditEvidenceFiles.length });
          // Skip adding a page - the actual PDF pages will be appended by the merge step
          continue;
        } catch(pdfErr){
          console.warn("PDF queue failed:", pdfErr);
          doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(26,35,50);
          doc.text("PDF: "+evFile.name, M, 32);
          if(isInline && evFile.url){ doc.setTextColor(1,87,155); doc.textWithLink("Download", M, 42, {url:evFile.url}); }
        }
      } else {
        // Non-renderable file types (docx, xlsx etc) — show evidence record with download
        drawAuditEvidenceHeader(evFile, fi, auditEvidenceFiles.length);
        const badgeColors={"docx":[0,120,215],"doc":[0,120,215],"xlsx":[33,115,70],"xls":[33,115,70],"txt":[95,114,133]};
        const bc=badgeColors[ext]||[95,114,133];
        doc.setFillColor(245,248,252); doc.rect(M,24,col,60,"F");
        doc.setDrawColor(221,227,234); doc.rect(M,24,col,60,"S");
        doc.setFillColor(...bc); doc.rect(M+4,28,18,8,"F");
        doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(255,255,255);
        doc.text(ext.toUpperCase(), M+13, 33.5, {align:"center"});
        doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(26,35,50);
        const nameLines = doc.splitTextToSize(evFile.name, col-30);
        doc.text(nameLines[0], M+26, 34);
        doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(55,71,79);
        doc.text(`Audit Evidence for: ${slot.area}`, M+4, 48);
        doc.text(`File type: ${ext.toUpperCase()} — cannot be rendered inside PDF`, M+4, 57);
        if(evFile.url && !isInline){ doc.setTextColor(1,87,155); doc.textWithLink("Click to open / download original file", M+4, 68, {url:evFile.url}); }
        else if(isInline && evFile.url){ doc.setTextColor(1,87,155); doc.textWithLink("Click to download from AeroQualify", M+4, 68, {url:evFile.url}); }
      }
    } catch(evErr){ console.warn("Evidence page failed:", evFile.name, evErr); }
  }

  // Rebuild footer with correct total page count including evidence pages
  const totalPages = doc.getNumberOfPages();
  for(let i=1; i<=totalPages; i++){
    doc.setPage(i);
    const isEvPage = i > reportPageCount;
    doc.setFillColor(isEvPage?26:245, isEvPage?35:248, isEvPage?50:252);
    doc.rect(0,287,W,10,"F");
    doc.setDrawColor(isEvPage?60:221, isEvPage?80:227, isEvPage?100:234);
    doc.setLineWidth(0.3); doc.line(0,287,W,287);
    doc.setFont("helvetica","normal"); doc.setFontSize(7);
    doc.setTextColor(isEvPage?200:95, isEvPage?210:114, isEvPage?220:133);
    doc.text("AeroQualify Pro · Quality Management System · Audit Report  |  QMS 004  |  CONTROLLED DOCUMENT", M, 293);
    doc.text(`Page ${i} of ${totalPages}`, W-M, 293, {align:"right"});
  }

  const filename = `Audit-Report-${slot.area.replace(/[\s/]+/g,"-")}-${slot.year}-Slot${slot.slot}.pdf`;

  // ── Merge queued PDF evidence files ──────────────────────────
  if(window._auditMergeQueue && window._auditMergeQueue.length > 0){
    try {
      const { PDFDocument } = await import("pdf-lib");
      const mainBytes = doc.output("arraybuffer");
      const mainPdf = await PDFDocument.load(mainBytes);
      for(const item of window._auditMergeQueue){
        try {
          const evPdf = await PDFDocument.load(item.bytes);
          const pages = await mainPdf.copyPages(evPdf, evPdf.getPageIndices());
          pages.forEach(p => mainPdf.addPage(p));
        } catch(e){ console.warn("Could not merge:", item.name, e); }
      }
      window._auditMergeQueue = [];
      const mergedBytes = await mainPdf.save();
      const blob = new Blob([mergedBytes], {type:"application/pdf"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 5000);
    } catch(mergeErr){
      console.warn("PDF merge failed, saving without evidence:", mergeErr);
      doc.save(filename);
    }
  } else {
    doc.save(filename);
  }
};


const SCHEDULE_PASSWORD = "QM2024!";

// ── Schedule PDF export ────────────────────────────────────────
const generateSchedulePDF = async (yearSlots, year, approval, auditAreasList=AUDIT_AREAS) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
  const W=297; const H=210; const M=12; const col=W-M*2;
  const addFooter = () => {
    const pages = doc.getNumberOfPages();
    for(let i=1;i<=pages;i++){
      doc.setPage(i);
      doc.setDrawColor(221,227,234); doc.setLineWidth(0.3); doc.line(M,H-8,W-M,H-8);
      doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(140,160,180);
      doc.text("AeroQualify Pro · QMS Annual Audit Programme · CONTROLLED DOCUMENT", M, H-4);
      doc.text(`Page ${i} of ${pages}`, W-M, H-4, {align:"right"});
    }
  };

  // Header
  doc.setFillColor(26,35,50); doc.rect(0,0,W,22,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(16); doc.setTextColor(255,255,255);
  doc.text("AeroQualify Pro", M, 10);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(160,185,210);
  doc.text(`ANNUAL AUDIT PROGRAMME — ${year}`, M, 17);
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(160,185,210);
  doc.text("Pegasus Flyers (E.A.) Ltd.  |  Wilson Airport, Nairobi", W-M, 10, {align:"right"});
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, W-M, 17, {align:"right"});

  let y = 28;
  // Column widths
  const areaW = 52; const monthW = (col - areaW - 22) / 12; const statusW = 22;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Table header
  doc.setFillColor(1,87,155); doc.rect(M,y,col,8,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(255,255,255);
  doc.text("AUDIT AREA", M+2, y+5.2);
  months.forEach((m,i) => doc.text(m, M+areaW+i*monthW+monthW/2, y+5.2, {align:"center"}));
  doc.text("STATUS", M+areaW+12*monthW+statusW/2, y+5.2, {align:"center"});
  y += 8;

  // Rows
  auditAreasList.forEach((area, ai) => {
    const rowH = 10;
    doc.setFillColor(ai%2===0?255:248,ai%2===0?255:250,ai%2===0?255:252);
    doc.rect(M,y,col,rowH,"F");
    doc.setDrawColor(221,227,234); doc.setLineWidth(0.2); doc.rect(M,y,col,rowH,"S");
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(26,35,50);
    doc.text(area, M+2, y+6.5);

    const slot1 = yearSlots.find(s=>s.area===area&&s.slot===1);
    const slot2 = yearSlots.find(s=>s.area===area&&s.slot===2);

    months.forEach((_,mi) => {
      const cx = M+areaW+mi*monthW+monthW/2;
      const s1 = slot1?.month===mi+1 ? slot1 : null;
      const s2 = slot2?.month===mi+1 ? slot2 : null;
      const slot = s1||s2;
      if(slot){
        const colors = {
          Completed:[46,125,50], "In Progress":[1,87,155],
          Scheduled:[245,127,23], Overdue:[198,40,40], Cancelled:[117,117,117]
        };
        const c = colors[slot.status]||[245,127,23];
        doc.setFillColor(...c);
        doc.roundedRect(cx-4,y+2,8,6,1,1,"F");
        doc.setFont("helvetica","bold"); doc.setFontSize(5.5); doc.setTextColor(255,255,255);
        doc.text(String(slot.slot), cx, y+6.2, {align:"center"});
      }
    });

    // Status
    const done = [slot1,slot2].filter(s=>s?.status==="Completed").length;
    const statusText = done===2?"Complete":`${done}/2`;
    const statusColor = done===2?[46,125,50]:[245,127,23];
    doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(...statusColor);
    doc.text(statusText, M+areaW+12*monthW+statusW/2, y+6.5, {align:"center"});
    y += rowH;
  });

  // Legend
  y += 6;
  doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(95,114,133);
  doc.text("LEGEND:", M, y);
  [["Scheduled",[245,127,23]],["In Progress",[1,87,155]],["Completed",[46,125,50]],["Overdue",[198,40,40]],["Cancelled",[117,117,117]]].forEach(([l,c],i) => {
    const bx = M+22+i*32;
    doc.setFillColor(...c); doc.roundedRect(bx,y-4,8,5,1,1,"F");
    doc.setTextColor(95,114,133); doc.setFont("helvetica","normal");
    doc.text(l, bx+10, y);
  });

  // Approval section
  y += 12;
  doc.setFillColor(245,248,252); doc.rect(M,y,col,36,"F");
  doc.setDrawColor(221,227,234); doc.rect(M,y,col,36,"S");
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(26,35,50);
  doc.text("PROGRAMME APPROVAL", M+3, y+6);
  const sigW = (col-6)/2;
  [
    ["Generated By — Quality Manager", approval?.qm_name||"", approval?.qm_date||""],
    ["Approved By — Accountable Manager", approval?.am_name||"", approval?.am_date||""],
  ].forEach(([label, name, date], i) => {
    const bx = M+3+i*(sigW+3);
    doc.setFont("helvetica","bold"); doc.setFontSize(6.5); doc.setTextColor(95,114,133);
    doc.text(label.toUpperCase(), bx, y+13);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(26,35,50);
    doc.text(name||"________________________________", bx, y+21);
    doc.setFontSize(7); doc.setTextColor(95,114,133);
    doc.text(`Date: ${date||"________________"}`, bx, y+28);
    doc.setDrawColor(170,190,210); doc.setLineWidth(0.3);
    doc.line(bx, y+32, bx+sigW-6, y+32);
    doc.setFontSize(6.5); doc.setTextColor(140,160,180);
    doc.text("Signature", bx, y+35.5);
  });

  addFooter();
  doc.save(`Audit-Programme-${year}.pdf`);
};

// ── Audit Notification PDF ─────────────────────────────────────
const generateNotificationPDF = async (slot) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W=210; const M=14; const col=W-M*2;

  const addFooter = () => {
    const pages = doc.getNumberOfPages();
    for(let i=1;i<=pages;i++){
      doc.setPage(i);
      doc.setDrawColor(221,227,234); doc.setLineWidth(0.3); doc.line(M,285,W-M,285);
      doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(140,160,180);
      doc.text(`Pegasus Flyers (E.A.) Ltd. · QMS 002 · Audit Notification · Ref: ${notifRef}`, M, 289);
      doc.text(`CONTROLLED DOCUMENT  ·  Page ${i} of ${pages}`, W-M, 289, {align:"right"});
    }
  };

  const FOOTER_Y = 276; const NEW_PAGE_Y = 20;

  // Area code lookup — PGF-QMS-XXX
  const AREA_CODES = {
    "Ground School Training"       : "007",
    "Flight Training Records"      : "008",
    "Company Manuals & Documents"  : "009",
    "Base Training Facilities"     : "010",
    "Aircraft"                     : "011",
    "AMO"                          : "012",
    "Management Personnel Records" : "013",
    "Ground & Flight Instructor Records": "014",
    "Quality Management"           : "016",
    "Safety Management Systems"    : "017",
    "Fuel Supplier"                : "022",
  };
  const areaCode = AREA_CODES[slot.area] || "000";

  // Date of scheduled audit — use planned_date if set, else derive from month/year
  const auditDateObj = slot.planned_date
    ? new Date(slot.planned_date)
    : new Date(slot.year, (slot.month || 1) - 1, 1);
  const dd   = String(auditDateObj.getDate()).padStart(2,"0");
  const mm   = String(auditDateObj.getMonth()+1).padStart(2,"0");
  const yyyy = auditDateObj.getFullYear();

  const notifRef = `PGF-QMS-${areaCode}-${dd}${mm}${yyyy}`;

  const needPage = (cy, need=20) => { if(cy+need>FOOTER_Y){ doc.addPage(); return NEW_PAGE_Y; } return cy; };

  // ── Header ───────────────────────────────────────────────────
  doc.setFillColor(26,35,50); doc.rect(0,0,W,28,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(255,255,255);
  doc.text("AeroQualify Pro", M, 11);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(160,185,210);
  doc.text("AUDIT NOTIFICATION FORM — QMS 002", M, 17);
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(160,185,210);
  doc.text("Pegasus Flyers (E.A.) Ltd.  |  Wilson Airport, Nairobi  |  +254206001467/8", W-M, 11, {align:"right"});
  doc.text(`Issued: ${new Date().toLocaleDateString("en-GB")}`, W-M, 17, {align:"right"});

  let y = 34;

  // ── Ref bar ──────────────────────────────────────────────────
  doc.setFillColor(1,87,155); doc.rect(M,y,col,10,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(255,255,255);
  doc.text(`Notification Reference: ${notifRef}`, M+3, y+6.5);
  doc.text(`${slot.area}`, W-M-3, y+6.5, {align:"right"});
  y += 14;

  const hw = (col-2)/2;
  const drawBox = (label, value, x, bY, w, h) => {
    doc.setFillColor(245,248,252); doc.rect(x,bY,w,h,"F");
    doc.setDrawColor(221,227,234); doc.rect(x,bY,w,h,"S");
    doc.setFont("helvetica","bold"); doc.setFontSize(6.5); doc.setTextColor(95,114,133);
    doc.text(label.toUpperCase(), x+2.5, bY+4);
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(26,35,50);
    const lines = doc.splitTextToSize(String(value||"—"), w-5);
    doc.text(lines, x+2.5, bY+9);
    return bY+h+2;
  };
  const halfBox = (label, value, x, bY) => {
    doc.setFillColor(245,248,252); doc.rect(x,bY,hw,14,"F");
    doc.setDrawColor(221,227,234); doc.rect(x,bY,hw,14,"S");
    doc.setFont("helvetica","bold"); doc.setFontSize(6.5); doc.setTextColor(95,114,133);
    doc.text(label.toUpperCase(), x+2.5, bY+4);
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(26,35,50);
    doc.text(String(value||"TBC"), x+2.5, bY+9);
  };

  // ── SECTION 1: AUDIT DETAILS ─────────────────────────────────
  doc.setFillColor(1,87,155); doc.rect(M,y,col,7,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
  doc.text("SECTION 1 — AUDIT DETAILS", M+3, y+4.8);
  y+=9;

  drawBox("Audit Area", slot.area, M, y, col, 14); y+=16;
  halfBox("Audit Type", slot.audit_type||"Internal", M, y);
  halfBox("Audit Ref / Slot", `${slot.year} — Slot #${slot.slot}`, M+hw+2, y);
  y+=16;
  halfBox("Planned Date", slot.planned_date||"TBC", M, y);
  halfBox("Lead Auditor", slot.lead_auditor||"TBC", M+hw+2, y);
  y+=16;
  halfBox("Auditee / Responsible Manager", slot.auditee||"TBC", M, y);
  halfBox("Department / Area", slot.area||"TBC", M+hw+2, y);
  y+=16;
  halfBox("Opening Brief", slot.opening_brief||"TBC", M, y);
  halfBox("Closing Brief", slot.closing_brief||"TBC", M+hw+2, y);
  y+=16;
  drawBox("Audit Criteria / Reference Documents", slot.audit_criteria||"AS9100D / KCAA ANO / Quality Manual", M, y, col, 14); y+=16;
  drawBox("Scope of Audit", slot.notes||"As per Annual Audit Programme", M, y, col, 18); y+=20;

  // ── SECTION 2: PLANNED SEQUENCE OF EVENTS ───────────────────
  const phases = [
    {
      num:"1",
      title:"Data Gathering and Review",
      color:[46,125,50],
      text:"Prior to the on-site audit, the lead auditor will conduct a desktop review of all relevant documentation, records, manuals and previous audit findings pertaining to the audit area. This phase includes review of applicable regulatory requirements, quality manual provisions and any outstanding corrective actions."
    },
    {
      num:"2",
      title:"On-Site Audit",
      color:[1,87,155],
      text:"The lead auditor will conduct the on-site inspection of the audit area, interviewing relevant personnel, observing processes and verifying objective evidence against established criteria. An opening brief will be held at the start and a closing brief at the conclusion of the on-site phase to discuss preliminary findings."
    },
    {
      num:"3",
      title:"Analysis and Issuance of Corrective Action Requests",
      color:[183,28,28],
      text:"Following the on-site audit, all findings will be analysed and classified as Level 1 (Major Non-Conformance), Level 2 (Minor Non-Conformance) or Observation. Formal Corrective Action Requests (CARs) will be issued to the Responsible Manager for all non-conformances identified, with due dates assigned in accordance with severity."
    }
  ];

  // Pre-calculate total height for Section 2 background before drawing
  const textIndent = M+16; const textW = col-20;
  const PH = 4.5;    // line height for 8pt body text
  const BADGE_H = 6; // height of phase badge/title row
  const DESC_GAP = 2; // gap between title row and description
  const PHASE_GAP = 6; // gap between phases

  let sec2H = 5; // top padding
  phases.forEach(phase => {
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    const ln = doc.splitTextToSize(phase.text, textW);
    sec2H += BADGE_H + DESC_GAP + ln.length * PH + PHASE_GAP;
  });
  sec2H += 3; // bottom padding

  y = needPage(y, sec2H + 9);
  doc.setFillColor(0,105,92); doc.rect(M,y,col,7,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
  doc.text("SECTION 2 — PLANNED SEQUENCE OF EVENTS", M+3, y+4.8);
  y += 9;

  // Draw background with pre-calculated height
  doc.setFillColor(232,245,233); doc.rect(M,y,col,sec2H,"F");
  doc.setDrawColor(200,230,201); doc.setLineWidth(0.3); doc.rect(M,y,col,sec2H,"S");

  let py = y + 5;
  phases.forEach((phase) => {
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    const pLines = doc.splitTextToSize(phase.text, textW);
    const blockH = BADGE_H + DESC_GAP + pLines.length * PH;

    // Coloured left accent stripe spanning full block
    doc.setFillColor(...phase.color);
    doc.rect(M+3, py, 2, blockH, "F");

    // Phase number badge
    doc.setFillColor(...phase.color);
    doc.roundedRect(M+7, py, 7, 5.5, 1.5, 1.5, "F");
    doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
    doc.text(phase.num, M+10.5, py + 4, {align:"center"});

    // Phase title — same row as badge
    doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...phase.color);
    doc.text("Phase " + phase.num + ": " + phase.title, textIndent, py + 4);

    // Description — new line below badge row
    py += BADGE_H + DESC_GAP;
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(40,50,65);
    doc.text(pLines, textIndent, py);

    py += pLines.length * PH + PHASE_GAP;
  });

  y += sec2H + 2;

  // ── SECTION 3: NOTICE TO AUDITEE ─────────────────────────────
  y = needPage(y, 28);
  doc.setFillColor(245,127,23); doc.rect(M,y,col,7,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
  doc.text("SECTION 3 — NOTICE TO AUDITEE", M+3, y+4.8);
  y+=9;

  const notice = "This notification is issued at least 7 days prior to the scheduled audit date in accordance with the Quality Manual. Please ensure all relevant records, documentation and personnel are available on the date of audit. This audit is a mandatory quality assurance activity. Your full cooperation is required and expected.";
  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  const noticeLines = doc.splitTextToSize(notice, col-6);
  const noticeBoxH = 5 + 5 + noticeLines.length*4.5 + 4; // top + title + text + bottom

  doc.setFillColor(255,243,224); doc.rect(M,y,col,noticeBoxH,"F");
  doc.setDrawColor(255,204,128); doc.setLineWidth(0.3); doc.rect(M,y,col,noticeBoxH,"S");
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(230,81,0);
  doc.text("Important Notice", M+3, y+6);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(26,35,50);
  doc.text(noticeLines, M+3, y+12);
  y += noticeBoxH + 2;

  // ── SECTION 4: ISSUED BY ─────────────────────────────────────
  const sigW2 = (col-6)/2;
  y = needPage(y, 34);
  doc.setFillColor(1,87,155); doc.rect(M,y,col,7,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
  doc.text("SECTION 4 — ISSUED BY — QUALITY MANAGER", M+3, y+4.8);
  y+=9;

  doc.setFillColor(245,248,252); doc.rect(M,y,col,26,"F");
  doc.setDrawColor(221,227,234); doc.rect(M,y,col,26,"S");
  [["Quality Manager Name & Signature",""],["Date Issued", new Date().toLocaleDateString("en-GB")]].forEach(([l,v],i) => {
    const bx = M+3+i*(sigW2+3);
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(26,35,50);
    if(v) doc.text(v, bx, y+10);
    doc.setDrawColor(170,190,210); doc.setLineWidth(0.3); doc.line(bx, y+21, bx+sigW2-3, y+21);
    doc.setFontSize(6.5); doc.setTextColor(140,160,180); doc.text(l, bx, y+24.5);
  });
  y+=30;

  // ── SECTION 5: ACKNOWLEDGEMENT OF RECEIPT ────────────────────
  y = needPage(y, 58);
  doc.setFillColor(26,35,50); doc.rect(M,y,col,7,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
  doc.text("SECTION 5 — ACKNOWLEDGEMENT OF RECEIPT", M+3, y+4.8);
  y+=9;

  doc.setFillColor(245,248,252); doc.rect(M,y,col,52,"F");
  doc.setDrawColor(221,227,234); doc.rect(M,y,col,52,"S");
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(26,35,50);
  doc.text("Please sign below to confirm receipt of this audit notification and your response.", M+3, y+7);

  // Checkboxes
  doc.setDrawColor(26,35,50); doc.setLineWidth(0.4);
  doc.rect(M+3, y+14, 5, 5, "S");
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(46,125,50);
  doc.text("ACCEPT", M+10, y+18);
  doc.setFont("helvetica","normal"); doc.setTextColor(26,35,50);
  doc.text("— I confirm receipt of this notification and will make all required resources available.", M+28, y+18);

  doc.rect(M+3, y+24, 5, 5, "S");
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(198,40,40);
  doc.text("REJECT", M+10, y+28);
  doc.setFont("helvetica","normal"); doc.setTextColor(26,35,50);
  doc.text("— I am unable to accommodate this audit on the planned date. Reason:", M+28, y+28);
  doc.setDrawColor(170,190,210); doc.setLineWidth(0.3);
  doc.line(M+3, y+34, M+col-3, y+34);

  // Signature lines
  [["Auditee Name & Signature"],["Date of Acknowledgement"]].forEach(([l], i) => {
    const bx = M+3+i*(sigW2+3);
    doc.setDrawColor(170,190,210); doc.line(bx, y+46, bx+sigW2-3, y+46);
    doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(140,160,180);
    doc.text(l, bx, y+49.5);
  });
  y+=56;

  // ── Attachments — inline embedded ────────────────────────────
  if(slot.attachments && slot.attachments.length>0){
    y = needPage(y, 16);
    doc.setFillColor(69,39,160); doc.rect(M,y,col,7,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
    doc.text("ATTACHMENTS", M+3, y+4.8);
    y+=9;

    for(let idx=0; idx<slot.attachments.length; idx++){ const f=slot.attachments[idx];
      // Attachment header bar
      y = needPage(y, 14);
      doc.setFillColor(237,231,246); doc.rect(M,y,col,9,"F");
      doc.setDrawColor(179,157,219); doc.setLineWidth(0.3); doc.rect(M,y,col,9,"S");
      doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(69,39,160);
      doc.text(`Attachment ${idx+1}: ${f.name}`, M+3, y+5.8);
      if(f.size){ doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(149,117,205); doc.text(Math.round(f.size/1024)+"KB", M+col-3, y+5.8, {align:"right"}); }
      y+=11;

      if(f.dataUrl){
        const isImage = f.type && f.type.startsWith("image/");
        const isPDF   = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

        if(isImage){
          // Embed image inline, scaled to fit page width
          try {
            const imgFmt = f.type.includes("png")?"PNG":"JPEG";
            // Create temp image to get natural dimensions
            const img = new Image();
            img.src = f.dataUrl;
            // Calculate display height preserving aspect ratio, max 120mm tall
            const maxW = col; const maxH = 120;
            let dW = maxW; let dH = maxH;
            if(img.naturalWidth && img.naturalHeight){
              const ratio = img.naturalWidth / img.naturalHeight;
              dH = Math.min(maxH, maxW / ratio);
              dW = dH * ratio;
              if(dW > maxW){ dW = maxW; dH = maxW / ratio; }
            }
            y = needPage(y, dH + 4);
            doc.addImage(f.dataUrl, imgFmt, M, y, dW, dH);
            y += dH + 4;
          } catch(e){ console.warn("Image embed failed:", e); }

        } else if(isPDF){
          // Render PDF pages via pdfjs (loaded in index.html) → canvas → JPEG → embed
          try {
            const pdfjsLib = window["pdfjs-dist/build/pdf"];
            if(pdfjsLib){
              const base64Data = f.dataUrl.split(",")[1];
              const pdfBytes = Uint8Array.from(atob(base64Data), c=>c.charCodeAt(0));
              const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
              const pdfDoc2 = await loadingTask.promise;
              const pageCount = pdfDoc2.numPages;
              const maxPages = Math.min(pageCount, 10);
              for(let p=1; p<=maxPages; p++){
                const page = await pdfDoc2.getPage(p);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width; canvas.height = viewport.height;
                const ctx = canvas.getContext("2d");
                await page.render({ canvasContext:ctx, viewport }).promise;
                const imgData = canvas.toDataURL("image/jpeg", 0.85);
                const ratio = viewport.width / viewport.height;
                const dW2 = col; const dH2 = dW2 / ratio;
                y = needPage(y, dH2 + 4);
                doc.addImage(imgData, "JPEG", M, y, dW2, dH2);
                y += dH2 + 4;
                if(pageCount > 1){
                  doc.setFont("helvetica","italic"); doc.setFontSize(7); doc.setTextColor(140,160,180);
                  doc.text("Page " + p + " of " + pageCount, M+col, y-2, {align:"right"});
                }
              }
              if(pageCount > 10){
                doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(140,160,180);
                doc.text("[" + (pageCount-10) + " additional pages not shown — see original file]", M+3, y+5);
                y+=10;
              }
            } else {
              doc.setFillColor(245,248,252); doc.rect(M,y,col,14,"F");
              doc.setDrawColor(221,227,234); doc.rect(M,y,col,14,"S");
              doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(140,160,180);
              doc.text("[PDF attached: " + f.name + " — PDF viewer unavailable]", M+4, y+8.5);
              y+=16;
            }
          } catch(e){
            console.warn("PDF embed failed:", e.message);
            doc.setFillColor(245,248,252); doc.rect(M,y,col,14,"F");
            doc.setDrawColor(221,227,234); doc.rect(M,y,col,14,"S");
            doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(140,160,180);
            doc.text("[PDF attached: " + f.name + " — could not render inline]", M+4, y+8.5);
            y+=16;
          }

        } else {
          // Other file types — show name only
          doc.setFillColor(245,248,252); doc.rect(M,y,col,12,"F");
          doc.setDrawColor(221,227,234); doc.rect(M,y,col,12,"S");
          doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(140,160,180);
          doc.text(`[${f.name} — file type cannot be rendered inline]`, M+4, y+7.5);
          y+=14;
        }
      } else {
        // No data URL (old record without base64)
        doc.setFillColor(245,248,252); doc.rect(M,y,col,12,"F");
        doc.setDrawColor(221,227,234); doc.rect(M,y,col,12,"S");
        doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(140,160,180);
        doc.text(`[${f.name} — re-attach file to enable inline preview]`, M+4, y+7.5);
        y+=14;
      }
      y+=2; // gap between attachments
    }
  }

  addFooter();
  doc.save(`Audit-Notification-${notifRef}.pdf`);
};

// ─── Ad-Hoc Audit Modal ───────────────────────────────────────
const ADHOC_TRIGGERS = [
  "Internal Concern / Observation",
  "External Audit Outcome",
  "Customer / Stakeholder Complaint",
  "Regulatory Directive",
  "Incident or Occurrence",
  "Management Request",
  "Repeat Non-Conformance",
  "Other",
];

const AdHocAuditModal = ({ year, existingSlots, onSave, onClose, orgAuditAreas=AUDIT_AREAS }) => {
  const [form, setForm] = useState({
    area: (orgAuditAreas||AUDIT_AREAS)[0],
    custom_area: "",
    use_custom: false,
    trigger: ADHOC_TRIGGERS[0],
    trigger_detail: "",
    audit_type: "Internal",
    lead_auditor: "",
    planned_date: "",
    opening_brief: "",
    closing_brief: "",
    audit_criteria: "AS9100D / KCAA ANO / Quality Manual",
    notes: "",
    month: new Date().getMonth()+1,
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const area = form.use_custom ? form.custom_area.trim() : form.area;
    if(!area){ alert("Please specify an audit area."); return; }
    setSaving(true);
    // Generate a unique ID that won't clash with scheduled slots
    const ts = Date.now();
    const id = "AS-ADHOC-" + year + "-" + area.replace(/\s+/g,"-").substring(0,20) + "-" + ts;
    const slot = {
      id, year: Number(year), area, slot: 99, month: Number(form.month),
      status: "Scheduled", findings: 0, observations: 0,
      ad_hoc: true,
      trigger: form.trigger,
      trigger_detail: form.trigger_detail,
      audit_type: form.audit_type,
      lead_auditor: form.lead_auditor,
      planned_date: form.planned_date||null,
      opening_brief: form.opening_brief,
      closing_brief: form.closing_brief,
      audit_criteria: form.audit_criteria,
      notes: form.notes,
      finding_items: "[]",
      attachments: "[]",
    };
    await onSave(slot);
    setSaving(false);
  };

  const inputStyle = { width:"100%",padding:"8px 10px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13,boxSizing:"border-box",background:"#fff" };
  const labelStyle = { fontSize:11,fontWeight:700,color:"#5f7285",textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4 };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff",borderRadius:14,width:560,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 50px rgba(0,0,0,0.25)",display:"flex",flexDirection:"column" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#e65100,#f57f17)",padding:"18px 24px",borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.75)",fontSize:11,textTransform:"uppercase",letterSpacing:1 }}>Unscheduled / Trigger-Based</div>
            <div style={{ color:"#fff",fontWeight:700,fontSize:17 }}>Add Ad-Hoc Audit — {year}</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.75)",fontSize:22,cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ padding:24,display:"flex",flexDirection:"column",gap:14,overflowY:"auto" }}>

          {/* Trigger banner */}
          <div style={{ padding:"12px 16px",background:"#fff3e0",borderRadius:8,borderLeft:"4px solid #f57f17",fontSize:12,color:"#e65100" }}>
            <strong>Ad-hoc audits</strong> are unscheduled audits triggered by a specific event or concern outside the annual programme. They will appear in the schedule marked <strong>AD-HOC</strong> and are fully tracked through the same audit workflow.
          </div>

          {/* Trigger */}
          <div style={{ borderBottom:"1px solid #eef2f7",paddingBottom:14 }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#1a2332",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5 }}>Trigger / Reason</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Trigger Category</label>
                <select value={form.trigger} onChange={e=>set("trigger",e.target.value)} style={inputStyle}>
                  {ADHOC_TRIGGERS.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Trigger Detail / Reference</label>
                <textarea value={form.trigger_detail} onChange={e=>set("trigger_detail",e.target.value)} rows={2} placeholder="e.g. Customer complaint ref CC-2026-04, KCAA finding ref XYZ, incident report..." style={{...inputStyle,resize:"vertical"}}/>
              </div>
            </div>
          </div>

          {/* Audit area */}
          <div style={{ borderBottom:"1px solid #eef2f7",paddingBottom:14 }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#1a2332",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5 }}>Audit Area</div>
            <div style={{ display:"flex",gap:10,marginBottom:10 }}>
              {[false,true].map(v=>(
                <label key={String(v)} style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",fontWeight:form.use_custom===v?700:400,color:form.use_custom===v?T.primaryDk:T.muted }}>
                  <input type="radio" checked={form.use_custom===v} onChange={()=>set("use_custom",v)} style={{ accentColor:T.primary }}/>
                  {v?"Custom area":"Standard area"}
                </label>
              ))}
            </div>
            {!form.use_custom
              ? <select value={form.area} onChange={e=>set("area",e.target.value)} style={inputStyle}>
                  {orgAuditAreas.map(a=><option key={a}>{a}</option>)}
                </select>
              : <input value={form.custom_area} onChange={e=>set("custom_area",e.target.value)} placeholder="Enter audit area name..." style={inputStyle}/>
            }
          </div>

          {/* Audit details */}
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:"#1a2332",marginBottom:10,textTransform:"uppercase",letterSpacing:0.5 }}>Audit Details</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <div>
                <label style={labelStyle}>Audit Type</label>
                <select value={form.audit_type} onChange={e=>set("audit_type",e.target.value)} style={inputStyle}>
                  {AUDIT_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Month</label>
                <select value={form.month} onChange={e=>set("month",Number(e.target.value))} style={inputStyle}>
                  {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Lead Auditor</label>
                <input value={form.lead_auditor} onChange={e=>set("lead_auditor",e.target.value)} placeholder="Name" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Planned Date</label>
                <input type="date" value={form.planned_date} onChange={e=>set("planned_date",e.target.value)} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Opening Brief</label>
                <input value={form.opening_brief} onChange={e=>set("opening_brief",e.target.value)} placeholder="e.g. 09:00" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Closing Brief</label>
                <input value={form.closing_brief} onChange={e=>set("closing_brief",e.target.value)} placeholder="e.g. 12:00" style={inputStyle}/>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Audit Criteria</label>
                <input value={form.audit_criteria} onChange={e=>set("audit_criteria",e.target.value)} style={inputStyle}/>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Scope / Notes</label>
                <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="Describe the scope of this ad-hoc audit..." style={{...inputStyle,resize:"vertical"}}/>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:"flex",gap:10,justifyContent:"flex-end",padding:"16px 24px",borderTop:"1px solid #eef2f7",background:"#fafbfc",flexShrink:0 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving} style={{ background:"linear-gradient(135deg,#e65100,#f57f17)",border:"none" }}>
            {saving?"Adding...":"＋ Add Ad-Hoc Audit"}
          </Btn>
        </div>
      </div>
    </div>
  );
};


const AuditsView = ({ data, user, profile, managers, onRefresh, showToast, org }) => {
  // Use org-specific audit areas if set, otherwise fall back to AUDIT_AREAS constant
  const orgAuditAreas = (() => {
    try {
      const custom = JSON.parse(org?.audit_areas||"null");
      const base = (custom && custom.length > 0) ? custom : AUDIT_AREAS;
      // Also include any areas from existing schedule slots that aren't in the list
      // This preserves integrity of old data when areas are renamed
      const scheduleAreas = [...new Set((data.auditSchedule||[]).map(s=>s.area).filter(Boolean))];
      const combined = [...new Set([...base, ...scheduleAreas.filter(a=>!base.includes(a))])];
      return combined;
    } catch { return AUDIT_AREAS; }
  })();
  const isQM    = ["admin","quality_manager"].includes(profile?.role);
  const isAdmin = profile?.role==="admin";
  const [view,      setView]      = useState("schedule");
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [modal,     setModal]     = useState(null);
  const [generating, setGenerating] = useState(false);
  const [pwModal,   setPwModal]   = useState(false);    // password gate
  const [approvalModal, setApprovalModal] = useState(false); // approval fields before generate
  const [approval,  setApproval]  = useState({ qm_name:"", qm_date:"", am_name:"", am_date:"" });
  const [adHocModal, setAdHocModal] = useState(false); // ad-hoc audit creator

  const schedule = data.auditSchedule||[];

  const getSlot = (area, slotNum) =>
    schedule.find(s=>s.area===area && s.slot===slotNum && s.year===year);

  const slotColor = (slot) => {
    if(!slot) return { bg:"#f5f8fc", border:"#dde3ea", text:"#8fa8c0", label:"Not Set" };
    const s = slot.status;
    if(s==="Completed")   return { bg:"#e8f5e9", border:"#a5d6a7", text:"#2e7d32", label:"Completed" };
    if(s==="In Progress") return { bg:"#e3f2fd", border:"#90caf9", text:"#01579b", label:"In Progress" };
    if(s==="Cancelled")   return { bg:"#f5f5f5", border:"#e0e0e0", text:"#757575", label:"Cancelled" };
    // Auto-detect overdue — scheduled/in-progress slots past their planned date
    const isSlotOverdue = !["Completed","Cancelled"].includes(s) &&
      slot.planned_date && new Date(slot.planned_date) < new Date();
    if(s==="Overdue"||isSlotOverdue) return { bg:"#ffebee", border:"#ef9a9a", text:"#c62828", label:"Overdue" };
    return { bg:"#fff8e1", border:"#ffe082", text:"#f57f17", label:"Scheduled" };
  };

  // Password gate → approval modal → generate
  const handleGenerateClick = () => setPwModal(true);

  const generateSchedule = async () => {
    setGenerating(true);
    try {
      const rows = [];
      orgAuditAreas.forEach((area, idx) => {
        const month1 = 1 + (idx % 6);
        const month2 = 7 + (idx % 6);
        rows.push({ id:`AS-${year}-${area.replace(/\s+/g,"-")}-1`, year, area, slot:1, month:month1, status:"Scheduled", findings:0, observations:0, qm_name:approval.qm_name, qm_date:approval.qm_date, am_name:approval.am_name, am_date:approval.am_date });
        rows.push({ id:`AS-${year}-${area.replace(/\s+/g,"-")}-2`, year, area, slot:2, month:month2, status:"Scheduled", findings:0, observations:0, qm_name:approval.qm_name, qm_date:approval.qm_date, am_name:approval.am_name, am_date:approval.am_date });
      });
      const { error } = await supabase.from("audit_schedule").upsert(rows, { onConflict:"id" });
      if(error) { showToast(`Error: ${error.message}`,"error"); return; }
      showToast(`${year} audit schedule generated — ${rows.length} slots created`,"success");
      setApprovalModal(false);
      onRefresh();
    } catch(e) { showToast(`Error: ${e.message}`,"error"); }
    finally { setGenerating(false); }
  };

  // Save a slot + send notification email
  const saveSlot = async (slot) => {
    const payload = { id: slot.id||`AS-${slot.year||year}-${slot.area?.replace(/\s+/g,"-")}-${slot.slot}`, year:slot.year||year, area:slot.area, slot:slot.slot, month:slot.month, ...slot };
    const { error } = await supabase.from("audit_schedule").upsert(payload, { onConflict:"id" });
    if(error) { showToast(`Error: ${error.message}`,"error"); return; }

    // Send notification emails when a slot has a planned date and lead auditor set
    if(slot.planned_date && slot.lead_auditor) {
      const am = managers.find(m=>m.role_title==="Accountable Manager");
      const rm = managers.find(m=>m.role_title===slot.auditee) || managers.find(m=>m.role_title==="Quality Manager");
      const recipients = [rm?.email, am?.email].filter(Boolean);
      if(recipients.length>0){
        await sendNotification({ type:"audit_scheduled", record:slot, recipients });
      }
    }

    if(slot.status==="Completed" && Number(slot.findings)>0){
      showToast(`Audit saved — ${slot.findings} finding(s) recorded. Raise CARs from the CAPA module.`,"success");
    } else {
      showToast("Audit slot saved","success");
    }
    setModal(null);
    onRefresh();
  };

  // Programme completion stats
  const totalSlots  = orgAuditAreas.length * 2;
  const yearSlots   = schedule.filter(s=>s.year===year);
  const adHocSlots  = yearSlots.filter(s=>s.ad_hoc);
  const completed   = yearSlots.filter(s=>s.status==="Completed").length;
  const overdue     = yearSlots.filter(s=>s.status==="Overdue"||(!["Completed","Cancelled"].includes(s.status)&&s.planned_date&&new Date(s.planned_date)<new Date())).length;
  const pct         = totalSlots>0 ? Math.round(completed/totalSlots*100) : 0;
  const totalFindings = yearSlots.reduce((a,s)=>a+Number(s.findings||0),0);
  const totalObs      = yearSlots.reduce((a,s)=>a+Number(s.observations||0),0);

  const hasSchedule = yearSlots.length > 0;

  return (
    <div style={{ padding:24, maxWidth:1200, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:22,color:T.primaryDk }}>Audit Management</div>
          <div style={{ fontSize:13,color:T.muted,marginTop:2 }}>Annual audit programme, schedule and records</div>
        </div>
        <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
          {/* Year selector */}
          <div style={{ display:"flex",alignItems:"center",gap:6,background:"#f5f8fc",borderRadius:8,padding:"4px 8px",border:"1px solid #dde3ea" }}>
            <button onClick={()=>setYear(y=>y-1)} style={{ background:"none",border:"none",cursor:"pointer",color:T.primary,fontWeight:700,fontSize:16,padding:"0 4px" }}>‹</button>
            <span style={{ fontWeight:700,fontSize:14,color:T.primaryDk,minWidth:36,textAlign:"center" }}>{year}</span>
            <button onClick={()=>setYear(y=>y+1)} style={{ background:"none",border:"none",cursor:"pointer",color:T.primary,fontWeight:700,fontSize:16,padding:"0 4px" }}>›</button>
          </div>
          {/* View toggle */}
          <div style={{ display:"flex",background:"#f5f8fc",borderRadius:8,border:"1px solid #dde3ea",overflow:"hidden" }}>
            {[["schedule","📅 Schedule"],["list","📋 All Audits"]].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:"7px 14px",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:view===v?"#01579b":"transparent",color:view===v?"#fff":T.muted,transition:"all 0.2s" }}>{l}</button>
            ))}
          </div>
          {isQM && hasSchedule && (
            <Btn variant="ghost" onClick={()=>generateSchedulePDF(yearSlots, year, yearSlots[0]||{}, orgAuditAreas)}>
              📥 Export Schedule PDF
            </Btn>
          )}
          {isQM && (
            <Btn variant="ghost" onClick={()=>setAdHocModal(true)}>
              ＋ Ad-Hoc Audit
            </Btn>
          )}
          {isQM && (
            <Btn onClick={handleGenerateClick} disabled={generating}>
              {generating?"Generating...":"⚡ Generate "+year+" Schedule"}
            </Btn>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24 }}>
        {[
          {label:"Programme Completion",value:`${pct}%`,sub:`${completed}/${totalSlots} audits`,color:pct===100?T.green:pct>50?T.yellow:T.red},
          {label:"Completed",value:completed,sub:"This year",color:T.green},
          {label:"Overdue",value:overdue,sub:"Past planned date",color:overdue>0?T.red:T.muted},
          {label:"Total Findings",value:totalFindings,sub:`+ ${totalObs} observations`,color:totalFindings>0?T.yellow:T.green},
        ].map(s=>(
          <div key={s.label} style={{ background:"#fff",borderRadius:10,padding:"14px 18px",border:"1px solid #dde3ea",boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:26,fontWeight:800,color:s.color,lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11,color:T.muted,marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ background:"#fff",borderRadius:10,padding:"14px 20px",border:"1px solid #dde3ea",marginBottom:24 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
          <span style={{ fontSize:12,fontWeight:700,color:T.primaryDk }}>Annual Programme Progress — {year}</span>
          <span style={{ fontSize:12,color:T.muted }}>{completed} of {totalSlots} audits completed</span>
        </div>
        <div style={{ height:10,background:"#eef2f7",borderRadius:5,overflow:"hidden" }}>
          <div style={{ height:"100%",width:`${pct}%`,background:pct===100?"#2e7d32":pct>50?"#f57f17":"#01579b",borderRadius:5,transition:"width 0.5s" }}/>
        </div>
      </div>

      {/* Schedule Grid View */}
      {view==="schedule" && (
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          {!hasSchedule ? (
            <div style={{ padding:60,textAlign:"center" }}>
              <div style={{ fontSize:48,marginBottom:16 }}>📅</div>
              <div style={{ fontSize:18,fontWeight:700,color:T.primaryDk,marginBottom:8 }}>No schedule for {year}</div>
              <div style={{ fontSize:13,color:T.muted,marginBottom:24 }}>Generate the annual audit programme to populate the schedule</div>
              {isQM&&<Btn onClick={handleGenerateClick} disabled={generating}>{generating?"Generating...":"⚡ Generate "+year+" Audit Schedule"}</Btn>}
            </div>
          ) : (
            <>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#1a2332" }}>
                  <th style={{ padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:0.5,width:200 }}>Audit Area</th>
                  {MONTHS.map(m=>(
                    <th key={m} style={{ padding:"8px 4px",textAlign:"center",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:0.3 }}>{m}</th>
                  ))}
                  <th style={{ padding:"12px 16px",textAlign:"center",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:0.5 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orgAuditAreas.map((area,ai)=>{
                  const slot1 = getSlot(area,1);
                  const slot2 = getSlot(area,2);
                  const bothDone = slot1?.status==="Completed" && slot2?.status==="Completed";
                  return (
                    <tr key={area} style={{ borderBottom:"1px solid #eef2f7",background:ai%2===0?"#fff":"#fafbfc" }}>
                      <td style={{ padding:"12px 16px",fontSize:13,fontWeight:600,color:T.primaryDk }}>
                        {area}
                      </td>
                      {MONTHS.map((_,mi)=>{
                        const monthNum = mi+1;
                        const s1 = slot1?.month===monthNum ? slot1 : null;
                        const s2 = slot2?.month===monthNum ? slot2 : null;
                        const hasSlot = s1||s2;
                        if(!hasSlot) return <td key={mi} style={{ padding:"8px 4px",textAlign:"center" }}><div style={{ width:8,height:8,borderRadius:"50%",background:"#eef2f7",margin:"0 auto" }}/></td>;
                        const slot = s1||s2;
                        const c = slotColor(slot);
                        return (
                          <td key={mi} style={{ padding:"4px",textAlign:"center" }}>
                            <div
                              onClick={()=>isQM&&setModal(slot)}
                              title={`${area} — Slot ${slot.slot}
Status: ${slot.status||"Scheduled"}
Lead: ${slot.lead_auditor||"Not assigned"}
Planned: ${slot.planned_date||"Not set"}`}
                              style={{ width:28,height:28,borderRadius:6,background:c.bg,border:`2px solid ${c.border}`,margin:"0 auto",cursor:isQM?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:c.text,transition:"transform 0.15s" }}
                              onMouseEnter={e=>{if(isQM)e.target.style.transform="scale(1.2)";}}
                              onMouseLeave={e=>{e.target.style.transform="scale(1)";}}
                            >
                              {slot.status==="Completed"?"✓":slot.slot}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ padding:"8px 16px",textAlign:"center" }}>
                        {bothDone
                          ? <span style={{ fontSize:11,fontWeight:700,color:"#2e7d32",background:"#e8f5e9",padding:"3px 10px",borderRadius:12 }}>✓ Complete</span>
                          : <span style={{ fontSize:11,fontWeight:600,color:T.muted,background:"#f5f8fc",padding:"3px 10px",borderRadius:12 }}>
                              {[slot1,slot2].filter(s=>s?.status==="Completed").length}/2
                            </span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Ad-hoc audits section below the main grid */}
            {adHocSlots.length > 0 && (
              <div style={{ marginTop:0,borderTop:"2px dashed #ffcc80" }}>
                <div style={{ background:"#fff3e0",padding:"8px 16px",display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{ background:"#e65100",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6 }}>AD-HOC</span>
                  <span style={{ fontSize:12,fontWeight:700,color:"#e65100" }}>Unscheduled / Trigger-Based Audits ({adHocSlots.length})</span>
                </div>
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <tbody>
                    {adHocSlots.map((s,i)=>{
                      const c = slotColor(s);
                      return (
                        <tr key={s.id} style={{ borderBottom:"1px solid #fff3e0",background:i%2===0?"#fffdf8":"#fff8ee" }}>
                          <td style={{ padding:"10px 16px",fontSize:13,fontWeight:600,color:"#bf360c",minWidth:220 }}>
                            <div>{s.area}</div>
                            {s.trigger && <div style={{ fontSize:10,color:"#e65100",marginTop:2 }}>⚡ {s.trigger}</div>}
                          </td>
                          {MONTHS.map((_,mi)=>{
                            const monthNum = mi+1;
                            if(s.month !== monthNum) return <td key={mi} style={{ padding:"8px 4px",textAlign:"center" }}><div style={{ width:8,height:8,borderRadius:"50%",background:"#fbe9e7",margin:"0 auto" }}/></td>;
                            return (
                              <td key={mi} style={{ padding:"4px",textAlign:"center" }}>
                                <div
                                  onClick={()=>isQM&&setModal(s)}
                                  title={s.area+" (Ad-Hoc)\nTrigger: "+(s.trigger||"—")+"\nStatus: "+(s.status||"Scheduled")+"\nLead: "+(s.lead_auditor||"Not assigned")+"\nPlanned: "+(s.planned_date||"Not set")}
                                  style={{ width:28,height:28,borderRadius:6,background:c.bg,border:"2px dashed "+c.border,margin:"0 auto",cursor:isQM?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:c.text,transition:"transform 0.15s" }}
                                  onMouseEnter={e=>{if(isQM)e.currentTarget.style.transform="scale(1.2)";}}
                                  onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
                                >
                                  {s.status==="Completed"?"✓":"⚡"}
                                </div>
                              </td>
                            );
                          })}
                          <td style={{ padding:"8px 16px",textAlign:"center" }}>
                            <span style={{ fontSize:11,fontWeight:700,color:c.text,background:c.bg,border:"1px solid "+c.border,padding:"3px 10px",borderRadius:12 }}>{s.status||"Scheduled"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            </>
          )}
        </div>
      )}

      {/* List View — All individual audits */}
      {view==="list" && (
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",overflow:"hidden" }}>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f5f8fc",borderBottom:"2px solid #dde3ea" }}>
                {["Area","Slot","Month","Type","Lead Auditor","Planned Date","Actual Date","Findings","Obs","Status",""].map(h=>(
                  <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yearSlots.length===0
                ? <tr><td colSpan={11} style={{ padding:40,textAlign:"center",color:T.muted,fontSize:13 }}>No audits scheduled for {year}</td></tr>
                : yearSlots.sort((a,b)=>a.month-b.month||a.slot-b.slot).map((s,i)=>{
                  const c = slotColor(s);
                  return (
                    <tr key={s.id} style={{ borderBottom:"1px solid #eef2f7",background:i%2===0?"#fff":"#fafbfc" }}>
                      <td style={{ padding:"10px 14px",fontSize:13,fontWeight:600,color:T.primaryDk }}>{s.area}</td>
                      <td style={{ padding:"10px 14px",fontSize:12,color:T.muted }}>{s.ad_hoc?<span style={{ background:"#fff3e0",color:"#e65100",fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:6,border:"1px solid #ffcc80" }}>AD-HOC</span>:<span>#{s.slot}</span>}</td>
                      <td style={{ padding:"10px 14px",fontSize:12,color:T.text }}>{MONTHS[(s.month||1)-1]}</td>
                      <td style={{ padding:"10px 14px",fontSize:12,color:T.text }}>{s.audit_type||"Internal"}</td>
                      <td style={{ padding:"10px 14px",fontSize:12,color:T.text }}>{s.lead_auditor||"—"}</td>
                      <td style={{ padding:"10px 14px",fontSize:12,color:T.text }}>{s.planned_date||"—"}</td>
                      <td style={{ padding:"10px 14px",fontSize:12,color:T.text }}>{s.actual_date||"—"}</td>
                      <td style={{ padding:"10px 14px",fontSize:12,color:Number(s.findings)>0?T.red:T.muted,fontWeight:Number(s.findings)>0?700:400 }}>{s.findings||0}</td>
                      <td style={{ padding:"10px 14px",fontSize:12,color:T.muted }}>{s.observations||0}</td>
                      <td style={{ padding:"10px 14px" }}>
                        <span style={{ fontSize:11,fontWeight:700,color:c.text,background:c.bg,border:`1px solid ${c.border}`,padding:"3px 10px",borderRadius:12 }}>{s.status||"Scheduled"}</span>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex",gap:6 }}>
                          {isQM&&<Btn size="sm" variant="ghost" onClick={()=>setModal(s)}>Edit</Btn>}
                          {s.status==="Completed"&&<Btn size="sm" variant="ghost" onClick={()=>generateAuditReport({...s,org_prefix:org?.car_prefix||"ORG"})}>📄 PDF</Btn>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {view==="schedule"&&hasSchedule&&(
        <div style={{ display:"flex",gap:16,marginTop:16,flexWrap:"wrap" }}>
          {[["Scheduled","#fff8e1","#ffe082","#f57f17"],["In Progress","#e3f2fd","#90caf9","#01579b"],["Completed","#e8f5e9","#a5d6a7","#2e7d32"],["Overdue","#ffebee","#ef9a9a","#c62828"],["Cancelled","#f5f5f5","#e0e0e0","#757575"]].map(([l,bg,border,text])=>(
            <div key={l} style={{ display:"flex",alignItems:"center",gap:6 }}>
              <div style={{ width:16,height:16,borderRadius:4,background:bg,border:`2px solid ${border}` }}/>
              <span style={{ fontSize:11,color:T.muted,fontWeight:600 }}>{l}</span>
            </div>
          ))}
          <div style={{ fontSize:11,color:T.muted,marginLeft:"auto" }}>Click a slot to edit · Numbers = slot 1 or 2 of biannual cycle</div>
        </div>
      )}

      {adHocModal&&(
        <AdHocAuditModal
          year={year}
          existingSlots={schedule}
          onSave={async(slot)=>{
            const { error } = await supabase.from("audit_schedule").upsert(slot, { onConflict:"id" });
            if(error){ showToast("Error: "+error.message,"error"); return; }
            showToast("Ad-hoc audit added to schedule","success");
            setAdHocModal(false);
            onRefresh();
          }}
          onClose={()=>setAdHocModal(false)}
        />
      )}
      {modal&&<AuditScheduleModal slot={modal} onSave={saveSlot} onClose={()=>setModal(null)} managers={managers} data={data} user={user} profile={profile} showToast={showToast} onRefresh={onRefresh} org={org}/>}

      {/* Password Gate Modal */}
      {pwModal&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center" }} onClick={()=>setPwModal(false)}>
          <div style={{ background:"#fff",borderRadius:14,width:380,padding:32,boxShadow:"0 8px 50px rgba(0,0,0,0.3)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:32,textAlign:"center",marginBottom:12 }}>🔐</div>
            <div style={{ fontWeight:800,fontSize:18,color:"#1a2332",textAlign:"center",marginBottom:6 }}>Quality Manager Authorisation</div>
            <div style={{ fontSize:13,color:"#5f7285",textAlign:"center",marginBottom:20 }}>Enter the QM password to generate or overwrite the {year} audit schedule</div>
            <input
              id="pw-input"
              type="password"
              placeholder="Enter password"
              autoFocus
              style={{ width:"100%",padding:"10px 12px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:14,boxSizing:"border-box",marginBottom:14 }}
              onKeyDown={e=>{
                if(e.key==="Enter"){
                  if(e.target.value===SCHEDULE_PASSWORD){ setPwModal(false); setApprovalModal(true); e.target.value=""; }
                  else { e.target.style.borderColor="#c62828"; setTimeout(()=>e.target.style.borderColor="#dde3ea",1000); }
                }
              }}
            />
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={()=>setPwModal(false)}>Cancel</Btn>
              <Btn onClick={()=>{
                const val=document.getElementById("pw-input").value;
                if(val===SCHEDULE_PASSWORD){ setPwModal(false); setApprovalModal(true); document.getElementById("pw-input").value=""; }
                else { document.getElementById("pw-input").style.borderColor="#c62828"; setTimeout(()=>document.getElementById("pw-input").style.borderColor="#dde3ea",1000); }
              }}>Confirm</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvalModal&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center" }} onClick={()=>setApprovalModal(false)}>
          <div style={{ background:"#fff",borderRadius:14,width:480,padding:0,boxShadow:"0 8px 50px rgba(0,0,0,0.3)",overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
            <div style={{ background:"linear-gradient(135deg,#01579b,#0277bd)",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ color:"rgba(255,255,255,0.7)",fontSize:11,textTransform:"uppercase",letterSpacing:1 }}>Programme Approval</div>
                <div style={{ color:"#fff",fontWeight:700,fontSize:16 }}>Generate {year} Audit Schedule</div>
              </div>
              <button onClick={()=>setApprovalModal(false)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:22,cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ padding:24,display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ padding:"10px 14px",background:"#fff3e0",borderRadius:8,fontSize:12,color:"#e65100",borderLeft:"4px solid #f57f17" }}>
                ⚠️ This will generate {orgAuditAreas.length*2} audit slots for {year}. Existing slots will be overwritten.
              </div>
              <div style={{ fontSize:13,fontWeight:700,color:"#1a2332",borderBottom:"1px solid #eef2f7",paddingBottom:8 }}>Quality Manager</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:"#5f7285",textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4 }}>Name</label>
                  <input value={approval.qm_name} onChange={e=>setApproval(p=>({...p,qm_name:e.target.value}))} placeholder="Quality Manager full name" style={{ width:"100%",padding:"8px 10px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13,boxSizing:"border-box" }}/>
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:"#5f7285",textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4 }}>Date</label>
                  <input type="date" value={approval.qm_date} onChange={e=>setApproval(p=>({...p,qm_date:e.target.value}))} style={{ width:"100%",padding:"8px 10px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13,boxSizing:"border-box" }}/>
                </div>
              </div>
              <div style={{ fontSize:13,fontWeight:700,color:"#1a2332",borderBottom:"1px solid #eef2f7",paddingBottom:8,marginTop:4 }}>Accountable Manager</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:"#5f7285",textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4 }}>Name</label>
                  <input value={approval.am_name} onChange={e=>setApproval(p=>({...p,am_name:e.target.value}))} placeholder="Accountable Manager full name" style={{ width:"100%",padding:"8px 10px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13,boxSizing:"border-box" }}/>
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:"#5f7285",textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4 }}>Date</label>
                  <input type="date" value={approval.am_date} onChange={e=>setApproval(p=>({...p,am_date:e.target.value}))} style={{ width:"100%",padding:"8px 10px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13,boxSizing:"border-box" }}/>
                </div>
              </div>
              <div style={{ display:"flex",gap:10,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid #eef2f7" }}>
                <Btn variant="ghost" onClick={()=>setApprovalModal(false)}>Cancel</Btn>
                <Btn onClick={generateSchedule} disabled={generating}>{generating?"Generating...":"⚡ Generate Schedule"}</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TABS ─────────────────────────────────────────────────────
const TABS = [
  {id:"dashboard",    label:"Dashboard",       icon:"▦",  group:"main"},
  {id:"cars",         label:"CARs",            icon:"📋", group:"main"},
  {id:"documents",    label:"Documents",       icon:"📄", group:"main"},
  {id:"flightdocs",   label:"Company Documents",icon:"📂",group:"main"},
  {id:"audits",       label:"Audits",          icon:"🔍", group:"main"},
  {id:"contractors",  label:"Contractors",     icon:"🔧", group:"main"},
  {id:"risks",        label:"Risk Register",   icon:"⚠️", group:"main"},
  {id:"rca",          label:"Root Cause Analysis", icon:"🧠", group:"main"},
  {id:"managers",     label:"Managers",        icon:"👥", group:"settings"},
  {id:"orgsettings",  label:"Org Settings",    icon:"⚙️",  group:"settings"},
  {id:"users",        label:"Users",           icon:"👤", group:"settings"},
  {id:"profile",      label:"My Profile",      icon:"🔐", group:"settings"},
  {id:"changelog",    label:"Change Log",      icon:"📋", group:"settings"},
  {id:"about",        label:"About",           icon:"(i)", group:"settings"},
  {id:"superadmin",   label:"Super Admin",     icon:"⚡",  group:"superadmin"},
];


// ─── Super Admin Panel ────────────────────────────────────────
// ─── Super Admin Users Tab ────────────────────────────────────
const SuperAdminUsersTab = ({ orgUsers, orgs, pendingUsers, assignUser, sendResetLink, showToast, onRefresh }) => {
  const [selOrgTab, setSelOrgTab] = useState("__pending__");

  const orgTabList = [
    { id:"__pending__", name:"Pending Approval", count: pendingUsers.length },
    ...orgs.map(o=>({ id:o.id, name:o.name, count:orgUsers.filter(u=>u.org_id===o.id).length }))
  ];

  const tabUsers = selOrgTab === "__pending__"
    ? pendingUsers
    : orgUsers.filter(u=>u.org_id===selOrgTab);

  const selOrg = orgs.find(o=>o.id===selOrgTab);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:0 }}>
      {/* Org tab strip */}
      <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:16 }}>
        {orgTabList.map(ot=>{
          const isPending = ot.id==="__pending__";
          const active = selOrgTab===ot.id;
          return (
            <button key={ot.id} onClick={()=>setSelOrgTab(ot.id)}
              style={{ padding:"7px 14px",borderRadius:20,
                border:`1.5px solid ${active?(isPending?"#ffe082":"#90caf9"):"#dde3ea"}`,
                background:active?(isPending?"#fff8e1":"#e3f2fd"):"#fff",
                color:active?(isPending?"#e65100":"#01579b"):"#5f7285",
                fontWeight:active?700:500,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
              {isPending?"⏳ ":""}{ot.name}
              <span style={{ background:active?(isPending?"#ffe082":"#bbdefb"):"#f0f4f8",
                color:active?(isPending?"#e65100":"#01579b"):"#8a9ab0",
                borderRadius:20,padding:"1px 7px",fontSize:11,fontWeight:700 }}>
                {ot.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Users panel */}
      <div style={{ background:"#fff",borderRadius:12,
        border:`1.5px solid ${selOrgTab==="__pending__"?"#ffe082":"#dde3ea"}`,overflow:"hidden" }}>

        {/* Panel header */}
        <div style={{ padding:"14px 20px",
          background:selOrgTab==="__pending__"?"#fff8e1":"#f8fafc",
          borderBottom:`1px solid ${selOrgTab==="__pending__"?"#ffe082":"#dde3ea"}`,
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:700,fontSize:14,color:selOrgTab==="__pending__"?"#e65100":"#1a2332" }}>
              {selOrgTab==="__pending__"
                ? `⏳ Pending Approval (${pendingUsers.length})`
                : `${selOrg?.name||"Organisation"} — ${tabUsers.length} user${tabUsers.length!==1?"s":""}`}
            </div>
            {selOrgTab!=="__pending__"&&selOrg?.slug&&(
              <div style={{ fontSize:11,color:"#8a9ab0",marginTop:2,fontFamily:"monospace" }}>
                Login Code: {selOrg.slug}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {tabUsers.length===0?(
          <div style={{ padding:32,textAlign:"center",color:"#8a9ab0",fontSize:13 }}>
            {selOrgTab==="__pending__"?"No accounts pending approval":"No users in this organisation yet"}
          </div>
        ):(
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f8fafc" }}>
                {(selOrgTab==="__pending__"
                  ? ["Email","Name","Joined","Assign Org","Role","Action"]
                  : ["Name","Email","Role","Status","Joined","Actions"]
                ).map(h=>(
                  <th key={h} style={{ padding:"9px 14px",
                    borderBottom:`1px solid ${selOrgTab==="__pending__"?"#ffe082":"#dde3ea"}`,
                    textAlign:"left",fontSize:11,fontWeight:700,color:"#8a9ab0",textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selOrgTab==="__pending__"
                ? tabUsers.map(u=><PendingUserRow key={u.id} u={u} orgs={orgs} onAssign={assignUser}/>)
                : tabUsers.map(u=>(
                    <tr key={u.id} className="row-hover">
                      <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8",fontSize:13,fontWeight:600,color:"#1a2332" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#01579b,#0288d1)",
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0 }}>
                            {(u.full_name||u.email)[0].toUpperCase()}
                          </div>
                          {u.full_name||"—"}
                        </div>
                      </td>
                      <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8",fontSize:12,color:"#5f7285" }}>{u.email}</td>
                      <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8" }}><Badge label={u.role||"viewer"}/></td>
                      <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8" }}>
                        <span style={{ background:u.status==="approved"?"#e8f5e9":u.status==="pending"?"#fff8e1":"#ffebee",
                          color:u.status==="approved"?"#2e7d32":u.status==="pending"?"#e65100":"#c62828",
                          borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600 }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8",fontSize:11,color:"#8a9ab0" }}>{fmt(u.created_at)}</td>
                      <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8" }}>
                        <div style={{ display:"flex",gap:6 }}>
                          <button onClick={()=>sendResetLink(u.email)}
                            style={{ background:"#e3f2fd",color:"#01579b",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                            📧 Reset
                          </button>
                          {u.status==="approved"&&(
                            <button onClick={async()=>{
                              if(!window.confirm(`Suspend ${u.full_name||u.email}?`)) return;
                              await supabase.from("profiles").update({status:"suspended"}).eq("id",u.id);
                              showToast("User suspended","success"); onRefresh();
                            }} style={{ background:"#ffebee",color:"#c62828",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                            Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const SuperAdminPanel = ({ orgs, orgUsers, onRefresh, showToast }) => {
  const [tab, setTab]           = useState("dashboard");
  const [newOrg, setNewOrg]     = useState({ name:"", slug:"", country:"Kenya", contact_email:"", contact_name:"" });
  const [newOrgDemo, setNewOrgDemo] = useState(false);
  const [demoDays,   setDemoDays]   = useState(14);
  const [creating, setCreating] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [loadingLog,  setLoadingLog]  = useState(false);

  const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const generateOrgCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusable chars (0,O,1,I)
    const segment = (n) => Array.from({length:n},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
    return `${segment(3)}-${segment(4)}-${segment(3)}`;
  };

  const createOrg = async () => {
    if(!newOrg.name.trim()) return;
    setCreating(true);
    const slug = newOrg.slug || generateOrgCode();
    const demoExpiry = newOrgDemo
      ? new Date(Date.now() + demoDays * 86400000).toISOString()
      : null;

    // 1. Create the organisation
    const { data: orgRow, error } = await supabase.from("organisations").insert({
      ...newOrg, slug,
      demo_expires_at: demoExpiry,
    }).select().single();

    if(error){ showToast("Error: "+error.message,"error"); setCreating(false); return; }

    // 2. Create user account + send welcome email with credentials
    if(newOrg.contact_email){
      await sendNotification({
        type: "create_org_user",
        record: {
          org_id:       orgRow.id,
          org_name:     orgRow.name,
          org_slug:     slug,
          contact_name: newOrg.contact_name || newOrg.contact_email.split("@")[0],
          contact_email:newOrg.contact_email,
          is_demo:      newOrgDemo ? "true" : "false",
          demo_days:    String(demoDays),
        },
        recipients: [newOrg.contact_email],
      });
    }

    showToast(newOrgDemo
      ? `Demo organisation created — expires in ${demoDays} days. Welcome email sent.`
      : "Organisation created. Welcome email sent.",
      "success");
    setNewOrg({ name:"", slug:"", country:"Kenya", contact_email:"", contact_name:"" });
    setNewOrgDemo(false); setDemoDays(14);
    onRefresh(); setTab("orgs");
    setCreating(false);
  };

  const seedDemoOrg = async (orgId) => {
    if(!window.confirm("This will populate the selected organisation with realistic demo data. Continue?")) return;
    showToast("Seeding demo data…","success");
    const today = new Date();
    const daysAgo = (n) => new Date(today-n*86400000).toISOString().slice(0,10);
    const daysFromNow = (n) => new Date(today.getTime()+n*86400000).toISOString().slice(0,10);
    // Only set demo expiry if not already set on the org
    const { data: orgData } = await supabase.from("organisations").select("demo_expires_at").eq("id", orgId).single();
    if(!orgData?.demo_expires_at){
      const demoExpiry = new Date(today.getTime()+14*86400000).toISOString();
      await supabase.from("organisations").update({ demo_expires_at: demoExpiry }).eq("id", orgId);
    }
    const managers = [
      {id:`${orgId}-mgr-1`,org_id:orgId,role_title:"Accountable Manager",person_name:"James Mwangi",email:"accountable@demo-aviation.com",phone:"+254700000001"},
      {id:`${orgId}-mgr-2`,org_id:orgId,role_title:"Quality Manager",person_name:"Sarah Ochieng",email:"qm@demo-aviation.com",phone:"+254700000002"},
      {id:`${orgId}-mgr-3`,org_id:orgId,role_title:"Head of Training",person_name:"Capt. David Njoroge",email:"training@demo-aviation.com",phone:"+254700000003"},
      {id:`${orgId}-mgr-4`,org_id:orgId,role_title:"Head of Maintenance",person_name:"Thomas Kamau",email:"maintenance@demo-aviation.com",phone:"+254700000004"},
    ];
    await supabase.from("responsible_managers").insert(managers);
    const auditSlots = [
      {id:`${orgId}-aud-1`,org_id:orgId,year:2026,month:1,area:"Flight Operations",type:"Internal",planned_date:daysAgo(45),status:"Completed"},
      {id:`${orgId}-aud-2`,org_id:orgId,year:2026,month:2,area:"Maintenance",type:"Internal",planned_date:daysAgo(20),status:"Completed"},
      {id:`${orgId}-aud-3`,org_id:orgId,year:2026,month:3,area:"Safety",type:"Internal",planned_date:daysFromNow(10),status:"Scheduled"},
      {id:`${orgId}-aud-4`,org_id:orgId,year:2026,month:4,area:"Quality",type:"Regulatory",planned_date:daysFromNow(30),status:"Scheduled"},
      {id:`${orgId}-aud-5`,org_id:orgId,year:2026,month:6,area:"Training",type:"Surveillance",planned_date:daysFromNow(75),status:"Scheduled"},
    ];
    await supabase.from("audit_schedule").insert(auditSlots);
    const audits = [
      {id:`${orgId}-audit-1`,org_id:orgId,title:"Q1 Flight Operations Internal Audit",type:"Internal",status:"Completed",lead:"Sarah Ochieng",scope:"Flight crew records, ops manual compliance, route authorisations",date:daysAgo(45),findings:3,obs:2},
      {id:`${orgId}-audit-2`,org_id:orgId,title:"Maintenance Base Inspection",type:"Internal",status:"Completed",lead:"Sarah Ochieng",scope:"AMM compliance, tooling calibration, technician licensing",date:daysAgo(20),findings:1,obs:4},
      {id:`${orgId}-audit-3`,org_id:orgId,title:"Safety Management System Review",type:"Internal",status:"Scheduled",lead:"Sarah Ochieng",scope:"SMS documentation, hazard reporting, safety promotion",date:daysFromNow(10),findings:0,obs:0},
    ];
    await supabase.from("audits").insert(audits);
    const cars = [
      {id:`DEMO-QMS-001-${daysAgo(45).replace(/-/g,"")}-CAPA001`,org_id:orgId,finding_description:"Flight crew training records found incomplete — simulator hours not logged for 3 crew members",qms_clause:"Ops Manual Section 4.2 — Crew Training Records",severity:"Major",status:"Closed",department:"Training",date_raised:daysAgo(45),due_date:daysAgo(15),responsible_manager:"Head of Training",raised_by_name:"Sarah Ochieng"},
      {id:`DEMO-QMS-002-${daysAgo(40).replace(/-/g,"")}-CAPA001`,org_id:orgId,finding_description:"Aircraft maintenance logbook entries missing for 2 routine inspections",qms_clause:"Maintenance Manual AMM 5.20 — Maintenance Records",severity:"Critical",status:"Closed",department:"Maintenance",date_raised:daysAgo(40),due_date:daysAgo(10),responsible_manager:"Head of Maintenance",raised_by_name:"Sarah Ochieng"},
      {id:`DEMO-QMS-003-${daysAgo(30).replace(/-/g,"")}-CAPA001`,org_id:orgId,finding_description:"Emergency equipment checklist not completed for 4 consecutive flights",qms_clause:"Ops Manual Section 8.1 — Emergency Equipment",severity:"Critical",status:"Pending Verification",department:"Flight Operations",date_raised:daysAgo(30),due_date:daysFromNow(5),responsible_manager:"Head of Training",raised_by_name:"Sarah Ochieng"},
      {id:`DEMO-QMS-004-${daysAgo(20).replace(/-/g,"")}-CAPA001`,org_id:orgId,finding_description:"Contractor approval documentation expired for two ground handling providers",qms_clause:"QMS Clause 8.4 — Control of Externally Provided Services",severity:"Major",status:"In Progress",department:"Administration",date_raised:daysAgo(20),due_date:daysFromNow(10),responsible_manager:"Accountable Manager",raised_by_name:"Sarah Ochieng"},
      {id:`DEMO-QMS-005-${daysAgo(10).replace(/-/g,"")}-CAPA001`,org_id:orgId,finding_description:"KCAA operating certificate renewal overdue by 15 days",qms_clause:"Regulatory Compliance — AOC Certificate Validity",severity:"Critical",status:"Open",department:"Quality",date_raised:daysAgo(10),due_date:daysFromNow(7),responsible_manager:"Accountable Manager",raised_by_name:"Sarah Ochieng"},
      {id:`DEMO-QMS-006-${daysAgo(5).replace(/-/g,"")}-CAPA001`,org_id:orgId,finding_description:"Fuel quality test records incomplete for Wilson Airport refuelling point",qms_clause:"Ops Manual Section 6.3 — Fuel Management",severity:"Minor",status:"Open",department:"Flight Operations",date_raised:daysAgo(5),due_date:daysFromNow(20),responsible_manager:"Head of Training",raised_by_name:"James Mwangi"},
    ];
    await supabase.from("cars").insert(cars);
    const caps = [
      {id:`${orgId}-cap-1`,org_id:orgId,car_id:cars[0].id,immediate_action:"All affected crew members identified and simulator sessions scheduled within 48 hours",root_cause_analysis:"Training coordinator departure left a gap in record-keeping — no handover procedure was in place",corrective_action:"Simulator hours logged and verified for all 3 crew members. Training coordinator role formally documented.",preventive_action:"Digital training record system implemented. Monthly QM review of training logs introduced.",submitted_by_name:"Capt. David Njoroge",submitted_at:new Date(today-30*86400000).toISOString(),status:"Complete"},
      {id:`${orgId}-cap-2`,org_id:orgId,car_id:cars[1].id,immediate_action:"Missing logbook entries reconstructed from engineer work orders and signed off by Lead Engineer",root_cause_analysis:"Paper-based dual-entry system prone to omission when engineers are under time pressure",corrective_action:"All missing entries completed and verified. Engineer briefing conducted.",preventive_action:"Electronic maintenance logbook system introduced. Pre-flight QA check added to sign-off procedure.",submitted_by_name:"Thomas Kamau",submitted_at:new Date(today-25*86400000).toISOString(),status:"Complete"},
      {id:`${orgId}-cap-3`,org_id:orgId,car_id:cars[2].id,immediate_action:"Affected crew briefed and emergency equipment checks reinstated immediately",root_cause_analysis:"Checklist item inadvertently removed during a manual revision — not caught in the review process",corrective_action:"Ops Manual revised and emergency checklist item restored. All crew re-briefed.",preventive_action:"Document control procedure updated to require QM sign-off on all checklist changes.",submitted_by_name:"Capt. David Njoroge",submitted_at:new Date(today-10*86400000).toISOString(),status:"Complete"},
    ];
    await supabase.from("caps").insert(caps);
    const verifs = [
      {id:`${orgId}-verif-1`,org_id:orgId,car_id:cars[0].id,immediate_action_ok:true,root_cause_ok:true,corrective_action_ok:true,preventive_action_ok:true,evidence_ok:true,recurrence_prevented:true,effectiveness_rating:"Effective",status:"Closed",verified_by_name:"Sarah Ochieng",verified_at:new Date(today-20*86400000).toISOString(),verifier_comments:"All training records verified as complete. Digital system confirmed operational. Finding closed."},
      {id:`${orgId}-verif-2`,org_id:orgId,car_id:cars[1].id,immediate_action_ok:true,root_cause_ok:true,corrective_action_ok:true,preventive_action_ok:true,evidence_ok:true,recurrence_prevented:true,effectiveness_rating:"Effective",status:"Closed",verified_by_name:"Sarah Ochieng",verified_at:new Date(today-15*86400000).toISOString(),verifier_comments:"Electronic logbook system verified. All entries complete and signed. Finding closed."},
    ];
    await supabase.from("capa_verifications").insert(verifs);
    await supabase.from("cars").update({status:"Closed"}).eq("id",cars[0].id);
    await supabase.from("cars").update({status:"Closed"}).eq("id",cars[1].id);
    const risks = [
      {id:`${orgId}-risk-1`,org_id:orgId,hazard_description:"Bird strike on approach to Wilson Airport",category:"Flight Operations",severity:4,likelihood:3,residual_severity:3,residual_likelihood:2,treatment:"Bird scaring equipment installed. Crew briefed on bird activity reporting.",status:"Monitoring",owner:"Head of Training",target_date:daysFromNow(60)},
      {id:`${orgId}-risk-2`,org_id:orgId,hazard_description:"Key maintenance engineer resignation without knowledge transfer",category:"Maintenance",severity:3,likelihood:2,residual_severity:2,residual_likelihood:1,treatment:"Cross-training programme initiated. Maintenance manuals updated.",status:"Open",owner:"Head of Maintenance",target_date:daysFromNow(30)},
      {id:`${orgId}-risk-3`,org_id:orgId,hazard_description:"KCAA regulatory requirement changes without adequate notice",category:"Regulatory Compliance",severity:4,likelihood:2,residual_severity:3,residual_likelihood:1,treatment:"QM subscribed to KCAA regulatory update mailing list. Monthly regulatory review meeting established.",status:"Monitoring",owner:"Accountable Manager",target_date:daysFromNow(90)},
      {id:`${orgId}-risk-4`,org_id:orgId,hazard_description:"Fuel contamination at third-party refuelling point",category:"Flight Operations",severity:5,likelihood:1,residual_severity:4,residual_likelihood:1,treatment:"Fuel testing procedure implemented at all refuelling points.",status:"Open",owner:"Head of Training",target_date:daysFromNow(45)},
      {id:`${orgId}-risk-5`,org_id:orgId,hazard_description:"Loss of critical QMS documentation in system failure",category:"Organisational",severity:3,likelihood:2,residual_severity:2,residual_likelihood:1,treatment:"Cloud backup of all QMS documents. AeroQualify Pro used as system of record.",status:"Closed",owner:"Accountable Manager",target_date:daysAgo(5)},
    ];
    await supabase.from("risk_register").insert(risks);
    const fdocs = [
      {id:`${orgId}-doc-1`,org_id:orgId,title:"Operations Manual Part A",doc_number:"OPS/A/001",rev:"Rev 4",category:"Core QMS",status:"Valid",date:daysAgo(60),expiry_date:daysFromNow(305),issue_date:daysAgo(60),issuing_authority:"KCAA"},
      {id:`${orgId}-doc-2`,org_id:orgId,title:"Air Operator Certificate",doc_number:"AOC/KE/042",rev:"Rev 1",category:"Regulatory",status:"Valid",date:daysAgo(180),expiry_date:daysFromNow(12),issue_date:daysAgo(180),issuing_authority:"KCAA"},
      {id:`${orgId}-doc-3`,org_id:orgId,title:"Safety Management System Manual",doc_number:"SMS/001",rev:"Rev 2",category:"Safety",status:"Valid",date:daysAgo(90),expiry_date:daysFromNow(275),issue_date:daysAgo(90),issuing_authority:"Internal"},
      {id:`${orgId}-doc-4`,org_id:orgId,title:"Maintenance Organisation Exposition",doc_number:"MOE/001",rev:"Rev 3",category:"Maintenance",status:"Valid",date:daysAgo(120),expiry_date:daysFromNow(245),issue_date:daysAgo(120),issuing_authority:"KCAA"},
      {id:`${orgId}-doc-5`,org_id:orgId,title:"Emergency Response Plan",doc_number:"ERP/001",rev:"Rev 1",category:"Safety",status:"Pending Renewal",date:daysAgo(200),expiry_date:daysFromNow(8),issue_date:daysAgo(200),issuing_authority:"Internal"},
    ];
    await supabase.from("flight_school_docs").insert(fdocs);
    const contractors = [
      {id:`${orgId}-con-1`,org_id:orgId,name:"Kenyan Avionics Services Ltd",category:"Avionics & Instruments",status:"Approved",rating:"A",contact:"info@kenyanavionics.co.ke",country:"Kenya",last_audit:daysAgo(90),next_audit:daysFromNow(275)},
      {id:`${orgId}-con-2`,org_id:orgId,name:"Wilson Ground Handling Co.",category:"Ground Handling",status:"Conditional",rating:"B",contact:"ops@wilsonground.co.ke",country:"Kenya",last_audit:daysAgo(30),next_audit:daysFromNow(60)},
      {id:`${orgId}-con-3`,org_id:orgId,name:"AfricaFuel Services",category:"Fuel Supplier",status:"Approved",rating:"A+",contact:"quality@africafuel.co.ke",country:"Kenya",last_audit:daysAgo(60),next_audit:daysFromNow(120)},
    ];
    await supabase.from("contractors").insert(contractors);
    showToast("Demo data seeded successfully!","success");
    onRefresh();
  };

  const updateOrgStatus = async (orgId, status) => {
    const { error } = await supabase.from("organisations").update({ status }).eq("id", orgId);
    if(error){ showToast("Error: "+error.message,"error"); return; }
    showToast(status==="active"?"Organisation activated":"Organisation suspended","success");
    onRefresh();
  };

  const sendResetLink = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://aeroqualify.co.ke"
    });
    if(error){ showToast("Error: "+error.message,"error"); return; }
    showToast(`Password reset link sent to ${email}`,"success");
  };

  const assignUser = async (userId, orgId, role) => {
    if(!orgId||!role) return;
    const { error } = await supabase.from("profiles").update({ org_id:orgId, role, status:"approved" }).eq("id", userId);
    if(error){ showToast("Error: "+error.message,"error"); return; }
    showToast("User assigned and approved","success");
    onRefresh();
  };

  const loadActivity = async () => {
    setLoadingLog(true);
    const { data } = await supabase.from("change_log").select("*").order("created_at",{ascending:false}).limit(50);
    setActivityLog(data||[]);
    setLoadingLog(false);
  };

  // Computed stats
  const [accessRequests, setAccessRequests] = useState([]);
  useEffect(()=>{
    supabase.from("access_requests").select("*").order("submitted_at",{ascending:false}).then(({data})=>{
      setAccessRequests((data||[]).filter(r=>r.status==="new"));
    });
  },[]);

  const activeOrgs   = orgs.filter(o=>o.status==="active").length;
  const totalUsers   = orgUsers.length;
  const pendingUsers = orgUsers.filter(u=>u.status==="pending");
  const approvedUsers= orgUsers.filter(u=>u.status==="approved").length;

  const TABS = [
    {id:"dashboard",  label:"📊 Dashboard"},
    {id:"requests",   label:`📬 Access Requests${accessRequests.length>0?` (${accessRequests.length})`:""}`},
    {id:"orgs",       label:"🏢 Organisations"},
    {id:"users",      label:`👥 Users${pendingUsers.length>0?` (${pendingUsers.length} pending)`:""}`},
    {id:"new",        label:"➕ New Org"},
    {id:"activity",   label:"📋 Activity Log"},
  ];

  const StatCard = ({icon,label,value,sub,color="#01579b",bg="#e3f2fd"}) => (
    <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",padding:"20px 24px",display:"flex",alignItems:"center",gap:16 }}>
      <div style={{ width:48,height:48,borderRadius:12,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:26,fontWeight:800,color,fontFamily:"'Oxanium',sans-serif",lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:12,fontWeight:600,color:"#1a2332",marginTop:2 }}>{label}</div>
        {sub&&<div style={{ fontSize:11,color:"#8a9ab0",marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:0,height:"100%",minHeight:0,overflow:"visible" }}>

      {/* ── Header ── */}
      <div style={{ background:"linear-gradient(135deg,#0d1b2a,#1a3a5c)",borderRadius:12,padding:"24px 28px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:"'Oxanium',sans-serif",fontSize:22,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:28 }}>⚡</span> AeroQualify Super Admin
          </div>
          <div style={{ fontSize:13,color:"#90b4d4",marginTop:4 }}>Platform control centre — manage all organisations, users and system health</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11,color:"#90b4d4" }}>Platform</div>
          <div style={{ fontWeight:700,color:"#fff",fontSize:14 }}>aeroqualify.co.ke</div>
        </div>
      </div>

      {/* ── Nav Tabs ── */}
      <div style={{ display:"flex",gap:6,marginBottom:20,flexWrap:"wrap" }}>
        {TABS.map(({id,label})=>(
          <button key={id} onClick={()=>{ setTab(id); if(id==="activity") loadActivity(); }}
            style={{ padding:"9px 18px",borderRadius:8,border:`1.5px solid ${tab===id?"#01579b":"#dde3ea"}`,background:tab===id?"#01579b":"#fff",color:tab===id?"#fff":"#5f7285",fontWeight:600,fontSize:13,cursor:"pointer",transition:"all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Dashboard Tab ── */}
      {tab==="dashboard"&&(
        <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
          {/* Stat cards */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14 }}>
            <StatCard icon="🏢" label="Active Organisations" value={activeOrgs} sub={`${orgs.length} total`} color="#01579b" bg="#e3f2fd"/>
            <StatCard icon="👥" label="Total Users" value={totalUsers} sub={`${approvedUsers} approved`} color="#2e7d32" bg="#e8f5e9"/>
            <StatCard icon="⏳" label="Pending Approvals" value={pendingUsers.length} sub="Awaiting admin review" color={pendingUsers.length>0?"#c62828":"#2e7d32"} bg={pendingUsers.length>0?"#ffebee":"#e8f5e9"}/>
            <StatCard icon="🌐" label="Platform" value="Live" sub="aeroqualify.co.ke" color="#6a1b9a" bg="#f3e5f5"/>
          </div>

          {/* Org health table */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",overflow:"hidden" }}>
            <div style={{ padding:"16px 20px",borderBottom:"1px solid #dde3ea",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontWeight:700,fontSize:15,color:"#1a2332" }}>Organisation Health</div>
              <button onClick={onRefresh} style={{ background:"none",border:"1px solid #dde3ea",borderRadius:6,padding:"4px 12px",fontSize:12,color:"#5f7285",cursor:"pointer" }}>↻ Refresh</button>
            </div>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["Organisation","Users","Org ID","CAR Prefix","Status","Created","Actions"].map(h=>(
                    <th key={h} style={{ padding:"10px 16px",borderBottom:"1px solid #dde3ea",textAlign:"left",fontSize:11,fontWeight:700,color:"#8a9ab0",textTransform:"uppercase",letterSpacing:0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map(o=>{
                  const uCount=orgUsers.filter(u=>u.org_id===o.id).length;
                  const pending=orgUsers.filter(u=>u.org_id===o.id&&u.status==="pending").length;
                  return (
                    <tr key={o.id} style={{ cursor:"pointer" }} onClick={()=>setSelectedOrg(selectedOrg?.id===o.id?null:o)}>
                      <td style={{ padding:"14px 16px",borderBottom:"1px solid #f0f4f8" }}>
                        <div style={{ fontWeight:700,color:"#1a2332",fontSize:13 }}>{o.name}</div>
                        <div style={{ fontSize:11,color:"#8a9ab0",display:"flex",alignItems:"center",gap:6 }}>
                          <span style={{ fontFamily:"monospace",background:"#f0f4f8",borderRadius:4,padding:"1px 6px",color:"#01579b",fontWeight:700 }}>{o.slug}</span>
                          <button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(o.slug);}} title="Copy org ID"
                            style={{ background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#8a9ab0",padding:0 }}>📋</button>
                          <span style={{ color:"#dde3ea" }}>·</span>
                          <span>{o.country||"—"}</span>
                        </div>
                      </td>
                      <td style={{ padding:"14px 16px",borderBottom:"1px solid #f0f4f8" }}>
                        <div style={{ fontSize:13,color:"#1a2332",fontWeight:600 }}>{uCount}</div>
                        {pending>0&&<div style={{ fontSize:11,color:"#c62828",fontWeight:600 }}>⚠ {pending} pending</div>}
                      </td>
                      <td style={{ padding:"14px 16px",borderBottom:"1px solid #f0f4f8" }}>
                        <div style={{ fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#01579b",background:"#e3f2fd",borderRadius:5,padding:"3px 10px",display:"inline-block",letterSpacing:1 }}>{o.slug}</div>
                        <button onClick={e=>{e.stopPropagation();navigator.clipboard?.writeText(o.slug);showToast("Login code copied!","success");}}
                          style={{ display:"block",marginTop:3,background:"none",border:"none",color:"#8a9ab0",fontSize:10,cursor:"pointer",padding:0 }}>
                          📋 Copy
                        </button>
                      </td>
                      <td style={{ padding:"14px 16px",borderBottom:"1px solid #f0f4f8",fontFamily:"monospace",fontSize:13,fontWeight:700,color:"#01579b" }}>{o.car_prefix||"ORG"}</td>
                      <td style={{ padding:"14px 16px",borderBottom:"1px solid #f0f4f8" }}>
                        <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                          <span style={{ background:o.status==="active"?"#e8f5e9":"#ffebee",color:o.status==="active"?"#2e7d32":"#c62828",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,display:"inline-block",width:"fit-content" }}>
                            {o.status==="active"?"● Active":"○ Suspended"}
                          </span>
                          {o.demo_expires_at&&(()=>{
                            const daysLeft=Math.ceil((new Date(o.demo_expires_at)-new Date())/86400000);
                            if(daysLeft>0) return <span style={{ fontSize:10,color:"#e65100",fontWeight:600 }}>⏱ Demo: {daysLeft}d left</span>;
                            return <span style={{ fontSize:10,color:"#c62828",fontWeight:600 }}>⏱ Demo expired</span>;
                          })()}
                        </div>
                      </td>
                      <td style={{ padding:"14px 16px",borderBottom:"1px solid #f0f4f8",fontSize:12,color:"#8a9ab0" }}>{fmt(o.created_at)}</td>
                      <td style={{ padding:"14px 16px",borderBottom:"1px solid #f0f4f8" }}>
                        <div style={{ display:"flex",gap:6 }}>
                          {o.slug!=="default"&&(
                            o.status==="active"
                              ?<button onClick={e=>{e.stopPropagation();updateOrgStatus(o.id,"suspended");}} style={{ background:"#ffebee",color:"#c62828",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Suspend</button>
                              :<button onClick={e=>{e.stopPropagation();updateOrgStatus(o.id,"active");}} style={{ background:"#e8f5e9",color:"#2e7d32",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Activate</button>
                          )}
                          <button onClick={e=>{e.stopPropagation();seedDemoOrg(o.id);}} style={{ background:"#f3e5f5",color:"#6a1b9a",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>🌱 Seed</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pending approvals quick action */}
          {pendingUsers.length>0&&(
            <div style={{ background:"#fff8e1",border:"1px solid #ffe082",borderRadius:12,padding:"16px 20px" }}>
              <div style={{ fontWeight:700,fontSize:14,color:"#e65100",marginBottom:12 }}>⏳ {pendingUsers.length} user{pendingUsers.length!==1?"s":""} awaiting approval</div>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {pendingUsers.slice(0,5).map(u=>(
                  <div key={u.id} style={{ display:"flex",alignItems:"center",gap:12,background:"#fff",borderRadius:8,padding:"10px 14px",border:"1px solid #ffe082" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:600,color:"#1a2332" }}>{u.full_name||u.email}</div>
                      <div style={{ fontSize:11,color:"#8a9ab0" }}>{u.email}</div>
                    </div>
                    <button onClick={()=>setTab("users")} style={{ background:"#01579b",color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer" }}>Review →</button>
                  </div>
                ))}
                {pendingUsers.length>5&&<div style={{ fontSize:12,color:"#8a9ab0",padding:"4px 0" }}>+{pendingUsers.length-5} more — go to Users tab</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Organisations Tab ── */}
      {tab==="orgs"&&(
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",overflow:"hidden" }}>
          <div style={{ padding:"16px 20px",borderBottom:"1px solid #dde3ea",fontWeight:700,fontSize:15,color:"#1a2332" }}>All Organisations</div>
          {orgs.length===0?(
            <div style={{ padding:32,textAlign:"center",color:"#8a9ab0" }}>No organisations yet. Create one to get started.</div>
          ):(
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["Organisation","Org ID (Login Code)","Country","Contact","CAR Prefix","Status","Created","Actions"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px",borderBottom:"1px solid #dde3ea",textAlign:"left",fontSize:11,fontWeight:700,color:"#8a9ab0",textTransform:"uppercase",letterSpacing:0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map(o=>{
                  const userCount=orgUsers.filter(u=>u.org_id===o.id).length;
                  return (
                    <tr key={o.id} className="row-hover">
                      <td style={{ padding:"12px 14px",borderBottom:"1px solid #f0f4f8" }}>
                        <div style={{ fontWeight:700,color:"#1a2332",fontSize:13 }}>{o.name}</div>
                        <div style={{ fontSize:11,color:"#8a9ab0" }}>{userCount} user{userCount!==1?"s":""}</div>
                      </td>
                      <td style={{ padding:"12px 14px",borderBottom:"1px solid #f0f4f8",fontFamily:"monospace",fontSize:12,color:"#8a9ab0" }}>{o.slug}</td>
                      <td style={{ padding:"12px 14px",borderBottom:"1px solid #f0f4f8",fontSize:13 }}>{o.country||"—"}</td>
                      <td style={{ padding:"12px 14px",borderBottom:"1px solid #f0f4f8" }}>
                        <div style={{ fontSize:12,color:"#1a2332" }}>{o.contact_name||"—"}</div>
                        <div style={{ fontSize:11,color:"#8a9ab0" }}>{o.contact_email||""}</div>
                      </td>
                      <td style={{ padding:"12px 14px",borderBottom:"1px solid #f0f4f8",fontFamily:"monospace",fontSize:13,fontWeight:700,color:"#01579b" }}>{o.car_prefix||"ORG"}</td>
                      <td style={{ padding:"12px 14px",borderBottom:"1px solid #f0f4f8" }}>
                        <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                          <span style={{ background:o.status==="active"?"#e8f5e9":"#ffebee",color:o.status==="active"?"#2e7d32":"#c62828",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,display:"inline-block",width:"fit-content" }}>
                            {o.status==="active"?"Active":"Suspended"}
                          </span>
                          {o.demo_expires_at&&(()=>{
                            const daysLeft=Math.ceil((new Date(o.demo_expires_at)-new Date())/86400000);
                            if(daysLeft>0) return <span style={{ fontSize:10,color:"#e65100",fontWeight:600 }}>⏱ {daysLeft}d demo left</span>;
                            return <span style={{ fontSize:10,color:"#c62828",fontWeight:600 }}>⏱ Expired</span>;
                          })()}
                        </div>
                      </td>
                      <td style={{ padding:"12px 14px",borderBottom:"1px solid #f0f4f8",fontSize:12,color:"#8a9ab0" }}>{fmt(o.created_at)}</td>
                      <td style={{ padding:"12px 14px",borderBottom:"1px solid #f0f4f8" }}>
                        <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                          {o.slug!=="default"&&(
                            o.status==="active"
                              ?<button onClick={()=>updateOrgStatus(o.id,"suspended")} style={{ background:"#ffebee",color:"#c62828",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Suspend</button>
                              :<button onClick={()=>updateOrgStatus(o.id,"active")} style={{ background:"#e8f5e9",color:"#2e7d32",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>Activate</button>
                          )}
                          <button onClick={()=>seedDemoOrg(o.id)} style={{ background:"#f3e5f5",color:"#6a1b9a",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>🌱 Seed</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab==="users"&&<SuperAdminUsersTab orgUsers={orgUsers} orgs={orgs} pendingUsers={pendingUsers} assignUser={assignUser} sendResetLink={sendResetLink} showToast={showToast} onRefresh={onRefresh}/>}

      {/* ── Access Requests Tab ── */}
      {tab==="requests"&&(
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",overflow:"hidden" }}>
          <div style={{ padding:"14px 20px",borderBottom:"1px solid #dde3ea",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ fontWeight:700,fontSize:15,color:"#1a2332" }}>📬 Access Requests ({accessRequests.length})</div>
            <button onClick={()=>supabase.from("access_requests").select("*").order("submitted_at",{ascending:false}).then(({data})=>setAccessRequests((data||[]).filter(r=>r.status==="new")))}
              style={{ background:"none",border:"1px solid #dde3ea",borderRadius:6,padding:"4px 12px",fontSize:12,color:"#5f7285",cursor:"pointer" }}>↻ Refresh</button>
          </div>
          {accessRequests.length===0?(
            <div style={{ padding:32,textAlign:"center",color:"#8a9ab0",fontSize:13 }}>No new access requests</div>
          ):(
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["Name","Organisation","Email","Phone","Message","Submitted","Action"].map(h=>(
                    <th key={h} style={{ padding:"9px 14px",borderBottom:"1px solid #dde3ea",textAlign:"left",fontSize:11,fontWeight:700,color:"#8a9ab0",textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accessRequests.map(r=>(
                  <tr key={r.id} className="row-hover">
                    <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8",fontSize:13,fontWeight:600,color:"#1a2332" }}>{r.name}</td>
                    <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8",fontSize:13,fontWeight:700,color:"#01579b" }}>{r.company}</td>
                    <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8",fontSize:12,color:"#5f7285" }}>{r.email}</td>
                    <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8",fontSize:12,color:"#5f7285" }}>{r.phone||"—"}</td>
                    <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8",fontSize:12,color:"#5f7285",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.message||"—"}</td>
                    <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8",fontSize:11,color:"#8a9ab0",whiteSpace:"nowrap" }}>{fmt(r.submitted_at)}</td>
                    <td style={{ padding:"11px 14px",borderBottom:"1px solid #f0f4f8" }}>
                      <div style={{ display:"flex",gap:6 }}>
                        <button onClick={()=>{
                          setNewOrg({
                            name: r.company,
                            slug: "",
                            country: "Kenya",
                            contact_name: r.name,
                            contact_email: r.email,
                          });
                          setTab("new");
                        }} style={{ background:"#e3f2fd",color:"#01579b",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                          ➕ Create Org
                        </button>
                        <button onClick={async()=>{
                          await supabase.from("access_requests").update({status:"done"}).eq("id",r.id);
                          setAccessRequests(p=>p.filter(x=>x.id!==r.id));
                          showToast("Marked as done","success");
                        }} style={{ background:"#e8f5e9",color:"#2e7d32",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                          ✓ Done
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── New Org Tab ── */}
      {tab==="new"&&(
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",padding:28,maxWidth:560 }}>
          <div style={{ fontWeight:700,fontSize:16,color:"#1a2332",marginBottom:4 }}>Create New Organisation</div>
          <div style={{ fontSize:12,color:"#8a9ab0",marginBottom:20 }}>Set up a new client organisation on the AeroQualify platform.</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <Input label="Organisation Name *" value={newOrg.name} onChange={e=>setNewOrg(p=>({...p,name:e.target.value,slug:slugify(e.target.value)}))} placeholder="e.g. Precision Air Services Ltd"/>
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:700,color:"#5f7285",letterSpacing:0.8,textTransform:"uppercase",display:"block",marginBottom:6 }}>Login Code (auto-generated)</label>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <input value={newOrg.slug} onChange={e=>setNewOrg(p=>({...p,slug:e.target.value}))}
                  style={{ flex:1,padding:"9px 12px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:14,fontFamily:"monospace",fontWeight:700,letterSpacing:1 }}
                  placeholder="Auto-generated on create"/>
                <button type="button" onClick={()=>setNewOrg(p=>({...p,slug:generateOrgCode()}))}
                  style={{ background:"#e8eaf6",color:"#3949ab",border:"none",borderRadius:8,padding:"9px 14px",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap" }}>
                  🔄 Generate
                </button>
              </div>
              <div style={{ fontSize:11,color:"#8a9ab0",marginTop:4 }}>Share this code privately with your staff — they need it to log in.</div>
            </div>
            <Input label="Country" value={newOrg.country} onChange={e=>setNewOrg(p=>({...p,country:e.target.value}))} placeholder="Kenya"/>
            <Input label="Contact Name" value={newOrg.contact_name} onChange={e=>setNewOrg(p=>({...p,contact_name:e.target.value}))} placeholder="Quality Manager name"/>
            <Input label="Contact Email" type="email" value={newOrg.contact_email} onChange={e=>setNewOrg(p=>({...p,contact_email:e.target.value}))} placeholder="qm@organisation.com"/>
          </div>
          {/* Demo / Full Access toggle */}
          <div style={{ marginTop:20,background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid #dde3ea" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:newOrgDemo?12:0 }}>
              <div>
                <div style={{ fontWeight:700,fontSize:13,color:"#1a2332" }}>Access Type</div>
                <div style={{ fontSize:11,color:"#8a9ab0",marginTop:2 }}>
                  {newOrgDemo ? `Demo access — expires in ${demoDays} days` : "Full access — no expiry"}
                </div>
              </div>
              <div style={{ display:"flex",gap:6 }}>
                <button type="button" onClick={()=>setNewOrgDemo(false)}
                  style={{ padding:"6px 14px",borderRadius:6,border:`1.5px solid ${!newOrgDemo?"#01579b":"#dde3ea"}`,
                    background:!newOrgDemo?"#e3f2fd":"#fff",color:!newOrgDemo?"#01579b":"#8a9ab0",
                    fontWeight:700,fontSize:12,cursor:"pointer" }}>
                  ✓ Full Access
                </button>
                <button type="button" onClick={()=>setNewOrgDemo(true)}
                  style={{ padding:"6px 14px",borderRadius:6,border:`1.5px solid ${newOrgDemo?"#e65100":"#dde3ea"}`,
                    background:newOrgDemo?"#fff3e0":"#fff",color:newOrgDemo?"#e65100":"#8a9ab0",
                    fontWeight:700,fontSize:12,cursor:"pointer" }}>
                  ⏱ Demo
                </button>
              </div>
            </div>
            {newOrgDemo&&(
              <div style={{ display:"flex",alignItems:"center",gap:10,marginTop:8 }}>
                <label style={{ fontSize:12,color:"#5f7285",fontWeight:600,whiteSpace:"nowrap" }}>Demo duration:</label>
                {[7,14,30].map(d=>(
                  <button key={d} type="button" onClick={()=>setDemoDays(d)}
                    style={{ padding:"4px 12px",borderRadius:6,border:`1.5px solid ${demoDays===d?"#e65100":"#dde3ea"}`,
                      background:demoDays===d?"#fff3e0":"#fff",color:demoDays===d?"#e65100":"#5f7285",
                      fontWeight:demoDays===d?700:500,fontSize:12,cursor:"pointer" }}>
                    {d} days
                  </button>
                ))}
                <input type="number" min={1} max={365} value={demoDays} onChange={e=>setDemoDays(Number(e.target.value))}
                  style={{ width:60,padding:"4px 8px",border:"1px solid #dde3ea",borderRadius:6,fontSize:12,textAlign:"center" }}/>
              </div>
            )}
          </div>

          <div style={{ marginTop:16,display:"flex",gap:10 }}>
            <Btn onClick={createOrg} disabled={!newOrg.name.trim()||creating} style={{ opacity:creating?0.7:1,
              background:newOrgDemo?"#e65100":undefined }}>
              {creating?"Creating…":newOrgDemo?"Create Demo Org":"Create Organisation"}
            </Btn>
            <Btn variant="ghost" onClick={()=>setTab("orgs")}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* ── Activity Log Tab ── */}
      {tab==="activity"&&(
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",overflow:"hidden" }}>
          <div style={{ padding:"14px 20px",borderBottom:"1px solid #dde3ea",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ fontWeight:700,fontSize:15,color:"#1a2332" }}>Platform Activity Log</div>
            <button onClick={loadActivity} style={{ background:"none",border:"1px solid #dde3ea",borderRadius:6,padding:"4px 12px",fontSize:12,color:"#5f7285",cursor:"pointer" }}>↻ Refresh</button>
          </div>
          {loadingLog?(
            <div style={{ padding:32,textAlign:"center",color:"#8a9ab0" }}>Loading activity…</div>
          ):(
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["Time","User","Action","Record","Table"].map(h=>(
                    <th key={h} style={{ padding:"9px 14px",borderBottom:"1px solid #dde3ea",textAlign:"left",fontSize:11,fontWeight:700,color:"#8a9ab0",textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activityLog.length===0?(
                  <tr><td colSpan={5} style={{ padding:32,textAlign:"center",color:"#8a9ab0" }}>No activity yet — click Refresh to load.</td></tr>
                ):activityLog.map((log,i)=>(
                  <tr key={i} className="row-hover">
                    <td style={{ padding:"10px 14px",borderBottom:"1px solid #f0f4f8",fontSize:11,color:"#8a9ab0",whiteSpace:"nowrap" }}>{fmt(log.created_at)}</td>
                    <td style={{ padding:"10px 14px",borderBottom:"1px solid #f0f4f8",fontSize:12,color:"#1a2332" }}>{log.user_name||"—"}</td>
                    <td style={{ padding:"10px 14px",borderBottom:"1px solid #f0f4f8" }}><Badge label={log.action}/></td>
                    <td style={{ padding:"10px 14px",borderBottom:"1px solid #f0f4f8",fontSize:12,color:"#5f7285",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{log.record_title||log.record_id||"—"}</td>
                    <td style={{ padding:"10px 14px",borderBottom:"1px solid #f0f4f8",fontSize:11,color:"#8a9ab0" }}>{log.table_name||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
};


// ─── Generic Modal Shell ──────────────────────────────────────


// ─── Pegasus Letterhead ───────────────────────────────────────
// ─── Pending User Row ────────────────────────────────────────
const PendingUserRow = ({ u, orgs, onAssign }) => {
  const [orgId, setOrgId] = useState("");
  const [role,  setRole]  = useState("viewer");
  return (
    <tr className="row-hover">
      <td style={{ padding:"11px 14px",borderBottom:"1px solid #fff8e1",fontSize:12,color:"#5f7285" }}>{u.email}</td>
      <td style={{ padding:"11px 14px",borderBottom:"1px solid #fff8e1",fontSize:13,fontWeight:600,color:"#1a2332" }}>{u.full_name||"—"}</td>
      <td style={{ padding:"11px 14px",borderBottom:"1px solid #fff8e1",fontSize:11,color:"#8a9ab0" }}>{fmt(u.created_at)}</td>
      <td style={{ padding:"11px 14px",borderBottom:"1px solid #fff8e1" }}>
        <select value={orgId} onChange={e=>setOrgId(e.target.value)}
          style={{ padding:"5px 8px",border:"1px solid #dde3ea",borderRadius:6,fontSize:12,minWidth:160 }}>
          <option value="">Select org…</option>
          {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </td>
      <td style={{ padding:"11px 14px",borderBottom:"1px solid #fff8e1" }}>
        <select value={role} onChange={e=>setRole(e.target.value)}
          style={{ padding:"5px 8px",border:"1px solid #dde3ea",borderRadius:6,fontSize:12 }}>
          {["viewer","manager","quality_auditor","quality_manager","admin"].map(r=>(
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </td>
      <td style={{ padding:"11px 14px",borderBottom:"1px solid #fff8e1" }}>
        <button onClick={()=>onAssign(u.id,orgId,role)} disabled={!orgId}
          style={{ background:orgId?"#01579b":"#e8edf2",color:orgId?"#fff":"#8a9ab0",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:orgId?"pointer":"default" }}>
          Approve →
        </button>
      </td>
    </tr>
  );
};

// ─── Org Users Page ───────────────────────────────────────────
const OrgUsersPage = ({ org, user, showToast, onRefresh }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("org_id", org?.id).order("created_at",{ascending:false});
    setUsers(data||[]);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(org?.id) loadUsers(); },[org?.id]);

  const sendReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if(error){ showToast("Error: "+error.message,"error"); return; }
    showToast(`Password reset link sent to ${email}`,"success");
  };

  const updateRole = async (userId, role) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if(error){ showToast("Error: "+error.message,"error"); return; }
    showToast("Role updated","success"); loadUsers();
  };

  const updateStatus = async (userId, status) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
    if(error){ showToast("Error: "+error.message,"error"); return; }
    showToast(`User ${status}`,"success"); loadUsers();
  };

  const pending  = users.filter(u=>u.status==="pending");
  const approved = users.filter(u=>u.status==="approved");

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20,maxWidth:900 }}>
      {pending.length>0&&(
        <div style={{ background:"#fff",borderRadius:12,border:"1.5px solid #ffe082",overflow:"hidden" }}>
          <div style={{ padding:"14px 20px",background:"#fff8e1",borderBottom:"1px solid #ffe082",fontWeight:700,fontSize:14,color:"#e65100" }}>⏳ Pending Approval ({pending.length})</div>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"#fffde7" }}>
              {["Name","Email","Joined","Role","Action"].map(h=>(
                <th key={h} style={{ padding:"9px 16px",borderBottom:"1px solid #ffe082",textAlign:"left",fontSize:11,fontWeight:700,color:"#8a9ab0",textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {pending.map(u=>(
                <PendingOrgUserRow key={u.id} u={u} onApproveWithRole={async(role)=>{
                  await supabase.from("profiles").update({status:"approved",role}).eq("id",u.id);
                  showToast(`${u.full_name||u.email} approved as ${role}`,"success"); loadUsers();
                }}/>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",overflow:"hidden" }}>
        <div style={{ padding:"14px 20px",borderBottom:"1px solid #dde3ea",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div style={{ fontWeight:700,fontSize:14,color:"#1a2332" }}>Team Members ({approved.length})</div>
          <button onClick={loadUsers} style={{ background:"none",border:"1px solid #dde3ea",borderRadius:6,padding:"4px 12px",fontSize:12,color:"#5f7285",cursor:"pointer" }}>↻ Refresh</button>
        </div>
        {loading?<div style={{ padding:32,textAlign:"center",color:"#8a9ab0" }}>Loading…</div>:(
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"#f8fafc" }}>
              {["Name","Email","Role","Status","Joined","Actions"].map(h=>(
                <th key={h} style={{ padding:"9px 16px",borderBottom:"1px solid #dde3ea",textAlign:"left",fontSize:11,fontWeight:700,color:"#8a9ab0",textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {approved.map(u=>(
                <tr key={u.id} style={{ borderBottom:"1px solid #f0f4f8" }}>
                  <td style={{ padding:"11px 16px",fontSize:13,fontWeight:600,color:"#1a2332" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <div style={{ width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#01579b,#0288d1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0 }}>
                        {(u.full_name||u.email)[0].toUpperCase()}
                      </div>
                      {u.full_name||"—"}
                      {u.id===user?.id&&<span style={{ fontSize:10,color:"#01579b",fontWeight:700,background:"#e3f2fd",borderRadius:10,padding:"1px 6px" }}>You</span>}
                    </div>
                  </td>
                  <td style={{ padding:"11px 16px",fontSize:12,color:"#5f7285" }}>{u.email}</td>
                  <td style={{ padding:"11px 16px" }}>
                    <select value={u.role||"viewer"} onChange={e=>updateRole(u.id,e.target.value)}
                      style={{ padding:"4px 8px",border:"1px solid #dde3ea",borderRadius:6,fontSize:12,background:"#fff" }}>
                      {["viewer","manager","quality_auditor","quality_manager","admin"].map(r=>(
                        <option key={r} value={r}>{r.replace("_"," ")}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding:"11px 16px" }}>
                    <span style={{ background:"#e8f5e9",color:"#2e7d32",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600 }}>Active</span>
                  </td>
                  <td style={{ padding:"11px 16px",fontSize:11,color:"#8a9ab0" }}>{fmt(u.created_at)}</td>
                  <td style={{ padding:"11px 16px" }}>
                    <div style={{ display:"flex",gap:6 }}>
                      <button onClick={()=>sendReset(u.email)}
                        style={{ background:"#e3f2fd",color:"#01579b",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                        📧 Reset Password
                      </button>
                      {u.id!==user?.id&&(
                        <button onClick={()=>{ if(window.confirm(`Suspend ${u.full_name||u.email}?`)) updateStatus(u.id,"suspended"); }}
                          style={{ background:"#ffebee",color:"#c62828",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const PendingOrgUserRow = ({ u, onApproveWithRole }) => {
  const [role, setRole] = useState("viewer");
  return (
    <tr style={{ borderBottom:"1px solid #fff8e1" }}>
      <td style={{ padding:"11px 16px",fontSize:13,fontWeight:600,color:"#1a2332" }}>{u.full_name||"—"}</td>
      <td style={{ padding:"11px 16px",fontSize:12,color:"#5f7285" }}>{u.email}</td>
      <td style={{ padding:"11px 16px",fontSize:11,color:"#8a9ab0" }}>{fmt(u.created_at)}</td>
      <td style={{ padding:"11px 16px" }}>
        <select value={role} onChange={e=>setRole(e.target.value)}
          style={{ padding:"5px 8px",border:"1px solid #dde3ea",borderRadius:6,fontSize:12 }}>
          {["viewer","manager","quality_auditor","quality_manager","admin"].map(r=>(
            <option key={r} value={r}>{r.replace("_"," ")}</option>
          ))}
        </select>
      </td>
      <td style={{ padding:"11px 16px" }}>
        <button onClick={()=>onApproveWithRole(role)}
          style={{ background:"#01579b",color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer" }}>
          Approve →
        </button>
      </td>
    </tr>
  );
};

// ─── Profile Page ─────────────────────────────────────────────
const ProfilePage = ({ user, profile, showToast, onRefresh }) => {
  const [name,    setName]    = useState(profile?.full_name||"");
  const [pw,      setPw]      = useState("");
  const [pw2,     setPw2]     = useState("");
  const [saving,  setSaving]  = useState(false);
  const [pwSaving,setPwSaving]= useState(false);

  const saveName = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    if(error){ showToast("Error: "+error.message,"error"); setSaving(false); return; }
    showToast("Profile updated","success"); onRefresh(); setSaving(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if(pw !== pw2){ showToast("Passwords do not match","error"); return; }
    if(pw.length < 6){ showToast("Password must be at least 6 characters","error"); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if(error){ showToast("Error: "+error.message,"error"); setPwSaving(false); return; }
    showToast("Password updated successfully","success");
    setPw(""); setPw2(""); setPwSaving(false);
  };

  const cardStyle = { background:"#fff",borderRadius:12,border:"1px solid #dde3ea",padding:28,maxWidth:500 };
  const sectionHead = (title, sub) => (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontWeight:700,fontSize:15,color:"#1a2332" }}>{title}</div>
      {sub&&<div style={{ fontSize:12,color:"#5f7285",marginTop:2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:20,maxWidth:520 }}>
      <div style={cardStyle}>
        {sectionHead("My Profile","Update your display name")}
        <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:20 }}>
          <div style={{ width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,#01579b,#0288d1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff",flexShrink:0 }}>
            {(profile?.full_name||user?.email||"?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:700,fontSize:14,color:"#1a2332" }}>{profile?.full_name||"—"}</div>
            <div style={{ fontSize:12,color:"#5f7285" }}>{user?.email}</div>
            <div style={{ fontSize:11,color:"#8a9ab0",marginTop:2 }}>{profile?.role?.replace(/_/g," ")||"viewer"}</div>
          </div>
        </div>
        <Input label="Display Name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/>
        <Btn onClick={saveName} disabled={saving} style={{ opacity:saving?0.7:1 }}>{saving?"Saving…":"Save Name"}</Btn>
      </div>
      <div style={cardStyle}>
        {sectionHead("Change Password","Enter a new password for your account")}
        <form onSubmit={changePassword}>
          <Input label="New Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 6 characters"/>
          <Input label="Confirm New Password" type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Repeat new password"/>
          <Btn type="submit" disabled={pwSaving||!pw||!pw2} style={{ opacity:(pwSaving||!pw||!pw2)?0.7:1 }}>
            {pwSaving?"Updating…":"Update Password"}
          </Btn>
        </form>
      </div>
    </div>
  );
};

// ─── Org Settings Page ────────────────────────────────────────
const OrgSettingsPage = ({ org, onSave }) => {
  const [prefix, setPrefix] = useState(org?.car_prefix||"ORG");
  const [areas,  setAreas]  = useState(()=>{
    try{ return JSON.parse(org?.audit_areas||"null") || ["Flight Operations","Maintenance","Training","Safety","Quality","Administration","Engineering","Ground Operations"]; }
    catch{ return ["Flight Operations","Maintenance","Training","Safety","Quality","Administration","Engineering","Ground Operations"]; }
  });
  const [newArea, setNewArea] = useState("");
  const [saving,  setSaving]  = useState(false);

  const addArea = () => {
    const trimmed = newArea.trim();
    if(!trimmed || areas.includes(trimmed)) return;
    setAreas(prev=>[...prev, trimmed]); setNewArea("");
  };
  const removeArea = (a) => setAreas(prev=>prev.filter(x=>x!==a));
  const moveArea = (idx, dir) => {
    const next = [...areas]; const swap = idx+dir;
    if(swap<0||swap>=next.length) return;
    [next[idx],next[swap]]=[next[swap],next[idx]]; setAreas(next);
  };
  const save = async() => {
    if(!prefix.trim()){ alert("CAR prefix cannot be empty"); return; }
    setSaving(true);
    await onSave({ car_prefix: prefix.trim().toUpperCase(), audit_areas: JSON.stringify(areas) });
    setSaving(false);
  };

  return (
    <div style={{ maxWidth:700,display:"flex",flexDirection:"column",gap:28 }}>
      <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",padding:28 }}>
        <div style={{ fontWeight:700,fontSize:15,color:"#1a2332",marginBottom:4 }}>CAR Naming Convention</div>
        <div style={{ fontSize:12,color:"#5f7285",marginBottom:16 }}>Set the prefix used to generate CAR and CAPA reference numbers.</div>
        <input value={prefix} onChange={e=>setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6))}
          style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:14,fontFamily:"monospace",fontWeight:700,letterSpacing:1,boxSizing:"border-box" }}
          maxLength={6} placeholder="e.g. PGF, KQA, AMO"/>
        <div style={{ background:"#f0f4f8",borderRadius:8,padding:"12px 16px",marginTop:12 }}>
          <div style={{ fontSize:11,fontWeight:700,color:"#5f7285",textTransform:"uppercase",letterSpacing:0.8,marginBottom:6 }}>Preview</div>
          <div style={{ fontFamily:"monospace",fontSize:13,color:"#1a2332" }}>
            <div>CAR ID: <strong>{prefix||"ORG"}-QMS-001-13032026-CAPA001</strong></div>
          </div>
        </div>
      </div>
      <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dde3ea",padding:28 }}>
        <div style={{ fontWeight:700,fontSize:15,color:"#1a2332",marginBottom:4 }}>Audit Areas</div>
        <div style={{ fontSize:12,color:"#5f7285",marginBottom:16 }}>Customise audit areas for your organisation.</div>
        <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:16 }}>
          {areas.map((a,i)=>(
            <div key={a} style={{ display:"flex",alignItems:"center",gap:8,background:"#f5f8fc",borderRadius:8,padding:"8px 12px",border:"1px solid #dde3ea" }}>
              <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
                <button onClick={()=>moveArea(i,-1)} disabled={i===0} style={{ background:"none",border:"none",cursor:i===0?"default":"pointer",color:i===0?"#ccc":"#5f7285",fontSize:10,padding:0,lineHeight:1 }}>▲</button>
                <button onClick={()=>moveArea(i,1)} disabled={i===areas.length-1} style={{ background:"none",border:"none",cursor:i===areas.length-1?"default":"pointer",color:i===areas.length-1?"#ccc":"#5f7285",fontSize:10,padding:0,lineHeight:1 }}>▼</button>
              </div>
              <span style={{ flex:1,fontSize:13,color:"#1a2332",fontWeight:500 }}>{a}</span>
              <button onClick={()=>removeArea(a)} style={{ background:"#ffebee",border:"none",borderRadius:6,color:"#c62828",fontWeight:700,fontSize:12,cursor:"pointer",padding:"3px 9px" }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <input value={newArea} onChange={e=>setNewArea(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addArea()}
            style={{ flex:1,padding:"9px 12px",border:"1.5px solid #dde3ea",borderRadius:8,fontSize:13 }}
            placeholder="Add new area…"/>
          <button onClick={addArea} style={{ background:"#01579b",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer" }}>+ Add</button>
        </div>
      </div>
      <div style={{ display:"flex",justifyContent:"flex-end" }}>
        <button onClick={save} disabled={saving}
          style={{ background:"#01579b",color:"#fff",border:"none",borderRadius:8,padding:"12px 32px",fontWeight:700,fontSize:14,cursor:saving?"wait":"pointer",opacity:saving?0.7:1 }}>
          {saving?"Saving…":"Save Settings"}
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [user,setUser]         = useState(null);
  const [showLogin,setShowLogin]           = useState(false);
  const [showOrgSwitcher,setShowOrgSwitcher] = useState(false);
  const [showPasswordReset,setShowPasswordReset] = useState(false);
  const [showTerms,setShowTerms]           = useState(false);
  const [authPopup,setAuthPopup] = useState(null); // "signup" | "pending" | "noProfile"
  const [profile,setProfile]   = useState(null);
  const [managers,setManagers] = useState([]);
  const [data,setData]         = useState({cars:[],caps:[],verifications:[],documents:[],flightDocs:[],audits:[],contractors:[],changeLog:[],risks:[],auditSchedule:[]});
  const [activeTab,setTab]     = useState("dashboard");
  const [toast,setToast]       = useState(null);
  const [loading,setLoading]   = useState(false);
  const [org,setOrg]           = useState(null);
  const [loginOrgOverride,setLoginOrgOverride] = useState(null); // org ID forced at login
  const [isSuperAdmin,setIsSuperAdmin] = useState(false);
  const [orgs,setOrgs]         = useState([]);   // super admin: all orgs
  const [orgUsers,setOrgUsers] = useState([]);   // super admin: all users
  const subs                   = useRef([]);
  const dataLoaded              = useRef(false);

  const showToast = useCallback((msg,type="success")=>setToast({message:msg,type}),[]);

  useEffect(()=>{
    // On a fresh tab open (not a refresh), sign out any lingering session
    // so the user always starts at the landing page.
    // On a page refresh, preserve the session so they stay logged in.
    const isRefresh = sessionStorage.getItem("aq_loaded");
    const urlHash = window.location.hash;
    const isEmailCallback = urlHash && (
      urlHash.includes("type=signup") ||
      urlHash.includes("type=recovery") ||
      urlHash.includes("type=email_change") ||
      urlHash.includes("access_token")
    );

    // Don't sign out if we're handling an email callback link
    if(!isRefresh && !isEmailCallback){
      supabase.auth.signOut();
    }
    sessionStorage.setItem("aq_loaded", "1");

    // If this is an email confirmation callback, show login screen immediately
    if(isEmailCallback && urlHash.includes("type=signup")){
      setShowLogin(true);
      setLoading(false);
    }

    const{data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(event==="PASSWORD_RECOVERY"){
        setShowPasswordReset(true);
        setShowLogin(false);
        setLoading(false);
        window.location.hash = "";
        return;
      }
      // Handle email confirmation — user clicked verify link
      if(event==="SIGNED_IN" && session?.user){
        const hash = window.location.hash;
        if(hash && (hash.includes("type=signup") || hash.includes("type=email_change"))){
          // Verified — sign out and show login with pending message
          supabase.auth.signOut().then(()=>{
            setLoading(false);
            setShowLogin(true);
            setAuthPopup("pending");
            window.location.hash = "";
          });
          return;
        }
      }
      if(!session?.user){
        setLoading(false);
        setProfile(null);
        setUser(null);
        setShowLogin(prev => prev ? prev : false);
      }
    });

    // Check hash for recovery token immediately
    if(urlHash && urlHash.includes("type=recovery")){
      setShowPasswordReset(true);
      setLoading(false);
      return;
    }

    // If there is an existing session on refresh, restore it
    if(isRefresh){
      supabase.auth.getSession().then(({data:{session}})=>{
        if(session?.user){ setLoading(true); setUser(session.user); }
        else { setLoading(false); }
      });
    }

    return()=>subscription.unsubscribe();
  },[]);

  const loadAll = useCallback(async()=>{
    if(!user)return;
    const [cars,caps,verifs,docs,fdocs,audits,contractors,logs,mgrs,prof,risks,auditSchedule]=await Promise.all([
      supabase.from(TABLES.cars).select("*").order("created_at",{ascending:false}),
      supabase.from(TABLES.caps).select("*"),
      supabase.from(TABLES.verifications).select("*"),
      supabase.from(TABLES.documents).select("*").order("created_at",{ascending:false}),
      supabase.from(TABLES.flightDocs).select("*").order("expiry_date",{ascending:true}),
      supabase.from(TABLES.audits).select("*").order("date",{ascending:true}),
      supabase.from(TABLES.contractors).select("*").order("name",{ascending:true}),
      supabase.from(TABLES.changeLog).select("*").order("created_at",{ascending:false}).limit(200),
      supabase.from(TABLES.managers).select("*").order("id"),
      supabase.from(TABLES.profiles).select("*").eq("id",user.id).single(),
      supabase.from(TABLES.risks).select("*").order("created_at",{ascending:false}),
      supabase.from("audit_schedule").select("*").order("year",{ascending:false}),
    ]);
    // Auto-mark overdue CARs — any non-closed CAR past due date becomes Overdue
    const OVERDUE_ELIGIBLE = ["Open","In Progress"];
    const today = new Date(); today.setHours(0,0,0,0);
    const processedCars = (cars.data||[]).map(c => {
      if(!OVERDUE_ELIGIBLE.includes(c.status)) return c; // only Open/In Progress can become Overdue
      if(!c.due_date) return c;
      const due = new Date(c.due_date); due.setHours(0,0,0,0);
      if(due < today) {
        supabase.from(TABLES.cars).update({status:"Overdue",updated_at:new Date().toISOString()}).eq("id",c.id).then(()=>{});
        return {...c, status:"Overdue"};
      }
      return c;
    });

    // Batch all state updates together to prevent intermediate empty renders
    flushSync(()=>{
      setData({
        cars:processedCars,caps:caps.data||[],verifications:verifs.data||[],auditSchedule:auditSchedule.data||[],
        documents:docs.data||[],flightDocs:fdocs.data||[],audits:audits.data||[],
        contractors:contractors.data||[],changeLog:logs.data||[],
        risks:risks.data||[],
      });
      setManagers(mgrs.data||[]);
      setProfile(prof.data);
      setIsSuperAdmin(prof.data?.is_super_admin||false);
      setLoading(false);
    });
    // Load org details — use login override if provided, otherwise use profile org_id
    // If super admin logged in without an org override, don't load an org (stay in platform mode)
    const isSuperAdminMode = prof.data?.is_super_admin && !loginOrgOverride;
    const orgIdToLoad = loginOrgOverride || (!isSuperAdminMode ? prof.data?.org_id : null);
    if(orgIdToLoad){
      supabase.from("organisations").select("*").eq("id",orgIdToLoad).single()
        .then(({data})=>{ if(data) setOrg(data); });
    } else if(isSuperAdminMode){
      setOrg(null); // clear org so sidebar shows platform mode
    }
    // Super admin: load all orgs and all users
    if(prof.data?.is_super_admin){
      supabase.from("organisations").select("*").order("name")
        .then(({data})=>{ if(data) setOrgs(data); });
      supabase.from(TABLES.profiles).select("*").order("created_at",{ascending:false})
        .then(({data})=>{ if(data) setOrgUsers(data); });
    }
  },[user,loginOrgOverride]);

  useEffect(()=>{ loadAll(); },[loadAll]);

  useEffect(()=>{
    if(!user||loading)return;
    const tables=["cars","caps","capa_verifications","documents","flight_school_docs","audits","contractors","change_log","risk_register","audit_schedule"];
    subs.current=tables.map(t=>
      supabase.channel(`rt-${t}`).on("postgres_changes",{event:"*",schema:"public",table:t},()=>loadAll()).subscribe()
    );
    return()=>{subs.current.forEach(s=>s.unsubscribe());};
  },[user,loading,loadAll]);

  const isAdmin  = profile?.role==="admin" || isSuperAdmin;
  const isQM     = ["admin","quality_manager"].includes(profile?.role) || isSuperAdmin;
  const canEdit  = ["admin","quality_manager","quality_auditor","manager"].includes(profile?.role) || isSuperAdmin;

  const alertItems = [
    ...data.cars.filter(c=>!["Closed","Completed"].includes(c.status)&&(isOverdue(c.due_date)||isApproaching(c.due_date))).map(c=>({id:c.id,due:c.due_date})),
    ...data.flightDocs.filter(d=>!["Expired","Approved"].includes(d.status)&&(isOverdue(d.expiry_date)||isApproaching(d.expiry_date))).map(d=>({id:d.id,due:d.expiry_date})),
    ...data.audits.filter(a=>a.status==="Scheduled"&&isOverdue(a.date)).map(a=>({id:a.id,due:a.date})),
    ...(data.risks||[]).filter(r=>!["Closed","Monitoring"].includes(r.status)&&isOverdue(r.target_date)).map(r=>({id:r.id,due:r.target_date})),
  ];

  const counts = {
    cars:      data.cars.filter(c=>["Open","In Progress"].includes(c.status)).length,
    flightdocs:data.flightDocs.filter(d=>!["Expired","Approved"].includes(d.status)&&(isApproaching(d.expiry_date)||isOverdue(d.expiry_date))).length,
    audits:    data.audits.filter(a=>a.status==="Scheduled"&&isOverdue(a.date)).length,
  };

  // ── Password Reset Screen (redirected from email link) ──
  if(showPasswordReset){
    return <PasswordResetScreen onDone={()=>{ setShowPasswordReset(false); window.location.hash=""; }} />;
  }

  if(!user) {
    const POPUPS = {
      signup: { icon:"📧", title:"Check your email", msg:"A verification link has been sent to your email address. Click the link to verify your account, then return here to sign in.", sub:"Once verified, your account will be reviewed by an administrator before you can access AeroQualify.", color:"#01579b", bg:"#e3f2fd" },
      pending: { icon:"⏳", title:"Account pending approval", msg:"Your account has been successfully created and your email verified.", sub:"Please contact your administrator to request access to AeroQualify Pro.", color:"#e65100", bg:"#fff3e0" },
      noProfile: { icon:"⚠️", title:"Account setup incomplete", msg:"Your account was created but the profile setup did not complete.", sub:"Please contact your administrator for assistance.", color:"#c62828", bg:"#ffebee" },
    };
    return (
      <>
        {/* Auth popup — shown above landing page or login screen */}
        {authPopup&&POPUPS[authPopup]&&(
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div style={{ background:"#fff", borderRadius:16, padding:36, maxWidth:420, width:"100%", textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.25)", animation:"fadeIn 0.3s ease" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>{POPUPS[authPopup].icon}</div>
              <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:20, color:POPUPS[authPopup].color, marginBottom:12 }}>{POPUPS[authPopup].title}</div>
              <div style={{ fontSize:14, color:"#37474f", lineHeight:1.7, marginBottom:10 }}>{POPUPS[authPopup].msg}</div>
              <div style={{ fontSize:12, color:"#607d8b", lineHeight:1.6, marginBottom:24, background:POPUPS[authPopup].bg, borderRadius:8, padding:"10px 14px" }}>{POPUPS[authPopup].sub}</div>
              <button onClick={()=>setAuthPopup(null)} style={{ width:"100%", padding:"12px", background:"#01579b", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>OK, got it</button>
            </div>
          </div>
        )}
        {showPasswordReset
          ? <PasswordResetScreen onDone={()=>{ setShowPasswordReset(false); setShowLogin(true); }}/>
          : showLogin
            ? <LoginScreen
                onLogin={(u, orgIdOverride, superAdminMode) => {
                  setUser(u);
                  setShowLogin(false);
                  setAuthPopup(null);
                  if(superAdminMode){ setIsSuperAdmin(true); setTab("superadmin"); }
                  if(orgIdOverride){ setLoginOrgOverride(orgIdOverride); }
                  // Show terms disclaimer if not yet accepted
                  if(!localStorage.getItem(DISCLAIMER_KEY)){ setShowTerms(true); }
                }}
                authPopup={authPopup} setAuthPopup={setAuthPopup}/>
            : <LandingPage onShowLogin={() => setShowLogin(true)} onShowSignup={() => setShowLogin(true)}/>
        }
      </>
    );
  }
  // Show loading screen while data is being fetched OR while profile hasn't arrived yet
  // This prevents the "viewer" flash while the real role loads
  if(loading || (user && !profile)) return (
    <div style={{ height:"100vh", background:"#eef2f7", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
      <GlobalStyle/>
      <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:28, fontWeight:800, color:T.primary }}>AeroQualify Pro</div>
      <div style={{ color:T.muted, fontSize:13 }}>{loading?"Connecting to database…":"Loading your profile…"}</div>
      <div style={{ width:32, height:32, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.primary}`, borderRadius:"50%", animation:"spin 1s linear infinite" }} />
    </div>
  );

  // Block access if account not yet approved by admin
  if(user && profile && profile.status !== "approved" && profile.role !== "admin") {
    return <PendingApprovalScreen user={user} onSignOut={async()=>{ await supabase.auth.signOut(); }} />;
  }

  // ── Super admin fullscreen portal (no org ID entered at login) ──
  if(isSuperAdmin && !loginOrgOverride && !org) {
    return (
      <div style={{ height:"100vh", maxHeight:"100vh", background:"#f0f4f8", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <GlobalStyle/>
        {/* Top stripe */}
        <div style={{ position:"fixed", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,#0d1b2a,#1a3a5c,#01579b)`, zIndex:200 }} />
        {/* Header bar */}
        <div style={{ background:"#0d1b2a", padding:"12px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:3, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#01579b,#0288d1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>✈</div>
            <div>
              <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:16, color:"#fff" }}>AeroQualify Pro</div>
              <div style={{ fontSize:10, color:"#90b4d4", letterSpacing:1 }}>PLATFORM ADMINISTRATION</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ fontSize:12, color:"#90b4d4" }}>
              Signed in as <strong style={{ color:"#fff" }}>{profile?.full_name||profile?.email}</strong>
            </div>
            <button
              onClick={async()=>{
                const slug = window.prompt("Enter Organisation ID:");
                if(!slug) return;
                const { data: orgData } = await supabase.from("organisations").select("*").eq("slug", slug.trim().toUpperCase()).single();
                if(!orgData){ alert("Organisation not found. Check the ID and try again."); return; }
                setLoginOrgOverride(orgData.id);
                setOrg(orgData);
              }}
              style={{ background:"#1a3a5c", border:"1px solid #2a5a8c", borderRadius:7, padding:"6px 14px", color:"#90b4d4", fontSize:12, cursor:"pointer" }}
              title="Enter an org ID to view as org user">
              🏢 Enter Org
            </button>
            <button
              onClick={async()=>{ await supabase.auth.signOut(); }}
              style={{ background:"none", border:"1px solid #c62828", borderRadius:7, padding:"6px 14px", color:"#ef9a9a", fontSize:12, cursor:"pointer" }}>
              Sign Out
            </button>
          </div>
        </div>
        {/* Portal content */}
        <div style={{ flex:1, padding:"24px 28px", overflowY:"auto", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <SuperAdminPanel
            orgs={orgs} orgUsers={orgUsers}
            showToast={showToast}
            onRefresh={()=>{
              supabase.from("organisations").select("*").order("name").then(({data})=>{ if(data) setOrgs(data); });
              supabase.from(TABLES.profiles).select("*").order("created_at",{ascending:false}).then(({data})=>{ if(data) setOrgUsers(data); });
            }}
          />
        </div>
        {toast&&<Toast message={toast.message} type={toast.type} onDone={()=>setToast(null)}/>}
      {showTerms&&<TermsModal onAccept={()=>{ localStorage.setItem(DISCLAIMER_KEY,"1"); setShowTerms(false); }}/>}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, overflow:"hidden", minWidth:0 }}>
      <GlobalStyle/>
      {/* Top stripe */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${T.primary},${T.sky},${T.teal})`, zIndex:200 }} />

      {/* ── Sidebar ──────────────────────────────── */}
      <aside style={{ width:220, flexShrink:0, background:"#fff", borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", marginTop:3, boxShadow:"2px 0 8px rgba(0,0,0,0.04)" }}>
        {/* Logo */}
        <div style={{ padding:"20px 16px 16px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${T.primary},${T.sky})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,boxShadow:"0 2px 8px rgba(1,87,155,0.25)" }}>✈</div>
            <div>
              <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:17, color:T.primaryDk, lineHeight:1 }}>AeroQualify</div>
              <div style={{ fontSize:9, color:T.muted, letterSpacing:1.5, textTransform:"uppercase" }}>Pro · QMS</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"10px 8px", overflowY:"auto" }}>
          <div style={{ fontSize:9, color:T.light, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", padding:"6px 8px 4px", marginBottom:2 }}>Main</div>
          {isSuperAdmin&&(
            <div>
              <div style={{ fontSize:9, color:"#c62828", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", padding:"6px 8px 4px", marginBottom:2 }}>Super Admin</div>
              <button className={`nav-item${activeTab==="superadmin"?" active":""}`} onClick={()=>setTab("superadmin")}
                style={{ width:"100%",textAlign:"left",background:"transparent",border:"none",borderLeft:"3px solid transparent",borderRadius:"0 7px 7px 0",padding:"9px 12px",color:activeTab==="superadmin"?T.red:T.muted,fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:9,marginBottom:4,transition:"all 0.15s" }}>
                <span style={{ fontSize:15,width:20,textAlign:"center" }}>⚡</span>
                <span>Organisations</span>
              </button>
            </div>
          )}
          {TABS.filter(t=>t.group==="main").map(t=>{
            const cnt=counts[t.id]; const active=activeTab===t.id;
            return (
              <button key={t.id} className={`nav-item${active?" active":""}`} onClick={()=>setTab(t.id)}
                style={{ width:"100%",textAlign:"left",background:"transparent",border:"none",borderLeft:"3px solid transparent",borderRadius:"0 7px 7px 0",padding:"9px 12px",color:active?T.primary:T.muted,fontWeight:active?600:400,fontSize:13,display:"flex",alignItems:"center",gap:9,marginBottom:1,transition:"all 0.15s" }}>
                <span style={{ fontSize:15,width:20,textAlign:"center" }}>{t.icon}</span>
                <span style={{ flex:1 }}>{t.label}</span>
                {cnt?<span style={{ background:T.red,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700 }}>{cnt}</span>:null}
              </button>
            );
          })}
          <div style={{ fontSize:9, color:T.light, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", padding:"14px 8px 4px", marginBottom:2 }}>Settings</div>
          {TABS.filter(t=>t.group==="settings").map(t=>{
            const active=activeTab===t.id;
            return (
              <button key={t.id} className={`nav-item${active?" active":""}`} onClick={()=>setTab(t.id)}
                style={{ width:"100%",textAlign:"left",background:"transparent",border:"none",borderLeft:"3px solid transparent",borderRadius:"0 7px 7px 0",padding:"9px 12px",color:active?T.primary:T.muted,fontWeight:active?600:400,fontSize:13,display:"flex",alignItems:"center",gap:9,marginBottom:1,transition:"all 0.15s" }}>
                <span style={{ fontSize:15,width:20,textAlign:"center" }}>{t.icon}</span>
                <span style={{ flex:1 }}>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding:"12px 14px", borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:10 }}>
            <div style={{ width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${T.primary},${T.sky})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0 }}>
              {(profile?.full_name||user.email)[0].toUpperCase()}
            </div>
            <div style={{ flex:1,overflow:"hidden" }}>
              <div style={{ fontSize:12,color:T.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{profile?.full_name||user.email}</div>
              <div style={{ marginTop:2, display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
                <Badge label={profile?.role||"viewer"}/>
                {isSuperAdmin&&<span style={{ background:T.redLt, color:T.red, borderRadius:20, padding:"1px 7px", fontSize:10, fontWeight:700 }}>Super Admin</span>}
              </div>
              {org&&(
                <div style={{ fontSize:10, color:T.muted, marginTop:3, display:"flex", alignItems:"center", gap:4, overflow:"hidden" }}>
                  <span>🏢</span>
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }} title={org.name}>{org.name}</span>
                  <button onClick={()=>setShowOrgSwitcher(true)} title="Switch organisation"
                    style={{ background:"none",border:"none",cursor:"pointer",color:T.primary,fontSize:11,padding:0,flexShrink:0,fontWeight:700 }}>⇄</button>
                </div>
              )}
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={()=>supabase.auth.signOut()} style={{ width:"100%",textAlign:"center" }}>Sign Out</Btn>
          <div style={{ fontSize:10,color:T.green,marginTop:8,display:"flex",alignItems:"center",gap:5 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block",animation:"pulse 2s infinite" }}/>
            Live sync active
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",marginTop:3,minWidth:0 }}>
        <AlertBanner items={alertItems}/>

        {/* Header */}
        <header style={{ background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"12px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div>
            <div style={{ fontFamily:"'Oxanium',sans-serif",fontSize:20,fontWeight:700,color:T.primaryDk }}>
              {TABS.find(t=>t.id===activeTab)?.label}
            </div>
            <div style={{ fontSize:11,color:T.muted }}>{new Date().toLocaleDateString("en-GB",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ fontSize:11,color:T.muted,textAlign:"right" }}>
              <div>{profile?.role?.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}</div>
              <div style={{ color:T.light }}>AS9100D · ISO 9001:2015</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex:1,overflowY:"auto",overflowX:"auto",padding:24,WebkitOverflowScrolling:"touch",minWidth:0 }}>

          {/* Demo banner */}
          {org?.demo_expires_at&&(()=>{
            const daysLeft = Math.ceil((new Date(org.demo_expires_at)-new Date())/86400000);
            if(daysLeft<=0) return null;
            const urgent = daysLeft<=3;
            const color  = urgent?"#c62828":"#e65100";
            const bg     = urgent?"#ffebee":"#fff3e0";
            const border = urgent?"#ef9a9a":"#ffcc80";
            return (
              <div style={{ background:bg,border:`1.5px solid ${border}`,borderRadius:10,padding:"12px 18px",
                marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16 }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <span style={{ fontSize:20 }}>{urgent?"🚨":"⏱"}</span>
                  <div>
                    <div style={{ fontWeight:700,fontSize:13,color }}>
                      {urgent ? "Demo expiring soon!" : "Demo Access"}
                    </div>
                    <div style={{ fontSize:12,color,marginTop:2 }}>
                      Your demo access expires in <strong>{daysLeft} day{daysLeft!==1?"s":""}</strong>
                      {" "}({new Date(org.demo_expires_at).toLocaleDateString("en-GB")}).
                      {" "}Contact your administrator to upgrade to full access.
                    </div>
                  </div>
                </div>
                <div style={{ background:color,color:"#fff",borderRadius:20,padding:"4px 14px",
                  fontSize:12,fontWeight:700,whiteSpace:"nowrap",flexShrink:0 }}>
                  {daysLeft}d left
                </div>
              </div>
            );
          })()}

          {activeTab==="dashboard" && <Dashboard data={data}/>}
          {activeTab==="cars" && <CARsView data={data} user={user} profile={profile} managers={managers} onRefresh={loadAll} showToast={showToast} org={org}/>}
          {activeTab==="documents" && <GenericPage title="Documents" subtitle="QMS documents with revision control" table="documents" columns={DOC_COLS} modalFields={DOC_FIELDS} modalTitle="Document" modalDefaults={{status:"Draft",rev:"Rev 1",date:today()}} data={data} canEdit={canEdit} canDelete={isAdmin} user={user} profile={profile} onRefresh={loadAll} showToast={showToast}/>}
          {activeTab==="flightdocs" && <GenericPage title="Company Documents" subtitle="Approvals, certificates, permits and regulatory documents" table="flight_school_docs" columns={FLIGHT_DOC_COLS} modalFields={FLIGHT_DOC_FIELDS} modalTitle="Company Document" modalDefaults={{status:"Valid",issue_date:today()}} data={{flight_school_docs:data.flightDocs}} canEdit={isQM} canDelete={isAdmin} user={user} profile={profile} onRefresh={loadAll} showToast={showToast}/>}
          {activeTab==="audits" && <AuditsView data={data} user={user} profile={profile} managers={managers} onRefresh={loadAll} showToast={showToast} org={org}/>}
          {activeTab==="contractors" && <GenericPage title="Contractors" subtitle="Approved contractor register" table="contractors" columns={CONTRACTOR_COLS} modalFields={CONTRACTOR_FIELDS} modalTitle="Contractor" modalDefaults={{status:"Approved",rating:"A"}} data={data} canEdit={isAdmin} canDelete={isAdmin} user={user} profile={profile} onRefresh={loadAll} showToast={showToast}/>}
          {activeTab==="risks"    && <RiskRegisterView data={data} user={user} profile={profile} managers={managers} onRefresh={loadAll} showToast={showToast}/>}
          {activeTab==="rca"      && <RCAView data={data} user={user} profile={profile}/>}
          {activeTab==="managers" && <ManagersPage managers={managers} onRefresh={loadAll} showToast={showToast} isAdmin={isAdmin}/>}
          {activeTab==="users" && isAdmin && <OrgUsersPage org={org} user={user} showToast={showToast} onRefresh={loadAll}/>}
          {activeTab==="profile" && <ProfilePage user={user} profile={profile} showToast={showToast} onRefresh={loadAll}/>}
          {activeTab==="orgsettings" && isAdmin && <OrgSettingsPage org={org} onSave={async(updates)=>{
            const{error}=await supabase.from("organisations").update(updates).eq("id",org.id);
            if(error){showToast("Error saving settings: "+error.message,"error");return;}
            setOrg(prev=>({...prev,...updates}));
            showToast("Organisation settings saved","success");
          }} />}
          {activeTab==="changelog" && <ChangeLogView logs={data.changeLog}/>}
          {activeTab==="about"     && <AboutView />}
          {activeTab==="superadmin"&&isSuperAdmin&&(
            <SuperAdminPanel
              orgs={orgs} orgUsers={orgUsers}
              onRefresh={()=>{
                supabase.from("organisations").select("*").order("name").then(({data})=>{ if(data) setOrgs(data); });
                supabase.from(TABLES.profiles).select("*").order("created_at",{ascending:false}).then(({data})=>{ if(data) setOrgUsers(data); });
              }}
              showToast={showToast}
            />
          )}
        </div>
      </div>

      {toast&&<Toast message={toast.message} type={toast.type} onDone={()=>setToast(null)}/>}
      {showOrgSwitcher&&user&&(
        <OrgSwitcherModal
          userId={user.id}
          currentOrgId={org?.id}
          onSwitch={(newOrg)=>{
            setOrg(newOrg);
            setLoginOrgOverride(newOrg.id);
            setShowOrgSwitcher(false);
            // Reload all data for the new org
            setTimeout(()=>loadAll(),100);
          }}
          onClose={()=>setShowOrgSwitcher(false)}
        />
      )}
    </div>
  );
}
