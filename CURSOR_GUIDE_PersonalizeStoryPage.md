# DAMMAH — PersonalizeStoryPage Redesign
## Cursor Implementation Guide

**File to edit:** `client/src/pages/PersonalizeStoryPage.tsx`
**Prototype reference:** `dammah_personalization_v2.html` (open it in a browser while implementing)
Do NOT touch routing, validation logic, localStorage, or navigation — only the visual layer.

---

## 1. FONTS — Add to `index.html`

Add inside `<head>` before any other styles:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap"
  rel="stylesheet"
/>
```

---

## 2. THEME TOKENS — Add to `theme.ts`

In the `COLORS` object or alongside it, add:

```ts
export const DESIGN_TOKENS = {
  fontDisplay: "'Cormorant Garamond', serif",
  fontBody:    "'DM Sans', sans-serif",

  ink:      '#1c1118',
  ink2:     '#5a4a52',
  ink3:     '#9a8a92',
  rose:     '#824D5C',
  rose2:    '#B07A8A',
  rose3:    '#d4a8b4',
  rosebg:   '#fdf0f3',
  gold:     '#c4965a',
  cream:    '#f8f4ef',
  parchment:'#efe8df',
  border:   '#ddd4ca',
  night:    '#170d1e',
  night2:   '#2a1a35',
  night3:   '#3d2548',

  springBounce: 'cubic-bezier(0.34, 1.26, 0.64, 1)',
  easeStd:      'cubic-bezier(0.4, 0, 0.2, 1)',
};
```

---

## 3. PAGE BACKGROUND

Replace the outer `Box` that wraps the whole page. It currently has a plain background. Change it to:

```tsx
<Box
  sx={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: { xs: 2, md: 3 },
    py: { xs: 3, md: 4 },
    background: 'radial-gradient(ellipse at 30% 20%, #ede0d4 0%, #e8ddd5 40%, #ddd4ca 100%)',
    position: 'relative',
    overflow: 'hidden',
    // subtle crosshatch texture overlay
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c4b4a4' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
      pointerEvents: 'none',
    },
  }}
>
```

---

## 4. SHELL (two-column grid)

The main card changes from a single centered column to a two-column grid. Replace the main Card/Box shell:

```tsx
<Box
  sx={{
    width: '100%',
    maxWidth: 960,
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 32px 80px rgba(28,17,24,0.22), 0 0 0 1px rgba(196,166,146,0.3)',
    minHeight: 620,
    position: 'relative',
    zIndex: 1,
  }}
>
  <LeftPanel story={story} personalization={personalization} />
  <RightPanel>
    {/* progress + step content + footer stay here */}
  </RightPanel>
</Box>
```

---

## 5. LEFT PANEL — Full spec

Create a new local component `LeftPanel` inside `PersonalizeStoryPage.tsx` (no new file needed).

```tsx
// Add this ref at the top of PersonalizeStoryPage for the starfield
const starfieldRef = useRef<HTMLDivElement>(null);

// Generate stars once on mount
useEffect(() => {
  const sf = starfieldRef.current;
  if (!sf) return;
  sf.innerHTML = '';
  const configs = [
    { count: 12, size: 2, minOp: 0.1, maxOp: 0.7, durMin: 2, durMax: 4 },
    { count: 10, size: 3, minOp: 0.05, maxOp: 0.4, durMin: 3, durMax: 6 },
    { count: 6,  size: 1, minOp: 0.2, maxOp: 0.9, durMin: 1.5, durMax: 3 },
  ];
  const colors = ['#fff', '#f0e8ff', '#ffe8f0', '#e8f0ff'];
  configs.forEach(({ count, size, minOp, maxOp, durMin, durMax }) => {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      const s = size + Math.random() * size;
      const dur = durMin + Math.random() * (durMax - durMin);
      const delay = -(Math.random() * dur);
      const color = colors[Math.floor(Math.random() * colors.length)];
      el.style.cssText = `
        position:absolute; border-radius:50%;
        width:${s}px; height:${s}px;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        background:${color};
        animation:starPulse ${dur}s ease-in-out ${delay}s infinite;
        --min-op:${minOp}; --max-op:${maxOp};
      `;
      sf.appendChild(el);
    }
  });
}, []);
```

Add `@keyframes starPulse` to your global CSS or MUI `GlobalStyles`:

```tsx
// In your App.tsx or theme, add to GlobalStyles:
<GlobalStyles styles={`
  @keyframes starPulse {
    0%, 100% { opacity: var(--min-op, 0.1); transform: scale(1); }
    50%       { opacity: var(--max-op, 0.7); transform: scale(1.3); }
  }
  @keyframes auroraDrift {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(20px, 15px) scale(1.1); }
  }
  @keyframes stepEnter {
    from { opacity: 0; transform: translateX(22px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes checkPop {
    from { transform: scale(0); }
    to   { transform: scale(1); }
  }
  @keyframes celebIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes tagIn {
    from { opacity: 0; transform: scale(0.7); }
    to   { opacity: 1; transform: scale(1); }
  }
`} />
```

**LeftPanel JSX:**

```tsx
function LeftPanel({
  story,
  personalization,
}: {
  story: StoryTemplate | null;
  personalization: Partial<StoryPersonalizationData>;
}) {
  const { childName, gender } = personalization;
  const hasName = (childName?.trim().length ?? 0) >= 2;

  // Avatar emoji based on gender
  const avatarEmoji = gender === 'female' ? '🌸' : gender === 'male' ? '🌊' : '✨';

  return (
    <Box
      sx={{
        background: 'linear-gradient(165deg, #170d1e 0%, #2a1a35 45%, #1a0a2e 100%)',
        p: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Starfield */}
      <Box
        ref={starfieldRef}
        sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
      />

      {/* Aurora glows */}
      {[
        { w: 260, h: 260, bg: 'rgba(130,77,92,0.25)', top: -80, right: -80, delay: '0s' },
        { w: 200, h: 200, bg: 'rgba(60,30,80,0.3)', bottom: -60, left: -60, delay: '-4s' },
        { w: 160, h: 160, bg: 'rgba(176,122,138,0.15)', top: '40%', right: '10%', delay: '-2s' },
      ].map((a, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: a.w,
            height: a.h,
            borderRadius: '50%',
            background: a.bg,
            filter: 'blur(60px)',
            top: a.top ?? 'auto',
            bottom: a.bottom ?? 'auto',
            left: a.left ?? 'auto',
            right: a.right ?? 'auto',
            pointerEvents: 'none',
            animation: `auroraDrift 8s ease-in-out ${a.delay} infinite alternate`,
          }}
        />
      ))}

      {/* Book cover */}
      <Box sx={{ position: 'relative', zIndex: 1, mb: '28px', perspective: '800px' }}>
        <Box
          sx={{
            borderRadius: '14px',
            background: 'linear-gradient(145deg, #3d1a2a 0%, #2a1435 40%, #16093a 100%)',
            aspectRatio: '3/4',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), 4px 0 12px rgba(0,0,0,0.4)',
            position: 'relative',
            overflow: 'hidden',
            transform: 'rotateY(-4deg) rotateX(2deg)',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s ease',
            '&:hover': {
              transform: 'rotateY(-2deg) rotateX(1deg) translateY(-4px)',
            },
            // Spine shadow
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0, top: 0, bottom: 0,
              width: '12px',
              background: 'linear-gradient(90deg, rgba(0,0,0,0.5), transparent)',
            },
            // Inner glow
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 30% 20%, rgba(176,122,138,0.12) 0%, transparent 60%)',
              pointerEvents: 'none',
            },
          }}
        >
          {/* Gold bottom glow */}
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 60% 80%, rgba(196,150,90,0.08) 0%, transparent 60%)',
          }} />
          {/* Spine shine */}
          <Box sx={{
            position: 'absolute', left: '12px', top: 0, bottom: 0, width: '3px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03), rgba(255,255,255,0.08))',
          }} />

          <Typography sx={{ fontSize: 52, position: 'relative', zIndex: 1, filter: 'drop-shadow(0 4px 16px rgba(176,122,138,0.5))' }}>
            🌟
          </Typography>
          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', px: '18px' }}>
            <Typography sx={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 15, fontWeight: 600,
              color: 'rgba(255,255,255,0.88)', lineHeight: 1.4, mb: 1,
            }}>
              {pickLang(story?.title, language) || 'The Night the Stars Listened'}
            </Typography>
            <Box component="span" sx={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              px: '10px', py: '3px', borderRadius: '999px',
              background: 'rgba(196,150,90,0.18)', border: '1px solid rgba(196,150,90,0.35)',
              fontSize: 10, color: '#c4965a', fontWeight: 500, letterSpacing: '0.06em',
            }}>
              ✦ Ages {story?.ageGroup || '4–8'}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Divider */}
      <Box sx={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', my: '20px', position: 'relative', zIndex: 1 }} />

      {/* Story meta — pushes to bottom */}
      <Box sx={{ position: 'relative', zIndex: 1, mt: 'auto' }}>
        <Typography sx={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', mb: 1 }}>
          Personalizing
        </Typography>
        <Typography sx={{
          fontFamily: "'Cormorant Garamond', serif",
          color: 'rgba(255,255,255,0.9)', fontSize: 19, lineHeight: 1.3,
          mb: '14px', fontWeight: 400, fontStyle: 'italic',
        }}>
          {pickLang(story?.title, language) || 'The Night the Stars Listened'}
        </Typography>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          px: '14px', py: '6px', borderRadius: '999px',
          background: 'rgba(130,77,92,0.28)', border: '1px solid rgba(176,122,138,0.4)',
          fontSize: 11, color: '#d4a8b4', fontWeight: 500,
        }}>
          <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: '#B07A8A', flexShrink: 0 }} />
          {pickLang(story?.topic, language) || 'Anxiety & Calm'}
        </Box>
      </Box>

      {/* Divider */}
      <Box sx={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', my: '20px', position: 'relative', zIndex: 1 }} />

      {/* Live child preview */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography sx={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', mb: 1 }}>
          Your child
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4a2535, #2a1a40)',
            border: '1.5px solid rgba(176,122,138,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}>
            {hasName ? avatarEmoji : '✨'}
          </Box>
          <Typography sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 16, fontStyle: 'italic',
            color: hasName ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.38)',
            transition: 'color 0.3s',
          }}>
            {hasName ? childName : 'Waiting for a name…'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
```

---

## 6. RIGHT PANEL — Wrapper

```tsx
<Box sx={{ background: '#fff', display: 'flex', flexDirection: 'column' }}>
  <ProgressBar activeStep={activeStep} totalSteps={STEPS.length} onStepClick={setActiveStep} />
  <Box sx={{ flex: 1, px: '44px', py: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    {/* step content goes here */}
  </Box>
  <StepFooter ... />
</Box>
```

---

## 7. PROGRESS BAR

Replace existing step indicator. **Do not use MUI Stepper** — build it manually:

```tsx
function ProgressBar({
  activeStep,
  totalSteps,
  onStepClick,
}: {
  activeStep: number;
  totalSteps: number;
  onStepClick: (i: number) => void;
}) {
  const labels = [
    t('personalize.steps.name'),
    t('personalize.steps.gender'),
    t('personalize.steps.photo'),
    t('personalize.steps.style'),
  ];

  return (
    <Box sx={{ px: '44px', pt: '32px', pb: 0 }}>
      {/* Dots + lines */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: '10px' }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <React.Fragment key={i}>
            <Box
              onClick={() => i <= activeStep && onStepClick(i)}
              sx={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, flexShrink: 0,
                cursor: i <= activeStep ? 'pointer' : 'default',
                userSelect: 'none',
                transition: 'all 0.4s cubic-bezier(0.34,1.26,0.64,1)',
                ...(i < activeStep && {
                  background: '#824D5C', color: '#fff',
                  boxShadow: '0 2px 10px rgba(130,77,92,0.35)',
                  '&:hover': { transform: 'scale(1.1)' },
                }),
                ...(i === activeStep && {
                  background: '#824D5C', color: '#fff',
                  boxShadow: '0 0 0 5px rgba(130,77,92,0.15), 0 4px 12px rgba(130,77,92,0.3)',
                }),
                ...(i > activeStep && {
                  background: '#f8f4ef', color: '#9a8a92',
                  border: '1.5px solid #ddd4ca',
                }),
              }}
            >
              {i < activeStep ? '✓' : i + 1}
            </Box>

            {i < totalSteps - 1 && (
              <Box sx={{
                flex: 1, height: 2,
                background: i < activeStep ? '#824D5C' : '#ddd4ca',
                transition: 'background 0.5s ease',
              }} />
            )}
          </React.Fragment>
        ))}
      </Box>

      {/* Labels */}
      <Box sx={{ display: 'flex' }}>
        {labels.map((label, i) => (
          <Typography
            key={i}
            sx={{
              flex: 1, textAlign: 'center', fontSize: 10,
              color: i === activeStep ? '#824D5C' : '#9a8a92',
              fontWeight: i === activeStep ? 600 : 400,
              transition: 'color 0.3s',
            }}
          >
            {label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
```

---

## 8. STEP CONTENT — Shared header pattern

Every step starts with the same two elements. Build a reusable `StepHeader`:

```tsx
function StepHeader({ eyebrow, heading }: { eyebrow: string; heading: React.ReactNode }) {
  return (
    <>
      {/* Eyebrow with trailing line */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: '10px' }}>
        <Typography sx={{
          fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: '#B07A8A', fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          {eyebrow}
        </Typography>
        <Box sx={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #ddd4ca, transparent)' }} />
      </Box>

      {/* Heading */}
      <Typography sx={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 30, fontWeight: 300, color: '#1c1118',
        lineHeight: 1.2, mb: 1,
        '& em': { fontStyle: 'italic', color: '#824D5C' },
      }}>
        {heading}
      </Typography>
    </>
  );
}
```

Use it in every step render:
```tsx
<StepHeader
  eyebrow={t('personalize.step1Of4')}   // "Step 1 of 4"
  heading={<>{t('personalize.nameHeading1')}<br /><em>{t('personalize.nameHeading2')}</em></>}
/>
```

---

## 9. STEP 1 — Name

```tsx
// Step 1 render
<Box sx={{ animation: 'stepEnter 0.38s cubic-bezier(0.4,0,0.2,1) forwards' }}>
  <StepHeader
    eyebrow={t('personalize.step1Of4')}
    heading={<>{t('personalize.nameHeadingLine1')}<br /><em>{t('personalize.nameHeadingLine2')}</em></>}
  />

  <Typography sx={{ fontSize: 13, color: '#9a8a92', lineHeight: 1.7, mb: '28px', maxWidth: 360 }}>
    {t('personalize.nameSub')}
    {/* EN: "Their name will be woven through every line — making this story entirely, unmistakably theirs." */}
  </Typography>

  {/* Input */}
  <TextField
    value={personalization.childName ?? ''}
    onChange={e => handleNameChange(e.target.value)}
    placeholder={t('personalize.namePlaceholder')} // "e.g. Layla…"
    onBlur={() => setChildNameBlurred(true)}
    inputProps={{ maxLength: 30, dir: isRTL ? 'rtl' : 'ltr' }}
    variant="standard"
    fullWidth
    sx={{
      mb: '6px',
      '& .MuiInput-root': {
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 34,
        fontWeight: 300,
        color: '#1c1118',
        '&::before': { borderBottom: '2px solid #ddd4ca' },
        '&::after':  { borderBottom: '2px solid #824D5C' },
        '&:hover:not(.Mui-disabled):before': { borderBottom: '2px solid #B07A8A' },
      },
      '& .MuiInput-input': {
        pb: '10px',
        '&::placeholder': { color: '#ddd4ca', opacity: 1 },
      },
    }}
  />

  <Typography sx={{ fontSize: 11, color: '#9a8a92', mb: '20px' }}>
    {t('personalize.nameHint')}
    {/* "Hebrew, Arabic, or Latin · 2–30 characters" */}
  </Typography>

  {/* Live preview sentence */}
  <Box sx={{
    p: '16px 20px',
    background: 'linear-gradient(135deg, #fdf8f5, #faf4f0)',
    borderRadius: '12px',
    borderLeft: '3px solid #d4a8b4',
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 17, fontStyle: 'italic',
    color: '#5a4a52', lineHeight: 1.7,
    position: 'relative', overflow: 'hidden',
    transition: 'all 0.4s ease',
    // decorative opening quote
    '&::before': {
      content: '"\\201C"',
      position: 'absolute', top: '-6px', left: '10px',
      fontSize: 60, color: '#d4a8b4', opacity: 0.18,
      fontFamily: "'Cormorant Garamond', serif", lineHeight: 1,
    },
  }}>
    {(personalization.childName?.trim().length ?? 0) >= 2 ? (
      <>
        <Box component="span" sx={{
          fontStyle: 'normal', fontWeight: 600, color: '#824D5C',
          fontFamily: "'Cormorant Garamond', serif",
          position: 'relative',
          '&::after': {
            content: '""', position: 'absolute',
            bottom: '-1px', left: 0, right: 0,
            height: '2px', background: '#d4a8b4', borderRadius: '1px',
          },
        }}>
          {personalization.childName}
        </Box>
        {t('personalize.previewSentenceSuffix')}
        {/* " looked up at the night sky — and for a moment, every star seemed to shine just for her." */}
      </>
    ) : (
      t('personalize.previewSentenceEmpty')
      // "Once upon a time, there was a child who believed in the magic of stories…"
    )}
  </Box>
</Box>
```

---

## 10. STEP 2 — Gender

```tsx
<Box sx={{ animation: 'stepEnter 0.38s cubic-bezier(0.4,0,0.2,1) forwards' }}>
  <StepHeader
    eyebrow={t('personalize.step2Of4')}
    heading={<>{t('personalize.genderHeadingLine1')}<br /><em>{t('personalize.genderHeadingLine2')}</em></>}
  />
  <Typography sx={{ fontSize: 13, color: '#9a8a92', lineHeight: 1.7, mb: '28px', maxWidth: 360 }}>
    {t('personalize.genderSub')}
    {/* "So every word feels natural — she, her, hers / he, him, his. No detail left generic." */}
  </Typography>

  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
    {(['female', 'male'] as const).map(g => {
      const isGirl = g === 'female';
      const selected = personalization.gender === g;
      return (
        <Box
          key={g}
          onClick={() => handleGenderSelect(g)}
          sx={{
            border: `2px solid ${selected ? (isGirl ? '#c47a8a' : '#7a9cc4') : '#ddd4ca'}`,
            borderRadius: '20px',
            p: '28px 20px 22px',
            textAlign: 'center',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.35s cubic-bezier(0.34,1.26,0.64,1)',
            background: selected
              ? (isGirl
                  ? 'linear-gradient(145deg, #fdf0f5, #fce5ef, #f9dde8)'
                  : 'linear-gradient(145deg, #eef3fd, #e4edfb, #dce6f8)')
              : '#fff',
            transform: selected ? 'translateY(-5px)' : 'translateY(0)',
            boxShadow: selected
              ? (isGirl
                  ? '0 12px 40px rgba(196,122,138,0.2)'
                  : '0 12px 40px rgba(122,156,196,0.2)')
              : 'none',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 12px 40px rgba(28,17,24,0.14)',
              background: isGirl
                ? 'linear-gradient(145deg, #fdf0f5, #fce5ef)'
                : 'linear-gradient(145deg, #eef3fd, #e4edfb)',
            },
          }}
        >
          {/* Check badge */}
          {selected && (
            <Box sx={{
              position: 'absolute', top: '12px', right: '12px',
              width: 22, height: 22, borderRadius: '50%',
              background: '#824D5C', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, zIndex: 2,
              animation: 'checkPop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}>
              ✓
            </Box>
          )}

          {/* Icon */}
          <Typography sx={{
            fontSize: 48, display: 'block', mb: '12px',
            position: 'relative', zIndex: 1,
            transition: 'transform 0.35s cubic-bezier(0.34,1.26,0.64,1)',
            transform: selected ? 'scale(1.12)' : 'scale(1)',
          }}>
            {isGirl ? '🌸' : '🌊'}
          </Typography>

          <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1c1118', position: 'relative', zIndex: 1 }}>
            {isGirl ? t('personalize.girl') : t('personalize.boy')}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#9a8a92', mt: '4px', position: 'relative', zIndex: 1 }}>
            {isGirl ? 'She · Her · Hers' : 'He · Him · His'}
          </Typography>
        </Box>
      );
    })}
  </Box>
</Box>
```

---

## 11. STEP 3 — Photo

```tsx
<Box sx={{ animation: 'stepEnter 0.38s cubic-bezier(0.4,0,0.2,1) forwards' }}>
  <StepHeader
    eyebrow={t('personalize.step3Of4')}
    heading={
      <>
        {t('personalize.photoHeadingLine1')}<br />
        <em>{personalization.childName || t('personalize.photoHeadingFallback')}</em>
      </>
    }
  />
  <Typography sx={{ fontSize: 13, color: '#9a8a92', lineHeight: 1.7, mb: '28px', maxWidth: 360 }}>
    {t('personalize.photoSub', { name: personalization.childName || t('personalize.photoSubFallback') })}
    {/* "[Name]'s face will appear in the first illustrated spreads — not a generic child, but them." */}
  </Typography>

  {/* Drop zone */}
  <Box
    onClick={() => fileInputRef.current?.click()}
    sx={{
      border: `2px ${personalization.photoPreviewUrl ? 'solid #B07A8A' : 'dashed #ddd4ca'}`,
      borderRadius: '24px',
      p: personalization.photoPreviewUrl ? '24px' : '36px 28px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.35s ease',
      background: personalization.photoPreviewUrl ? '#fff' : '#f8f4ef',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        borderColor: '#B07A8A',
        background: '#fdf0f3',
        // Overlay on loaded state
        ...(personalization.photoPreviewUrl && {
          '&::after': {
            opacity: 1,
          },
        }),
      },
      // "Replace photo" hover overlay
      '&::after': personalization.photoPreviewUrl ? {
        content: `"${t('personalize.replacePhoto')}"`,
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(130,77,92,0.85)', color: '#fff',
        fontSize: 13, fontWeight: 600, borderRadius: '22px',
        opacity: 0, transition: 'opacity 0.25s',
      } : {},
    }}
  >
    {/* Avatar ring */}
    <Box sx={{
      width: 110, height: 110, borderRadius: '50%',
      background: personalization.photoPreviewUrl
        ? 'transparent'
        : 'linear-gradient(135deg, #e8d5dc, #d4c0c8)',
      mx: 'auto', mb: '16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: personalization.photoPreviewUrl ? 'unset' : 44,
      border: '5px solid #fff',
      boxShadow: personalization.photoPreviewUrl
        ? '0 14px 40px rgba(130,77,92,0.28)'
        : '0 8px 28px rgba(130,77,92,0.2)',
      position: 'relative', zIndex: 1,
      transition: 'transform 0.4s cubic-bezier(0.34,1.26,0.64,1), box-shadow 0.4s',
      transform: personalization.photoPreviewUrl ? 'scale(1.06)' : 'scale(1)',
      overflow: 'hidden',
    }}>
      {personalization.photoPreviewUrl ? (
        <img
          src={personalization.photoPreviewUrl}
          alt="child"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      ) : '📷'}
    </Box>

    {personalization.photoPreviewUrl ? (
      <>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#824D5C', mb: '4px', position: 'relative', zIndex: 1 }}>
          {t('personalize.photoAdded')} {/* "Photo added ✓" */}
        </Typography>
        <Typography sx={{ fontSize: 12, color: '#9a8a92', position: 'relative', zIndex: 1 }}>
          {t('personalize.tapToReplace')}
        </Typography>
      </>
    ) : (
      <>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#1c1118', mb: '6px', position: 'relative', zIndex: 1 }}>
          {t('personalize.uploadPhoto')}
        </Typography>
        <Typography sx={{ fontSize: 12, color: '#9a8a92', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
          {t('personalize.uploadHint')}
          {/* "JPG or PNG · Max 5 MB\nUsed only to create illustrations" */}
        </Typography>
      </>
    )}
  </Box>

  {/* Trust strip */}
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', mt: '16px', flexWrap: 'wrap' }}>
    {[
      t('personalize.trust1'), // "Illustrations only"
      t('personalize.trust2'), // "Never shared"
      t('personalize.trust3'), // "Deleted after"
    ].map(text => (
      <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf50', flexShrink: 0 }} />
        <Typography sx={{ fontSize: 11, color: '#9a8a92' }}>{text}</Typography>
      </Box>
    ))}
  </Box>
</Box>
```

---

## 12. STEP 4 — Visual Style

```tsx
// Define style data
const STYLE_DISPLAY = [
  { id: 'watercolor',           label: t('personalize.visualStyles.watercolor.label'),           emoji: '🎨', bg: 'linear-gradient(135deg, #fce4f4, #e0f0fc)' },
  { id: 'semi_realistic',       label: t('personalize.visualStyles.semi_realistic.label'),       emoji: '🖼️', bg: 'linear-gradient(135deg, #e4f0e4, #f0e8e4)' },
  { id: 'flat_cartoon',         label: t('personalize.visualStyles.flat_cartoon.label'),         emoji: '✏️', bg: 'linear-gradient(135deg, #fff3e0, #fce4f4)' },
  { id: 'paper_craft',          label: t('personalize.visualStyles.paper_craft.label'),          emoji: '📄', bg: 'linear-gradient(135deg, #f5f0e8, #e8e0d8)' },
  { id: 'vintage_1950s_little_golden', label: t('personalize.visualStyles.vintage_1950s_little_golden.label'), emoji: '📚', bg: 'linear-gradient(135deg, #f0e4d4, #e8d4c0)' },
];

// Render
<Box sx={{ animation: 'stepEnter 0.38s cubic-bezier(0.4,0,0.2,1) forwards' }}>
  <StepHeader
    eyebrow={t('personalize.step4Of4')}
    heading={<>{t('personalize.styleHeadingLine1')}<br /><em>{t('personalize.styleHeadingLine2')}</em></>}
  />
  <Typography sx={{ fontSize: 13, color: '#9a8a92', lineHeight: 1.7, mb: '28px', maxWidth: 360 }}>
    {t('personalize.styleSub', { name: personalization.childName || t('personalize.styleSubFallback') })}
    {/* "Every page will be rendered in this mood. Pick the world you want [Name] to step into." */}
  </Typography>

  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
    {STYLE_DISPLAY.map(style => {
      // Use real thumbnail images where available, fall back to emoji
      const thumbSrc = VISUAL_STYLES.find(v => v.id === style.id)?.image;
      const selected = personalization.visualStyle === style.id;

      return (
        <Box
          key={style.id}
          onClick={() => handleStyleSelect(style.id as VisualStyle)}
          sx={{
            borderRadius: '14px', overflow: 'hidden',
            border: `2px solid ${selected ? '#824D5C' : '#ddd4ca'}`,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34,1.26,0.64,1)',
            position: 'relative', background: '#fff',
            boxShadow: selected ? '0 0 0 4px rgba(130,77,92,0.12)' : 'none',
            transform: selected ? 'translateY(-5px) scale(1.02)' : 'translateY(0)',
            '&:hover': {
              transform: 'translateY(-5px) scale(1.02)',
              boxShadow: '0 12px 40px rgba(28,17,24,0.14)',
            },
          }}
        >
          {/* Check badge */}
          {selected && (
            <Box sx={{
              position: 'absolute', top: 7, right: 7,
              width: 18, height: 18, borderRadius: '50%',
              background: '#824D5C', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, zIndex: 1,
            }}>
              ✓
            </Box>
          )}

          {/* Thumbnail */}
          <Box sx={{
            height: 72,
            background: thumbSrc ? 'none' : style.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {thumbSrc ? (
              <img src={thumbSrc} alt={style.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Typography sx={{ fontSize: 30 }}>{style.emoji}</Typography>
            )}
          </Box>

          <Typography sx={{
            p: '8px 10px 10px',
            fontSize: 11, fontWeight: 600,
            color: '#1c1118', textAlign: 'center',
          }}>
            {style.label}
          </Typography>
        </Box>
      );
    })}
  </Box>
</Box>
```

---

## 13. FOOTER (Back + Continue buttons)

Replace the existing navigation footer:

```tsx
<Box sx={{
  px: '44px', py: '20px',
  borderTop: '1px solid #f8f4ef',
  display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', gap: '14px',
}}>
  <Button
    onClick={handleBack}
    disabled={activeStep === 0}
    sx={{
      px: '22px', py: '11px',
      border: '1.5px solid #ddd4ca', borderRadius: '12px',
      fontSize: 13, fontWeight: 500, color: '#9a8a92',
      background: 'transparent',
      transition: 'all 0.25s',
      '&:hover': { borderColor: '#B07A8A', color: '#824D5C', background: 'transparent' },
      '&:disabled': { opacity: 0.25 },
      textTransform: 'none',
      // Flip arrow for RTL
      '& .arrow': { transform: isRTL ? 'rotate(180deg)' : 'none' },
    }}
  >
    <span className="arrow">←</span>&nbsp;{t('personalize.back')}
  </Button>

  <Button
    onClick={isLastStep ? handleSubmit : handleNext}
    disabled={!isStepValid(activeStep, personalization)}
    sx={{
      flex: 1, maxWidth: 240,
      px: '28px', py: '13px',
      background: isLastStep
        ? 'linear-gradient(110deg, #170d1e 0%, #824D5C 100%)'
        : 'linear-gradient(110deg, #824D5C 0%, #B07A8A 100%)',
      border: 'none', borderRadius: '12px',
      fontSize: 14, fontWeight: 600, color: '#fff',
      boxShadow: '0 4px 16px rgba(130,77,92,0.25)',
      transition: 'all 0.3s cubic-bezier(0.34,1.26,0.64,1)',
      textTransform: 'none',
      // Shine overlay
      position: 'relative', overflow: 'hidden',
      '&::before': {
        content: '""', position: 'absolute', inset: 0,
        background: 'linear-gradient(110deg, rgba(255,255,255,0.12), transparent)',
        pointerEvents: 'none',
      },
      '&:hover:not(:disabled)': {
        transform: 'translateY(-2px) scale(1.02)',
        boxShadow: '0 10px 30px rgba(130,77,92,0.4)',
      },
      '&:active:not(:disabled)': {
        transform: 'translateY(0) scale(0.99)',
      },
      '&:disabled': { opacity: 0.35, transform: 'none', boxShadow: 'none' },
    }}
  >
    {isLastStep ? `✨ ${t('personalize.createStory')}` : `${t('personalize.continue')} →`}
  </Button>
</Box>
```

---

## 14. CELEBRATION SCREEN

Replaces the old review/confirmation step. Render this when `activeStep === totalSteps` (after final submit):

```tsx
{showCelebration && (
  <Box sx={{
    textAlign: 'center', py: '24px',
    animation: 'celebIn 0.5s cubic-bezier(0.34,1.26,0.64,1) forwards',
  }}>
    <Typography sx={{
      fontSize: 72, display: 'block', mb: '18px',
      animation: 'checkPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
    }}>
      ✨
    </Typography>

    <Typography sx={{
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 34, fontWeight: 300, color: '#824D5C',
      mb: 1, fontStyle: 'italic',
    }}>
      {t('personalize.celebrateName', { name: personalization.childName })}
      {/* "[Name]'s story is ready." */}
    </Typography>

    <Typography sx={{ fontSize: 14, color: '#9a8a92', lineHeight: 1.7, maxWidth: 300, mx: 'auto', mb: 3 }}>
      {t('personalize.celebrateSub', { name: personalization.childName })}
      {/* "Every word, every illustration — made for [Name]. Get ready for something truly special." */}
    </Typography>

    <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
      {[
        personalization.childName,
        personalization.gender === 'female' ? '🌸 Girl' : '🌊 Boy',
        '📷 Photo ready',
        STYLE_DISPLAY.find(s => s.id === personalization.visualStyle)?.label ?? '',
      ].map((tag, i) => (
        <Box
          key={i}
          sx={{
            px: '16px', py: '8px',
            background: '#fdf0f3', borderRadius: '999px',
            fontSize: 12, fontWeight: 600, color: '#824D5C',
            border: '1px solid rgba(130,77,92,0.15)',
            animation: `tagIn 0.4s cubic-bezier(0.34,1.26,0.64,1) ${0.1 + i * 0.1}s both`,
          }}
        >
          {tag}
        </Box>
      ))}
    </Box>
  </Box>
)}
```

When celebration is shown, change footer to:
```tsx
// Hide Back button, change Continue to:
'📖  ' + t('personalize.openStory')  // "Open the Story"
// onClick stays as navigate to /read
```

---

## 15. i18n KEYS TO ADD

Add these to both `en.json` and `he.json` under `personalize.*`:

```json
{
  "personalize": {
    "step1Of4": "Step 1 of 4",
    "step2Of4": "Step 2 of 4",
    "step3Of4": "Step 3 of 4",
    "step4Of4": "Step 4 of 4",

    "nameHeadingLine1": "What's your",
    "nameHeadingLine2": "child's name?",
    "nameSub": "Their name will be woven through every line — making this story entirely, unmistakably theirs.",
    "namePlaceholder": "e.g. Layla…",
    "nameHint": "Hebrew, Arabic, or Latin · 2–30 characters",
    "previewSentenceSuffix": " looked up at the night sky — and for a moment, every star seemed to shine just for her.",
    "previewSentenceEmpty": "Once upon a time, there was a child who believed in the magic of stories…",

    "genderHeadingLine1": "Is your child",
    "genderHeadingLine2": "a girl or a boy?",
    "genderSub": "So every word feels natural — she, her, hers / he, him, his. No detail left generic.",

    "photoHeadingLine1": "A photo of",
    "photoHeadingFallback": "your child",
    "photoSub": "{{name}}'s face will appear in the first illustrated spreads — not a generic child, but them.",
    "photoSubFallback": "your child",
    "photoAdded": "Photo added ✓",
    "tapToReplace": "Tap to replace",
    "uploadPhoto": "Upload a photo",
    "uploadHint": "JPG or PNG · Max 5 MB\nUsed only to create illustrations",
    "replacePhoto": "Replace photo",
    "trust1": "Illustrations only",
    "trust2": "Never shared",
    "trust3": "Deleted after",

    "styleHeadingLine1": "Choose the",
    "styleHeadingLine2": "illustration style",
    "styleSub": "Every page will be rendered in this mood. Pick the world you want {{name}} to step into.",
    "styleSubFallback": "your child",

    "back": "Back",
    "continue": "Continue",
    "createStory": "Create the Story",
    "openStory": "Open the Story",

    "celebrateName": "{{name}}'s story is ready.",
    "celebrateSub": "Every word, every illustration — made for {{name}}. Get ready for something truly special."
  }
}
```

---

## 16. CHECKLIST FOR CURSOR

Work through these in order. Check each off before moving to the next.

- [ ] Fonts added to `index.html`
- [ ] `DESIGN_TOKENS` added to `theme.ts`
- [ ] Keyframe animations added to `GlobalStyles` in `App.tsx`
- [ ] Page background changed to parchment radial gradient + crosshatch overlay
- [ ] Shell changed to 2-column grid (`320px 1fr`)
- [ ] `LeftPanel` component built with starfield, aurora, 3D book, live child preview
- [ ] `ProgressBar` rebuilt as manual dots+lines (no MUI Stepper)
- [ ] `StepHeader` helper component created
- [ ] Step 1 (Name): Cormorant input + live preview sentence + underline highlight
- [ ] Step 2 (Gender): Spring-physics cards, gradient backgrounds, check badge animation
- [ ] Step 3 (Photo): Drop zone with overlay, avatar ring scale, trust strip
- [ ] Step 4 (Style): Image thumbnails, spring hover, check badge, no scrollable grid
- [ ] Footer: New Back + Continue buttons with exact `sx` props above
- [ ] Celebration screen replacing review step
- [ ] All i18n keys added to `en.json` and `he.json`
- [ ] RTL tested: `isRTL` flips arrow in Back button, `dir` on name input, step animations still left→right
- [ ] Starfield generated via `useEffect` on mount (not on re-render)
- [ ] `animation: stepEnter` applied to step wrapper `Box` — re-triggers on `activeStep` change by using `key={activeStep}` on the wrapper

**Final note on `key={activeStep}`:** Wrap each step's outermost `Box` like this so the enter animation re-triggers on every step change:
```tsx
<Box key={activeStep} sx={{ animation: 'stepEnter 0.38s cubic-bezier(0.4,0,0.2,1) forwards' }}>
```
