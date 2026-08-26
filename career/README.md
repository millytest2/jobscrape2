# Career Kit — Miles Tipton

Everything here is generated from one source of truth so your resumes can never contradict each other again.

## Read in this order

1. **`RECRUITER_TEARDOWN.md`** — the review. Start with §1; it's the highest-priority item in your search.
2. **`TARGET_LIST.md`** — companies, live search links, and the weekly plan.
3. **`resumes/`** — four one-page ATS-optimized resumes (`.docx` to send, `.txt` to see what a parser sees).
4. **`outreach/TEMPLATES.md`** — cover letter, recruiter/hiring-manager messages, follow-ups, thank-you.
5. **`application_tracker.csv`** — log every application here.

## Files

| File | What it is |
|---|---|
| `resume_data.json` | **Source of truth.** Employment facts: companies, titles, dates, education. Fix a fact once, here. |
| `build_variants.py` | Tailored copy per role family, with hard length limits that keep each resume on one page. |
| `build_resumes.cjs` | Renders the `.docx` files. |
| `verify_resumes.py` | Confirms each resume parses cleanly, has no tables, and fits one page. Emits the `.txt` versions. |
| `keyword_check.py` | Scores a resume against a job description and lists missing keywords. |

## Regenerating after an edit

```bash
cd career
python3 build_variants.py    # rebuild copy + enforce length limits
node build_resumes.cjs       # render .docx
python3 verify_resumes.py    # confirm one page, no tables, emit .txt
```

If `build_variants.py` fails, it tells you exactly which bullet is too long. Shorten it and rerun — that guard is what keeps every resume on one page.

## Before every application

```bash
# paste the job description into a file first
python3 keyword_check.py sales_engineer jd.txt
```

Add missing keywords to your skills line **only if they're genuinely true of you**. Then rename the file `Miles_Tipton_<Company>_<Role>.docx` before submitting — recruiters see filenames.

## First three things to do

1. Verify every title and date in `resume_data.json` against your offer letters and contracts, then make LinkedIn match exactly. See `RECRUITER_TEARDOWN.md` §1.
2. Replace the LinkedIn placeholder in `resume_data.json` (`contact.line2`) with your real profile URL, or delete it.
3. Open each `.docx` and confirm it's one page in your copy of Word.
