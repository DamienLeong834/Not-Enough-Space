# References & Citations — Not Enough Space

All primary data in the app is sourced from NASA's official archives. This document
records every external source the project relies on, so judges and educators can verify
the science.

## Primary data source (used for every museum artifact)

- **NASA Space Science Data Coordinated Archive (NSSDCA)**
  <https://nssdc.gsfc.nasa.gov/>
  The challenge's named data source. Each museum exhibit in the app stores its NSSDCA
  catalogue key(s) and links back to the archive. Verified against NSSDCA records on
  2026-11-14 (see `js/nssdc-data.js`).

### Artifact → NSSDCA catalogue (COSPAR) ID mapping

Every exhibit is backed by a record read back from NASA's own NSSDCA "Spacecraft —
Details" page and matched by name. The full verified snapshot (with launch dates,
mass, disciplines, and descriptions) ships in `js/nssdc-data.js`, `verifiedOn:
2026-11-14`. The app's internal key maps to the official NSSDC/COSPAR ID below.

| # | Artifact | Location | NSSDCA / COSPAR ID | Chapter |
|---|---|---|---|---|
| 1 | Apollo Lunar Modules | Moon | `1969-059C` (Apollo 11 LM / EASEP) | 1 |
| 2 | Lunar Roving Vehicles (LRVs) | Moon | carried by Apollo 15/16/17 LMs (per NSSDCA) | 2 |
| 3 | ALSEP Scientific Packages | Moon | `1971-008C` (Apollo 14 LM / ALSEP) | 3 |
| 4 | Surveyor Landers | Moon | `1966-045A`, `1967-035A`, `1968-001A` | 3 |
| 5 | Sojourner Rover | Mars | `1996-068A` (Mars Pathfinder) | 5 |
| 6 | Spirit & Opportunity | Mars | `2003-027A`, `2003-032A` | 9 |
| 7 | Ingenuity Helicopter | Mars | `2020-052A` (Mars 2020) | 5 |
| 8 | Viking 1 & 2 Landers | Mars | `1975-075C`, `1975-083C` | 6 |
| 9 | Phoenix & InSight Landers | Mars | `2007-034A`, `2018-042A` | 8 |
| 10 | Dawn Spacecraft | Deep Space | `2007-043A` | 11 |
| 11 | NEAR Shoemaker | Deep Space | `1996-008A` | 11 |
| 12 | Pioneer 10 & 11 | Deep Space | `1972-012A` (+ NASA Pioneer 11 end-of-ops report) | 12 |
| 13 | Kepler Space Telescope | Deep Space | `2009-011A` | 13 |

> The authoritative, machine-readable crosswalk is in `js/nssdc-data.js` (each record
> links to its live NSSDCA page). These IDs were verified by reading each record back
> from NASA and matching by name; unrelated IDs were discarded, not guessed.

## Challenge & program sources

- **Challenge page:** "NASA's Discarded Equipment Storytelling" (2026)
  <https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/>
- **Funding disclosure:** NASA Space Apps is funded by NASA's Science Mission Directorate
  through a contract with Booz Allen Hamilton, Mindgrub, and SecondMuse. (Displayed in
  the app's footer and About page per challenge requirements.)

## Supplementary / framing sources

- **NASA Space Place** <https://spaceplace.nasa.gov/> — age-appropriate framing and
  vocabulary for the 7–12 audience.
- **Krillion** <https://krillion.io/> — supplementary context on spacecraft locations
  and status (used as secondary color/context, not as primary data).

## Image & asset provenance

- All illustrations, emoji, and UI assets in the app are either original (team-created)
  or system emoji; no copyrighted NASA photography is required to use the product.
- Where real mission imagery is desirable (future educator pack), we will use NASA's
  public-domain media per NASA's media usage guidelines.

## Citation format for the written submission

> Not Enough Space team (2026). *Not Enough Space: storytelling about NASA's discarded
> equipment for ages 7–12.* NASA Space Apps Challenge. Data: NASA Space Science Data
> Coordinated Archive (NSSDCA), https://nssdc.gsfc.nasa.gov/. Challenge:
> https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/.
