# PRD phase: AI/ML validation & AR guidance (post-MVP)

Roadmap bucket for capabilities described under **AI/ML Validation**, **AR Installation Guidance**, **Post-Install Verification**, and related UX in the full fenestration PRD. These intentionally sit **after** platform foundation ([`platform-foundation.md`](./platform-foundation.md)) and assisted capture polish.

## AI / computer vision track

1. **Data:** Annotated opening imagery, defect taxonomies (shims, sealant, anchoring), synthetic augmentation policy.
2. **Inference:** Edge-first proposals for field latency; cloud GPU for re-training and heavy mesh alignment.
3. **Human-in-the-loop:** QA overrides feed back into labels; confidence thresholds gate WARN/FAIL automation vs manual review only.

## AR installation track

1. **Anchoring:** Stable coordinate frames from survey sessions + manufacturer unit metadata.
2. **Runtime:** ARKit / ARCore step flows with drift detection and loss-of-tracking UX (per PRD outdoor/gloves constraints).
3. **Safety:** Hands-free / voice modes as stretch goals after tap-first baseline.

## Post-install verification track

1. **Evidence model:** Extend `CaptureSession` or sibling `InstallationSession` type with punch-list codes and scorecards.
2. **Reporting:** Warranty bundle exports building on existing PDF/CSV pipelines.

## Ordering suggestion

Assisted measurement → defect CV (narrow vertical slice, one defect class) → AR placement prototype → full QA scorecards → BIM/twin exports.
