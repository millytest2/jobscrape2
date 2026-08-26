# Resume Teardown — Miles Tipton
*Reviewed as a senior technical-sales recruiter would read it in 2026: first by the parser, then by a 7-second human skim, then by an interview panel.*

---

## 1. The finding that outranks everything else

You sent five resumes. They describe **five different employment histories**. Not five different emphases — five different sets of facts.

| Employer | Titles you claim | Dates you claim |
|---|---|---|
| The Social Hogg | `Contract - Sales Closer` / `Business Development Representative` / `Sales Closer` / `Contract Sales Closer` | `Apr 2026 – Present` / `2026 – Present` |
| **Company name itself** | `The Social Hogg` / `Social Hog` / `The Social Hog` | — |
| UPath.ai | `Head of Technology` / `Co-Founder` / `Head of Sales Enablement and Technology` | **`Jun 2024 – Present` vs `Feb 2025 – Present`** |
| Merly.ai | `Technical Sales Specialist` | **`Jun–Aug 2025` vs `Jun–Sep 2025`** |
| Inbenta | `Sales Engineer` / `Associate Sales Engineer` | `Jul 2023 – Jun 2024` (consistent) |
| Homegrown Solutions | `Sales Engineer` | `Feb 2023 – Jun 2023` — **appears on only 1 of 5** |
| Reyvisum Solutions | `Technology Consultant` | `Jan 2022 – Sep 2024` — **appears on 1 of 5, and overlaps both Inbenta and Homegrown** |

And the metrics drift too: inbound leads are `50+`, `100+`, or `50` depending on the file. Social Hogg is `20 SMB sales`, `over 20 deals`, `60 warm leads`, or `50 leads`.

**Why this is the single biggest risk to your search, not a cosmetic issue:**

1. Recruiters and hiring managers pull your LinkedIn side-by-side with your resume within seconds of opening it. Mismatched titles and dates read as embellishment before anyone reads a bullet.
2. If you apply to two roles at the same company (or two portfolio companies with the same investor-shared ATS), the system shows the recruiter both submissions. Different dates on the same employer is a documented rejection trigger.
3. Employment-verification vendors check **title and dates**, not bullets. A `Feb 2025` start that you wrote as `Jun 2024` is the kind of discrepancy that rescinds an offer after you've resigned somewhere else.
4. `Reyvisum Solutions, Jan 2022 – Sep 2024` overlaps a full-time Sales Engineer role at Inbenta and another at Homegrown. Either it was contract/part-time work — in which case label it that way — or the dates are wrong. As written it is indefensible in a background check.

**This is fixable in twenty minutes and it is the highest-ROI thing you will do this week.** Open your offer letters, contracts, and pay stubs. Write down the literal title and the literal month-year for each. Then make LinkedIn and every resume match exactly. Everything below assumes you've done that.

I've built you a single source of truth at `career/resume_data.json`. Every resume variant is generated from it, so this problem cannot come back.

### What I assumed (verify each one)
- **UPath.ai → `Co-Founder & Head of Technology`, `06/2024 – Present`.** You claimed both titles, so the combined form is honest. I used the earlier start date because it makes your history continuous from Inbenta. **If UPath actually began Feb 2025, change it** — a fake continuous timeline is worse than a real seven-month gap, and we can fill that gap with the event/bartending work.
- **Merly.ai ends `09/2025`** (2 of your versions say Sep, 1 says Aug).
- **Inbenta → `Sales Engineer`** (3 of 4 versions). If your offer letter says *Associate* Sales Engineer, use that. Never inflate a title someone can verify in one phone call.
- **The Social Hogg → `Business Development Representative (Contract)`.** Match your actual contract's spelling and title.
- **Reyvisum Solutions: left off entirely.** Add it back only as `(Contract)` with true dates, or leave it off. Do not list it as it appeared.
- **Homegrown Solutions: added back to all four variants.** See §3.

---

## 2. How your resume is actually judged in 2026

Three gates, in order. Most candidates optimize for gate 1 and lose at gate 2.

**Gate 1 — the parser.** Greenhouse, Lever, Ashby, Workday and iCIMS convert your file to structured text. It fails on multi-column layouts, tables, text boxes, headers/footers, graphics, and icons. Your files were mostly fine here. What I changed: `MM/YYYY` dates everywhere (parsers reliably mis-read `2026 - Present`), standard section headers, and zero tables.

**Gate 2 — keyword and title matching.** The score is dominated by **job-title match**, then by exact-phrase skill matches. This is why each variant now carries a title line directly under your name (`SALES ENGINEER | SOLUTIONS ENGINEER`) and a dense `CORE SKILLS` block. Both spelled-out and acronym forms appear (`Large Language Models (LLM)`, `proof of concept (POC)`) because different systems index different forms.

**Gate 3 — the human, at roughly 7 seconds.** They read: current title, most recent employer, one number, and whether the story is coherent. Your old files buried the best number.

### Do not do the white-text keyword trick
Invisible or white-on-white keyword stuffing is the most common "ATS hack" circulating right now. It does not work anymore and it is actively dangerous: every ATS shows recruiters a plain-text rendering where hidden text appears in full, and several major systems flag it automatically. Getting caught doesn't just lose the role — recruiting teams keep notes on candidates. Everything in your new resumes is visible text you can defend in an interview.

---

## 3. What you had and were throwing away

**`Closed $60,000 in managed and professional IT services contracts in three months.`**

That is your single strongest line. Real revenue, short window, technical sale. It appeared on **one** of your five resumes — the onboarding one — and was missing from the *sales* resume, which is the last place it should be missing.

Second-strongest: **`Sales Engineer` at Inbenta**, an actual AI vendor, delivering demos to executives. That is a genuine, hard-to-fake technical pre-sales credential and it is exactly what the roles you want screen for.

Both now appear on all four variants.

---

## 4. Positioning: stop applying as an SDR

Your `Five_New_Role_Resume_Review.pdf` is five near-identical SDR/BDR resumes differing only in the summary line and the skills row. Two problems:

1. **It's the wrong tier.** SDR/BDR is the most commoditized role in tech sales — hundreds of applicants, entry-level pay, and you'd be competing against 22-year-olds while holding a real Sales Engineer title and a $60K close. You'd be bidding against your own resume.
2. **The differentiation is cosmetic.** Swapping `Lead Generation • Outbound Prospecting` for `Cold Calling • Cold Email` changes almost no keyword weight. The work experience underneath — the part that carries the score — was byte-identical across all five.

**Your actual market position, stated plainly:** you sell technical products *and* you build with the technology you sell. In 2026 that combination is the scarce one. Forward-deployed and solutions-consultant postings at AI companies rose roughly 4x through this year, and every one of those job descriptions asks for someone who can run a discovery call on Tuesday and wire up an API integration on Wednesday. Very few candidates can do both. You can, and you have receipts for both.

Lead with **Sales Engineer / Solutions Engineer / AI Solutions Consultant.** Use the AE variant for revenue-first roles. Keep the TAM/implementation variant for post-sales roles, which are often an easier first door into a company you want.

---

## 5. Your four resumes

Each is one page, single-column, table-free, and generated from the same facts.

| File | Use it for |
|---|---|
| `Miles_Tipton_Sales_Engineer.docx` | Sales Engineer, Solutions Engineer, Pre-Sales Engineer, Solutions Architect (associate) |
| `Miles_Tipton_AI_Solutions_Consultant.docx` | AI Solutions Consultant, Forward-Deployed Engineer, Implementation Consultant, Technical Specialist |
| `Miles_Tipton_Technical_Account_Manager.docx` | Technical Account Manager, Customer Success Engineer, Onboarding/Implementation Specialist |
| `Miles_Tipton_Account_Executive.docx` | Account Executive, Technical Sales Rep, Business Development Manager |

A matching `.txt` sits beside each one. That is verbatim what a parser extracts — paste it into "paste your resume" fields, and read it once to see your resume the way the machine does.

**Before you send any of these:** open the `.docx`, confirm it's one page in your copy of Word, and confirm the header reads correctly. They're built to land at exactly one page; if your Word version spills 2–3 lines onto a second page, delete the last bullet under Momentum OS or Homegrown and it will pull back.

---

## 6. Fix these next (ranked by impact)

**1. Put a LinkedIn URL on your resume.** Not one of your five resumes had one. Two had GitHub, three had nothing. Recruiters check LinkedIn before they reply; making them search for you costs you responses. The new resumes have a placeholder — **replace `linkedin.com/in/milestipton` with your real URL** or delete the line.

**2. Make LinkedIn match the resume exactly.** Same titles, same month-year dates, same company spellings. Set your headline to the role you want, not the one you have: *"Sales Engineer | Generative AI & Automation | I sell what I build."*

**3. Get the numbers you're missing.** Your bullets lean on activity metrics (60 calls, 20+ demos) rather than outcome metrics. Hiring managers for SE and AE roles ask for these in the first screen, every time. Go find:
   - Quota and attainment % at Social Hogg (even "hit 120% of a 15-deal monthly target")
   - Average deal size and sales-cycle length
   - Revenue influenced at Inbenta — even approximate pipeline value on deals you supported
   - Win rate on demos you ran
   - UPath revenue, not just lead count

   One real attainment number is worth more than every activity metric on the page.

**4. Learn MEDDIC/MEDDPICC this week.** It appears in a large share of SE and AE job descriptions and is a common first-screen question. It's a few hours of reading. Once you can genuinely speak to it, add it to the skills line — but not before, because you'll be asked to walk through it.

**5. Decide the Reyvisum question.** Real engagement with contract dates, or off the resume. No third option.

**6. Keep the bartending resume completely separate.** It's a fine hospitality resume and irrelevant to this search — but note that `Hotel Santa Barbara, May 2025 – Jan 2026` overlaps Merly.ai and UPath on your other resumes. That's normal (side income while building a company) and nothing to hide. Just never let two versions of the same months reach the same recruiter describing different jobs, and if asked, answer plainly: you bartended nights while building UPath.

---

## 7. The AI-screened interview

You will hit asynchronous AI video screens and AI phone screens at a meaningful share of these companies. What they score:

- **Structure.** Answer in STAR. These systems reward a detectable beginning, middle, and result far more than charisma.
- **Keyword echo.** Say the actual words from the job description — "technical discovery," "proof of concept," "stakeholder alignment." Transcript matching is a real component of the score.
- **Length.** 60–90 seconds. Under 30 seconds scores as low engagement; past two minutes gets truncated and you lose your own conclusion.
- **Delivery.** Look at the camera lens, not the preview window. Steady pace. Silence while you think is penalized less than filler — pause rather than "um."
- **Consistency.** Some systems flag mismatches between what you say and what your resume claims. One more reason §1 matters.

**Have these three stories rehearsed cold** — they cover most of what you'll be asked:
1. **The $60K close.** Discovery → what you found → how you scoped it → how you closed. This is your best story; lead with it.
2. **A demo that went sideways.** A technical question you couldn't answer at Inbenta, what you did in the room, how you followed up. Everyone screens for coachability and honesty under pressure; a clean recovery story beats a flawless one.
3. **Something you built.** Walk through the AgentKit/n8n CRM end to end — the problem, the architecture, the 40% result. This is what separates you from every other candidate in the stack. Have the GitHub link ready.

**Prepare your answer to "why so many roles in three years?"** — you will be asked in every single screen. Don't get defensive. The honest frame: *"I took contract and startup work deliberately to get range across the technical sales stack — pre-sales at Inbenta, closing at Homegrown, building the product at UPath. I'm looking for one place to go deep now."* Say it in one breath and move on.
