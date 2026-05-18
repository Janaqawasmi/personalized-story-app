// Visual Bible card — collapsible, editable.

function PaletteSwatches({ colors }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {colors.map((c) => (
        <div key={c.name} style={{ display: "inline-flex", alignItems: "center", gap: 8,
          padding: "5px 11px 5px 5px", borderRadius: 999,
          background: "#fff", border: `1px solid ${DRAFT_B.border}`,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 999, background: c.hex,
            border: `1px solid rgba(0,0,0,.08)`, flexShrink: 0,
          }}/>
          <span style={{ fontSize: 12.5, color: DRAFT_B.ink, fontWeight: 500 }}>{c.name}</span>
        </div>
      ))}
    </div>
  );
}

function EnvironmentCard({ name, atmosphere, spatialLayout }) {
  const t = window.t;
  return (
    <div style={{
      padding: "12px 14px",
      background: DRAFT_B.cream,
      border: `1px solid ${DRAFT_B.borderSoft}`,
      borderRadius: 10,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: 0.08,
        textTransform: "uppercase", color: COLORS.primary,
        fontFamily: FONTS.mono, marginBottom: 6,
      }}>{name}</div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px", fontSize: 13, lineHeight: 1.55 }}>
        <span style={{ color: DRAFT_B.inkMuted, fontWeight: 600 }}>{t.envAtmosphere}</span>
        <span style={{ color: DRAFT_B.ink }}>{atmosphere}</span>
        <span style={{ color: DRAFT_B.inkMuted, fontWeight: 600 }}>{t.envLayout}</span>
        <span style={{ color: DRAFT_B.ink }}>{spatialLayout}</span>
      </div>
    </div>
  );
}

function ListPill({ children, tone = "neutral" }) {
  const bg = tone === "avoid" ? COLORS.errorSoft : DRAFT_B.cream;
  const fg = tone === "avoid" ? "#7a3838" : DRAFT_B.inkSoft;
  return (
    <span style={{
      display: "inline-block", padding: "5px 11px",
      background: bg, color: fg,
      borderRadius: 8, fontSize: 12.5, fontWeight: 500,
      border: `1px solid ${tone === "avoid" ? "#e5cccc" : DRAFT_B.borderSoft}`,
    }}>{children}</span>
  );
}

// Localised content by language
const VB_CONTENT = {
  en: {
    character: "Sara, a six-year-old girl; wavy shoulder-length brown hair, freckles across the bridge of her nose, a mustard wool sweater and beige corduroy skirt. A linen canvas bag carried on both shoulders.",
    style: "Soft watercolour on rough paper; thin brown pencil line. Warm earth atmosphere; gentle stylisation — not cartoonish, not realistic.",
    anchors: ["watercolour on rough paper", "thin brown pencil line", "soft morning atmosphere", "gentle stylisation"],
    palette: [
      { name: "earth orange", hex: "#c4965a" },
      { name: "smoky rose", hex: "#b07a8a" },
      { name: "misty blue", hex: "#617891" },
      { name: "chamomile green", hex: "#8a9b78" },
      { name: "paper cream", hex: "#f5f1eb" },
      { name: "ink black", hex: "#2a2421" },
    ],
    envs: [
      { name: "corridor_morning",
        atmosphere: "Urban school corridor; cool morning light entering from a high window.",
        spatial: "Classroom door on the right, linoleum floor, notice board on the left." },
      { name: "classroom_late",
        atmosphere: "Classroom after hours; warm yellow light from the teacher's desk lamp.",
        spatial: "Rows of desks, whiteboard, unlit corner window." },
    ],
    avoid: ["text, letters, words", "speech bubbles", "logos", "writing on signs", "realistic faces"],
  },
  he: {
    character: "שרה, ילדה כבת שש, שיער חום גלי באורך הכתפיים, נמשים על גשר האף, חולצת צמר חרדל וחצאית קורדרוי בז׳. תיק בד פשתן נסחב על שתי כתפיים.",
    style: "צבעי מים רכים על גוויל גס, קו עפרון דקיק בעיפרון חום. אווירת אדמה חמה, סטיליזציה עדינה — לא קריקטוריסטית, לא ריאליסטית.",
    anchors: ["צבעי מים על נייר גוויל", "קו עפרון חום דקיק", "אווירה ערב-בוקר רכה", "סטיליזציה עדינה"],
    palette: [
      { name: "כתום עפר", hex: "#c4965a" },
      { name: "ורד מעושן", hex: "#b07a8a" },
      { name: "כחול ערפילי", hex: "#617891" },
      { name: "ירוק קמומיל", hex: "#8a9b78" },
      { name: "קרם נייר", hex: "#f5f1eb" },
      { name: "שחור דיו", hex: "#2a2421" },
    ],
    envs: [
      { name: "corridor_morning",
        atmosphere: "מסדרון בית-ספר עירוני; אור בוקר קר נכנס מחלון גבוה.",
        spatial: "דלת כיתה מימין, רצפת לינוליאום, רשימת מודיעין משמאל." },
      { name: "classroom_late",
        atmosphere: "כיתה אחרי שעות הלימוד; אור צהוב חם משולחן המורה.",
        spatial: "שורות שולחנות, לוח מחיק, חלון פינתי לא מואר." },
    ],
    avoid: ["טקסט, אותיות, מילים", "בועות דיבור", "לוגואים", "כתב על שלטים", "פנים ריאליסטיות"],
  },
  ar: {
    character: "سارة، فتاة في السادسة؛ شعر بنيّ مموّج بطول الكتفين، نمش على جسر الأنف، كنزة صوف خردلية وتنورة قَطيفة (كوردروي) بيج. حقيبة قماش كتّاني تُحمل على الكتفين معًا.",
    style: "ألوان مائية ناعمة على ورق خشن، خط رصاص بنيّ رفيع. أجواء ترابية دافئة وأسلوب لطيف — لا كرتوني ولا واقعي.",
    anchors: ["ألوان مائية على ورق خشن", "خط رصاص بني رفيع", "أجواء صباحية ناعمة", "أسلوب لطيف"],
    palette: [
      { name: "برتقالي ترابي", hex: "#c4965a" },
      { name: "وردي دخاني", hex: "#b07a8a" },
      { name: "أزرق ضبابي", hex: "#617891" },
      { name: "أخضر بابوني", hex: "#8a9b78" },
      { name: "كريم ورقي", hex: "#f5f1eb" },
      { name: "أسود حبر", hex: "#2a2421" },
    ],
    envs: [
      { name: "corridor_morning",
        atmosphere: "ممرّ مدرسي حضري؛ ضوء صباح بارد يدخل من نافذة عالية.",
        spatial: "باب الصف إلى اليمين، أرضية لينوليوم، لوحة إعلانات إلى اليسار." },
      { name: "classroom_late",
        atmosphere: "صفّ بعد الدوام؛ ضوء أصفر دافئ من مصباح طاولة المعلّمة.",
        spatial: "صفوف من الطاولات، لوح أبيض، نافذة زاوية غير مضاءة." },
    ],
    avoid: ["نصوص وأحرف وكلمات", "بالونات حوار", "شعارات", "كتابة على لافتات", "وجوه واقعية"],
  },
};

function VisualBibleCard({ version = 2, expanded = true, edited = false }) {
  const t = window.t;
  const lang = window.__lang__ || "en";
  const c = VB_CONTENT[lang] || VB_CONTENT.en;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${DRAFT_B.border}`,
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 1px 0 rgba(42,36,33,.02), 0 8px 24px -16px rgba(42,36,33,.08)",
    }}>
      <div style={{
        padding: "16px 22px",
        background: `linear-gradient(180deg, ${COLORS.parchment} 0%, #fff 100%)`,
        borderBottom: expanded ? `1px solid ${DRAFT_B.borderSoft}` : "none",
        display: "flex", alignItems: "flex-start", gap: 16,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: COLORS.primary, color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: FONTS.display, fontSize: 20, fontWeight: 700, flexShrink: 0,
        }}>VB</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <h2 style={{
              margin: 0, fontFamily: FONTS.display, fontSize: 22, fontWeight: 700,
              color: DRAFT_B.ink, letterSpacing: "-0.02em",
            }}>{t.vbTitle}</h2>
            <Chip tone="info" size="sm">{t.vbVersion(version)}</Chip>
            {edited && <Chip tone="rose" size="sm">{t.vbEditedTag}</Chip>}
          </div>
          <p style={{
            margin: 0, color: DRAFT_B.inkMuted, fontSize: 13.5, lineHeight: 1.55,
            maxWidth: 640,
          }}>
            {t.vbSubtitle}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Btn variant="secondary" size="sm" icon={I.edit}>{t.vbEdit}</Btn>
          <Btn variant="ghost" size="sm" icon={I.refresh}>{t.vbRegenerate}</Btn>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "20px 22px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Section title={t.vbCharacter} hint={t.vbCharacterHint}>
                <p style={{ margin: 0, color: DRAFT_B.ink, fontSize: 14, lineHeight: 1.65 }}>
                  {c.character}
                </p>
              </Section>
              <Section title={t.vbStyle}>
                <p style={{ margin: 0, color: DRAFT_B.ink, fontSize: 14, lineHeight: 1.65 }}>
                  {c.style}
                </p>
              </Section>
              <Section title={t.vbAnchors} hint={t.vbAnchorsHint}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {c.anchors.map((a) => <ListPill key={a}>{a}</ListPill>)}
                </div>
              </Section>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Section title={t.vbPalette}>
                <PaletteSwatches colors={c.palette}/>
              </Section>
              <Section title={t.vbEnvironments} count={c.envs.length}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {c.envs.map((e) => (
                    <EnvironmentCard key={e.name}
                      name={e.name} atmosphere={e.atmosphere} spatialLayout={e.spatial}/>
                  ))}
                </div>
              </Section>
              <Section title={t.vbAvoid} tone="avoid">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {c.avoid.map((a) => <ListPill key={a} tone="avoid">{a}</ListPill>)}
                </div>
              </Section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, hint, count, tone, children }) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, flexWrap: "wrap",
      }}>
        <h3 style={{
          margin: 0, fontFamily: FONTS.sans, fontSize: 12,
          letterSpacing: 0.08, textTransform: "uppercase",
          fontWeight: 700, color: tone === "avoid" ? COLORS.error : DRAFT_B.inkSoft,
        }}>{title}</h3>
        {typeof count === "number" && (
          <span style={{ fontSize: 11.5, color: DRAFT_B.inkMuted, fontWeight: 600 }}>·  {count}</span>
        )}
        {hint && (
          <span style={{ fontSize: 12, color: DRAFT_B.inkMuted, fontStyle: "italic" }}>— {hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

Object.assign(window, { VisualBibleCard });
