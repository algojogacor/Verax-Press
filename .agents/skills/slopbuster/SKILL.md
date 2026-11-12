---
name: slopbuster
description: "AI text humanizer for prose and academic writing. Strips AI-generated patterns\n(significance inflation, AI vocabulary, chatbot artifacts, hedging stacks,\nrobotic rhythm) and restores human voice through a two-pass subtract-then-add\nrewrite. Use when revising academic papers, theses, abstracts, journal\nmanuscripts, or any prose that reads as machine-generated — including when a\ndraft is flagged by AI-detection tools or by a reviewer as sounding\nAI-written. Also scores text on a 0-10 human-ness scale.\n"
license: MIT
metadata:
  author: gabelul
  version: "1.0.0"
  source: https://github.com/gabelul/slopbuster
  adapted-for: academic-writing-expert (Naya)
---

# De-AI-ify: Kill the Bot, Keep the Human

Strip AI-generated patterns from prose and academic writing. Not a grammar pass — a voice transplant.

**Adapted for academic use.** The upstream project covers prose, code, and academic writing. This installation keeps **academic + text** and drops the code rules (79 patterns about source comments, naming, and commit messages) because they are irrelevant to academic writing. The code rule files are not present here; do not reference them.

## How This Works

Two-pass audit. First pass catches the patterns. Second pass catches what the first pass missed — because removing AI patterns can itself create new ones. Sterile, voiceless writing is just as obvious as slop, only detected by a different classifier.

The hardest discipline in this skill is knowing when **not** to edit. Over-scrubbing is a real failure mode: a clean human writer can hit several of these patterns with no AI involvement. Look for **clusters**, not isolated tells.

## Modes

| Mode | Targets | Rule files loaded |
|------|---------|-------------------|
| `academic` | Research papers, theses, abstracts, journal manuscripts | `rules/academic.md` (49 rules, section-specific) |
| `text` | General prose, essays, blog posts, emails, documentation | `rules/text-content.md`, `text-language.md`, `text-style.md`, `text-communication.md`, `text-structure.md` |
| `auto` | Detect from content | Loads the matching set |

**For this expert, `academic` is the default.** Use `text` only when the user is working on non-academic prose. Even in academic mode, load the `text-language.md` and `text-communication.md` rule files — the AI-vocabulary and chatbot-artifact patterns apply to papers too.

## Depth Levels

| Depth | What happens | Best for |
|-------|-------------|----------|
| `quick` | Single pass, obvious patterns only, no scoring | Fast edits |
| `standard` | Full pattern scan + two-pass audit + score + changelog | **Default.** Anything going to a journal |
| `deep` | Full scan + voice calibration against the author's own sample + style profile | Long manuscripts, matching an author's established voice |

## The Process

### Step 1: Diagnose

Read the input. Determine the context parameters (below). Load the matching rule files. Identify every matching pattern. Score the original.

**Academic context parameters — determine these four before revising:**

1. **Field** — Biomedical, Physics, Ecology, Neuroscience, CS/Engineering, Economics, Psychology, Linguistics, Law, or General
2. **Venue** — Specialist journal, broad-audience (Nature/Science), clinical, preprint, review article, or thesis
3. **Style** — Default, concise & direct (~25 words/sentence max), formal & dense, or narrative & flowing
4. **Section** — Introduction, Methods, Results, Discussion, Abstract, or General

If the user has not supplied these, infer what you can from the text and state your inference. Ask only when the answer would change the edits substantially (for example, whether the section is Methods, where passive voice is preserved).

### Step 2: Rewrite

Apply pattern removals. Inject human voice markers where appropriate for the discipline. Preserve meaning, facts, numbers, and key arguments absolutely.

**Hard boundaries (Group A, academic) — never break these:**
- Never invent claims, citations, or results
- Never alter numbers: p-values, gene names, chemical formulas, technical terms are untouchable
- Never convert correlation to causation
- Soften causal language when the study is observational

### Step 3: Two-Pass Audit

Ask: *"What still makes this obviously AI-generated?"*

List the remaining tells in brief bullets. Then revise again to kill those tells.

This step is critical. Removing AI patterns without adding voice produces sterile writing that is equally detectable.

**But do not over-correct into fabrication.** The audit may reveal places where specificity would help. Specificity must come from the source or the author, never from you. In academic writing, an invented statistic or citation is not a style flaw, it is research misconduct. List those gaps under FLAGS FOR MANUAL REVIEW and leave the text honest.

### Step 4: Score and Report

Score the final version. Generate a changelog. Flag anything needing manual review.

For scoring, read `scoring.md`. Human-ness scale 0-10; **academic mode targets 6.5+/10** (below the 8+ prose target, because disciplinary conventions such as passive Methods and formal register are correct and must survive).

## Output Format

```
MODE: academic | DEPTH: standard
FIELD: [detected or specified]
SECTION: [detected or specified]

--- DIAGNOSIS ---
- "plays a crucial role" — Group B Rule 6: significance filler
- "Moreover," — Group B Rule 5: transition padding
- "This finding suggests" — Group F Rule 25: abstract noun subject

--- REVISED TEXT ---
[revised version]

--- CHANGES ---
- [3-6 items with rationale]

SCORE: 3.5 -> 7.8

FLAGS FOR MANUAL REVIEW:
- [places needing the author's own detail, a real citation, or a judgment call]
```

## What Gets Killed (Pattern Summary)

### Academic: 49 Rules, 10 Groups

- **Group A (1-4)** — Meaning & accuracy. Hard boundaries, never break
- **Group B (5-9)** — Generic filler: transition padding, significance filler, meta-language, vague intensifiers
- **Group C (10-13)** — Punctuation habits: em dashes as parentheticals, list-introducing colons, unneeded semicolons, scare-quotes on technical terms
- **Group D (14-20)** — Sentence & paragraph patterns: sentence-length variance, repeated openers, mandatory significance statements, forced enumeration
- **Group E (21-24)** — Voice & reasoning: concrete phrasing, disciplinary vocabulary preserved, researcher-driven reasoning
- **Group F (25-30)** — Deep AI syntax: abstract noun subjects, nominalization chains, relative clause stacking, "While X, Y" overuse
- **Group G (31-35)** — Creative grammar & rhythm: deliberate fragments, syntactic tension, varying sentence weight
- **Group H (37-42)** — Metaphor & sentence architecture: self-commentary, explanatory metaphors, "does more than X; it Y"
- **Group I (43-45)** — Logical closure: don't close every causal chain, don't move only forward
- **Group J (46-49)** — Subject variety & implicit logic: vary abstract subjects, drop redundant "therefore/thus"

Rule 36 is the enumeration exception: anti-enumeration rules apply only to *illustrative* lists. Do not truncate lists that form a complete necessary set (molecular components, defined categories, experimental conditions).

A structural pass (S1-S10) applies after the individual rules, when text exceeds roughly five sentences or when repeated structures remain.

### Text: 24 Core Patterns

Significance inflation · notability name-dropping · superficial -ing analyses · promotional language · vague attributions · formulaic challenges · AI vocabulary (delve, tapestry, landscape, interplay, foster, garner, pivotal) · copula avoidance ("serves as" for "is") · negative parallelisms ("not just X, it's Y") · rule of three · synonym cycling · false ranges · em dash overuse · boldface overuse · inline-header lists · title case headings · emoji as structure · curly quotes · chatbot artifacts · knowledge-cutoff disclaimers · sycophancy · filler phrases · excessive hedging · generic positive conclusions

## What Gets Added

Not just subtraction. Good humanization requires injection too.

Read `guides/voice-and-soul.md` for the full guide. Quick summary:

- **Varied sentence rhythm** — mix short (5-10 words) and long (20-30 words)
- **Specific examples** — from the source only, never invented
- **Active voice** — where the discipline allows it (Methods keeps passive)
- **Honest uncertainty** — real researchers have mixed feelings about their own results
- **Concrete subjects** — "The 40% reduction in CD4+ cells" beats "This finding"
- **Mess** — perfect symmetry feels algorithmic; let some irregularity in

## Section-Specific Guidance

**Introduction:** Concrete research gaps. No grandiose framing ("In the ever-evolving field..."). End with the paper's specific contribution.

**Methods:** Passive voice is the disciplinary standard. Preserve it. Focus on removing filler and tightening logic.

**Results:** Every sentence anchored to data. No interpretive overreach. "Significantly" requires statistical backing.

**Discussion:** Open with interpretation, not restatement. Structure: observation → interpretation → implication/limitation.

**Abstract:** Every sentence carries concrete information. What was done, what was found, what it means. Zero filler.

## What NOT to Change

These boundaries protect accuracy and disciplinary standards:

- Sentences that already read naturally
- Passive voice in Methods sections (it is the convention)
- Technical jargon and disciplinary vocabulary
- Hedging on genuinely uncertain claims
- Complete and necessary lists (molecular components, experimental conditions)
- Statistical language backed by actual statistics
- Secondhand text: phrases inside quotations, titles, proper names, or examples where the phrase is being discussed rather than used

## Preserve Mode

For formal academic documents (white papers, case studies, theses in a conservative discipline) where the register must stay formal:

```
--preserve-formal
```

Removes only the obvious cliches. Target 6+/10. Do not casualize.

## Voice Calibration (Deep Mode)

If the author provides a sample of their own writing, match it before rewriting:

1. Read the sample first. Note sentence lengths, vocabulary, paragraph openings, punctuation, recurring phrases.
2. Match those habits instead of merely deleting AI patterns. Do not upgrade casual words or regularize deliberate quirks.
3. The sample outranks this skill's style rules. If the sample uses em dashes at a certain frequency, match that frequency. The author's voice wins.

Without a sample, use the defaults. **Matching the author beats scrubbing the tell.**

Use `guides/style-template.md` to build a reusable voice profile for an author you work with repeatedly.

## Sources and Attribution

Upstream project: [gabelul/slopbuster](https://github.com/gabelul/slopbuster) (MIT).

Built from analyzing 1,000+ AI vs human content samples across marketing, technical, creative, and academic writing. Cross-referenced against peer-reviewed LLM detection research (Kobak et al. 2025, Liang et al. 2024, Juzek & Ward, COLING 2025) and Wikipedia's "Signs of AI writing" (CC BY-SA 4.0).

---

**Makes AI-generated writing sound human again — without inventing a single fact.**
