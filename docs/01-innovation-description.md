# Not Enough Space — Innovation Description

**NASA Space Apps Challenge 2026 · Challenge: "NASA's Discarded Equipment Storytelling"**
**Team:** Damien (Team Lead), Keane (Art & Design), Chung Hang (Game Design), Sean (Research)
**Track:** Beginner / Youth · Difficulty: Intermediate
**Submission type:** Browser-based educational game (Progressive Web App, no install required)

---

## 1. The idea in one line

*Not Enough Space* turns NASA's abandoned hardware — the rovers, landers, and probes
left across the Moon, Mars, and deep space — into a gentle, story-driven adventure
for children aged 7–12, so that "space junk" becomes a **museum of human achievement**.

## 2. The problem we are solving

The 2026 challenge asks teams to *"tell the story of some or all of this equipment
that introduces school-age space enthusiasts to the hardware and the science it made
possible."* That is a real gap:

- NASA's own catalogue (NSSDCA) is a powerful, authoritative data source — but it is
  written for engineers, not 7-year-olds.
- Existing "space junk" material for kids is either cartoonish or non-existent.
- Children learn best through **story and play**, not through tables of catalogue IDs.

We built a product that sits exactly in that gap: it is data-accurate (every artifact
links back to its NSSDCA record) but wrapped in a comic, a game, and a museum a child
can explore alone.

## 3. What the product actually is

Not Enough Space is a free, offline-capable web app (a PWA — it installs to a tablet
or laptop like an app and works without internet). There is **no account, no ad, no
paywall, and no build step** — you open the page and play.

The experience is a four-step loop:

1. **Read** — a comic chapter that personifies a piece of discarded equipment and tells
   the human story behind it (14 chapters: 5 on the Moon, 6 on Mars, 3 in deep space).
2. **Dive** — a "Deep Space Dive" mini-game where the child "fishes" the abandoned
   hardware out of the depths of space, answering simple questions. Deeper dives =
   rarer finds, gamifying the NSSDCA depth/orbit data.
3. **Collect** — each recovered artifact lands in a **Space Junk Museum** and a personal
   **Collection Album**, each with its real name, location, and NSSDCA catalogue link.
4. **Earn** — a personalized **Explorer Certificate** rewards progress, giving teachers
   and parents a tangible takeaway.

The whole thing is **bilingual (English / Spanish)** and **accessibility-first**: full
keyboard navigation, ARIA labels, high-contrast and easy-read modes, text scaling,
reduced-motion support, and optional text-to-speech narration and sound effects.

## 4. Why it is original

- **A new metaphor.** Instead of a static gallery, we use a *fishing/diving* game to
  "retrieve" abandoned equipment from the depths of space. The dive depth is driven by
  real NSSDCA data (orbit altitude, distance from Earth), so play and data are the same
  thing.
- **Child-shaped narrative.** The hardware is given a voice ("The Grave of the Innocent
  Scouts", "The Long Goodbye") — emotionally literate storytelling that respects kids'
  curiosity rather than talking down to them.
- **Zero-friction reach.** A no-build, offline PWA means a teacher in a low-bandwidth
  classroom can install it once and use it forever, on any device.

## 5. Use of NASA data and resources

Every artifact in the museum is grounded in the **NASA Space Science Data Coordinated
Archive (NSSDCA)** — the exact data source the challenge points to. Each exhibit carries
its NSSDCA catalogue key(s) and links back to the source, e.g.:

| Artifact | Location | NSSDCA key(s) |
|---|---|---|
| Apollo Lunar Modules | Moon | `apollo11-lm` |
| Lunar Roving Vehicles | Moon | Apollo 15/16/17 LMs |
| ALSEP packages | Moon | `apollo14-lm` |
| Surveyor Landers | Moon | `surveyor1`, `surveyor3`, `surveyor7` |
| Sojourner Rover | Mars | `mars-pathfinder` |
| Spirit & Opportunity | Mars | `spirit`, `opportunity` |
| Ingenuity Helicopter | Mars | `mars2020` |
| Viking 1 & 2 Landers | Mars | `viking1-lm`, `viking2-lm` |
| Phoenix & InSight | Mars | `phoenix`, `insight` |
| Dawn | Deep Space | `dawn` |
| NEAR Shoemaker | Deep Space | `near` |
| Pioneer 10 & 11 | Deep Space | `pioneer10` |
| Kepler | Deep Space | `kepler` |

We also drew on **NASA Space Place** for age-appropriate framing and **Krillion** for
supplementary context. All sources are cited in `02-references-citations.md`.

## 6. Who it is for, and why it matters

The challenge explicitly targets *school-age space enthusiasts*. Not Enough Space is built
for exactly that reader: a 7–12 year old (or a parent/teacher reading with them) who can
finish a chapter in five minutes and come away knowing that *Spirit* and *Opportunity*
are real robots still sitting on Mars. By pairing rigorously sourced NASA data with
play, we turn passive scrolling into active STEM curiosity — and we do it on the child's
terms, in their language, on their device.

## 7. What we would build next

- A teacher dashboard and printable worksheet pack.
- More languages (the i18n layer already supports adding any locale).
- An educator-authored "mission" mode aligning chapters to school science standards.
- A partnerships path with NASA Space Place and science museums for co-branded exhibits.

---

*Figures (chapter counts, artifact counts, NSSDCA keys) reflect the submitted build
of the app as of November 2026.*
