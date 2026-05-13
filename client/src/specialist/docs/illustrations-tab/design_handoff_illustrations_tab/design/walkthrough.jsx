// Walkthrough shell: state pills + language switcher + one Illustrations tab at a time.

const { useState: useWS } = React;

const STATES = [
  { key: "cta",        en: "A · CTA",        en_sub: "Workspace not started",
                       he: "A · התחלה",      he_sub: "המרחב טרם נפתח",
                       ar: "A · البدء",       ar_sub: "لم تُفتح المساحة بعد" },
  { key: "generating", en: "A→B · Generating", en_sub: "Visual Bible + scene plans",
                       he: "A→B · מייצר",    he_sub: "Visual Bible + תכנונים",
                       ar: "A→B · يولّد",     ar_sub: "Visual Bible + الخطط" },
  { key: "workspace",  en: "B · Workspace",  en_sub: "Mixed sub-statuses",
                       he: "B · מרחב עבודה", he_sub: "מצבי משנה מעורבים",
                       ar: "B · المساحة",     ar_sub: "حالات فرعية مختلطة" },
  { key: "expanded",   en: "B′ · Tech panel", en_sub: "Developer details",
                       he: "B′ · פאנל טכני",  he_sub: "פרטי מפתח",
                       ar: "B′ · لوحة تقنية", ar_sub: "تفاصيل المطوّر" },
  { key: "ready",      en: "C · Ready",      en_sub: "All approved",
                       he: "C · מוכן",       he_sub: "הכל אושר",
                       ar: "C · جاهز",        ar_sub: "اعتُمد الجميع" },
  { key: "dialog",     en: "Modal · Preview", en_sub: "Approval preview",
                       he: "מודל · תצוגה",  he_sub: "תצוגה לאישור",
                       ar: "نافذة · معاينة",  ar_sub: "معاينة الاعتماد" },
  { key: "published",  en: "C′ · Published", en_sub: "Read-only gallery",
                       he: "C′ · פורסם",    he_sub: "גלריה לקריאה",
                       ar: "C′ · منشور",     ar_sub: "معرض للقراءة" },
];

const LANGS = [
  { key: "en", label: "EN" },
  { key: "he", label: "עב" },
  { key: "ar", label: "ع" },
];

function Walkthrough() {
  const [state, setState] = useWS("workspace");
  const [lang, setLang] = useWS("en");

  // Set window.t and __lang__ synchronously before children render.
  window.__lang__ = lang;
  window.t = STRINGS[lang];

  return (
    <div style={{ minHeight: "100vh", background: "#1f1a17" }}>
      <Toolbar state={state} setState={setState} lang={lang} setLang={setLang}/>
      <div style={{ padding: "20px", background: "#1f1a17" }}>
        <div style={{
          background: "#fff",
          borderRadius: 14, overflow: "hidden",
          boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)",
          maxWidth: 1280, margin: "0 auto",
        }}>
          <IllustrationsTab state={state}/>
        </div>
      </div>
      <div style={{
        maxWidth: 1280, margin: "20px auto 40px", color: "#9e978a",
        fontFamily: FONTS.mono, fontSize: 11.5, textAlign: "center",
      }}>
        Specialist desk · Story workspace · §12 redesign exploration
      </div>
    </div>
  );
}

function Toolbar({ state, setState, lang, setLang }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(31,26,23,0.94)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,.08)",
      padding: "14px 24px",
      display: "flex", alignItems: "center", gap: 14,
      fontFamily: FONTS.sans, flexWrap: "wrap",
    }}>
      <div style={{
        fontFamily: FONTS.display, color: "#f5f1eb", fontSize: 17, fontWeight: 700,
        letterSpacing: "-0.01em",
      }}>Illustrations tab · redesign</div>

      <div style={{ height: 22, width: 1, background: "rgba(255,255,255,.12)", marginInline: 6 }}/>

      {/* State pills */}
      <div style={{
        display: "flex", gap: 4, flexWrap: "wrap", flex: 1, minWidth: 0,
      }}>
        {STATES.map((s) => {
          const active = s.key === state;
          return (
            <button key={s.key} onClick={() => setState(s.key)} style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${active ? "#c4965a" : "rgba(255,255,255,.12)"}`,
              background: active ? "#c4965a" : "transparent",
              color: active ? "#1f1a17" : "#e9dfd2",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: FONTS.sans,
              display: "inline-flex", flexDirection: "column", alignItems: "flex-start",
              lineHeight: 1.2,
            }}>
              <span>{s[lang]}</span>
              <span style={{
                fontSize: 10.5, opacity: active ? 0.72 : 0.55, fontWeight: 500,
              }}>{s[lang + "_sub"]}</span>
            </button>
          );
        })}
      </div>

      {/* Language switcher */}
      <div style={{
        display: "inline-flex", borderRadius: 999, padding: 3,
        background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.10)",
      }}>
        {LANGS.map((l) => {
          const on = l.key === lang;
          return (
            <button key={l.key} onClick={() => setLang(l.key)} style={{
              padding: "5px 12px", borderRadius: 999,
              background: on ? "#f5f1eb" : "transparent",
              color: on ? "#1f1a17" : "#e9dfd2",
              border: 0, cursor: "pointer", fontWeight: 700, fontSize: 12.5,
              fontFamily: FONTS.sans, minWidth: 36,
            }}>{l.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// Set defaults before first render so chrome.jsx etc. don't crash on undefined window.t
window.__lang__ = "en";
window.t = STRINGS.en;

ReactDOM.createRoot(document.getElementById("root")).render(<Walkthrough/>);
