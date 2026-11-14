/* ============================================================
   Not Enough Space — Data Layer
   All facts verbatim from the official NASA Space Apps 2026
   challenge page: "Abandoned but not Forgotten: Storytelling
   about NASA's Discarded Equipment on the Moon and Mars"
   (Details + Resources tabs).
   Comic narration restates those verified facts — it adds no
   new claims about the hardware.
   ============================================================ */
(function () {
  "use strict";
  // ---- Official challenge info (verified from the challenge page) ----
  const CHALLENGE = {
    title:
      "Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars",
    url:
      "https://www.spaceappschallenge.org/2026/challenges/nasas-discarded-equipment-storytelling/",
    difficulty: ["Intermediate", "Beginner/Youth"],
    subjects: ["Astrophysics", "Planets & Moons", "Space Exploration"],
    blurb:
      "Since the 1960s, NASA has left hardware across the solar system–on the Moon, on Mars, and in deep space. From rovers and instruments that completed their science missions to probes still traveling away from Earth this hardware varies widely in both its purpose and current level of functionality. Your challenge is to tell the story of some or all of this equipment that introduces school-age space enthusiasts to the hardware and the science it made possible.",
    dataSource:
      "NASA Space Science Data Coordinated Archive (NSSDCA): The NSSDCA is NASA's definitive, publicly available catalog. Participants can use it to search for any spacecraft or instrument sent into space, retrieve its mission parameters, and learn exactly what its final resting place and operational status is.",
    funding:
      "NASA Space Apps is funded by NASA's Science Mission Directorate through a contract with Booz Allen Hamilton, Mindgrub, and SecondMuse.",
  };
  // ---- Deep Space Dive scoring ----
  // tier: common (shallow) | uncommon (deep) | rare (deeper) | gem (One in a Deep Space!)
  const TIERS = {
    common: { label: "Shallow find", icon: "🌊" },
    uncommon: { label: "Deep dig", icon: "🤿" },
    rare: { label: "Deeper!", icon: "🌊" },
    gem: { label: "One in a Deep Space!", icon: "💎" },
  };
  // ---- Depth zones: the dive is a journey, not just a score ----
  const ZONES = [
    { min: 0, name: "Starfish Shallows", icon: "⭐" },
    { min: 40, name: "The Moon Belt", icon: "🌙" },
    { min: 80, name: "Comet Trail", icon: "☄️" },
    { min: 120, name: "The Deep Dark", icon: "🌑" },
    { min: 160, name: "Ice Cold Orbit", icon: "🧊" },
    { min: 200, name: "Planet Belt", icon: "🪐" },
    { min: 240, name: "The Far Side", icon: "🛸" },
  ];
  function zoneFor(depth) {
    let z = ZONES[0];
    for (let i = 0; i < ZONES.length; i++) {
      if (depth >= ZONES[i].min) z = ZONES[i];
    }
    return z;
  }
  // Helper: build an answer entry
  function ans(text, depth, tier, aliases) {
    return {
      text: text,
      depth: depth,
      tier: tier,
      aliases: aliases || [text],
    };
  }
  /* ==========================================================
     Comic page narration — what the 🔊 button reads out loud.
     It only restates facts that are already verified on the
     official challenge Resources tab.
     (declared before CHAPTERS so makePages() can read it)
     ========================================================== */
    const NARRATION = {
    0: [
      "A small explorer stands on the Moon and looks out across the grey dust.",
      "For more than half a century, machines have arrived here, legs first, and never left.",
      "They were not asked to stay, but the arithmetic of rocketry decided for them.",
      "Every gram of fuel would be needed to go home, so heavy things were left behind.",
      "Those leftovers became quiet monuments to the first journeys away from Earth.",
      "This is the weight of going home: the things we must leave so we can return.",
    ],
    1: [
      "Chapter 1 — The Launch Pad. A lunar module sits on the Moon, built to go down and never come back.",
      "Four legs, one engine, and a flat top wide as a floor: that is the descent stage.",
      "When the astronauts climbed back up, the top half flew home to Earth.",
      "The bottom half had nowhere to go, so it stayed as a launch pad for later missions.",
      "The most famous descent stage is Eagle, from Apollo 11.",
      "Eagle is still on the Moon right now, waiting for the next visitors.",
    ],
    2: [
      "Chapter 2 — Parked Forever. Three little electric vehicles sit on the Moon.",
      "They are Lunar Roving Vehicles, or moon buggies, driven by astronauts.",
      "Each buggy was small, light, and powered by batteries instead of fuel.",
      "They could only be used on flat, smooth plains near the landing sites.",
      "When the astronauts flew home, the buggies stayed behind permanently.",
      "Three moon buggies are still parked in the lunar dust today.",
    ],
    3: [
      "Chapter 3 — The Listeners. Before astronauts walked on the Moon, robotic probes touched the dust.",
      "Surveyor landers proved that soft landings were possible in the 1960s.",
      "Some bounced, some tipped over, but some landed perfectly.",
      "After the crews arrived, they left science packages called ALSEP.",
      "ALSEP instruments listened for moonquakes and bounced laser beams back to Earth.",
      "The packages kept working in the dark long after the astronauts departed.",
    ],
    4: [
      "Episode Four — The Grave of the Innocent Scouts. The Moon is scattered with machines that did their jobs.",
      "Lunar modules, rovers, and science experiments all rest in the grey dust.",
      "None of them were meant to come home; they were built to be left behind.",
      "Together they form a graveyard of innocent scouts that answered big questions.",
      "Each one taught us something about landing, driving, or doing science off Earth.",
      "They are still there, quietly marking where humans first explored another world.",
    ],
    5: [
      "Chapter 5 — The First Wheels. On Mars, before giant labs rolled across the plains, there was a small rover.",
      "Sojourner was about the size of a microwave and arrived in 1997.",
      "It was delivered by the Pathfinder lander and rolled onto Ares Vallis.",
      "Sojourner proved that a rover could explore another planet.",
      "It was the first wheeled vehicle to drive on Mars.",
      "Now it sits parked, a monument to the first Martian road trip.",
    ],
    6: [
      "Chapter 6 — Digging for Life. In 1976, a lander touched down in Chryse Planitia on Mars.",
      "It was Viking, sent to scoop the red dust and look for signs of life.",
      "Before rovers began to roam, Viking sat in one place and dug.",
      "It scooped soil and ran experiments to see if anything was alive in the dirt.",
      "The results were puzzling, but Viking taught us how to search for life on Mars.",
      "Its landing proved that Mars could be reached and studied up close.",
    ],
    7: [
      "Chapter 7 — The First Knock. In 1976, nobody knew if a machine could survive touching Mars.",
      "Viking 1 and Viking 2 were the first to try, and they succeeded.",
      "They became the first U.S. landers to operate on the red planet.",
      "Their work gave humanity the confidence to send more missions.",
      "They listened, measured, and photographed until their power ran down.",
      "Viking answered a huge question: yes, machines can live on Mars.",
    ],
    8: [
      "Phoenix & InSight. Two more Mars landers arrived long after Viking.",
      "Phoenix dug near the north pole, searching for water ice in the soil.",
      "It found ice and showed that Mars has frozen water not far below the surface.",
      "InSight came later with a different job: to listen to the planet itself.",
      "It placed a seismometer on Mars and detected marsquakes.",
      "Both landers eventually lost power, but their data keeps teaching us about Mars.",
    ],
    9: [
      "Spirit & Opportunity. Two twin rovers landed on Mars in 2004.",
      "They were built to last ninety days, but they rolled across Mars for years.",
      "Spirit explored the Gusev Crater region.",
      "Opportunity explored Meridiani Planum and found signs of ancient water.",
      "Together they proved that Mars once had environments that could have been habitable.",
      "Both are now silent, but their tracks are still etched in the red dust.",
    ],
    10: [
      "Curiosity. A rover the size of a car landed in Gale Crater in 2012.",
      "Curiosity is a rolling chemistry lab designed to study Mars's past habitability.",
      "It is powered by a radioisotope thermoelectric generator, a warm plutonium heart.",
      "That power source lets it work through dust storms and dark winters.",
      "Curiosity has climbed a mountain and drilled rocks to read Mars's history.",
      "It is still exploring, looking for clues that Mars could once have supported life.",
    ],
    11: [
      "Chapter 11 — The Unexpected Touchdown. A spacecraft named NEAR Shoemaker orbited asteroid 433 Eros.",
      "It was never meant to land; its job was to map the peanut-shaped rock from orbit.",
      "NEAR Shoemaker took pictures and studied the asteroid's surface.",
      "At the end of its mission, controllers tried something bold.",
      "They slowly lowered the spacecraft until it gently touched down on Eros.",
      "It became the first spacecraft to orbit and land on an asteroid.",
    ],
    12: [
      "Chapter 12 — The Long Goodbye. Pioneer 10 and 11 were scouts sent into the dark.",
      "They left before anyone knew how to cross the asteroid belt or survive Jupiter's radiation.",
      "Pioneer 10 flew past Jupiter, returning the first close-up images of the gas giant.",
      "Pioneer 11 visited Jupiter and Saturn, then continued outward.",
      "Their power faded long ago, but they are still coasting silently away from the Sun.",
      "They are among the first human-made objects to leave the solar system behind.",
    ],
    13: [
      "Chapter 13 — The Planet Hunter. For nine years, Kepler stared at one patch of sky.",
      "It watched thousands of stars, waiting for tiny dips in their light.",
      "Those dips meant a planet was crossing in front of a star.",
      "Kepler discovered thousands of exoplanets, worlds beyond our solar system.",
      "It changed how we see the galaxy, showing that planets are common.",
      "When its fuel ran out, Kepler drifted into an Earth-trailing orbit, still looking outward.",
    ],
  };
  // Build comic page slots: comics/ch{n}/page-{i}.png
  function makePages(chapterId, count) {
    const pages = [];
    const lines = NARRATION[chapterId] || [];
    for (let i = 1; i <= count; i++) {
      pages.push({
        src: "comics/ch" + chapterId + "/page-" + i + ".png",
        caption: "", // optional short caption printed under the art
        narration: lines[i - 1] || "", // read-aloud text for this page
      });
    }
    return pages;
  }
  /* ==========================================================
     14 CHAPTERS — Moon (5), Mars (6), Deep Space (3).
     Equipment names and facts come from the official
     NASA Space Apps Challenge Resources tab.
     ========================================================== */
    const CHAPTERS = [
    {
      id: 0,
      location: "The Moon",
      pin: "🌙",
      title: "Episode Zero: The Weight of Going Home",
      equipment: ["Why Things Stay"],
      brief:
        "Before the first chapter, a small explorer looks at the Moon and wonders why some machines must stay behind.",
      facts: [
        "Rocket fuel is limited, so heavy hardware is often left on the surface to save weight for the trip home.",
        "Every leftover lander, rover, and science station becomes a long-term witness to human exploration.",
      ],
      pages: makePages(0, 6),
      prompts: [
        {
          q: "Why do spacecraft leave hardware behind on other worlds?",
          answers: [
            ans("to save fuel", 65, "rare", [
              "to save fuel",
              "save fuel",
              "fuel",
              "need fuel to return",
              "to lift off",
            ]),
            ans("they are too heavy", 40, "uncommon", [
              "too heavy",
              "heavy",
              "weight",
            ]),
            ans("to return home", 25, "common", [
              "to return home",
              "go home",
              "return to earth",
            ]),
          ],
        },
        {
          q: "What world is shown in Episode Zero?",
          answers: [
            ans("the Moon", 110, "gem", [
              "the moon",
              "moon",
              "luna",
            ]),
            ans("Mars", 20, "common", [
              "mars",
              "the red planet",
            ]),
          ],
        },
        {
          q: "What kind of objects become quiet monuments on the Moon?",
          answers: [
            ans("machines", 65, "rare", [
              "machines",
              "spacecraft",
              "probes",
              "landers",
              "rovers",
            ]),
            ans("leftover hardware", 40, "uncommon", [
              "leftover hardware",
              "hardware",
              "equipment",
            ]),
          ],
        },
      ],
    },
    {
      id: 1,
      location: "The Moon",
      pin: "🌙",
      title: "The Launch Pad",
      equipment: ["Apollo Lunar Modules"],
      brief:
        "Chapter 1 — The Moon. Today's story: Apollo Lunar Modules. A spacecraft that flew to the Moon and stayed behind as a launch pad.",
      facts: [
        "Apollo Lunar Modules: The descent stages of the Lunar Modules (like Apollo 11's Eagle) were left behind as launch pads.",
      ],
      pages: makePages(1, 6),
      prompts: [
        {
          q: "Which space agency left equipment behind on the Moon, Mars, and deep space?",
          answers: [
            ans("NASA", 20, "common", [
              "nasa",
              "the nasa",
              "national aeronautics and space administration",
            ]),
          ],
        },
        {
          q: "What part of the Lunar Module was left behind on the Moon?",
          answers: [
            ans("descent stage", 70, "rare", [
              "descent stage",
              "descent stages",
              "the descent stage",
              "descent",
              "lunar module descent stage",
              "lm descent stage",
              "the bottom half",
              "lower stage",
            ]),
            ans("lunar module", 20, "common", [
              "lunar module",
              "lunar modules",
              "the lunar module",
              "module",
              "lm",
            ]),
            ans("lander", 15, "common", [
              "lander",
              "landers",
              "the lander",
            ]),
          ],
        },
        {
          q: "What was the name of Apollo 11's Lunar Module?",
          answers: [
            ans("Eagle", 110, "gem", [
              "eagle",
              "the eagle",
              "apollo 11 eagle",
              "lm eagle",
              "apollo 11 lunar module eagle",
            ]),
          ],
        },
      ],
    },
    {
      id: 2,
      location: "The Moon",
      pin: "🌙",
      title: "Parked Forever",
      equipment: ["Lunar Roving Vehicles"],
      brief:
        "Chapter 2 — The Moon. Today's story: Lunar Roving Vehicles. Three electric moon buggies still parked on the lunar surface.",
      facts: [
        "Lunar Roving Vehicles (LRVs): Three electric 'moon buggies' driven by astronauts. Parked permanently on the Moon.",
      ],
      pages: makePages(2, 6),
      prompts: [
        {
          q: "What did astronauts call the Lunar Roving Vehicle?",
          answers: [
            ans("moon buggy", 110, "gem", [
              "moon buggy",
              "moon buggies",
              "the moon buggy",
              "buggy",
            ]),
            ans("lunar rover", 65, "rare", [
              "lunar rover",
              "lunar roving vehicle",
              "lrv",
              "rover",
            ]),
          ],
        },
        {
          q: "What powered the moon buggies?",
          answers: [
            ans("batteries", 65, "rare", [
              "batteries",
              "battery",
              "electricity",
              "electric power",
            ]),
            ans("electricity", 40, "uncommon", [
              "electricity",
              "electric",
            ]),
          ],
        },
        {
          q: "How many moon buggies are still on the Moon?",
          answers: [
            ans("three", 110, "gem", [
              "three",
              "3",
              "3 buggies",
              "three buggies",
            ]),
          ],
        },
      ],
    },
    {
      id: 3,
      location: "The Moon",
      pin: "🌙",
      title: "The Listeners",
      equipment: ["Surveyor Landers", "ALSEP Packages"],
      brief:
        "Chapter 3 — The Moon. Today's story: Surveyor landers and ALSEP science packages. Robots that touched the dust first and kept listening after the astronauts left.",
      facts: [
        "Surveyor Landers: Robotic probes sent in the 1960s to prove soft landings were possible.",
        "ALSEP Scientific Packages: Apollo Lunar Surface Experiments Packages (seismometers, retroreflectors, etc.) left to do science after astronauts departed.",
      ],
      pages: makePages(3, 6),
      prompts: [
        {
          q: "What did Surveyor landers prove was possible?",
          answers: [
            ans("soft landings", 65, "rare", [
              "soft landings",
              "soft landing",
              "landing softly",
            ]),
            ans("landing on the Moon", 40, "uncommon", [
              "landing on the moon",
              "moon landing",
            ]),
          ],
        },
        {
          q: "What does ALSEP stand for?",
          answers: [
            ans("Apollo Lunar Surface Experiments Package", 110, "gem", [
              "apollo lunar surface experiments package",
              "apollo lunar surface experiment package",
            ]),
            ans("science package", 25, "common", [
              "science package",
              "experiments package",
            ]),
          ],
        },
        {
          q: "Which ALSEP instrument listens for moonquakes?",
          answers: [
            ans("seismometer", 65, "rare", [
              "seismometer",
              "seismometers",
            ]),
            ans("retroreflector", 40, "uncommon", [
              "retroreflector",
              "laser reflector",
            ]),
          ],
        },
      ],
    },
    {
      id: 4,
      location: "The Moon",
      pin: "🌙",
      title: "The Grave of the Innocent Scouts",
      equipment: ["Leftover Lunar Hardware"],
      brief:
        "Episode Four — The Moon. Today's story: the graveyard of lunar explorers. Landers, rovers, and experiments that did their jobs and stayed behind.",
      facts: [
        "The Moon holds a collection of Apollo hardware, Surveyor probes, rovers, and science experiments left as silent monuments.",
      ],
      pages: makePages(4, 6),
      prompts: [
        {
          q: "What kind of place has the Moon become for old spacecraft?",
          answers: [
            ans("a graveyard", 65, "rare", [
              "a graveyard",
              "graveyard",
            ]),
            ans("a museum", 40, "uncommon", [
              "a museum",
              "museum",
            ]),
            ans("monuments", 25, "common", [
              "monuments",
              "monument",
            ]),
          ],
        },
        {
          q: "Why are these lunar scouts called 'innocent'?",
          answers: [
            ans("they did their jobs", 65, "rare", [
              "they did their jobs",
              "did their jobs",
            ]),
            ans("they were left behind", 40, "uncommon", [
              "left behind",
              "abandoned",
            ]),
          ],
        },
        {
          q: "Name one type of hardware left on the Moon.",
          answers: [
            ans("lander", 40, "uncommon", [
              "lander",
              "landers",
            ]),
            ans("rover", 40, "uncommon", [
              "rover",
              "rovers",
              "moon buggy",
            ]),
            ans("science experiment", 25, "common", [
              "science experiment",
              "experiment",
            ]),
          ],
        },
      ],
    },
    {
      id: 5,
      location: "Mars",
      pin: "🔴",
      title: "The First Wheels",
      equipment: ["Sojourner Rover"],
      brief:
        "Chapter 5 — Mars. Today's story: Sojourner, the first rover on Mars. A tiny machine that proved wheels could roll on the red planet.",
      facts: [
        "Sojourner Rover: The first rover on Mars (1997), delivered by the Pathfinder lander. Now permanently parked.",
      ],
      pages: makePages(5, 6),
      prompts: [
        {
          q: "What was the first rover on Mars?",
          answers: [
            ans("Sojourner", 110, "gem", [
              "sojourner",
              "the sojourner",
              "sojourner rover",
            ]),
          ],
        },
        {
          q: "Which lander delivered Sojourner to Mars?",
          answers: [
            ans("Pathfinder", 65, "rare", [
              "pathfinder",
              "mars pathfinder",
              "the pathfinder",
            ]),
            ans("lander", 20, "common", [
              "lander",
              "the lander",
            ]),
          ],
        },
        {
          q: "When did Sojourner land on Mars?",
          answers: [
            ans("1997", 110, "gem", [
              "1997",
              "in 1997",
            ]),
          ],
        },
      ],
    },
    {
      id: 6,
      location: "Mars",
      pin: "🔴",
      title: "Digging for Life",
      equipment: ["Viking 1 & 2 Landers"],
      brief:
        "Chapter 6 — Mars. Today's story: Viking, the first successful U.S. landers on Mars. They scooped soil and searched for signs of life.",
      facts: [
        "Viking 1 & 2 Landers: The first U.S. landers to successfully operate on Mars (1976), remaining exactly where they touched down.",
      ],
      pages: makePages(6, 6),
      prompts: [
        {
          q: "Which landers were the first U.S. spacecraft to operate on Mars?",
          answers: [
            ans("Viking", 110, "gem", [
              "viking",
              "viking 1",
              "viking 2",
              "viking 1 and 2",
              "viking 1 & 2",
              "the viking landers",
            ]),
          ],
        },
        {
          q: "What did Viking do on the Martian surface?",
          answers: [
            ans("scooped soil", 65, "rare", [
              "scooped soil",
              "dug",
              "scooped",
              "searched for life",
            ]),
            ans("searched for life", 40, "uncommon", [
              "searched for life",
              "looked for life",
            ]),
          ],
        },
        {
          q: "When did Viking land on Mars?",
          answers: [
            ans("1976", 110, "gem", [
              "1976",
              "in 1976",
            ]),
          ],
        },
      ],
    },
    {
      id: 7,
      location: "Mars",
      pin: "🔴",
      title: "The First Knock",
      equipment: ["Viking 1 & 2 Landers"],
      brief:
        "Chapter 7 — Mars. Today's story: Viking's successful landing proved machines could survive on Mars, opening the door for future explorers.",
      facts: [
        "Viking 1 and Viking 2 proved that soft landings on Mars were possible and paved the way for later missions.",
      ],
      pages: makePages(7, 6),
      prompts: [
        {
          q: "What huge question did Viking answer?",
          answers: [
            ans("machines can survive on Mars", 65, "rare", [
              "machines can survive on mars",
              "can a machine survive on mars",
              "survive on mars",
            ]),
            ans("soft landings on Mars are possible", 40, "uncommon", [
              "soft landings on mars are possible",
              "landing on mars is possible",
            ]),
          ],
        },
        {
          q: "Which planet did Viking land on?",
          answers: [
            ans("Mars", 110, "gem", [
              "mars",
              "the red planet",
            ]),
          ],
        },
        {
          q: "In what year did Viking try the first knock on Mars?",
          answers: [
            ans("1976", 110, "gem", [
              "1976",
              "in 1976",
            ]),
          ],
        },
      ],
    },
    {
      id: 8,
      location: "Mars",
      pin: "🔴",
      title: "Phoenix & InSight",
      equipment: ["Phoenix Lander", "InSight Lander"],
      brief:
        "Chapter 8 — Mars. Today's story: Phoenix dug for water ice and InSight listened for marsquakes. Two landers that expanded what we know about the red planet.",
      facts: [
        "Phoenix Lander: Dug near Mars's north pole and found water ice in the soil.",
        "InSight Lander: Placed a seismometer on Mars and detected marsquakes.",
      ],
      pages: makePages(8, 6),
      prompts: [
        {
          q: "What did Phoenix dig for on Mars?",
          answers: [
            ans("water ice", 65, "rare", [
              "water ice",
              "frozen water",
              "ice",
            ]),
            ans("water", 25, "common", [
              "water",
            ]),
          ],
        },
        {
          q: "What did InSight listen for on Mars?",
          answers: [
            ans("marsquakes", 110, "gem", [
              "marsquakes",
              "marsquake",
              "mars quakes",
            ]),
            ans("tremors", 40, "uncommon", [
              "tremors",
              "shaking",
            ]),
          ],
        },
        {
          q: "What instrument did InSight use to listen to Mars?",
          answers: [
            ans("seismometer", 65, "rare", [
              "seismometer",
              "seismometers",
            ]),
            ans("microphone", 25, "common", [
              "microphone",
            ]),
          ],
        },
      ],
    },
    {
      id: 9,
      location: "Mars",
      pin: "🔴",
      title: "Spirit & Opportunity",
      equipment: ["Spirit Rover", "Opportunity Rover"],
      brief:
        "Chapter 9 — Mars. Today's story: twin rovers built for ninety days that rolled across Mars for years.",
      facts: [
        "Spirit and Opportunity: Twin Mars Exploration Rovers that far outlasted their planned missions.",
      ],
      pages: makePages(9, 6),
      prompts: [
        {
          q: "What are the names of the twin Mars rovers?",
          answers: [
            ans("Spirit and Opportunity", 110, "gem", [
              "spirit and opportunity",
              "spirit & opportunity",
              "spirit opportunity",
            ]),
          ],
        },
        {
          q: "How long were Spirit and Opportunity originally built to last?",
          answers: [
            ans("ninety days", 65, "rare", [
              "ninety days",
              "90 days",
              "3 months",
            ]),
            ans("a few months", 25, "common", [
              "a few months",
              "months",
            ]),
          ],
        },
        {
          q: "Spirit and Opportunity are examples of what kind of spacecraft?",
          answers: [
            ans("rovers", 65, "rare", [
              "rovers",
              "rover",
            ]),
            ans("Mars Exploration Rovers", 40, "uncommon", [
              "mars exploration rovers",
              "mer",
            ]),
          ],
        },
      ],
    },
    {
      id: 10,
      location: "Mars",
      pin: "🔴",
      title: "Curiosity",
      equipment: ["Curiosity Rover"],
      brief:
        "Chapter 10 — Mars. Today's story: Curiosity, a rolling chemistry lab the size of a car, powered by a warm plutonium heart.",
      facts: [
        "Curiosity Rover: A car-sized rover powered by a radioisotope generator. It studies whether Mars could have supported life.",
      ],
      pages: makePages(10, 6),
      prompts: [
        {
          q: "What powers the Curiosity rover?",
          answers: [
            ans("plutonium", 65, "rare", [
              "plutonium",
              "radioisotope",
              "nuclear power",
              "rtg",
            ]),
            ans("nuclear power", 40, "uncommon", [
              "nuclear power",
              "nuclear",
            ]),
          ],
        },
        {
          q: "About how big is Curiosity?",
          answers: [
            ans("the size of a car", 65, "rare", [
              "the size of a car",
              "car sized",
              "car-size",
            ]),
            ans("large", 25, "common", [
              "large",
              "big",
            ]),
          ],
        },
        {
          q: "What is Curiosity's main science goal?",
          answers: [
            ans("past habitability", 65, "rare", [
              "past habitability",
              "whether mars could support life",
              "life on mars",
            ]),
            ans("study rocks", 25, "common", [
              "study rocks",
              "drill rocks",
            ]),
          ],
        },
      ],
    },
    {
      id: 11,
      location: "Deep Space",
      pin: "🪐",
      title: "The Unexpected Touchdown",
      equipment: ["NEAR Shoemaker"],
      brief:
        "Chapter 11 — Deep Space. Today's story: NEAR Shoemaker, the first spacecraft to orbit and land on an asteroid.",
      facts: [
        "NEAR Shoemaker: First spacecraft to orbit and land on an asteroid. Left resting on the surface of 433 Eros.",
      ],
      pages: makePages(11, 6),
      prompts: [
        {
          q: "On which asteroid did NEAR Shoemaker land?",
          answers: [
            ans("433 Eros", 110, "gem", [
              "433 eros",
              "eros",
              "asteroid 433 eros",
            ]),
          ],
        },
        {
          q: "What made NEAR Shoemaker's landing 'unexpected'?",
          answers: [
            ans("it was not meant to land", 65, "rare", [
              "it was not meant to land",
              "never meant to land",
              "not designed to land",
            ]),
            ans("it was the first asteroid landing", 40, "uncommon", [
              "first asteroid landing",
              "first to land on an asteroid",
            ]),
          ],
        },
        {
          q: "What shape is asteroid 433 Eros?",
          answers: [
            ans("peanut-shaped", 65, "rare", [
              "peanut-shaped",
              "peanut shaped",
              "like a peanut",
            ]),
            ans("elongated", 25, "common", [
              "elongated",
              "long",
            ]),
          ],
        },
      ],
    },
    {
      id: 12,
      location: "Deep Space",
      pin: "🪐",
      title: "The Long Goodbye",
      equipment: ["Pioneer 10 & 11"],
      brief:
        "Chapter 12 — Deep Space. Today's story: Pioneer 10 and 11, early scouts that explored the outer planets and kept going.",
      facts: [
        "Pioneer 10 & 11: Early deep-space probes that explored the outer planets. Now drifting silently out of the solar system.",
      ],
      pages: makePages(12, 6),
      prompts: [
        {
          q: "Which planet did Pioneer 10 fly past first?",
          answers: [
            ans("Jupiter", 110, "gem", [
              "jupiter",
            ]),
          ],
        },
        {
          q: "Where are Pioneer 10 and 11 now?",
          answers: [
            ans("out of the solar system", 65, "rare", [
              "out of the solar system",
              "leaving the solar system",
              "beyond the solar system",
            ]),
            ans("deep space", 25, "common", [
              "deep space",
              "space",
            ]),
          ],
        },
        {
          q: "Why are they called scouts?",
          answers: [
            ans("they went first", 65, "rare", [
              "they went first",
              "first to explore",
              "pioneers",
            ]),
            ans("they explored unknown regions", 40, "uncommon", [
              "explored unknown regions",
              "went into the dark",
            ]),
          ],
        },
      ],
    },
    {
      id: 13,
      location: "Deep Space",
      pin: "🪐",
      title: "The Planet Hunter",
      equipment: ["Kepler Space Telescope"],
      brief:
        "Chapter 13 — Deep Space. Today's story: Kepler, the telescope that stared at one patch of sky and discovered thousands of worlds.",
      facts: [
        "Kepler Space Telescope: Revolutionary exoplanet-hunting telescope that ran out of fuel and is drifting in an Earth-trailing orbit.",
      ],
      pages: makePages(13, 6),
      prompts: [
        {
          q: "What was Kepler hunting for?",
          answers: [
            ans("exoplanets", 110, "gem", [
              "exoplanets",
              "exoplanet",
              "planets around other stars",
              "new worlds",
            ]),
            ans("planets", 40, "uncommon", [
              "planets",
              "new planets",
            ]),
          ],
        },
        {
          q: "How did Kepler find planets?",
          answers: [
            ans("by watching stars dip in brightness", 65, "rare", [
              "by watching stars dip in brightness",
              "dips in starlight",
              "transit method",
            ]),
            ans("it stared at one patch of sky", 40, "uncommon", [
              "stared at one patch of sky",
              "watched one area",
            ]),
          ],
        },
        {
          q: "Where is Kepler now?",
          answers: [
            ans("Earth-trailing orbit", 65, "rare", [
              "earth-trailing orbit",
              "trailing earth",
              "earth trailing",
            ]),
            ans("drifting in space", 25, "common", [
              "drifting in space",
              "drifting",
            ]),
          ],
        },
      ],
    },
  ];
  /* ---- Depth targets per chapter -------------------------------------
     Thresholds are derived from what each chapter can actually reward,
     so 3 stars is always reachable and 42 stars is a real goal.
     ------------------------------------------------------------------- */
  function maxDepthFor(chapter) {
    let max = 0;
    chapter.prompts.forEach(function (p) {
      let best = 0;
      p.answers.forEach(function (a) {
        if (a.depth > best) best = a.depth;
      });
      max += best;
    });
    return max;
  }
  function targetsFor(chapter) {
    const max = maxDepthFor(chapter);
    const round5 = function (n) {
      return Math.ceil(n / 5) * 5;
    };
    return {
      pass: 50, // reachable with two good answers in every chapter
      star2: round5(max * 0.6),
      star3: round5(max * 0.85),
      max: max,
    };
  }
  /* ==========================================================
     SPACE JUNK MUSEUM — every equipment entry verbatim from
     the official Resources tab of the challenge page.
     Each entry unlocks when its chapter is finished.
     `key` is a stable id used by the restore layer.
     ========================================================== */
  const MUSEUM = [
    {
      key: "apollo-lm",
      nssdcKeys: ["apollo11-lm"],
      chapter: 1,
      location: "The Moon",
      pin: "🌙",
      name: "Apollo Lunar Modules",
      fact:
        "The descent stages of the Lunar Modules (like Apollo 11's Eagle) were left behind as launch pads.",
    },
    {
      key: "lrv",
      nssdcKeys: [],
      nssdcNote: "NSSDCA catalogues the lunar rover as part of the Apollo 15, 16 and 17 Lunar Modules.",
      chapter: 2,
      location: "The Moon",
      pin: "🌙",
      name: "Lunar Roving Vehicles (LRVs)",
      fact:
        'Three electric "moon buggies" driven by astronauts. Parked permanently on the Moon.',
    },
    {
      key: "alsep",
      nssdcKeys: ["apollo14-lm"],
      chapter: 3,
      location: "The Moon",
      pin: "🌙",
      name: "ALSEP Scientific Packages",
      fact:
        "Apollo Lunar Surface Experiments Packages (seismometers, retroreflectors, etc.) left to do science after astronauts departed.",
    },
    {
      key: "surveyor",
      nssdcKeys: ["surveyor1", "surveyor3", "surveyor7"],
      chapter: 3,
      location: "The Moon",
      pin: "🌙",
      name: "Surveyor Landers",
      fact:
        "Robotic probes sent in the 1960s to prove soft landings were possible.",
    },
    {
      key: "sojourner",
      nssdcKeys: ["mars-pathfinder"],
      chapter: 5,
      location: "Mars",
      pin: "🔴",
      name: "Sojourner Rover",
      fact:
        "The first rover on Mars (1997), delivered by the Pathfinder lander. Now permanently parked.",
    },
    {
      key: "spirit-opportunity",
      nssdcKeys: ["spirit", "opportunity"],
      chapter: 9,
      location: "Mars",
      pin: "🔴",
      name: "Spirit & Opportunity",
      fact:
        "Twin rovers that operated for years. Both are now inactive monuments to Mars exploration.",
    },
    {
      key: "ingenuity",
      nssdcKeys: ["mars2020"],
      chapter: 5,
      location: "Mars",
      pin: "🔴",
      name: "Ingenuity Helicopter",
      fact:
        "The first aircraft on another planet. Sustained rotor damage and became a stationary artifact.",
    },
    {
      key: "viking",
      nssdcKeys: ["viking1-lm", "viking2-lm"],
      chapter: 6,
      location: "Mars",
      pin: "🔴",
      name: "Viking 1 & 2 Landers",
      fact:
        "The first U.S. landers to successfully operate on Mars (1976), remaining exactly where they touched down.",
    },
    {
      key: "phoenix-insight",
      nssdcKeys: ["phoenix", "insight"],
      chapter: 8,
      location: "Mars",
      pin: "🔴",
      name: "Phoenix & InSight Landers",
      fact:
        "Phoenix dug for water ice; InSight listened for marsquakes. Both eventually lost power.",
    },
    {
      key: "dawn",
      nssdcKeys: ["dawn"],
      chapter: 11,
      location: "Deep Space",
      pin: "🪐",
      name: "Dawn Spacecraft",
      fact:
        "Mapped Vesta and Ceres. Ran out of fuel and remains in a perpetual, unpowered orbit around Ceres.",
    },
    {
      key: "near",
      nssdcKeys: ["near"],
      chapter: 11,
      location: "Deep Space",
      pin: "🪐",
      name: "NEAR Shoemaker",
      fact:
        "First spacecraft to orbit and land on an asteroid. Left resting on the surface of 433 Eros.",
    },
    {
      key: "pioneer",
      nssdcKeys: ["pioneer10"],
      nssdcNote:
        "NSSDCA catalogues Pioneer 10 as 1972-012A and also holds NASA's own 'Pioneer 11 ends operations' report.",
      chapter: 12,
      location: "Deep Space",
      pin: "🪐",
      name: "Pioneer 10 & 11",
      fact:
        "Early deep-space probes that explored the outer planets. Now drifting silently out of the solar system.",
    },
    {
      key: "kepler",
      nssdcKeys: ["kepler"],
      chapter: 13,
      location: "Deep Space",
      pin: "🪐",
      name: "Kepler Space Telescope",
      fact:
        "Revolutionary exoplanet-hunting telescope that ran out of fuel and is drifting in an Earth-trailing orbit.",
    },
  ];
  // Daily "Mission fact" — rotates deterministically by calendar day.
  function dailyFactIndex(date) {
    const d = date || new Date();
    const days = Math.floor(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000
    );
    return days % MUSEUM.length;
  }
  window.NES_DATA = {
    CHALLENGE: CHALLENGE,
    TIERS: TIERS,
    ZONES: ZONES,
    zoneFor: zoneFor,
    CHAPTERS: CHAPTERS,
    MUSEUM: MUSEUM,
    targetsFor: targetsFor,
    maxDepthFor: maxDepthFor,
    dailyFactIndex: dailyFactIndex,
  };
})();
