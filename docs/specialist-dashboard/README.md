# Specialist dashboard

This folder indexes specialist dashboard documentation. The detailed route and page specs live under [client/src/specialist/docs](../../client/src/specialist/docs).

## Illustration pipeline (v2)

The specialist-side **illustration v2** pipeline is specified in [docs/illustration/spec.md](../illustration/spec.md). It runs after manuscript approval: the story enters `illustration_workspace`, where a **Visual Bible** and per-page **scene plans** are generated, images are produced and reviewed, and the story can be marked `illustration_ready` then **published** to the public `story_templates` catalog.

**Architecture (summary).** Artefacts (Visual Bible, scene plans, final prompts, images) live in Firestore subcollections under each `stories/{storyId}` document. Long-running work is driven by `illustrationJobs` and an in-process worker (pilot). Specialists approve or reject per-page images; publishing projects approved images and manuscript text into `story_templates` for the caregiver-facing site.

**Phase plans** (`docs/illustration/phase-1-plan.md` … `phase-6-plan.md`) are the historical implementation record; the **spec** (`docs/illustration/spec.md`) is the source of truth for behaviour.

## Related links

- [client/src/specialist/docs/00-overview.md](../../client/src/specialist/docs/00-overview.md)
- [docs/illustration/spec.md](../illustration/spec.md)
