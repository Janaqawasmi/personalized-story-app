# Unified StoryGridCard — Migration Guide

## What changed

### Files

| File | Role |
|------|------|
| `client/src/components/StoryGridCard.tsx` | Single story card (catalog + featured `variant`) |
| `client/src/components/catalog/catalogStyles.ts` | Shared grid + page header `sx` |
| `client/src/components/home/FeaturedStoriesSection.tsx` | Imports unified card with `variant="featured"` |

### Removed

| File | Reason |
|------|--------|
| `client/src/components/story/StoryGridCard.tsx` | Merged into `components/StoryGridCard.tsx` |
| `client/src/components/StoryCard.tsx` | Unused |

---

## Usage

```tsx
// Catalog (default): no price row, no NEW badge
<StoryGridCard story={story} />

// Homepage featured: price + optional NEW badge
<StoryGridCard story={story} variant="featured" onClick={(id) => navigate(`/stories/${id}`)} />
```

### `variant="featured"` extras

- Footer shows `₪{price}` + `home.featured.price_suffix` when `price` is a finite number.
- `isNew` shows the gradient NEW badge on the cover.

---

## Shared layout tokens

Import from `client/src/components/catalog/catalogStyles.ts`:

- `storyCatalogGridSx` — 4-column catalog grid (`lg: repeat(4)`), gap `2.5`
- `storyCatalogGridLooseSx` — 3-column max, gap `4` (search + favorites)
- `catalogPageHeaderTitleSx`, `catalogCountBadgeSx`, `catalogBreadcrumbSx`

---

## Topic styling

Pills use `STORY_TOPIC_TAG_STYLES` from `client/src/constants/topicColors.ts`. Cover gradients are resolved inside `StoryGridCard` (including optional `coverGradient` on the story object).

---

## RTL

Favorite: `insetInlineEnd`. NEW badge: `insetInlineStart`. Body: `direction: isRTL ? "rtl" : "ltr"`.
