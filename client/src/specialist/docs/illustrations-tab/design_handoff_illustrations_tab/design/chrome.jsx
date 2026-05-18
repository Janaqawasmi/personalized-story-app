// chrome.jsx — workspace header, pipeline stepper, tab bar.
// Reads UI strings from window.t (set by walkthrough before render).

const { useState } = React;

// ---- small atoms ---------------------------------------------------------

function StatusDot({ color }) {
  return (
    <span style={{
      display: "inline-block",
      width: 6, height: 6, borderRadius: 999,
      background: color, marginInlineEnd: 6, flexShrink: 0,
    }}/>
  );
}

function Chip({ children, tone = "neutral", outlined = false, size = "sm", style }) {
  const tones = {
    neutral:   { bg: DRAFT_B.borderSoft, fg: DRAFT_B.inkSoft, dot: null },
    info:      { bg: COLORS.infoSoft,    fg: COLORS.primaryDark, dot: COLORS.primary },
    success:   { bg: COLORS.successSoft, fg: "#3f5739", dot: COLORS.success },
    warning:   { bg: COLORS.warningSoft, fg: "#6e5320", dot: COLORS.warning },
    error:     { bg: COLORS.errorSoft,   fg: "#7a3838", dot: COLORS.error },
    rose:      { bg: COLORS.secondarySoft, fg: COLORS.secondary, dot: COLORS.secondary },
    ghost:     { bg: "transparent",      fg: DRAFT_B.inkMuted, dot: null },
  };
  const t = tones[tone] || tones.neutral;
  const h = size === "sm" ? 22 : 26;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      height: h, paddingInline: 9, borderRadius: 999,
      background: outlined ? "transparent" : t.bg,
      border: outlined ? `1px solid ${DRAFT_B.border}` : "1px solid transparent",
      color: t.fg,
      fontSize: 12, fontWeight: 600, letterSpacing: 0.01,
      whiteSpace: "nowrap",
      ...style,
    }}>
      {t.dot && <StatusDot color={t.dot}/>}
      {children}
    </span>
  );
}

function Btn({ children, variant = "primary", size = "md", icon, disabled, onClick, style }) {
  const sizes = {
    sm: { h: 30, px: 12, fs: 13 },
    md: { h: 38, px: 16, fs: 14 },
    lg: { h: 46, px: 22, fs: 15 },
  };
  const s = sizes[size];
  const variants = {
    primary: { bg: COLORS.primary, fg: "#fff", bd: COLORS.primary, hbg: COLORS.primaryDark },
    secondary: { bg: "transparent", fg: DRAFT_B.ink, bd: DRAFT_B.border, hbg: DRAFT_B.cream },
    ghost: { bg: "transparent", fg: DRAFT_B.inkSoft, bd: "transparent", hbg: DRAFT_B.cream },
    danger: { bg: "transparent", fg: COLORS.error, bd: DRAFT_B.border, hbg: COLORS.errorSoft },
    success: { bg: COLORS.success, fg: "#fff", bd: COLORS.success, hbg: "#516a47" },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      height: s.h, paddingInline: s.px, borderRadius: 999,
      background: disabled ? DRAFT_B.borderSoft : v.bg,
      color: disabled ? DRAFT_B.inkMuted : v.fg,
      border: `1px solid ${disabled ? DRAFT_B.border : v.bd}`,
      fontFamily: FONTS.sans, fontSize: s.fs, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: 0.01,
      transition: "background .15s ease",
      ...style,
    }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = v.hbg; }}
    onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = v.bg; }}
    >
      {icon}
      {children}
    </button>
  );
}

function IconBtn({ children, ariaLabel, onClick, size = 34 }) {
  return (
    <button aria-label={ariaLabel} onClick={onClick} style={{
      width: size, height: size, borderRadius: 999,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "transparent", border: "1px solid transparent",
      color: DRAFT_B.inkSoft, cursor: "pointer",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = DRAFT_B.cream}
    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      {children}
    </button>
  );
}

// ---- inline icons -------------------------------------------------------

const I = {
  back: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
  ),
  more: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>
  ),
  chevron: (rot = 0) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rot}deg)`, transition: "transform .2s" }}><path d="M6 9l6 6 6-6"/></svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
  ),
  refresh: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
  ),
  sparkles: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/></svg>
  ),
  message: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3a8.38 8.38 0 0 1 8.5 8.5z"/></svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
  ),
  warn: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/></svg>
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  book: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ),
  download: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ),
  spinner: (size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ animation: "ill-spin 1s linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
    </svg>
  ),
};

// ---- Workspace header ---------------------------------------------------

function WorkspaceHeader({ status, statusTone = "info" }) {
  const t = window.t;
  const isRTL = t.dir === "rtl";
  return (
    <div style={{
      padding: "10px 36px",
      borderBottom: `1px solid ${DRAFT_B.border}`,
      background: DRAFT_B.cream,
      fontFamily: FONTS.sans,
    }}>
      <button style={{
        background: "transparent", border: 0, padding: 0, color: DRAFT_B.inkMuted,
        fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6,
        cursor: "pointer",
      }}>
        <span style={{ transform: isRTL ? "scaleX(-1)" : "none", display: "inline-flex" }}>{I.back}</span>
        {t.backToStories}
      </button>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 5 }}>
        <h1 style={{
          flex: 1, margin: 0, fontFamily: FONTS.display,
          fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em",
          color: DRAFT_B.ink, lineHeight: 1.2,
        }}>{t.storyTitle}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Chip tone={statusTone}>{status}</Chip>
          <IconBtn ariaLabel="actions">{I.more}</IconBtn>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Chip outlined>{t.storyType}</Chip>
        <Chip outlined>{t.ageRange}</Chip>
        <span style={{ color: DRAFT_B.inkMuted, fontSize: 12.5, marginInlineStart: 6 }}>
          {t.storyMeta}
        </span>
      </div>
    </div>
  );
}

// ---- Pipeline stepper ---------------------------------------------------

function PipelineStepper({ active = 4 }) {
  const t = window.t;
  const steps = t.pipelineSteps;
  return (
    <div style={{
      padding: "12px 36px",
      borderBottom: `1px solid ${DRAFT_B.border}`,
      background: COLORS.parchment,
      display: "flex", alignItems: "center", gap: 0,
      fontFamily: FONTS.sans,
    }}>
      {steps.map((s, i) => {
        const done = i < active;
        const now = i === active;
        return (
          <React.Fragment key={s + i}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 999,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: now ? COLORS.primary : (done ? "#fff" : "transparent"),
                color: now ? "#fff" : (done ? COLORS.primary : DRAFT_B.inkMuted),
                border: `1.5px solid ${now ? COLORS.primary : (done ? COLORS.primary : DRAFT_B.border)}`,
                fontSize: 11, fontWeight: 700, fontFamily: FONTS.sans,
              }}>
                {done ? <span style={{ fontSize: 10, lineHeight: 1 }}>✓</span> : i + 1}
              </div>
              <span style={{
                fontSize: 12.5, fontWeight: now ? 700 : 500,
                color: now ? DRAFT_B.ink : (done ? DRAFT_B.inkSoft : DRAFT_B.inkMuted),
              }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 1.5, background: done ? COLORS.primary : DRAFT_B.border,
                margin: "0 12px", opacity: done ? 0.6 : 1,
              }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---- Tab bar ------------------------------------------------------------

function TabBar() {
  const t = window.t;
  const tabs = [
    { key: "brief", label: t.tabBrief },
    { key: "draft", label: t.tabStory },
    { key: "illustrations", label: t.tabIllustrations },
    { key: "history", label: t.tabHistory },
  ];
  return (
    <div style={{
      borderBottom: `1px solid ${DRAFT_B.border}`,
      background: DRAFT_B.cream,
      paddingInline: 36, display: "flex", gap: 4,
      fontFamily: FONTS.sans,
    }}>
      {tabs.map((x) => {
        const isActive = x.key === "illustrations";
        return (
          <div key={x.key} style={{
            padding: "12px 14px",
            fontSize: 14, fontWeight: 600,
            color: isActive ? COLORS.primary : DRAFT_B.inkMuted,
            borderBottom: `2px solid ${isActive ? COLORS.primary : "transparent"}`,
            marginBottom: -1, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            {x.label}
            {x.key === "illustrations" && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: isActive ? COLORS.primary : DRAFT_B.border,
                color: isActive ? "#fff" : DRAFT_B.inkMuted,
                borderRadius: 999, padding: "1px 6px", minWidth: 18, textAlign: "center",
                lineHeight: 1.4,
              }}>16</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkspaceShell({ status, statusTone, stepperActive = 4, children }) {
  const t = window.t;
  return (
    <div dir={t.dir} style={{
      background: COLORS.background,
      fontFamily: FONTS.sans, color: DRAFT_B.ink,
      minHeight: "100%", display: "flex", flexDirection: "column",
    }}>
      <WorkspaceHeader status={status} statusTone={statusTone}/>
      <PipelineStepper active={stepperActive}/>
      <TabBar/>
      <div style={{ flex: 1, padding: "28px 36px 36px" }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { Chip, Btn, IconBtn, I, WorkspaceShell, WorkspaceHeader, PipelineStepper, TabBar });
