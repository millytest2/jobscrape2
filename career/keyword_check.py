#!/usr/bin/env python3
"""Compare a resume variant against a job description and report keyword coverage.

Usage:
    python3 keyword_check.py sales_engineer path/to/job_description.txt
    python3 keyword_check.py resumes/Miles_Tipton_Sales_Engineer.txt jd.txt

Reports which meaningful JD terms your resume already covers and which it misses,
so you can add the true ones to your skills line before submitting.
"""
import re
import sys
from collections import Counter
from pathlib import Path

STOP = set("""a an the and or but if then than that this these those of in on at to for with by from as is are was
were be been being it its it's you your we our they their he she his her i me my will would can could should may
must have has had do does did not no nor so such own same too very s t just don now about into through during
before after above below up down out off over under again further once here there when where why how all any both
each few more most other some only who whom which what while at across per within without upon toward towards
role position job company team candidate candidates applicant experience experiences year years work working
looking seeking join help make like well also including include includes etc via new use used using ability able
strong excellent great good best plus preferred required requirements responsibilities qualifications benefits
equal opportunity employer diverse diversity inclusion applicants regardless race color religion sex national
origin disability veteran status compensation salary range base equity offer please apply application""".split())

def _words(text):
    raw = re.findall(r"[a-zA-Z][a-zA-Z0-9+#./&-]*", text.lower())
    # strip trailing punctuation so "team." and "team" are the same token
    return [w.rstrip("./-&") for w in raw]

def tokens(text):
    return [w for w in _words(text) if len(w) > 2 and w not in STOP]

def phrases(text):
    """Two-word phrases within a clause. ATS keyword matching weights these most,
    and staying inside clause boundaries avoids junk like 'discovery deliver'."""
    out = []
    for clause in re.split(r"[.,;:()\[\]\n|/]+", text.lower()):
        words = _words(clause)
        for i in range(len(words) - 1):
            a, b = words[i], words[i + 1]
            if a in STOP or b in STOP or len(a) < 3 or len(b) < 3:
                continue
            out.append(f"{a} {b}")
    return out

def resolve(arg):
    p = Path(arg)
    if p.exists():
        return p.read_text()
    guess = Path("resumes") / f"Miles_Tipton_{arg}.txt"
    if guess.exists():
        return guess.read_text()
    for f in Path("resumes").glob("*.txt"):
        if arg.lower().replace("_", "") in f.stem.lower().replace("_", ""):
            return f.read_text()
    sys.exit(f"Could not find resume for '{arg}'. Options: "
             + ", ".join(sorted(f.stem for f in Path('resumes').glob('*.txt'))))

def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    resume = resolve(sys.argv[1]).lower()
    jd = Path(sys.argv[2]).read_text()

    jd_phrases = [p for p, c in Counter(phrases(jd)).most_common(25)]
    jd_words = [w for w, c in Counter(tokens(jd)).most_common(40)]

    hit_p = [p for p in jd_phrases if p in resume]
    miss_p = [p for p in jd_phrases if p not in resume]
    hit_w = [w for w in jd_words if w in resume]
    miss_w = [w for w in jd_words if w not in resume]

    total = len(jd_phrases) + len(jd_words)
    hits = len(hit_p) + len(hit_w)
    pct = 100 * hits / total if total else 0

    print(f"\n{'='*70}\nKEYWORD COVERAGE: {pct:.0f}%  ({hits}/{total})\n{'='*70}")
    print("Aim for 70%+ before submitting. Below 50% means either the resume needs")
    print("work or this role is genuinely a stretch — decide which, honestly.\n")

    print(f"COVERED PHRASES ({len(hit_p)}):")
    print("  " + (", ".join(hit_p[:25]) if hit_p else "(none)"))
    print(f"\nMISSING PHRASES ({len(miss_p)}) <- highest-value gaps:")
    print("  " + (", ".join(miss_p[:25]) if miss_p else "(none)"))
    print(f"\nMISSING TERMS ({len(miss_w)}):")
    print("  " + (", ".join(miss_w[:35]) if miss_w else "(none)"))
    print("\nAdd ONLY what is genuinely true of you. A keyword you cannot talk about")
    print("for two minutes in an interview is worse than a missing keyword.\n")

if __name__ == "__main__":
    main()
