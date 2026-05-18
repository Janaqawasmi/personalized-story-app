// Composes panels into the Illustrations tab, switchable by `state` prop.

function WorkspacePanel({ allApproved = false, expandedPage = null }) {
  const t = window.t;
  const pages = allApproved
    ? [
        { pageNumber: 3, subStatus: "approved", scenePlanVersion: 2, imageVersion: 2, versionCount: { scenePlans: 2, images: 2 } },
        { pageNumber: 4, subStatus: "approved", scenePlanVersion: 1, imageVersion: 1, versionCount: { scenePlans: 1, images: 1 } },
        { pageNumber: 5, subStatus: "approved", scenePlanVersion: 1, imageVersion: 1, versionCount: { scenePlans: 1, images: 1 } },
      ]
    : [
        { pageNumber: 3, subStatus: "approved", scenePlanVersion: 2, imageVersion: 2,
          versionCount: { scenePlans: 2, images: 2 } },
        { pageNumber: 4, subStatus: "awaiting_review", scenePlanVersion: 1, imageVersion: 1,
          versionCount: { scenePlans: 1, images: 1 } },
        { pageNumber: 5, subStatus: "generating_image", scenePlanVersion: 1, imageVersion: null,
          versionCount: { scenePlans: 1, images: 0 } },
        { pageNumber: 6, subStatus: "needs_revision", scenePlanVersion: 2, imageVersion: 1,
          versionCount: { scenePlans: 2, images: 1 },
          rejectionNote: t.sampleRejection,
          visualBibleIsStale: true },
        { pageNumber: 7, subStatus: "plan_only", scenePlanVersion: 1, imageVersion: null,
          versionCount: { scenePlans: 1, images: 0 } },
      ];

  return (
    <div>
      <VisualBibleCard version={2} expanded={true}/>

      <SectionHeader
        eyebrow={t.pagesEyebrow}
        title={allApproved ? t.pagesTitleApproved(16) : t.pagesTitleMixed(16)}
        right={(
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" size="sm" icon={I.refresh}>{t.regenAllPlans}</Btn>
            <Btn variant="secondary" size="sm" icon={I.sparkles}>{t.generateAllImages}</Btn>
          </div>
        )}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {pages.map((p) => (
          <PageCard key={p.pageNumber} {...p} expanded={p.pageNumber === expandedPage}/>
        ))}
      </div>

      <PublishBar ready={allApproved} total={16} approved={allApproved ? 16 : 4}/>
    </div>
  );
}

function SectionHeader({ eyebrow, title, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", gap: 12,
      margin: "28px 0 14px",
      paddingBottom: 10,
      borderBottom: `1px solid ${DRAFT_B.border}`,
    }}>
      <div>
        {eyebrow && (
          <div style={{
            fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 0.1,
            textTransform: "uppercase", color: COLORS.primary, fontWeight: 700, marginBottom: 4,
          }}>{eyebrow}</div>
        )}
        <h2 style={{
          margin: 0, fontFamily: FONTS.display, fontSize: 22, fontWeight: 700,
          color: DRAFT_B.ink, letterSpacing: "-0.02em",
        }}>{title}</h2>
      </div>
      <span style={{ flex: 1 }}/>
      {right}
    </div>
  );
}

function IllustrationsTab({ state = "workspace" }) {
  const t = window.t;
  switch (state) {
    case "cta":
      return (
        <WorkspaceShell status={t.statusApproved} statusTone="success" stepperActive={3}>
          <CTAPanel/>
        </WorkspaceShell>
      );
    case "generating":
      return (
        <WorkspaceShell status={t.statusWorkspace} statusTone="info" stepperActive={4}>
          <GeneratingPanel/>
        </WorkspaceShell>
      );
    case "workspace":
      return (
        <WorkspaceShell status={t.statusWorkspace} statusTone="info" stepperActive={4}>
          <WorkspacePanel/>
        </WorkspaceShell>
      );
    case "expanded":
      return (
        <WorkspaceShell status={t.statusWorkspace} statusTone="info" stepperActive={4}>
          <WorkspacePanel expandedPage={3}/>
        </WorkspaceShell>
      );
    case "ready":
      return (
        <WorkspaceShell status={t.statusReady} statusTone="success" stepperActive={5}>
          <GalleryPanel published={false}/>
        </WorkspaceShell>
      );
    case "published":
      return (
        <WorkspaceShell status={t.statusPublished} statusTone="success" stepperActive={5}>
          <GalleryPanel published={true}/>
        </WorkspaceShell>
      );
    case "dialog":
      return (
        <div style={{ position: "relative", width: "100%", minHeight: 1180, background: COLORS.background }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.4,
            pointerEvents: "none", filter: "blur(2px)",
          }}>
            <WorkspaceShell status={t.statusWorkspace} statusTone="info" stepperActive={4}>
              <WorkspacePanel allApproved={true}/>
            </WorkspaceShell>
          </div>
          <div style={{ position: "absolute", inset: 0 }}>
            <ApprovalPreviewDialog/>
          </div>
        </div>
      );
    default:
      return null;
  }
}

Object.assign(window, { IllustrationsTab, WorkspacePanel });
