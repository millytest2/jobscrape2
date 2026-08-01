# Job Tracker Verification — August 1, 2026

Verification pass over the Manus-generated `Miles_Tipton_MASTER_Tracker_Aug1_2026.xlsx`,
plus a new curated target-company list. Output workbook:
`Miles_Tipton_MASTER_Tracker_Aug1_2026_VERIFIED.xlsx`.

## Method

Live web search on 2026-08-01 against company career pages, ATS boards
(Greenhouse / Lever / Ashby / Workday), funding and layoff news, and employee reviews.

**Limitation:** Built In, LinkedIn, Indeed and Wellfound return HTTP 403 to automated
fetches, so individual aggregator posting URLs could not be opened one by one. Rows marked
`VERIFIED LIVE` were confirmed on a company-owned board or a source quoting it directly.
Rows marked `CHECK` / `UNCONFIRMED` should be confirmed on the company careers page before
time is spent on them.

## Results — original 29 rows

| Outcome | Count |
|---|---|
| Genuinely actionable | 11 |
| Dead, fabricated, or not worth pursuing | 5 |
| Duplicate pairs (same job listed twice) | 2 |
| Materially wrong location or salary | 4 |
| Unverifiable | 3 |
| "Careers page" links rather than real postings | 4 |

### Notable findings

- **Hired.com** (row 29, "AI Workflow Specialist, $30–$90/hr") — the company shut down in
  June 2024. The row, the salary range and the link were all fabricated.
- **Harness "Associate Sales Engineer"** (row 6) — no such title exists. Harness SE roles are
  Sales Engineer / Senior Enterprise Sales Engineer at $170K–$290K, several levels senior.
- **DealHub "Revenue Operations Analyst"** (row 11) — mislabeled. `revpath.dealhub.io` is
  RevPath, a RevOps job board DealHub runs *for other companies*. The actual employer was
  never named. RevPath is a good board and is now listed as one.
- **Airwallex** and **Block/Square** — both listed as remote/LA. Airwallex US SDR reqs are
  hybrid SF/NYC/Austin at 3 days in office; Block BDR reqs are currently Seattle / NYC / DC /
  Dublin.
- **Huntress** — US remote SDR postings appear to have been pulled around June 2026.
- **Deepgram** — the live SDR req is German-speaking, London-based.
- **Correlation One** — real, and an interview is active, but it is a part-time contract
  Expert Network role at ~10–12 hrs/week, not a $65K–$85K salaried position.
- **Otter (CloudKitchens)** — the strongest row in the original file and correctly identified:
  Solutions Engineer, Los Angeles, live on Otter's own Greenhouse board (req 8436361002).
- **Scale AI** — cut 200 FTEs and 500 contractors after the Meta deal and pivoted from data
  labeling to an enterprise apps business. The annotation path listed is the shrinking one.

## New content

- **🏢 Target Companies** — 48 companies across five lanes: career/labor-market intelligence,
  GTM engineering & sales tech, SMB/local search, applied AI, and LA-anchored companies.
  Includes a verified "do not bother" list (BetterUp, Skyray Ventures, Azara, Hired.com).
- **🏆 Top 20 Titles v2** — reordered by 90-day winnability. **GTM Engineer is now #1** and was
  absent from v1 entirely; postings grew 205% YoY to 3,000+ open as of January 2026 at
  $132K–$241K, and the role description (Clay / Zapier / Make, enrichment pipelines, outbound
  automation, APIs) matches existing Social Hog and UPath work directly.
- **🔎 Where To Search** — niche boards including the Clay GTM job board and RevPath.
- **📄 Resume Kit** — five resume variants with ATS keyword blocks and XYZ bullet scaffolds.

## Open item

The original prompt asked for a fully rewritten resume per job title. The resume files were
not provided, so the Resume Kit tab contains keyword architecture and bullet scaffolding built
from verified history (Inbenta, Homegrown Solutions, Merly.ai, UPath.ai, Social Hog, Built for
Main Street, GW Organizational Sciences, Harvard CS50, Harvard coaching certificate) rather
than invented employment details.
