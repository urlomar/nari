import { useState } from "react";

const C = {
  brand: "#C4622D",
  light: "#FAF3EE",
  dark: "#1A0F0A",
  accent: "#E8956D",
  soft: "#F5E6DC",
  muted: "#9C7A6A",
  note: "#FFF8F4",
  white: "#FFFFFF",
};

// ─── QUESTION DATA ────────────────────────────────────────────────────────────

const questions = [
  {
    id: "journey",
    phase: "First, let's place you",
    question: "Where are you in your natural hair journey?",
    subtitle: "Nari wants to meet you exactly where you are.",
    type: "icon_grid",   // 2-col cards with big emoji
    cols: 2,
    options: [
      { value: "transitioning_early", emoji: "🌱", label: "Just started transitioning",        sub: "0–12 months" },
      { value: "transitioning_late",  emoji: "🌿", label: "Still transitioning, almost there", sub: "1–2 years" },
      { value: "big_chop_recent",     emoji: "✂️", label: "Just did the big chop",             sub: "Fresh start" },
      { value: "natural_established", emoji: "🌳", label: "Been natural for a while",          sub: "3+ years" },
      { value: "always_natural",      emoji: "👑", label: "Always been natural",               sub: "Born this way" },
    ],
    nariNote: "Whether you're two weeks post-relaxer or ten years natural, your hair has completely different needs. This changes how Nari talks to you — not just what she recommends.",
  },
  {
    id: "curl_type",
    phase: "First, let's place you",
    question: "Which looks most like your curl pattern?",
    subtitle: "Pick your dominant pattern. Mixed types are the norm.",
    type: "curl_grid",   // 3-col with curl SVG illustrations
    cols: 3,
    options: [
      { value: "2a2b", label: "2A / 2B", desc: "Loose, beachy waves",       curl: "wave" },
      { value: "2c3a", label: "2C / 3A", desc: "Defined S-waves",           curl: "s_wave" },
      { value: "3b3c", label: "3B / 3C", desc: "Bouncy corkscrews",         curl: "corkscrew" },
      { value: "4a",   label: "4A",      desc: "Tight coils, visible S",    curl: "coil" },
      { value: "4b",   label: "4B",      desc: "Dense Z-pattern",           curl: "z_coil" },
      { value: "4c",   label: "4C",      desc: "Tight zig-zag, major volume", curl: "tight_coil" },
    ],
    nariNote: null,
  },
  {
    id: "porosity",
    phase: "First, let's place you",
    question: "How does your hair behave with water?",
    subtitle: "The single most important thing to know about your hair.",
    type: "visual_single",  // horizontal cards with mini diagram
    options: [
      { value: "low",    icon: "💧", label: "Water beads up and sits on top",              tag: "Low porosity" },
      { value: "normal", icon: "🌊", label: "Water absorbs at a normal pace",             tag: "Normal porosity" },
      { value: "high",   icon: "🧽", label: "Soaks up instantly but dries out fast",      tag: "High porosity" },
      { value: "unsure", icon: "🤔", label: "Honestly not sure yet",                      tag: "We'll figure it out" },
    ],
    nariNote: "High porosity hair needs heavier creams and oils to seal moisture in. Low porosity hair repels products — it loves light, water-based formulas and a little heat to open the cuticle. This single answer changes your entire product list.",
  },
  {
    id: "density",
    phase: "First, let's place you",
    question: "How would you describe your strands?",
    subtitle: "Think about both the thickness of each strand and how much hair you have.",
    type: "icon_grid",
    cols: 2,
    options: [
      { value: "fine_low",   emoji: "🪶", label: "Fine strands",     sub: "Not a lot of them" },
      { value: "fine_high",  emoji: "🌫️", label: "Fine strands",     sub: "But a whole lot of them" },
      { value: "medium",     emoji: "✨", label: "Medium strands",   sub: "Average amount" },
      { value: "thick_low",  emoji: "🌿", label: "Thick, strong strands", sub: "Not a lot" },
      { value: "thick_high", emoji: "🌳", label: "Thick, strong strands", sub: "Tons of it" },
    ],
    nariNote: null,
  },
  {
    id: "goals",
    phase: "What are we building toward?",
    question: "What do you most want for your hair right now?",
    subtitle: "Pick up to 3.",
    type: "chip_multi",   // pill/chip shape, wrapping layout
    max: 3,
    options: [
      { value: "moisture",   emoji: "💧", label: "Deep moisture" },
      { value: "growth",     emoji: "📏", label: "Length & growth" },
      { value: "definition", emoji: "🌀", label: "Curl definition" },
      { value: "frizz",      emoji: "🌬️", label: "Frizz control" },
      { value: "scalp",      emoji: "🌱", label: "Healthy scalp" },
      { value: "damage",     emoji: "🛡️", label: "Repair & strengthen" },
      { value: "volume",     emoji: "💨", label: "Volume & fullness" },
      { value: "simplify",   emoji: "⚡", label: "Simpler routine" },
      { value: "affordable", emoji: "💸", label: "Affordable products" },
      { value: "technique",  emoji: "🤲", label: "Better technique" },
    ],
    nariNote: null,
  },
  {
    id: "frustrations",
    phase: "What are we building toward?",
    question: "What are your top 3 hair frustrations?",
    subtitle: "Tap them in order — your #1 is Nari's #1 priority.",
    type: "rank_cards",   // 2-col compact cards with rank badge
    max: 3,
    options: [
      { value: "breakage",   emoji: "💔", label: "Breakage & shedding" },
      { value: "dryness",    emoji: "🏜️", label: "Constant dryness" },
      { value: "frizz",      emoji: "⚡", label: "Uncontrollable frizz" },
      { value: "products",   emoji: "❓", label: "Products don't work" },
      { value: "time",       emoji: "⏰", label: "Routine takes too long" },
      { value: "detangling", emoji: "😤", label: "Detangling is a nightmare" },
      { value: "cost",       emoji: "💸", label: "Good products cost too much" },
      { value: "technique",  emoji: "📚", label: "Don't know how to apply" },
      { value: "nothing",    emoji: "🌟", label: "Honestly doing okay!" },
    ],
    nariNote: "Your #1 frustration shapes everything. If detangling tops your list, Nari leads with slip-focused products and technique tips before anything else.",
  },
  {
    id: "sensitivities",
    phase: "Last few things",
    question: "Does your hair react badly to anything?",
    subtitle: "Hard filters — Nari will never recommend products with these.",
    type: "chip_multi",
    max: 99,
    options: [
      { value: "protein",     emoji: "🥚", label: "Protein" },
      { value: "sulfates",    emoji: "🫧", label: "Sulfates" },
      { value: "silicones",   emoji: "💊", label: "Silicones" },
      { value: "fragrance",   emoji: "🌸", label: "Fragrance" },
      { value: "mineral_oil", emoji: "🛢️", label: "Mineral oil" },
      { value: "none",        emoji: "✅", label: "Nothing yet" },
    ],
    nariNote: "Even if a product has thousands of glowing reviews — if it contains something on your list, Nari won't recommend it. Full stop.",
  },
  {
    id: "budget",
    phase: "Last few things",
    question: "What's your budget per product?",
    subtitle: "Nari will always lead with options in your range.",
    type: "icon_grid",
    cols: 2,
    options: [
      { value: "budget",  emoji: "🛒", label: "Under $10",           sub: "Drugstore wins" },
      { value: "mid",     emoji: "💛", label: "$10 – $25",            sub: "Sweet spot" },
      { value: "premium", emoji: "💎", label: "$25 – $50",            sub: "Worth the investment" },
      { value: "any",     emoji: "👑", label: "Price isn't a factor", sub: "Show me the best" },
    ],
    nariNote: null,
  },
  {
    id: "black_owned_pref",
    phase: "Last few things",
    question: "Want us to prioritize Black-owned brands?",
    subtitle: "We track this and love putting them front and center.",
    type: "icon_grid",
    cols: 3,
    options: [
      { value: "yes",     emoji: "✊🏾", label: "Yes always" },
      { value: "mixed",   emoji: "🤝",  label: "Show a mix" },
      { value: "no_pref", emoji: "🌐",  label: "No preference" },
    ],
    nariNote: null,
  },
];

const phases = [...new Set(questions.map(q => q.phase))];

// ─── CURL SVG ILLUSTRATIONS ───────────────────────────────────────────────────

function CurlIcon({ type, color = C.brand, size = 44 }) {
  const paths = {
    wave:       <path d="M4 22 Q12 10 20 22 Q28 34 36 22" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"/>,
    s_wave:     <path d="M6 14 Q14 6 22 14 Q30 22 38 14 M6 28 Q14 20 22 28 Q30 36 38 28" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"/>,
    corkscrew:  <path d="M20 4 C30 4 34 12 28 18 C22 24 14 24 14 32 C14 38 22 42 28 38" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"/>,
    coil:       <><ellipse cx="22" cy="16" rx="10" ry="7" fill="none" stroke={color} strokeWidth="3"/><ellipse cx="22" cy="30" rx="8" ry="6" fill="none" stroke={color} strokeWidth="3"/></>,
    z_coil:     <path d="M10 10 L20 10 L12 22 L22 22 L14 34 L24 34" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>,
    tight_coil: <><circle cx="16" cy="14" r="6" fill="none" stroke={color} strokeWidth="3"/><circle cx="28" cy="14" r="6" fill="none" stroke={color} strokeWidth="3"/><circle cx="22" cy="26" r="6" fill="none" stroke={color} strokeWidth="3"/><circle cx="22" cy="38" r="5" fill="none" stroke={color} strokeWidth="3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      {paths[type] || paths.wave}
    </svg>
  );
}

// ─── LAYOUT COMPONENTS ───────────────────────────────────────────────────────

function IconGrid({ q, answers, onSelect }) {
  const isMulti = q.type === "multi";
  const sel = (v) => isMulti ? (answers[q.id] || []).includes(v) : answers[q.id] === v;
  const cols = q.cols || 2;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {q.options.map(opt => {
        const s = sel(opt.value);
        return (
          <button key={opt.value} onClick={() => onSelect(opt.value)} style={{
            background: s ? C.brand : C.white,
            border: `2px solid ${s ? C.brand : "rgba(196,98,45,0.18)"}`,
            borderRadius: 14, padding: "16px 12px", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 6, textAlign: "center", transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 26, lineHeight: 1 }}>{opt.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: s ? "#fff" : C.dark, fontFamily: "sans-serif" }}>{opt.label}</span>
            {opt.sub && <span style={{ fontSize: 11, color: s ? "rgba(255,255,255,0.7)" : C.muted, fontFamily: "sans-serif" }}>{opt.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

function CurlGrid({ q, answers, onSelect }) {
  const sel = (v) => answers[q.id] === v;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {q.options.map(opt => {
        const s = sel(opt.value);
        return (
          <button key={opt.value} onClick={() => onSelect(opt.value)} style={{
            background: s ? C.brand : C.white,
            border: `2px solid ${s ? C.brand : "rgba(196,98,45,0.18)"}`,
            borderRadius: 14, padding: "14px 8px", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 8, textAlign: "center", transition: "all 0.15s",
          }}>
            <CurlIcon type={opt.curl} color={s ? "#fff" : C.brand} size={40} />
            <span style={{ fontSize: 15, fontWeight: 700, color: s ? "#fff" : C.dark, fontFamily: "sans-serif" }}>{opt.label}</span>
            <span style={{ fontSize: 11, color: s ? "rgba(255,255,255,0.7)" : C.muted, fontFamily: "sans-serif", lineHeight: 1.3 }}>{opt.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function VisualSingle({ q, answers, onSelect }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {q.options.map(opt => {
        const s = answers[q.id] === opt.value;
        return (
          <button key={opt.value} onClick={() => onSelect(opt.value)} style={{
            background: s ? C.brand : C.white,
            border: `2px solid ${s ? C.brand : "rgba(196,98,45,0.18)"}`,
            borderRadius: 14, padding: "14px 18px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 14,
            textAlign: "left", transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>{opt.icon}</span>
            <span style={{ flex: 1, fontSize: 14, color: s ? "#fff" : C.dark, fontFamily: "Georgia, serif", lineHeight: 1.4 }}>{opt.label}</span>
            <span style={{
              fontSize: 11, background: s ? "rgba(255,255,255,0.2)" : C.soft,
              color: s ? "#fff" : C.brand, borderRadius: 20,
              padding: "3px 10px", fontFamily: "sans-serif", whiteSpace: "nowrap", flexShrink: 0,
            }}>{opt.tag}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChipMulti({ q, answers, onSelect }) {
  const sel = (v) => (answers[q.id] || []).includes(v);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {q.options.map(opt => {
        const s = sel(opt.value);
        return (
          <button key={opt.value} onClick={() => onSelect(opt.value)} style={{
            background: s ? C.brand : C.white,
            border: `2px solid ${s ? C.brand : "rgba(196,98,45,0.2)"}`,
            borderRadius: 50, padding: "10px 18px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7,
            transition: "all 0.15s", flexShrink: 0,
          }}>
            <span style={{ fontSize: 16 }}>{opt.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: s ? "#fff" : C.dark, fontFamily: "sans-serif", whiteSpace: "nowrap" }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function RankCards({ q, answers, onChange }) {
  const ranked = answers[q.id] || [];

  function tap(val) {
    if (val === "nothing") { onChange(["nothing"]); return; }
    const clean = ranked.filter(v => v !== "nothing");
    if (clean.includes(val)) {
      onChange(clean.filter(v => v !== val));
    } else if (clean.length < q.max) {
      onChange([...clean, val]);
    }
  }

  // Split into two columns
  const half = Math.ceil(q.options.length / 2);
  const col1 = q.options.slice(0, half);
  const col2 = q.options.slice(half);

  function Card({ opt }) {
    const idx = ranked.indexOf(opt.value);
    const s = idx !== -1;
    return (
      <button onClick={() => tap(opt.value)} style={{
        background: s ? C.brand : C.white,
        border: `2px solid ${s ? C.brand : "rgba(196,98,45,0.18)"}`,
        borderRadius: 14, padding: "12px 14px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        textAlign: "left", transition: "all 0.15s", width: "100%",
        position: "relative",
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{opt.emoji}</span>
        <span style={{ fontSize: 13, color: s ? "#fff" : C.dark, fontFamily: "sans-serif", fontWeight: 500, lineHeight: 1.3, flex: 1 }}>{opt.label}</span>
        {s && (
          <span style={{
            background: "rgba(255,255,255,0.3)", color: "#fff",
            borderRadius: "50%", width: 22, height: 22, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, fontFamily: "sans-serif",
          }}>{idx + 1}</span>
        )}
      </button>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {col1.map(opt => <Card key={opt.value} opt={opt} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {col2.map(opt => <Card key={opt.value} opt={opt} />)}
        </div>
      </div>
      {ranked.length > 0 && ranked[0] !== "nothing" && (
        <p style={{ fontSize: 12, color: C.brand, fontFamily: "sans-serif", margin: "10px 0 0", textAlign: "center" }}>
          {ranked.length < q.max
            ? `Tap ${q.max - ranked.length} more in order of priority`
            : "All ranked! Tap any to remove and re-order."}
        </p>
      )}
    </div>
  );
}

// ─── PHASE BAR ───────────────────────────────────────────────────────────────

function PhaseBar({ current }) {
  const ci = phases.indexOf(current);
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {phases.map((p, i) => (
        <div key={p} style={{ flex: 1 }}>
          <div style={{ height: 3, borderRadius: 2, marginBottom: 4, background: i <= ci ? C.brand : C.soft, transition: "background 0.4s" }} />
          <span style={{ fontSize: 10, fontFamily: "sans-serif", letterSpacing: 0.5, color: i === ci ? C.brand : i < ci ? C.accent : C.muted, fontWeight: i === ci ? 600 : 400, display: "block" }}>
            {p}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN QUIZ ────────────────────────────────────────────────────────────────

export default function NariCurlsQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const q = questions[step];
  const isMulti = q?.type === "chip_multi";
  const isRank  = q?.type === "rank_cards";
  const current = answers[q?.id];
  const canAdvance = (isMulti || isRank) ? (current?.length > 0) : !!current;

  function select(val) {
    if (isMulti) {
      const prev = answers[q.id] || [];
      if (val === "none") { setAnswers({ ...answers, [q.id]: ["none"] }); return; }
      const cleaned = prev.filter(v => v !== "none");
      if (cleaned.includes(val)) {
        setAnswers({ ...answers, [q.id]: cleaned.filter(v => v !== val) });
      } else if (cleaned.length < (q.max || 99)) {
        setAnswers({ ...answers, [q.id]: [...cleaned, val] });
      }
    } else {
      setAnswers({ ...answers, [q.id]: val });
    }
    setShowNote(false);
  }

  function advance() {
    if (step < questions.length - 1) { setStep(step + 1); setShowNote(false); }
    else setDone(true);
  }

  function back() {
    if (step > 0) { setStep(step - 1); setShowNote(false); }
  }

  // ── DONE SCREEN ──
  if (done) {
    const labelMap = {};
    questions.forEach(q => q.options.forEach(o => { labelMap[o.value] = o.label; }));
    return (
      <div style={{ background: C.dark, borderRadius: 20, padding: "44px 32px", fontFamily: "Georgia, serif" }}>
        <div style={{ fontSize: 11, fontFamily: "sans-serif", letterSpacing: 2, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Your Nari profile</div>
        <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 400, margin: "0 0 8px" }}>Nari's got you, sis. 🌿</h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, fontFamily: "sans-serif", margin: "0 0 28px", lineHeight: 1.6 }}>
          Now upload a photo so Nari can analyze your curl pattern and build your personalized routine.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {questions.map(q => {
            const ans = answers[q.id];
            if (!ans) return null;
            const display = Array.isArray(ans)
              ? ans.map(v => labelMap[v] || v).join(" · ")
              : (labelMap[ans] || ans);
            return (
              <div key={q.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "11px 14px" }}>
                <div style={{ fontSize: 10, fontFamily: "sans-serif", letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>
                  {q.id.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: 13, color: "#fff", fontFamily: "sans-serif" }}>{display}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, background: C.brand, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontFamily: "sans-serif", fontWeight: 600, cursor: "pointer" }}>
            Upload my hair photo →
          </button>
          <button onClick={() => { setDone(false); setStep(0); setAnswers({}); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", borderRadius: 12, padding: "14px 16px", fontSize: 13, fontFamily: "sans-serif", cursor: "pointer" }}>
            Start over
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER QUESTION BODY ──
  function renderBody() {
    if (q.type === "icon_grid")    return <IconGrid    q={q} answers={answers} onSelect={select} />;
    if (q.type === "curl_grid")    return <CurlGrid    q={q} answers={answers} onSelect={select} />;
    if (q.type === "visual_single") return <VisualSingle q={q} answers={answers} onSelect={select} />;
    if (q.type === "chip_multi")   return <ChipMulti   q={q} answers={answers} onSelect={select} />;
    if (q.type === "rank_cards")   return <RankCards   q={q} answers={answers} onChange={v => setAnswers({ ...answers, [q.id]: v })} />;
    return null;
  }

  return (
    <div style={{ background: C.light, borderRadius: 20, padding: "36px 28px", maxWidth: 600, margin: "0 auto", fontFamily: "Georgia, serif" }}>
      <PhaseBar current={q.phase} />

      <div style={{ fontSize: 11, fontFamily: "sans-serif", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: C.brand, marginBottom: 10 }}>
        {q.phase}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 400, color: C.dark, margin: "0 0 6px", lineHeight: 1.3 }}>
        {q.question}
      </h2>

      {q.subtitle && (
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 20px", lineHeight: 1.5, fontFamily: "sans-serif" }}>
          {q.subtitle}
        </p>
      )}
      {!q.subtitle && <div style={{ marginBottom: 20 }} />}

      {renderBody()}

      {q.nariNote && (
        <div style={{ margin: "16px 0 4px" }}>
          <button onClick={() => setShowNote(!showNote)} style={{ background: "none", border: "none", color: C.brand, fontSize: 13, cursor: "pointer", fontFamily: "sans-serif", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span>💬</span> {showNote ? "Got it, close" : "Nari's take on this"}
          </button>
          {showNote && (
            <div style={{ background: C.note, borderLeft: `3px solid ${C.brand}`, borderRadius: "0 8px 8px 0", padding: "12px 16px", marginTop: 8, fontSize: 13, color: "#5C3D2E", lineHeight: 1.65, fontFamily: "sans-serif" }}>
              {q.nariNote}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        <button onClick={back} disabled={step === 0} style={{ background: "none", border: "none", color: step === 0 ? "transparent" : C.muted, cursor: step === 0 ? "default" : "pointer", fontSize: 13, fontFamily: "sans-serif", padding: 0 }}>
          ← Back
        </button>
        <span style={{ fontSize: 12, color: C.muted, fontFamily: "sans-serif" }}>{step + 1} / {questions.length}</span>
        <button onClick={advance} disabled={!canAdvance} style={{ background: canAdvance ? C.brand : C.soft, color: canAdvance ? "#fff" : "#C4A090", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontFamily: "sans-serif", fontWeight: 600, cursor: canAdvance ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
          {step === questions.length - 1 ? "Meet Nari →" : "Next →"}
        </button>
      </div>
    </div>
  );
}