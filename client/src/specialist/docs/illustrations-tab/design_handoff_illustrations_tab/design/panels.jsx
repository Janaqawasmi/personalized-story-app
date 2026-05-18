// Panels: CTA, generating, gallery (read-only), and ApprovalPreviewDialog modal.

function CTAPanel() {
  const t = window.t;
  return (
    <div style={{
      maxWidth: 720, margin: "60px auto", textAlign: "center",
      background: "#fff",
      border: `1px solid ${DRAFT_B.border}`,
      borderRadius: 16,
      padding: "48px 40px",
      boxShadow: "0 1px 0 rgba(42,36,33,.02), 0 12px 32px -22px rgba(42,36,33,.12)",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: COLORS.primarySoft, color: COLORS.primary,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 18px",
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/>
          <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>
          <path d="M5 16l.6 1.6L7 18l-1.4.4L5 20l-.6-1.6L3 18l1.4-.4L5 16z"/>
        </svg>
      </div>
      <h2 style={{
        margin: "0 0 10px", fontFamily: FONTS.display,
        fontSize: 28, fontWeight: 700, color: DRAFT_B.ink, letterSpacing: "-0.02em",
      }}>{t.ctaHeadline}</h2>
      <p style={{
        margin: "0 0 28px", fontSize: 15.5, lineHeight: 1.65,
        color: DRAFT_B.inkSoft, maxWidth: 480, marginInline: "auto",
      }}>{t.ctaBody}</p>
      <Btn variant="primary" size="lg" icon={I.sparkles}>{t.ctaButton}</Btn>
      <div style={{ marginTop: 18, fontSize: 12.5, color: DRAFT_B.inkMuted, fontFamily: FONTS.mono }}>
        {t.ctaMeta}
      </div>

      <div style={{
        marginTop: 36, paddingTop: 24, borderTop: `1px solid ${DRAFT_B.borderSoft}`,
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16,
        textAlign: "start",
      }}>
        {t.ctaSteps.map(([n, title, desc]) => (
          <div key={n}>
            <div style={{
              fontFamily: FONTS.mono, fontSize: 11, color: COLORS.primary,
              fontWeight: 700, letterSpacing: 0.08, marginBottom: 4,
            }}>{n}</div>
            <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: DRAFT_B.ink, marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 12.5, color: DRAFT_B.inkMuted, lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneratingPanel({ progress = 0.55 }) {
  const t = window.t;
  const pct = Math.round(progress * 100);
  return (
    <div style={{
      maxWidth: 720, margin: "40px auto",
      background: "#fff", border: `1px solid ${DRAFT_B.border}`,
      borderRadius: 16, padding: "32px 36px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: COLORS.primarySoft, color: COLORS.primary,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>{I.spinner(26)}</div>
        <div>
          <h2 style={{
            margin: 0, fontFamily: FONTS.display, fontSize: 22, fontWeight: 700,
            color: DRAFT_B.ink, letterSpacing: "-0.02em",
          }}>{t.genTitle}</h2>
          <div style={{ color: DRAFT_B.inkMuted, fontSize: 13.5, marginTop: 2 }}>
            {t.genSub}
          </div>
        </div>
      </div>

      <div style={{
        height: 8, borderRadius: 999, background: DRAFT_B.borderSoft, overflow: "hidden", marginBottom: 8,
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`,
          borderRadius: 999,
        }}/>
      </div>
      <div style={{ fontSize: 12.5, fontFamily: FONTS.mono, color: DRAFT_B.inkMuted, marginBottom: 18 }}>
        {t.genHint} · {pct}%
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
        paddingTop: 16, borderTop: `1px solid ${DRAFT_B.borderSoft}`,
      }}>
        <ProgressLine icon={I.check} state="done" label={t.genStage1Label} meta={t.genStage1Meta}/>
        <ProgressLine icon={I.spinner(12)} state="busy" label={t.genStage2Label} meta={t.genStage2Meta}/>
      </div>
    </div>
  );
}

function ProgressLine({ icon, state, label, meta }) {
  const colors = {
    done: { fg: COLORS.success, bg: COLORS.successSoft },
    busy: { fg: COLORS.primary, bg: COLORS.primarySoft },
    idle: { fg: DRAFT_B.inkMuted, bg: DRAFT_B.cream },
  }[state];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
      background: colors.bg, borderRadius: 8,
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 999, background: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: colors.fg, flexShrink: 0,
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: DRAFT_B.ink }}>{label}</div>
        <div style={{ fontSize: 11.5, color: DRAFT_B.inkMuted, fontFamily: FONTS.mono }}>{meta}</div>
      </div>
    </div>
  );
}

function PublishBar({ ready = false, total = 16, approved = 4 }) {
  const t = window.t;
  return (
    <div style={{
      position: "sticky", bottom: 0,
      marginTop: 24,
      background: ready ? "#fff" : "rgba(255,255,255,.92)",
      backdropFilter: "blur(10px)",
      border: `1px solid ${ready ? COLORS.success : DRAFT_B.border}`,
      borderRadius: 14,
      padding: "14px 22px",
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: ready ? `0 0 0 4px ${COLORS.successSoft}` : "0 -4px 18px -12px rgba(42,36,33,.12)",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: FONTS.display, fontSize: 17, fontWeight: 700, color: DRAFT_B.ink,
          letterSpacing: "-0.01em", marginBottom: 2,
        }}>
          {ready ? t.pubApprovedTitle : t.pubProgressTitle}
        </div>
        <div style={{ fontSize: 13, color: DRAFT_B.inkMuted }}>
          {ready ? t.pubApprovedSub : t.pubProgressSub(approved, total)}
        </div>
      </div>
      <ProgressDots total={total} approved={approved}/>
      <Btn variant={ready ? "success" : "primary"} size="lg" disabled={!ready}
           icon={ready ? I.check : null}>
        {ready ? t.pubReady : t.pubMore(total - approved)}
      </Btn>
    </div>
  );
}

function ProgressDots({ total, approved }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: 999,
          background: i < approved ? COLORS.success : DRAFT_B.borderSoft,
        }}/>
      ))}
    </div>
  );
}

function GalleryPanel({ published = false }) {
  const t = window.t;
  return (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.parchment} 0%, ${DRAFT_B.cream} 100%)`,
        border: `1px solid ${DRAFT_B.border}`,
        borderRadius: 14,
        padding: "26px 28px",
        display: "flex", alignItems: "center", gap: 22, marginBottom: 22,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: published ? COLORS.success : COLORS.primary, color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{
            margin: 0, fontFamily: FONTS.display, fontSize: 26, fontWeight: 700,
            color: DRAFT_B.ink, letterSpacing: "-0.02em",
          }}>
            {published ? t.galPublished : t.galAllApproved}
          </h2>
          <div style={{ color: DRAFT_B.inkSoft, fontSize: 14, marginTop: 4 }}>
            {published ? t.galPublishedSub : t.galAllApprovedSub}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" icon={I.eye}>{t.galPreview}</Btn>
          {!published
            ? <Btn variant="primary" icon={I.book}>{t.galPublish}</Btn>
            : <Btn variant="ghost" icon={I.refresh}>{t.galReopen}</Btn>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const n = i + 1;
          const ps = t.pageSamples[n] || t.pageSamples[3];
          return (
            <div key={n} style={{
              background: "#fff", border: `1px solid ${DRAFT_B.borderSoft}`,
              borderRadius: 10, padding: 8,
            }}>
              <IllPlaceholder pageNumber={n} kind="approved" seed={n + 1}/>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 4px 4px",
                fontSize: 12, color: DRAFT_B.inkSoft,
              }}>
                <span style={{ fontFamily: FONTS.mono, color: DRAFT_B.inkMuted }}>p.{n}</span>
                <span style={{ flex: 1, fontFamily: FONTS.display, fontWeight: 700, color: DRAFT_B.ink, fontSize: 13 }}>
                  {ps.title}
                </span>
                <Chip tone="success" size="sm" style={{ height: 18, fontSize: 10.5 }}>✓</Chip>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApprovalPreviewDialog() {
  const t = window.t;
  const p3 = t.pageSamples[3];
  const p4 = t.pageSamples[4];
  return (
    <div style={{
      position: "relative",
      width: "100%", height: "100%",
      background: "rgba(23,13,30,0.62)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 40,
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, overflow: "hidden",
        width: "min(1080px, 100%)",
        maxHeight: "100%",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,.4)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "16px 24px",
          borderBottom: `1px solid ${DRAFT_B.borderSoft}`,
          display: "flex", alignItems: "center", gap: 12,
          background: DRAFT_B.cream,
        }}>
          <div>
            <h3 style={{
              margin: 0, fontFamily: FONTS.display, fontSize: 20, fontWeight: 700,
              color: DRAFT_B.ink, letterSpacing: "-0.015em",
            }}>{t.dlgTitle}</h3>
            <div style={{ color: DRAFT_B.inkMuted, fontSize: 12.5, marginTop: 2 }}>
              {t.dlgSub}
            </div>
          </div>
          <span style={{ flex: 1 }}/>
          <Chip tone="success">{t.dlgAllApproved}</Chip>
          <IconBtn ariaLabel="close">{I.x}</IconBtn>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          background: COLORS.parchment, padding: 40, gap: 28,
          minHeight: 480,
        }}>
          <BookSpread n={3} sample={p3}/>
          <BookSpread n={4} sample={p4}/>
        </div>

        <div style={{
          padding: "14px 24px",
          borderTop: `1px solid ${DRAFT_B.borderSoft}`,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <IconBtn ariaLabel={t.dlgPrev}>{I.chevron(-90)}</IconBtn>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} style={{
                width: i === 1 ? 18 : 6, height: 6, borderRadius: 999,
                background: i === 1 ? COLORS.primary : DRAFT_B.border,
              }}/>
            ))}
          </div>
          <IconBtn ariaLabel={t.dlgNext}>{I.chevron(90)}</IconBtn>
          <span style={{ flex: 1, fontFamily: FONTS.mono, fontSize: 12, color: DRAFT_B.inkMuted }}>
            {t.dlgSpread(2, 8)}
          </span>
          <Btn variant="secondary" icon={I.download}>{t.dlgExport}</Btn>
          <Btn variant="primary" icon={I.book}>{t.dlgPublish}</Btn>
        </div>
      </div>
    </div>
  );
}

function BookSpread({ n, sample }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 8, padding: 18,
      boxShadow: "0 6px 18px -10px rgba(0,0,0,.18)",
      display: "flex", flexDirection: "column",
    }}>
      <IllPlaceholder pageNumber={n} kind="approved" seed={n}/>
      <div style={{
        marginTop: 16, padding: "0 4px",
        fontFamily: FONTS.display, fontSize: 16.5, lineHeight: 1.7,
        color: DRAFT_B.ink, textAlign: "start",
      }}>
        {sample.text}
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ paddingTop: 12, fontFamily: FONTS.mono, fontSize: 11, color: DRAFT_B.inkMuted, textAlign: "center" }}>
        — {n} —
      </div>
    </div>
  );
}

Object.assign(window, { CTAPanel, GeneratingPanel, GalleryPanel, PublishBar, ApprovalPreviewDialog });
