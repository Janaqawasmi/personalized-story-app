# Visual Style Images

This folder contains example images for each visual style option in the personalization wizard.

## Required Images

Place the following images in this folder with **exact file names** (lowercase, no spaces):

- `watercolor.jpg` - Watercolour style example
- `semi-realistic.jpg` - Semi-Realistic style example  
- `flat-cartoon.jpg` - Flat Digital Cartoon style example
- `paper-craft.jpg` - Paper-Craft Children's Book style example
- `vintage-1950s-little-golden.jpg` - Vintage 1950s Little Golden Storybook style example

## Image Requirements

- **Format**: JPG or PNG
- **Recommended size**: 600x400px (portrait orientation preferred)
- **Naming**: Use lowercase, hyphens for spaces, no special characters
- **Content**: All images should show the **same scene/content** rendered in different styles
- This ensures **fair visual comparison** for users

## Usage

These images are imported in `PersonalizeStoryPage.tsx` at the top of the file:

```ts
import watercolorImg from "../assets/story-styles/watercolor.jpg";
import semiRealisticImg from "../assets/story-styles/semi-realistic.jpg";
// ... etc
```

They are then used in the `VISUAL_STYLES` configuration array, where each style object references the imported image.

## Academic Note

Each visual style is represented by a static reference image selected by the user. The chosen style ID (`watercolor`, `semi_realistic`, etc.) is later injected into the generative AI prompt to ensure consistent visual output matching user expectations.

