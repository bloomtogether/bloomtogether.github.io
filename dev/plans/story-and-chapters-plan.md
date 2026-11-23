# Big & Small: the continuing story plan (v3)

This turns the game from one small level into a **big, explorable world with a story that keeps going**. There is no final "The End": the story is told in **Books**. Each Book is a set of chapters, ends on a reveal that opens the next one, and new chapters can keep being added.

Everything already built stays: online play, chat, names, the look and the controls. It ships in phases to https://bloomtogether.github.io/, and every phase is a complete, playable update.

---

## 1. A much bigger world

Today the whole game is one walled strip about **22 m wide and 90 m long**: one path, walls on both sides. The new world is built differently.

### The Vale: an open hub you walk around in
- A large, open central area of **about 300 × 300 m**, roughly 40 times today's level. It has hills, a river, bridges, forest edges, ruins and paths.
- The **sleeping Heart Tree** stands in the middle, huge and visible from everywhere, so you always know where you are.
- **Region gates** around the edge lead into each chapter's region. A gate opens when the story reaches it.
- **The Vale changes as you play.** Each root you wake brings part of it back to life: dry riverbeds fill, grey trees turn green, bridges reappear, and new paths and secrets open.
- **Free to explore** between chapters, with its own Golden Seeds, hidden Memory Petals, side caves and viewpoints.
- **Map screen (M key):** shows the Vale, the regions, where both players are, and what you've found.

### Bigger chapter regions
- Each chapter region is **3–5 times the size of today's level**, with open areas instead of a single corridor.
- **More than one route.** Main puzzles are spread out, and you choose the order you solve them in.
- **Optional side areas:** caves, rooftops, hidden rooms, a small optional puzzle or two per region.
- **Landmarks** you can see from far away (a windmill, a crystal spire, a clock tower), so the bigger space never feels confusing.
- **Fast travel:** waystones you've activated let you jump back to them, so bigger never means tedious.

### Keeping it smooth at this size
- Areas far from both players switch off automatically: their sound, animation and detail stop.
- Trees, rocks, grass and props are drawn in efficient batches.
- The level loads a region at a time, behind a short story scene, so loading never shows.
- Distant landmarks are kept simple, and fade gently into the haze.

---

## 2. The story (it keeps going)

### Premise
The **Everbloom Vale** was kept alive by one great **Heart Tree**. Its seven roots carried water to seven realms. Then came **the Hush**, a long silent storm that stopped the roots. The gardens sank, the mines went dark, the windmills stopped, the lake froze, the marsh fogged over, the clockwork library stopped ticking, the desert swallowed its temples, and the tree fell asleep.

Before it slept, the tree woke its two oldest caretakers: a **Giant** shaped from riverstone, and a **Sprite** made from one of its blossoms. They have forgotten everything, including each other.

### Book 1: The Seven Roots (chapters 1–8)
- Wake the seven roots, one per chapter.
- In chapter 8, climb the Heart Tree itself. It wakes and blooms, and the Vale turns green.
- **Not an ending: a reveal.** From the top of the tree, they see the Hush wasn't a storm at all. It came from beyond the mountains, from somewhere the tree's roots never reached. A path opens over the mountains: **"Book 2 begins."**

### Where the story goes next
Book 2 is not built in this plan; this is direction only. The plan keeps the door open:
- **Book 2: Beyond the Mountains** (ideas): a cold coast, a sunken city, a sky island. The search for where the Hush comes from, and other caretakers like you who are still asleep.
- The game structure (hub, regions, journal, save) is built so **new Books and chapters plug in** without redoing anything. The Vale stays your home base, and new paths open from it.

### The side story: "the forgotten bond" (runs through every Book)
- **Memory Petals** are hidden in every chapter and around the Vale. Each one unlocks a short illustrated memory.
- In Book 1 they reveal, in order, that the Giant and the Sprite were partners long before the Hush:
  - how they met, the Giant carrying a lost seed across the vale (chapters 1–3);
  - the years they spent tending it together (chapters 4–5);
  - how the Hush separated them (chapters 6–7);
  - and that they planted the Heart Tree together (chapter 8).
- **Find every petal in Book 1** and a secret memory hints at what happened to them **before** the vale, which is a thread Book 2 picks up.
- The side story never closes either: each Book adds new memories.

### How the story is told
- **Opening scenes:** a short camera fly-through of each new region, with 3–5 story lines in a storybook caption box. Skippable.
- **In-level dialogue:** short lines in speech bubbles above the characters, using **your actual names**. For example: *Anya: "It's so dark in here… stay close."*
- **Memory cards:** when someone finds a petal, a full-screen illustrated card with a short memory. Both players see it.
- **Journal:** a menu page with every memory found, the story so far, and the map.
- **Root-waking scenes:** as each root wakes, you see that part of the Vale come back to life.

---

## 3. The chapters of Book 1

Each chapter is a big region of **25–40 minutes**, with **6–8 co-op puzzles** (some optional), **3 Memory Petals**, **40 Golden Seeds**, **2–3 secret areas** and a waystone. Each chapter introduces **one new mechanic** and mixes in the earlier ones. Book 1 plus exploring the Vale is roughly **5–6 hours** for a first playthrough.

| # | Chapter | Look | New mechanic | Signature co-op puzzles |
|---|---|---|---|---|
| 1 | **The Sunken Garden** (today's level, rebuilt much bigger) | Sunny terraced gardens, ruins, waterworks | **Seesaw launch** + Giant **ground pound** | The gate, ravine throw, vault and two plates as today, plus a terraced upper garden, a seesaw up to a hidden balcony, a ground-pound secret cellar, and a flooded lower garden |
| 2 | **The Lantern Mines** | Dark crystal caves | Sprite **light pulse**; darkness | Crystal bridges that last while lit, mine carts (the Giant pushes, the Sprite switches tracks), a pulley lift, a rolling-boulder chase |
| 3 | **The Windmill Heights** | Floating orchard islands | **Wind currents** for gliding; **wading** | Ride windmill blades, throw the Sprite into a wind current, turn sails to redirect wind, the Giant wades deep water with the Sprite on his head |
| 4 | **The Frostmere Lake** | Frozen lake, snowy pines | **Ice**: slippery floors, thin ice | Sliding ice-block puzzles, thin ice that cracks under the Giant but holds the Sprite, snowballs that grow into bridges as the Giant rolls them, the Sprite's glow melts frozen switches |
| 5 | **The Mushroom Marsh** | Glowing swamp, fog, giant fungi | **Bouncy mushrooms**, growing vines | Trampoline chains, bounce the Giant onto ledges, the Sprite waters seed-pods to grow vine bridges, a fog maze only the Sprite's light can show |
| 6 | **The Clockwork Library** | A huge ticking library tower | **Gears, rotating rooms, timing** | The Giant turns big cranks while the Sprite rides inside the gears, rooms that rotate and change the floor, timed doors you pass together, bookshelf climbs |
| 7 | **The Sunstone Desert** | Dunes, buried temples | **Mirrors and light beams**; quicksand | The Giant pushes mirrors to aim the Sprite's beam at sun locks, quicksand that slowly sinks the Giant but not the Sprite, sandstorm gusts, a hidden tomb |
| 8 | **The Heart Tree** | Climbing the giant tree, inside and out | **Everything combined** + "the Hush stirs" | Climb ahead of a creeping dark fog using every ability together (no combat, just pressure and teamwork). The tree blooms, the Vale turns green, and the reveal opens **Book 2** |

---

## 4. Secrets and collectibles

| Collectible | Where | Purpose |
|---|---|---|
| **Root Stones** | 3 per chapter | Main progress; needed to wake each root |
| **Memory Petals** | 3 per chapter, plus a few in the Vale | Unlock the side story's memories |
| **Golden Seeds** | 40 per chapter, plus more around the Vale | Collect them; **plant them in the Vale** to grow flowers, trees and paths, so your garden shows your progress |
| **Secret areas** | 2–3 per chapter, plus Vale caves | Hidden rooms behind cracked walls, on high ledges, in dark corners |
| **Waystones** | 1–2 per region | Fast travel |

- The **chapter-end screen** shows time, seeds, petals, secrets, throws and falls.
- **Progress is saved** on your laptop (online: on the host's). You can return to any region to find what you missed.

---

## 5. Characters and feel
- **Giant:**
  - heavier, smoother animations: stomps, landing, push, carry, throw wind-up;
  - **dust puffs** on steps and landings;
  - an impact ring for the ground pound.
- **Sprite:**
  - livelier animations;
  - glowing trail;
  - a soft twinkle on jumps;
  - wings that flap faster while gliding.
- **Little reactions:**
  - a celebration when a puzzle is solved;
  - a wave when the other player comes close;
  - the Sprite can sit on the Giant's shoulder when idle.
- **Sound:**
  - footsteps per surface: grass, stone, wood, ice, sand;
  - better mechanism sounds;
  - **calm generated music** for the Vale and for each region.
- **Comfort settings:**
  - music and effects volume;
  - camera motion;
  - "reduce flashing".
  - No screen shake unless you turn it on.

## 6. Online and controls
- Online play, chat and names work everywhere, and story scenes play for both players at once.
- **New abilities use existing keys:**
  - Giant ground pound: jump, then interact in mid-air.
  - Sprite light pulse: interact when nothing else is nearby.
- **M opens the map.** Mute moves into the settings menu, and Shift+M still mutes quickly.
- Each new ability is explained the first time it appears.

---

## 7. Phases

| Phase | What you get | Playable result |
|---|---|---|
| **1** | The big world foundation: region loading, save, map, waystones, story system (scenes, dialogue, memory cards, journal), **the Vale hub** (first version, with the tree and the first gate), **Chapter 1 rebuilt much bigger** with seesaw, ground pound, secrets, petals and seeds, plus the feel and sound upgrades and the settings menu | Explore the Vale, then play a big story-driven Chapter 1 |
| **2** | Chapter 2: The Lantern Mines; the Vale's mine area wakes | Chapters 1–2 |
| **3** | Chapter 3: The Windmill Heights | Chapters 1–3 |
| **4** | Chapter 4: The Frostmere Lake | Chapters 1–4 |
| **5** | Chapter 5: The Mushroom Marsh | Chapters 1–5 |
| **6** | Chapter 6: The Clockwork Library | Chapters 1–6 |
| **7** | Chapter 7: The Sunstone Desert | Chapters 1–7 |
| **8** | Chapter 8: The Heart Tree, and the reveal that opens Book 2 | All of Book 1 |
| **Next** | Book 2: Beyond the Mountains | The story continues |

**Size:** Phase 1 is the biggest, roughly two to three times the v2 rebuild, because it builds the systems everything else uses: the big world, the hub, the story system and save. Each later phase is about one v2-sized build.

**Testing in every phase:**
- a scripted playthrough of every chapter so far;
- online play between two browsers on the live link;
- a check of each area in screenshots for clarity, color consistency and smooth frame rate at the larger size;
- then the push.

---

## 8. Open question
- **Story names:** should the characters also get story names (for example "Bram" the Giant and "Lumi" the Sprite)? Or should the story use only your own names? My suggestion is your own names in dialogue, and "the Giant" and "the Sprite" in narration. If you don't choose, I'll go with that.

---

## 9. Phase 1 status (first slice, November 2026)

**Built and playable:**
- **World foundation:** one region loaded at a time (the Vale, Chapter 1), a short fade between them, a save on the laptop (the host's save online), waystones with fast travel (3 in the Vale, 1 in Chapter 1).
- **Story system:** opening scenes with a slow camera glide and storybook captions (prologue, Chapter 1 intro, "the first root wakes"), skippable; character lines in speech bubbles using the players' names; memory cards with painted illustrations; a journal (story so far, memories, map); a map on **M**.
- **The Vale (first version):** about 230 m of walkable hills inside a ring of mountains, the Heart Tree in the middle (its seven roots light up as they wake), a river that is dry until Chapter 1 is done, three bridges, forests and ruins, a lookout hill, seven region gates (Chapter 1 open, the rest sealed and named), a Seed Garden where every 5 golden seeds planted grow flowers, 20 seeds, 1 petal, 1 secret.
- **Chapter 1, bigger:** the original puzzles plus a terraced east garden (seesaw, a ledge, a hidden balcony only a ground-pound launch reaches), a secret cellar under a cracked slab, and a flooded west garden (stepping stones, a throw to an island, a lever that raises a stone path). 40 seeds, 3 petals, 3 secrets, an exit gate back to the Vale, a chapter-end screen with stats.
- **New abilities:** Giant ground pound (jump, then interact in mid-air), seesaw launches. Each is explained the first time it appears.
- **Feel and sound:** dust on Giant steps and landings, an impact ring on ground pounds, sparkles on Sprite jumps, cheers when a puzzle is solved, footsteps per surface (grass, stone, wood), calm generated music per region.
- **Settings:** music and effects volume, reduce camera motion, reduce flashing, screen shake (off by default), erase save. Shift+M mutes.
- **Props:** Heart Tree, region gate, waystone, seesaw, memory petal, golden seed and stone bridge, modelled in Blender with softened Poly Haven textures.

**Still to do for Phase 1:**
- Chapter 1 is about twice the original area, not yet 3 to 5 times: an upper terrace route and more side areas are still to come.
- The Vale's side caves and more Vale petals and secrets.
- Little reactions: waving when the partner comes close, the Sprite sitting on the Giant's shoulder when idle.
- Streaming regions in and out instead of building both at load, and switching off far detail inside the Vale.
- A scripted playthrough checked into the repo, and an online test on the live link after the push.
