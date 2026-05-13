// PageCard — renders one manuscript page in its current sub-status.

function IllPlaceholder({ pageNumber, kind = "approved", seed = 0, label }) {
  const palettes = [
    ["#f3d9c4", "#d3a48a", "#7a5a4a"],
    ["#e8dfc9", "#c4a07a", "#5a4732"],
    ["#d8e0d2", "#8da080", "#3f5739"],
    ["#e6dde9", "#b9a4c4", "#5a4869"],
    ["#dde5ea", "#94aab9", "#3f5263"],
    ["#f1e0d6", "#d28a6f", "#7c3b2a"],
  ];
  const p = palettes[seed % palettes.length];
  const muted = kind === "rejected" || kind === "generating";
  const opacity = muted ? 0.55 : 1;
  return (
    <div style={{
      position: "relative", width: "100%", aspectRatio: "1/1",
      background: `radial-gradient(120% 90% at 60% 30%, ${p[0]} 0%, ${p[1]} 70%, ${p[2]}30 100%)`,
      borderRadius: 10, overflow: "hidden",
      border: `1px solid ${DRAFT_B.borderSoft}`,
      opacity,
    }}>
      <svg viewBox="0 0 200 200" preserveAspectRatio="none" style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        mixBlendMode: "multiply", opacity: 0.55,
      }}>
        <defs>
          <filter id={`paper-${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed}/>
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .14 0"/>
          </filter>
        </defs>
        <rect width="200" height="200" filter={`url(#paper-${seed})`}/>
        <path d={`M0 ${130 + (seed % 3) * 6} Q 60 ${120 + (seed % 4) * 4} 100 ${135 + seed * 2} T 200 ${130}`}
              fill={p[2]} opacity="0.18"/>
        <g opacity={muted ? 0.45 : 0.78}>
          <ellipse cx={70 + (seed * 13) % 70} cy="150" rx="14" ry="4" fill={p[2]} opacity="0.4"/>
          <path d={`M ${70 + (seed * 13) % 70} 150 c -2 -22 4 -38 6 -52 c 1 -8 -8 -10 -8 -18 c 0 -6 4 -10 8 -10 c 5 0 9 4 9 11 c 0 7 -7 11 -6 18 c 2 16 7 28 5 51 z`}
                fill={p[2]} opacity="0.7"/>
        </g>
        <rect x={130 + (seed % 3) * 6} y={60 + (seed % 2) * 8} width="36" height="78"
              fill={p[2]} opacity="0.22" rx="2"/>
      </svg>
      <div style={{
        position: "absolute", insetInlineStart: 10, insetBlockStart: 10,
        fontFamily: FONTS.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.08,
        textTransform: "uppercase",
        color: "rgba(42,36,33,.6)",
        background: "rgba(255,255,255,.55)",
        padding: "3px 7px", borderRadius: 4,
      }}>
        p.{pageNumber}
      </div>
      {label && (
        <div style={{
          position: "absolute", insetInlineEnd: 10, insetBlockEnd: 10,
          fontFamily: FONTS.mono, fontSize: 10, color: "rgba(42,36,33,.6)",
          background: "rgba(255,255,255,.55)", padding: "3px 7px", borderRadius: 4,
        }}>{label}</div>
      )}
    </div>
  );
}

function pageStatusBadge(subStatus) {
  const t = window.t;
  switch (subStatus) {
    case "plan_only": return <Chip tone="neutral">{t.statusPlanOnly}</Chip>;
    case "generating_image": return (
      <Chip tone="info">
        <span style={{ display: "inline-flex", marginInlineEnd: 6 }}>{I.spinner(11)}</span>
        {t.statusGenerating}
      </Chip>
    );
    case "awaiting_review": return <Chip tone="warning">{t.statusAwaiting}</Chip>;
    case "approved": return (
      <Chip tone="success">
        <span style={{ display: "inline-flex", marginInlineEnd: 4 }}>{I.check}</span>
        {t.statusApprovedPage}
      </Chip>
    );
    case "needs_revision": return <Chip tone="error">{t.statusRejected}</Chip>;
    default: return null;
  }
}

function PrimaryAction({ subStatus }) {
  const t = window.t;
  switch (subStatus) {
    case "plan_only":
      return <Btn variant="primary" icon={I.sparkles}>{t.actGenerate}</Btn>;
    case "generating_image":
      return <Btn variant="secondary" icon={I.spinner(13)} disabled>{t.actDrawing}</Btn>;
    case "awaiting_review":
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="success" icon={I.check}>{t.actApprove}</Btn>
          <Btn variant="secondary" icon={I.message}>{t.actReject}</Btn>
        </div>
      );
    case "approved":
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <Chip tone="success" size="md">
            <span style={{ display: "inline-flex", marginInlineEnd: 6 }}>{I.check}</span>
            {t.actApproved}
          </Chip>
          <Btn variant="ghost" size="sm" icon={I.refresh}>{t.actReopen}</Btn>
        </div>
      );
    case "needs_revision":
      return <Btn variant="secondary" icon={I.spinner(13)} disabled>{t.actRegen}</Btn>;
    default: return null;
  }
}

function PageCard({
  pageNumber,
  subStatus = "plan_only",
  scenePlanVersion = 1,
  imageVersion = null,
  versionCount = { scenePlans: 1, images: 0 },
  visualBibleIsStale = false,
  rejectionNote = null,
  lastError = null,
  expanded = false,
}) {
  const t = window.t;
  const sample = (t.pageSamples && t.pageSamples[pageNumber]) || t.pageSamples[3];
  const showImage = subStatus !== "plan_only";
  const imageKind = subStatus === "needs_revision" || subStatus === "generating_image" ? "generating"
                   : subStatus === "approved" ? "approved" : "review";
  const isApproved = subStatus === "approved";

  return (
    <article style={{
      background: "#fff",
      border: `1px solid ${isApproved ? COLORS.successSoft : DRAFT_B.border}`,
      borderRadius: 14, overflow: "hidden",
      boxShadow: "0 1px 0 rgba(42,36,33,.02), 0 8px 24px -20px rgba(42,36,33,.08)",
      position: "relative",
    }}>
      {isApproved && (
        <div style={{
          position: "absolute", insetInlineStart: 0, top: 0, bottom: 0,
          width: 3, background: COLORS.success, opacity: 0.7,
        }}/>
      )}

      <div style={{
        padding: "14px 20px 12px",
        borderBottom: `1px solid ${DRAFT_B.borderSoft}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: DRAFT_B.cream, color: DRAFT_B.ink,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: FONTS.display, fontSize: 17, fontWeight: 700,
          border: `1px solid ${DRAFT_B.borderSoft}`, flexShrink: 0,
        }}>{pageNumber}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <h3 style={{
              margin: 0, fontFamily: FONTS.display, fontSize: 18, fontWeight: 700,
              color: DRAFT_B.ink, letterSpacing: "-0.015em", lineHeight: 1.2,
            }}>{sample.title}</h3>
            <span style={{ color: DRAFT_B.inkMuted, fontSize: 12, fontFamily: FONTS.mono }}>
              {t.versionLabel(scenePlanVersion, versionCount.scenePlans)}
            </span>
          </div>
          <div style={{ color: DRAFT_B.inkMuted, fontSize: 12.5, fontFamily: FONTS.mono }}>
            {t.pageNumber(pageNumber)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {pageStatusBadge(subStatus)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 0 }}>
        <div style={{ padding: "16px 20px 18px", borderInlineEnd: `1px solid ${DRAFT_B.borderSoft}` }}>
          {/* Manuscript blockquote */}
          <div style={{
            padding: "10px 14px",
            background: DRAFT_B.cream,
            borderInlineStart: `3px solid ${DRAFT_B.border}`,
            borderRadius: 6,
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: 10.5, color: DRAFT_B.inkMuted, fontFamily: FONTS.mono,
              letterSpacing: 0.08, textTransform: "uppercase", marginBottom: 4, fontWeight: 700,
            }}>{t.sourceText}</div>
            <div style={{ fontSize: 13.5, color: DRAFT_B.inkSoft, lineHeight: 1.6, fontStyle: "italic" }}>
              {sample.text}
            </div>
          </div>

          <p style={{
            margin: "0 0 12px",
            fontSize: 14.5, lineHeight: 1.7, color: DRAFT_B.ink,
            fontFamily: FONTS.sans,
          }}>{sample.prose}</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <Detail label={t.intentLabel} value={sample.intent} accent={COLORS.secondary}/>
            <Detail label={t.detailLabel} value={sample.detail} accent={COLORS.warning}/>
          </div>

          {visualBibleIsStale && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 8,
              background: COLORS.warningSoft, border: `1px solid #ead7a8`,
              color: "#6e5320", fontSize: 12.5, marginBottom: 12,
            }}>
              <span style={{ display: "inline-flex" }}>{I.warn}</span>
              {t.staleBanner}
              <button style={{
                background: "transparent", border: 0, padding: 0, color: COLORS.warning,
                fontWeight: 700, cursor: "pointer", fontSize: 12.5, marginInlineStart: "auto",
              }}>{t.staleAction}</button>
            </div>
          )}

          {rejectionNote && (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: COLORS.errorSoft, border: `1px solid #e5cccc`,
              color: "#7a3838", fontSize: 13, marginBottom: 12, lineHeight: 1.55,
            }}>
              <div style={{
                fontSize: 10.5, fontFamily: FONTS.mono, letterSpacing: 0.08,
                textTransform: "uppercase", fontWeight: 700, marginBottom: 4,
              }}>{t.rejectedHeader}</div>
              <div style={{ fontStyle: "italic" }}>“{rejectionNote}”</div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <Btn variant="ghost" size="sm" icon={I.refresh}>{t.secAltPlan}</Btn>
            <Btn variant="ghost" size="sm" icon={I.message}>{t.secSuggestChange}</Btn>
            <span style={{ flex: 1 }}/>
            <Btn variant="ghost" size="sm" icon={expanded ? I.chevron(180) : I.chevron(0)}>
              {t.secTechDetails}
            </Btn>
          </div>

          {expanded && <TechnicalPanel/>}
        </div>

        <div style={{ padding: "16px 20px 18px", background: DRAFT_B.cream }}>
          {!showImage ? (
            <ImagePlaceholderEmpty/>
          ) : subStatus === "generating_image" ? (
            <ImagePlaceholderBusy pageNumber={pageNumber}/>
          ) : (
            <div>
              <IllPlaceholder pageNumber={pageNumber} kind={imageKind} seed={pageNumber}
                label={imageVersion ? t.versionLabel(imageVersion, versionCount.images) : null}/>
              {subStatus === "needs_revision" && (
                <div style={{
                  marginTop: 8, fontSize: 12, color: DRAFT_B.inkMuted,
                  display: "inline-flex", gap: 6, alignItems: "center",
                  width: "100%", justifyContent: "center",
                }}>
                  <span style={{ display: "inline-flex" }}>{I.spinner(11)}</span>
                  {t.newVersionLabel}
                </div>
              )}
              {(subStatus === "awaiting_review" || subStatus === "approved") && (
                <div style={{
                  marginTop: 8, display: "flex", alignItems: "center", gap: 8,
                  fontSize: 11.5, color: DRAFT_B.inkMuted, fontFamily: FONTS.mono,
                }}>
                  <span>1024×1024</span>
                  <span>·</span>
                  <span>seedream-4-0</span>
                  <span style={{ flex: 1 }}/>
                  <button style={{
                    background: "transparent", border: `1px solid ${DRAFT_B.borderSoft}`,
                    borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: DRAFT_B.inkMuted,
                    display: "inline-flex", alignItems: "center",
                  }}>{I.eye}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: "12px 20px",
        borderTop: `1px solid ${DRAFT_B.borderSoft}`,
        background: isApproved ? "#f6f9f4" : "#fff",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <PrimaryAction subStatus={subStatus}/>
        <span style={{ flex: 1 }}/>
        {lastError && (
          <span style={{ color: COLORS.error, fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ marginInlineEnd: 4, display: "inline-flex", verticalAlign: "-2px" }}>{I.warn}</span>
            {lastError}
          </span>
        )}
      </div>
    </article>
  );
}

function Detail({ label, value, accent }) {
  return (
    <div style={{
      padding: "10px 12px",
      background: DRAFT_B.cream,
      border: `1px solid ${DRAFT_B.borderSoft}`,
      borderRadius: 8,
    }}>
      <div style={{
        fontSize: 10.5, fontFamily: FONTS.mono, letterSpacing: 0.08,
        textTransform: "uppercase", fontWeight: 700, color: accent, marginBottom: 4,
      }}>{label}</div>
      <div style={{ fontSize: 13, color: DRAFT_B.ink, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function ImagePlaceholderEmpty() {
  const t = window.t;
  return (
    <div style={{
      aspectRatio: "1/1", borderRadius: 10,
      background: "repeating-linear-gradient(135deg, #fff, #fff 8px, " + DRAFT_B.cream + " 8px, " + DRAFT_B.cream + " 16px)",
      border: `1.5px dashed ${DRAFT_B.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 8, color: DRAFT_B.inkMuted,
      textAlign: "center", padding: 16,
    }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 0.1, textTransform: "uppercase" }}>
        {t.noImageHead}
      </div>
      <div style={{ fontFamily: FONTS.sans, fontSize: 13, color: DRAFT_B.inkSoft, fontWeight: 600 }}>
        {t.noImageHint}
      </div>
    </div>
  );
}

function ImagePlaceholderBusy({ pageNumber }) {
  const t = window.t;
  return (
    <div style={{
      aspectRatio: "1/1", borderRadius: 10,
      background: `linear-gradient(120deg, ${COLORS.primarySoft} 0%, ${DRAFT_B.cream} 100%)`,
      border: `1px solid ${DRAFT_B.borderSoft}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 10, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,.5) 50%, transparent 70%)",
        animation: "ill-shimmer 1.6s linear infinite",
      }}/>
      <div style={{ color: COLORS.primary, position: "relative" }}>{I.spinner(28)}</div>
      <div style={{
        fontFamily: FONTS.sans, fontSize: 12.5, color: DRAFT_B.inkSoft,
        position: "relative", fontWeight: 600,
      }}>
        {t.drawingPage(pageNumber)}
      </div>
      <div style={{
        fontFamily: FONTS.mono, fontSize: 11, color: DRAFT_B.inkMuted, position: "relative",
      }}>{t.underThirty}</div>
    </div>
  );
}

function TechnicalPanel() {
  return (
    <div style={{
      marginTop: 14, padding: "12px 14px",
      background: "#1f1a17", color: "#e9dfd2",
      borderRadius: 10, direction: "ltr", textAlign: "start",
      fontFamily: FONTS.mono, fontSize: 11.5, lineHeight: 1.7,
    }}>
      <div style={{ color: "#c4965a", marginBottom: 6, letterSpacing: 0.05, textTransform: "uppercase", fontWeight: 700, fontSize: 10 }}>
        ─── Stage 1b · scene plan (v3) ─── claude-sonnet-4-6 · 2340/312 tok · 1.8s ───
      </div>
      <div style={{ color: "#9e978a" }}>moment</div>
      <div>Sara's right hand hovers two inches from the door, weight on the back foot.</div>
      <div style={{ color: "#9e978a", marginTop: 6 }}>cameraSpec</div>
      <div>Low angle, behind-left, medium close. Shoulder reads tension; face partial.</div>
      <div style={{ color: "#9e978a", marginTop: 6 }}>lightingChoice</div>
      <div>High window source, cool morning quality. Door entrance in dull shadow.</div>
      <div style={{ marginTop: 8, opacity: 0.7 }}>
        ▸ show structured prompt  ▸ show raw LLM call  ▸ copy final prompt
      </div>
    </div>
  );
}

Object.assign(window, { PageCard, IllPlaceholder });
