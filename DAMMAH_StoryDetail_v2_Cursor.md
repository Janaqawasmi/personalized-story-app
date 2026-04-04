# DAMMAH — Story Detail Page v2
## Complete Implementation Document for Cursor

> **Route:** `/stories/:storyId`
> **Stack:** React + TypeScript + MUI + Framer Motion + Firebase/Firestore + i18next
> **Reference:** Interactive prototype (story_detail_v2 widget)
> **Status:** Ready to implement — follow sections in order

---

## 0. Rules Before You Start

- Edit only: `src/pages/StoryDetail/` and its sub-files
- Do NOT touch: routing, auth, `useFavorite`, `StoryGridCard`, `theme.ts` COLORS
- All spacing via MUI `sx` `gap`, `gridTemplateColumns` — never `marginLeft` / `marginRight`
- RTL via `dir` on the page root container — all children inherit
- Fonts loaded in `public/index.html` — see Section 1
- All animations added **last** (Section 9) — page must work perfectly without them

---

## 1. Google Fonts — `public/index.html`

Add inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Nunito:wght@400;600;700;800&display=swap"
  rel="stylesheet"
/>
```

---

## 2. Typography — `client/src/theme.ts`

Add inside `createAppTheme` typography block only. Do not change COLORS.

```ts
typography: {
  fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  h1: { fontFamily: "'Playfair Display', Georgia, serif" },
  h2: { fontFamily: "'Playfair Display', Georgia, serif" },
  h3: { fontFamily: "'Playfair Display', Georgia, serif" },
},
```

For RTL/Hebrew: when `language === 'he'`, override `fontFamily` to `"'Assistant', 'Nunito', sans-serif"` via the page-level `dir` container — see Section 11.

---

## 3. File Structure

Create this folder structure. Build each file in the order listed.

```
src/pages/StoryDetail/
├── StoryDetailPage.tsx          ← orchestrator, data, layout
├── components/
│   ├── HeroCover.tsx            ← cover image + trust badge
│   ├── HeroInfo.tsx             ← breadcrumb → CTA row
│   ├── ChipsRow.tsx             ← 4 colored semantic chips
│   ├── FeaturesGrid.tsx         ← 2×2 feature grid
│   ├── PricingCard.tsx          ← toggle + price + trust line
│   ├── CtaRow.tsx               ← personalize button + fav icon
│   ├── PreviewGallery.tsx       ← full preview section
│   ├── FaqSection.tsx           ← accordion list
│   ├── RelatedStories.tsx       ← 3-col catalog card grid
│   └── StickyMobileCta.tsx      ← fixed bottom bar (mobile only)
├── hooks/
│   ├── useStoryDetail.ts        ← Firestore fetch + states
│   └── useRelatedStories.ts     ← related query
├── animations/
│   └── variants.ts              ← Framer Motion presets
└── StoryDetail.styles.ts        ← shared sx objects
```

---

## 4. Design Tokens

Use these exact values everywhere. Do not invent new hex codes.

```ts
// StoryDetail.styles.ts
export const SDColors = {
  // Primary purple — CTA, AI chip, active states
  purple: {
    light: '#EEEDFE',
    main:  '#7F77DD',
    dark:  '#534AB7',
    text:  '#3C3489',
  },
  // Therapeutic green — trust, shield, approval
  green: {
    light: '#E1F5EE',
    main:  '#1D9E75',
    dark:  '#085041',
  },
  // Warm amber — age range
  amber: {
    light: '#FAEEDA',
    main:  '#BA7517',
    dark:  '#633806',
  },
  // Topic pink — story topic, favorites
  pink: {
    light: '#FBEAF0',
    main:  '#D4537E',
    dark:  '#72243E',
  },
  // Bilingual coral — language feature
  coral: {
    light: '#FAECE7',
    main:  '#D85A30',
    dark:  '#712B13',
  },
  // Favorite
  favActive: 'rgba(212,83,126,0.1)',
};

export const SDGradients = {
  cta:          'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
  coverBg:      'linear-gradient(135deg, #1a1040 0%, #2d1b69 30%, #0f2847 70%, #0a1628 100%)',
  relatedGreen: 'linear-gradient(135deg, #0f4028 0%, #1D9E75 100%)',
  relatedCoral: 'linear-gradient(135deg, #4a1b0c 0%, #D85A30 100%)',
  relatedBlue:  'linear-gradient(135deg, #042C53 0%, #378ADD 100%)',
};

export const SDRadii = {
  chip:       '20px',
  card:       '16px',
  cover:      '20px',
  cta:        '14px',
  trustBadge: '12px',
  faqItem:    '14px',
  featIcon:   '8px',
  spreadCard: '20px',
  previewBanner: '20px',
  bridgeCta:  '16px',
  spreadNav:  '10px',
  viewBtn:    '10px',
};

export const SDShadows = {
  cover:       '0 20px 60px rgba(26,16,64,0.25)',
  trustBadge:  '0 4px 16px rgba(0,0,0,0.08)',
  ctaHover:    '0 8px 32px rgba(125,119,221,0.35)',
  spreadHover: '0 12px 40px rgba(0,0,0,0.08)',
  catalogCard: '0 16px 40px rgba(26,16,64,0.12)',
};
```

---

## 5. Data Hooks

### `hooks/useStoryDetail.ts`

```ts
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useParams } from 'react-router-dom';

export function useStoryDetail() {
  const { storyId } = useParams<{ storyId: string }>();
  const [story, setStory] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!storyId) return;
    setLoading(true);
    getDoc(doc(db, 'story_templates', storyId))
      .then(snap => {
        if (!snap.exists()) { setError(true); return; }
        setStory({ id: snap.id, ...snap.data() } as StoryTemplate);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [storyId]);

  return { story, loading, error, storyId: storyId! };
}
```

### `hooks/useRelatedStories.ts`

```ts
import { useState, useEffect } from 'react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

export function useRelatedStories(primaryTopic: string, currentId: string) {
  const [related, setRelated] = useState<StoryTemplate[]>([]);

  useEffect(() => {
    if (!primaryTopic) return;
    getDocs(query(
      collection(db, 'story_templates'),
      where('primaryTopic', '==', primaryTopic),
      where('status', '==', 'published'),
      limit(4)  // fetch 4, filter out current in client
    )).then(snap => {
      setRelated(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as StoryTemplate))
          .filter(s => s.id !== currentId)
          .slice(0, 3)
      );
    });
  }, [primaryTopic, currentId]);

  return related;
}
```

### Firestore `StoryTemplate` interface

```ts
// types/story.ts
export interface PreviewSpread {
  imageUrl?: string;
  text: Record<string, string>; // { en: '...', he: '...' }
}

export interface FaqItem {
  question: Record<string, string>;
  answer: Record<string, string>;
}

export interface StoryTemplate {
  id: string;
  title: Record<string, string>;
  subtitle: Record<string, string>;
  description: Record<string, string>;
  coverUrl: string;
  ageRange: string;
  primaryTopic: string;
  topicLabel: Record<string, string>;
  priceDigital?: number;
  pricePrint?: number;
  currency: string;
  printAvailable: boolean;
  previewSpreads: PreviewSpread[];
  faq: FaqItem[];
  status: 'published' | 'draft' | 'coming_soon';
}
```

---

## 6. Page Skeleton — `StoryDetailPage.tsx`

```tsx
import React, { useRef, useState, useEffect } from 'react';
import { Container, Box, CircularProgress, Typography, Button } from '@mui/material';
import { useLangNavigate } from '@/hooks/useLangNavigate';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useFavorite } from '@/hooks/useFavorite';
import { useStoryDetail } from './hooks/useStoryDetail';
import { useRelatedStories } from './hooks/useRelatedStories';
import HeroCover from './components/HeroCover';
import HeroInfo from './components/HeroInfo';
import PreviewGallery from './components/PreviewGallery';
import FaqSection from './components/FaqSection';
import RelatedStories from './components/RelatedStories';
import StickyMobileCta from './components/StickyMobileCta';

export default function StoryDetailPage() {
  const { t } = useTranslation();
  const { direction, isRTL, language } = useLanguage();
  const navigate = useLangNavigate();
  const { story, loading, error, storyId } = useStoryDetail();
  const related = useRelatedStories(story?.primaryTopic ?? '', storyId);
  const { isFavorite, toggleFavorite } = useFavorite(storyId);
  const { user } = useAuth();

  const heroRef = useRef<HTMLDivElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  // Sticky CTA: show after hero scrolls out of view
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const handlePersonalize = () => {
    navigate(`/stories/${storyId}/personalize`);
  };

  // ── Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress sx={{ color: '#7F77DD' }} />
        <Typography sx={{ fontSize: '14px', color: '#888' }}>{t('states.loading')}</Typography>
      </Box>
    );
  }

  // ── Error / not found state
  if (error || !story) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <Typography sx={{ fontSize: '18px', fontWeight: 600 }}>{t('states.notFound')}</Typography>
        <Button onClick={() => navigate('/books')} sx={{ color: '#534AB7' }}>
          {t('storyDetail.backToCatalog')}
        </Button>
      </Box>
    );
  }

  const lang = language as string;
  const localTitle       = story.title[lang]       ?? story.title['en'];
  const localSubtitle    = story.subtitle[lang]     ?? story.subtitle['en'];
  const localDescription = story.description[lang]  ?? story.description['en'];
  const localTopicLabel  = story.topicLabel[lang]   ?? story.topicLabel['en'];

  return (
    // dir on root — RTL inherits through all children
    <Box
      dir={direction}
      lang={language}
      sx={{
        bgcolor: '#f4f2ef',
        minHeight: '100vh',
        fontFamily: language === 'he'
          ? "'Assistant', 'Nunito', sans-serif"
          : "'Nunito', 'Segoe UI', sans-serif",
      }}
    >
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, pb: { xs: 12, md: 10 } }}>

        {/* BACK NAV */}
        <BackNav onBack={() => navigate('/books')} isRTL={isRTL} label={t('storyDetail.backToCatalog')} />

        {/* HERO — ref for sticky trigger */}
        <Box ref={heroRef}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr' },
            gap: { xs: 3, md: '40px' },
            alignItems: 'start',
            mb: 5,
          }}>
            <HeroCover
              coverUrl={story.coverUrl}
              title={localTitle}
            />
            <HeroInfo
              story={story}
              title={localTitle}
              subtitle={localSubtitle}
              description={localDescription}
              topicLabel={localTopicLabel}
              isFavorite={isFavorite}
              onFavoriteToggle={toggleFavorite}
              onPersonalize={handlePersonalize}
              language={language}
            />
          </Box>
        </Box>

        {/* PREVIEW — immediately after hero */}
        <PreviewGallery
          spreads={story.previewSpreads}
          language={language}
          onPersonalize={handlePersonalize}
        />

        {/* FAQ */}
        <FaqSection
          items={story.faq}
          language={language}
        />

        {/* RELATED */}
        {related.length > 0 && (
          <RelatedStories stories={related} language={language} />
        )}

      </Container>

      {/* STICKY MOBILE CTA */}
      <StickyMobileCta
        visible={stickyVisible}
        title={localTitle}
        price={story.currency + (story.priceDigital ?? '')}
        onPersonalize={handlePersonalize}
      />
    </Box>
  );
}

// ── Inline BackNav — too small for its own file
function BackNav({ onBack, isRTL, label }: { onBack: () => void; isRTL: boolean; label: string }) {
  return (
    <Box
      component="button"
      onClick={onBack}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        pb: 3, pt: 1,
        fontSize: '14px', fontWeight: 600, color: '#534AB7',
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {/* Arrow flips in RTL */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}>
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      {label}
    </Box>
  );
}
```

---

## 7. Components — Exact Specs

### 7.1 `HeroCover.tsx`

**Purpose:** Cover image with floating trust badge. No interaction logic here.

```tsx
// Layout:
// - Outer Box: position relative
// - Cover area: aspect-ratio 3/4, borderRadius '20px', overflow hidden
//   - If coverUrl: <img> with objectFit cover, width 100%, height 100%, alt={title}
//   - If no coverUrl or img error: night-sky placeholder (see below)
// - Trust badge: position absolute, bottom -12px, insetInlineEnd 16px
//   (insetInlineEnd auto-flips in RTL — do NOT use 'right')

// Cover placeholder when no image:
// background: SDGradients.coverBg
// Display centered emoji or "🦁" placeholder
// Optional: twinkling star dots (see Section 9.6)

// Trust badge markup:
// background white, border 1px solid #e0e0e0, borderRadius SDRadii.trustBadge
// padding 8px 14px, display flex, gap 6px
// boxShadow SDShadows.trustBadge
// ShieldIcon (MUI) sx={{ fontSize: 14, color: SDColors.green.dark }}
// Typography: fontSize 12px, fontWeight 700, color SDColors.green.dark
// Text: t('storyDetail.therapistApproved')

// Cover image shadow:
// boxShadow: SDShadows.cover
```

**Props:**
```ts
interface HeroCoverProps {
  coverUrl: string;
  title: string;
}
```

---

### 7.2 `HeroInfo.tsx`

**Purpose:** Full info column from breadcrumb to CTA row.

**Order of children — strict top to bottom:**

1. `<ChipsRow />` — category chips
2. Title — `Typography` variant `h1`, Playfair Display 32px weight 700, lineHeight 1.2
3. Subtitle — 16px weight 400 lineHeight 1.5, color `#555`
4. Description — 15px weight 400 lineHeight 1.7, color `#444`, mb 2.5
5. `<FeaturesGrid />` — 2×2 grid
6. `<PricingCard />` — toggle + price
7. `<CtaRow />` — personalize + favorite

Add breadcrumb label ABOVE the title:
```tsx
<Typography sx={{
  fontSize: '13px', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '1.2px',
  color: '#888', mb: 1.25,
}}>
  {t('storyDetail.breadcrumb')}
</Typography>
```

**Props:**
```ts
interface HeroInfoProps {
  story: StoryTemplate;
  title: string;
  subtitle: string;
  description: string;
  topicLabel: string;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onPersonalize: () => void;
  language: string;
}
```

---

### 7.3 `ChipsRow.tsx`

Four chips in a `flexWrap` row with `gap: '8px'`.

Each chip: `display inline-flex`, `alignItems center`, `gap 5px`, `padding '5px 12px'`, `borderRadius SDRadii.chip`, `fontSize 13px`, `fontWeight 600`.

| Chip | Background | Text color | Icon |
|------|-----------|------------|------|
| AI personalized | `#EEEDFE` | `#3C3489` | AutoAwesome (MUI) or sparkle SVG |
| Therapeutic | `#E1F5EE` | `#085041` | Shield (MUI) |
| Ages `{story.ageRange}` | `#FAEEDA` | `#633806` | none |
| `{topicLabel}` | `#FBEAF0` | `#72243E` | none |

Chip hover: `translateY(-1px)` over 200ms, CSS only, no JS.

```tsx
// Chip hover via sx:
sx={{ '&:hover': { transform: 'translateY(-1px)' }, transition: 'transform 0.2s' }}
```

**Props:**
```ts
interface ChipsRowProps {
  ageRange: string;
  topicLabel: string;
}
```

---

### 7.4 `FeaturesGrid.tsx`

2×2 CSS grid. `gridTemplateColumns: '1fr 1fr'`, `gap: '6px 16px'`.

Four items — each: `display flex`, `alignItems flex-start`, `gap 10px`.

Icon box: `width 32px`, `height 32px`, `borderRadius SDRadii.featIcon`, centered flex. Icon size 16px.

Label: `fontSize 13px`, `fontWeight 600`, `color '#555'`, `lineHeight 1.4`, `paddingTop '6px'`.

| Feature | Icon color bg | Icon |
|---------|-------------|------|
| AI-personalized name & photo | `#EEEDFE` / `#534AB7` | PlayArrow or sparkle |
| Psychologist-designed protocol | `#E1F5EE` / `#1D9E75` | Shield |
| Preview before you buy | `#E6F1FB` / `#378ADD` | Visibility |
| Available in Hebrew & English | `#FAECE7` / `#D85A30` | Language |

Use MUI icon components. All text via i18n keys (`features.*`).

No props needed — static content driven by i18n.

---

### 7.5 `PricingCard.tsx`

```tsx
// Outer card:
// background '#f9f8fc', border '1px solid #e8e4f8'
// borderRadius SDRadii.card, padding '20px', mb 2.25

// 1. Price toggle (ToggleButtonGroup or custom):
//    Two options: "Digital" and "Print"
//    Active: background '#1a1a2e', color white
//    Inactive: background transparent, color '#666'
//    borderRadius '20px', padding '3px', background '#eee'
//    If story.printAvailable === false: hide Print tab entirely

// 2. Price display row:
//    Price: fontSize 36px, fontWeight 800, color '#1a1a2e'
//    Qualifier: fontSize 13px, color '#888'
//    Digital qualifier: t('pricing.oneTime')
//    Print qualifier: t('pricing.shipped')
//    If status === 'coming_soon': show t('pricing.comingSoon') badge instead

// 3. Trust line:
//    CheckCircleOutline icon (MUI), fontSize 14px, color '#1D9E75'
//    Text: t('pricing.previewBeforePaying'), fontSize 13px, fontWeight 600, color '#085041'
//    display flex, gap 6px, alignItems center

// Pricing logic:
// priceDigital / pricePrint from story, with story.currency prefix
// If neither price exists: show coming_soon state
```

**Props:**
```ts
interface PricingCardProps {
  priceDigital?: number;
  pricePrint?: number;
  currency: string;
  printAvailable: boolean;
  status: string;
}
```

---

### 7.6 `CtaRow.tsx`

```tsx
// Container: display flex, gap 10px, alignItems stretch

// 1. Personalize button (flex: 1):
//    background: SDGradients.cta
//    color white, fontSize 17px, fontWeight 700
//    borderRadius SDRadii.cta, padding '16px 20px'
//    display flex, alignItems center, justifyContent center, gap 8px
//    AutoAwesome icon (18px) before label
//    onClick: props.onPersonalize
//    Hover: transform translateY(-2px), boxShadow SDShadows.ctaHover
//    Animation: pulse glow (added in Section 9.3 — add keyframes via GlobalStyles)
//    If status === 'coming_soon': label = t('pricing.notifyMe'), icon = NotificationsNone

// 2. Favorite button (width 52px, square):
//    borderRadius SDRadii.cta (14px)
//    border '1px solid #ddd', background white
//    Inactive icon: FavoriteBorder, stroke '#999'
//    Active icon: Favorite, color SDColors.pink.main (#D4537E)
//    Active background: SDColors.favActive
//    Active border: SDColors.pink.main
//    onClick: props.onFavoriteToggle
//    aria-label dynamic: "Add to favorites" / "Remove from favorites"
```

**Props:**
```ts
interface CtaRowProps {
  onPersonalize: () => void;
  onFavoriteToggle: () => void;
  isFavorite: boolean;
  status: string;
}
```

---

### 7.7 `PreviewGallery.tsx` ← Most Important Section

**This section renders immediately after the hero.** It has three parts: banner, spread card, bridge CTA.

#### Part A — Preview Banner

```tsx
// Outer box:
// background 'linear-gradient(135deg, #EEEDFE 0%, #f5f3ff 100%)'
// border '1.5px solid #c8c3f5', borderRadius SDRadii.previewBanner
// padding '24px 28px', mb 2.5
// display flex, alignItems center, justifyContent space-between, gap 2

// Left side:
//   Eyebrow: "Step 1 — Try it first" — 11px, weight 700, uppercase, letterSpacing 1.5px, color '#7F77DD'
//   Title: t('preview.seeInside') — 20px, weight 700, color '#1a1a2e'
//   Subtitle: t('preview.genericVersionNote') — 14px, color '#666'

// Right side (flexShrink 0):
//   "Free preview" badge: background '#534AB7', color white, 12px bold, padding '5px 14px', borderRadius '20px'
//   Spread navigation buttons (1, 2) — see below
```

#### Spread Navigation Buttons

```tsx
// display flex, gap 8px
// Each button: width 36px, height 36px, borderRadius SDRadii.spreadNav
// border '1.5px solid #ddd', background white, fontSize 13px, fontWeight 700
// Active: border '#7F77DD', background '#EEEDFE', color '#534AB7'
// onClick: setActiveSpread(n)
// Render one button per spread (up to 2 from story.previewSpreads)
```

#### Part B — Spread Card

```tsx
// State:
const [activeSpread, setActiveSpread] = useState(0);

// Outer card:
// borderRadius SDRadii.spreadCard, border '1px solid #e5e0f8'
// background white, overflow hidden
// Hover: boxShadow SDShadows.spreadHover

// Inner grid: gridTemplateColumns '1fr 1fr', minHeight 280px

// LEFT COLUMN — illustration:
//   If spread.imageUrl: <img> objectFit cover, width 100%, height 100%, alt={t('preview.illustrationPreview')}
//   If no imageUrl: placeholder — background SDGradients.coverBg, centered content
//     Show large emoji (from story cover or generic book emoji)
//     Text label: t('preview.illustrationPreview') — 11px uppercase, rgba(255,255,255,0.4)
//   borderInlineEnd '1px solid #f0eeff'

// RIGHT COLUMN — text area:
//   padding '28px 28px 24px'
//   display flex, flexDirection column, justifyContent space-between

//   Page label: t('preview.pageRange', { start: n*2-1, end: n*2 })
//   11px uppercase letterSpacing 1.5px, color '#aaa', mb 1.75

//   Story text:
//   fontFamily Playfair Display, fontSize 18px, fontStyle italic, lineHeight 1.7
//   color '#2a2050', flex 1
//   Render spread.text[language] ?? spread.text['en']
//   Replace [Child's name] token with styled span:
//     color '#534AB7', fontWeight 700, fontStyle normal, fontFamily Nunito
//     background '#EEEDFE', padding '1px 6px', borderRadius '4px'

//   AI hint (below text):
//   paddingTop 2, borderTop '1px solid #f0eeff', marginTop 2
//   display flex, gap 1, alignItems center
//   AutoAwesome icon: 14px, color '#7F77DD'
//   Text: t('preview.childNameHint') — 12px, fontWeight 600, color '#534AB7'
```

**Replacing `[Child's name]` token:**

```tsx
function renderSpreadText(text: string): React.ReactNode {
  const parts = text.split('[Child\'s name]');
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <Box
          component="span"
          sx={{
            color: '#534AB7',
            fontWeight: 700,
            fontStyle: 'normal',
            fontFamily: "'Nunito', sans-serif",
            fontSize: '15px',
            background: '#EEEDFE',
            px: '6px',
            py: '1px',
            borderRadius: '4px',
          }}
        >
          [Child&apos;s name]
        </Box>
      )}
    </React.Fragment>
  ));
}
```

#### Part C — Bridge CTA (below spread card)

```tsx
// Outer box:
// mt 2, background white, border '1.5px solid #c8c3f5'
// borderRadius SDRadii.bridgeCta, padding '18px 22px'
// display flex, alignItems center, justifyContent space-between, gap 2

// Left text:
//   Title: "Ready to make it about your child?" — 14px, fontWeight 700, color '#1a1a2e', mb 0.4
//   Sub: "Step 2 — Add their name, gender, and photo" — 13px, color '#888'

// Right button:
//   background SDGradients.cta, color white
//   fontSize 14px, fontWeight 700, borderRadius '12px'
//   padding '11px 22px'
//   AutoAwesome icon 14px before label
//   label: t('storyDetail.personalize')
//   onClick: props.onPersonalize
//   Hover: translateY(-1px), boxShadow SDShadows.ctaHover

// Empty state:
// If story.previewSpreads.length < 2: show "coming soon" card with ComingSoonIcon
// Use existing empty state component or simple centered text
```

**Props:**
```ts
interface PreviewGalleryProps {
  spreads: PreviewSpread[];
  language: string;
  onPersonalize: () => void;
}
```

---

### 7.8 `FaqSection.tsx`

```tsx
// Section title: t('faq.title') — 22px, fontWeight 700, mb 2.5

// Use MUI Accordion, AccordionSummary, AccordionDetails
// Stack of items with gap 8px (use flexDirection column + gap in Box wrapper)

// Per accordion:
// borderRadius: SDRadii.faqItem + ' !important'
// border '1px solid #e8e4f0', boxShadow none, mb 0
// '&:before': { display: 'none' }  ← removes MUI default divider

// AccordionSummary:
// px 2.5
// Summary text: 15px, fontWeight 600, color '#1a1a2e'
// ExpandMoreIcon sx:
//   transition 'transform 0.3s ease'
//   '.Mui-expanded &': { transform: 'rotate(180deg)' }

// When expanded: light background on summary:
// '&.Mui-expanded': { bgcolor: '#faf9ff' }

// AccordionDetails:
// px 2.5, pb 2.25
// fontSize 14px, lineHeight 1.7, color '#555'
// borderTop '1px solid #f0eeff'

// First item: defaultExpanded={true}

// Data: map over story.faq array
// question: item.question[language] ?? item.question['en']
// answer:   item.answer[language]   ?? item.answer['en']
```

**Props:**
```ts
interface FaqSectionProps {
  items: FaqItem[];
  language: string;
}
```

---

### 7.9 `RelatedStories.tsx` ← Catalog Card Style

> **Critical:** These cards must look identical to the catalog/library story cards.
> Do NOT create a new design. Use `StoryGridCard` if it already exists.

**If `StoryGridCard` component already exists in the codebase:**

```tsx
import StoryGridCard from '@/components/StoryGridCard';

export default function RelatedStories({ stories, language }: RelatedStoriesProps) {
  const navigate = useLangNavigate();
  const { t } = useTranslation();

  return (
    <Box sx={{ mb: 6 }}>
      <Typography sx={{ fontSize: '22px', fontWeight: 700, mb: 2.5 }}>
        {t('related.title')}
      </Typography>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
        gap: '20px',
      }}>
        {stories.map(story => (
          <StoryGridCard
            key={story.id}
            story={story}
            language={language}
            onClick={() => {
              navigate(`/stories/${story.id}`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
```

**If `StoryGridCard` does NOT exist yet, build it to match the catalog exactly:**

```tsx
// Card structure (match catalog exactly):
// Outer: Paper or Box — borderRadius 16px, border '1px solid #e8e4f0', overflow hidden
// Cursor pointer
// Hover: translateY(-4px), boxShadow SDShadows.catalogCard — transition 0.22s

// 1. Cover area: aspect-ratio 4/3
//    If story.coverUrl: <img> objectFit cover, width/height 100%
//    If no image: gradient placeholder (use SDGradients.coverBg or topic-based gradient)

// 2. Card body: padding '14px 16px', display flex, flexDirection column, gap '6px'
//    Topic label: 11px, fontWeight 700, uppercase, letterSpacing 1px, color '#888'
//    Title: Playfair Display, 16px, fontWeight 700, lineHeight 1.3, color '#1a1a2e'
//    Age range: 12px, color '#aaa'

// 3. Card footer: padding '0 16px 16px'
//    "View Story" button:
//      width 100%, padding 10px
//      borderRadius SDRadii.viewBtn (10px)
//      border '1.5px solid #7F77DD', background transparent
//      color '#534AB7', fontSize 13px, fontWeight 700
//      Hover: background '#EEEDFE', borderColor '#534AB7'
//      label: t('storyCard.viewStory') or equivalent existing key
//      onClick: navigates to /stories/:id, scrolls to top
```

**Props:**
```ts
interface RelatedStoriesProps {
  stories: StoryTemplate[];
  language: string;
}
```

---

### 7.10 `StickyMobileCta.tsx`

```tsx
// Position: fixed, bottom 0, left 0, right 0
// Only visible on mobile: display { xs: 'flex', md: 'none' }
// Slide in/out: transform stickyVisible ? 'translateY(0)' : 'translateY(100%)'
// transition 'transform 0.3s ease'
// zIndex 90
// background white, borderTop '1px solid #ede9f8'
// padding '12px 20px'
// display flex, alignItems center, justifyContent space-between, gap 2

// Left:
//   Story title: 14px, fontWeight 700, color '#1a1a2e'
//   Price + format: 12px, color '#888'

// Right (flex, gap 8px):
//   "Preview" outline button: border '#7F77DD', color '#534AB7', 13px bold, borderRadius 10px
//   "Personalize" fill button: background SDGradients.cta, color white, 13px bold, borderRadius 10px
//   Both onClick: props.onPersonalize
```

**Props:**
```ts
interface StickyMobileCtaProps {
  visible: boolean;
  title: string;
  price: string;
  onPersonalize: () => void;
}
```

---

## 8. Page Section Order — Final

This is the exact render order in `StoryDetailPage.tsx`. Do not change it.

```
1. BackNav
2. Hero (two-column grid)
   ├── HeroCover (left)
   └── HeroInfo (right)
        ├── Breadcrumb
        ├── Title (h1)
        ├── Subtitle
        ├── ChipsRow
        ├── Description
        ├── FeaturesGrid
        ├── PricingCard
        └── CtaRow
3. PreviewGallery          ← RIGHT AFTER HERO
   ├── Preview Banner (Step 1 — Try it first)
   ├── Spread Card (split: illustration | text + AI hint)
   └── Bridge CTA (Step 2 — Personalize this story)
4. FaqSection
5. RelatedStories          ← catalog card style
6. StickyMobileCta         ← fixed, mobile only
```

**Why this order:**
- Preview directly follows hero — zero scrolling required to see it
- Preview → Bridge CTA creates a "try first, then commit" flow
- FAQ answers hesitation after the preview builds desire
- Related stories keep users in the funnel if this story isn't right

---

## 9. Animations — Add Last

> Only add these after the page works perfectly without them.
> All must respect `prefers-reduced-motion`.

### Setup

```tsx
// animations/variants.ts
import { Variants } from 'framer-motion';

export const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

export const heroVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] } },
};

export const featureStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export const featureItem: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
// In RTL: flip x direction — pass as prop to the variant or use CSS
```

### 9.1 Hero entrance

Wrap the hero `Box` in `motion.div`:
```tsx
<motion.div variants={heroVariant} initial="hidden" animate="visible">
  {/* hero grid */}
</motion.div>
```

### 9.2 Scroll reveals

Wrap `PreviewGallery`, `FaqSection`, `RelatedStories` in `motion.div`:
```tsx
<motion.div variants={fadeUpVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
```

### 9.3 CTA pulse glow

In `CtaRow.tsx`, add `GlobalStyles` for the keyframe, apply animation to the button:

```tsx
import { GlobalStyles } from '@mui/material';

// In component:
<GlobalStyles styles={{
  '@keyframes ctaPulse': {
    '0%, 100%': { boxShadow: '0 0 0 0 rgba(125,119,221,0)' },
    '50%': { boxShadow: '0 0 0 10px rgba(125,119,221,0.3)' },
  },
}} />

// On button sx:
sx={{
  animation: 'ctaPulse 2.5s ease-in-out infinite',
  '&:hover': {
    animation: 'none',
    transform: 'translateY(-2px)',
    boxShadow: SDShadows.ctaHover,
  },
}}
```

### 9.4 Favorite toggle spring

In `CtaRow.tsx`, wrap fav icon in `motion.div`:
```tsx
<motion.div
  animate={isFavorite ? { scale: [1, 1.2, 1] } : { scale: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
>
  <FavoriteIcon />
</motion.div>
```

### 9.5 Spread crossfade

In `PreviewGallery.tsx`, wrap spread content in `AnimatePresence` + `motion.div`:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeSpread}
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.97 }}
    transition={{ duration: 0.35 }}
  >
    {/* spread inner content */}
  </motion.div>
</AnimatePresence>
```

### 9.6 Cover stars (nice-to-have)

In `HeroCover.tsx`, when no `coverUrl` is provided, render twinkling dots:

```tsx
// Generate 12 random dots in useEffect, positioned absolutely on the cover
// Each: 2–4px white circle, opacity 0.3–1.0, CSS animation 'starTwinkle' 2–4s infinite alternate
// @keyframes starTwinkle { 0% { opacity: 0.2 } 100% { opacity: 1.0 } }
// Different animationDelay per dot (0–2s)
// Pure decoration — zero interaction, zero accessibility requirements
```

### 9.7 Features stagger (RTL-aware)

Wrap `FeaturesGrid` grid in `motion.div variants={featureStagger}`.
Each item in `motion.div variants={featureItem}`.

In RTL: flip the x offset:
```tsx
const featureItemRTL: Variants = {
  hidden: { opacity: 0, x: 16 },   // comes from the right in RTL
  visible: { opacity: 1, x: 0 },
};
// Choose variant based on isRTL prop
```

### 9.8 Reduced motion — mandatory

```tsx
// In StoryDetailPage.tsx or a shared hook:
import { useReducedMotion } from 'framer-motion';

const prefersReduced = useReducedMotion();

// Pass as prop to animated components OR:
// Override all durations to 0 when true:
const duration = prefersReduced ? 0 : undefined; // Framer uses default when undefined

// For CTA pulse: conditionally apply animation name:
sx={{ animation: prefersReduced ? 'none' : 'ctaPulse 2.5s ease-in-out infinite' }}
```

---

## 10. Page States

### Loading
```tsx
// Centered CircularProgress + label
// sx color '#7F77DD'
// No skeleton screens needed
```

### Error / Not Found
```tsx
// Centered Typography "Story not found"
// Button "Back to catalog" → /books
// No other content
```

### Coming Soon (`story.status === 'coming_soon'`)
```tsx
// PricingCard: show t('pricing.comingSoon') instead of price
// CtaRow: change label to t('pricing.notifyMe'), icon NotificationsNone instead of AutoAwesome
// CtaRow onClick: open email capture flow instead of navigating to /personalize
// Everything else on page remains identical
```

### Print Not Available (`story.printAvailable === false`)
```tsx
// Hide Print tab from PricingCard toggle entirely
// Default to Digital tab
```

---

## 11. RTL Implementation

Set `dir` on the **page root only**. Never set on individual elements.

```tsx
<Box dir={direction}> {/* 'ltr' or 'rtl' from useLanguage() */}
```

**Icon flipping rules:**

| Icon | Flip in RTL? |
|------|-------------|
| Back arrow (← / →) | YES — `style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}` |
| Forward/next arrows | YES |
| Heart (favorite) | NO |
| Shield (trust) | NO |
| Sparkle / AutoAwesome | NO |
| ExpandMore chevron | NO |
| CheckCircle | NO |
| Language globe | NO |

**Trust badge position:**
```tsx
// Use insetInlineEnd instead of right:
sx={{ position: 'absolute', bottom: '-12px', insetInlineEnd: '16px' }}
// Automatically places bottom-right in LTR, bottom-left in RTL
```

**Spacing rule — never use these:**
- `marginLeft`, `marginRight`
- `paddingLeft`, `paddingRight`
- `left`, `right` in `position: absolute`

**Use these instead:**
- `gap` in flex/grid
- `marginInlineStart`, `marginInlineEnd`
- `paddingInlineStart`, `paddingInlineEnd`
- `insetInlineStart`, `insetInlineEnd`

**Font switching:**
```tsx
// Page root sx:
fontFamily: language === 'he'
  ? "'Assistant', 'Nunito', sans-serif"
  : "'Nunito', 'Segoe UI', sans-serif"

// Playfair Display only for English titles and story preview text
// For Hebrew: use Assistant at same sizes, same weights — Playfair does not support Hebrew
```

---

## 12. Responsive Behavior

### Desktop (≥ 900px)
- Hero: two-column grid `1fr 1.1fr`, gap 40px
- Preview spread: two-column split `1fr 1fr`
- Related: three-column grid
- All within 900px max-width Container

### Tablet (600px–899px)
- Hero: two-column grid, gap reduced to 24px
- Preview spread: two-column split, reduced padding
- Related: two-column grid

### Mobile (< 600px)
- Hero: single column, stacked — cover on top, info below
- Preview spread: single column — illustration top, text below
- Related: single column or two-column
- StickyMobileCta: visible (display flex), fixed at bottom
- On desktop StickyMobileCta: display none

### Mobile CTA priority — choose one of:

**Option A (Recommended):** Reorder info column on mobile — show Title → Chips → PricingCard → CtaRow → then Description → Features below.
```tsx
// Use CSS order property on mobile:
sx={{ order: { xs: -1, md: 0 } }} // on PricingCard + CtaRow wrappers
```

**Option B (Simpler):** Keep info column order unchanged and rely on `StickyMobileCta` to catch mobile users.

---

## 13. i18n Keys

Add to `en.json` and `he.json`:

```json
{
  "storyDetail": {
    "backToCatalog": "Back to catalog",
    "breadcrumb": "Personalized story",
    "personalize": "Personalize this story",
    "therapistApproved": "Therapist approved"
  },
  "chips": {
    "aiPersonalized": "AI personalized",
    "therapeutic": "Therapeutic",
    "age": "Ages {{age}}"
  },
  "features": {
    "aiNamePhoto": "AI-personalized name & photo",
    "psychDesigned": "Psychologist-designed protocol",
    "previewFirst": "Preview before you buy",
    "bilingualAvail": "Available in Hebrew & English"
  },
  "pricing": {
    "digital": "Digital",
    "print": "Print",
    "oneTime": "one-time",
    "shipped": "shipped to you",
    "previewBeforePaying": "Preview before paying",
    "comingSoon": "Coming soon",
    "notifyMe": "Notify me when available"
  },
  "preview": {
    "seeInside": "See inside",
    "stepLabel": "Step 1 — Try it first",
    "genericVersionNote": "Read 2 free spreads before personalizing. No account needed.",
    "freePreview": "Free preview",
    "illustrationPreview": "Illustration preview",
    "pageRange": "Page {{start}}–{{end}}",
    "childNameHint": "This text will feature your child's name",
    "bridgeTitle": "Ready to make it about your child?",
    "bridgeSub": "Step 2 — Add their name, gender, and photo"
  },
  "faq": {
    "title": "Common questions",
    "q1": "How does personalization work?",
    "a1": "You enter your child's name, gender, and optionally upload a photo. You see a free 2-spread preview before any payment — then unlock the full story for a one-time fee.",
    "q2": "What is this story about?",
    "q3": "Who is this book for?",
    "q4": "What about print quality?"
  },
  "related": {
    "title": "More stories you'll love"
  },
  "storyCard": {
    "viewStory": "View Story"
  },
  "states": {
    "loading": "Loading story…",
    "notFound": "Story not found"
  }
}
```

---

## 14. Accessibility Checklist

- [ ] `<img>` cover: `alt={story.title[language]}`
- [ ] Favorite button: `aria-label` dynamic — "Add to favorites" / "Remove from favorites"
- [ ] All MUI Accordion items: keyboard accessible (MUI handles natively)
- [ ] Spread nav buttons: `aria-label="Spread 1"`, `aria-label="Spread 2"`
- [ ] CTA button: reachable via Tab
- [ ] `lang` attribute on page root Box matches current language (`"en"` or `"he"`)
- [ ] All chip text/background combos: WCAG AA contrast (pre-validated in design tokens)
- [ ] All animations: `prefers-reduced-motion` respected (Section 9.8)
- [ ] Price toggle: keyboard accessible

---

## 15. Build Order for Cursor

Follow this exact sequence. Each step produces a working page state.

| Step | Task | Files |
|------|------|-------|
| 1 | Fonts + typography | `public/index.html`, `theme.ts` |
| 2 | Data hooks + types | `useStoryDetail.ts`, `useRelatedStories.ts`, `types/story.ts` |
| 3 | Page skeleton + states | `StoryDetailPage.tsx` |
| 4 | Hero cover | `HeroCover.tsx` |
| 5 | Chips + features + pricing + CTA | `ChipsRow.tsx`, `FeaturesGrid.tsx`, `PricingCard.tsx`, `CtaRow.tsx` |
| 6 | Hero info column | `HeroInfo.tsx` |
| 7 | **Preview gallery** (highest priority) | `PreviewGallery.tsx` |
| 8 | FAQ | `FaqSection.tsx` |
| 9 | Related stories (catalog card style) | `RelatedStories.tsx` |
| 10 | Sticky mobile CTA | `StickyMobileCta.tsx` |
| 11 | RTL pass | All files |
| 12 | Responsive pass | All files |
| 13 | Animations | `variants.ts`, all animated components |

---

## 16. Completion Checklist

Before marking done:

**Layout**
- [ ] Hero two-column desktop, stacked mobile
- [ ] Preview section appears immediately after hero — no other content in between
- [ ] Section order: Back → Hero → Preview → FAQ → Related → Sticky
- [ ] Max-width 900px centered

**Preview**
- [ ] Banner shows "Step 1 — Try it first" framing
- [ ] Spread 1 / Spread 2 buttons work, crossfade animation plays
- [ ] `[Child's name]` token renders as purple pill span
- [ ] AI hint line shows below story text
- [ ] Bridge CTA below spread card links to personalize flow

**Hero**
- [ ] Trust badge positioned at `insetInlineEnd: 16px`, `bottom: -12px`
- [ ] All 4 chips correct colors
- [ ] 4 features in 2×2 grid (not 6)
- [ ] Price toggle Digital/Print works
- [ ] Print tab hidden when `printAvailable === false`
- [ ] CTA pulse animation plays, stops on hover
- [ ] Favorite button toggles with spring animation

**Related Stories**
- [ ] Cards match catalog/library card design exactly
- [ ] "View Story" button present
- [ ] Clicking navigates to story detail and scrolls to top
- [ ] Renders only when related.length > 0

**RTL**
- [ ] Switch to Hebrew → all layout mirrors
- [ ] Back arrow flips
- [ ] Trust badge moves to opposite corner
- [ ] Font switches to Assistant
- [ ] No `marginLeft` / `marginRight` / `left` / `right` usage

**States**
- [ ] Loading: spinner centered
- [ ] Error: "not found" + back button
- [ ] Coming soon: pricing + CTA copy changes
- [ ] Print unavailable: Print tab hidden

**Mobile**
- [ ] Sticky CTA appears after scrolling past hero
- [ ] Sticky CTA hidden on desktop (md+)
- [ ] Preview single-column on mobile
- [ ] Related stories single/two-column on mobile

**Quality**
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] `prefers-reduced-motion` disables all animations
- [ ] All i18n keys exist in en.json and he.json

---

*End of implementation document.*
*Total components: 10 | Total sections: 5 | Build steps: 13*
