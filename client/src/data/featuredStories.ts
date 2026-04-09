import type { StoryTopic } from "../constants/topicColors";

export interface FeaturedStory {
  id: string;
  titleKey: string;
  ageRangeKey: string;
  topic: StoryTopic;
  descriptionKey: string;
  price: number;
  isNew: boolean;
  coverGradient: string;
}

/** Static seed data — replace with Firestore fetch later. */
export const FEATURED_STORIES: FeaturedStory[] = [
  {
    id: "night-stars",
    titleKey: "home.featured.stories.0.title",
    ageRangeKey: "home.featured.stories.0.ageRange",
    topic: "fear",
    descriptionKey: "home.featured.stories.0.description",
    price: 29,
    isNew: true,
    coverGradient: "linear-gradient(145deg, #2d1b69, #0f2847, #0a1628)",
  },
  {
    id: "worry-cloud",
    titleKey: "home.featured.stories.1.title",
    ageRangeKey: "home.featured.stories.1.ageRange",
    topic: "anxiety",
    descriptionKey: "home.featured.stories.1.description",
    price: 29,
    isNew: false,
    coverGradient: "linear-gradient(145deg, #1a3a2a, #0f4020, #061a0a)",
  },
  {
    id: "captain-heart",
    titleKey: "home.featured.stories.2.title",
    ageRangeKey: "home.featured.stories.2.ageRange",
    topic: "confidence",
    descriptionKey: "home.featured.stories.2.description",
    price: 29,
    isNew: false,
    coverGradient: "linear-gradient(145deg, #4a1c2a, #1f0a10, #100508)",
  },
  {
    id: "grandma-garden",
    titleKey: "home.featured.stories.3.title",
    ageRangeKey: "home.featured.stories.3.ageRange",
    topic: "grief",
    descriptionKey: "home.featured.stories.3.description",
    price: 29,
    isNew: true,
    coverGradient: "linear-gradient(145deg, #1a1040, #280a28, #0a0618)",
  },
  {
    id: "maple-street",
    titleKey: "home.featured.stories.4.title",
    ageRangeKey: "home.featured.stories.4.ageRange",
    topic: "change",
    descriptionKey: "home.featured.stories.4.description",
    price: 29,
    isNew: false,
    coverGradient: "linear-gradient(145deg, #2a1a08, #3d2010, #1a0c04)",
  },
  {
    id: "big-red-feeling",
    titleKey: "home.featured.stories.5.title",
    ageRangeKey: "home.featured.stories.5.ageRange",
    topic: "anger",
    descriptionKey: "home.featured.stories.5.description",
    price: 29,
    isNew: false,
    coverGradient: "linear-gradient(145deg, #3d0a0a, #1a0404, #0a0202)",
  },
];
