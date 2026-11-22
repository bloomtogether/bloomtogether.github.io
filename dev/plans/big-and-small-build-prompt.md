# Build prompt: Big & Small: The Sunken Garden

## 1. What to build

A complete, playable **3D two-player co-op puzzle-adventure** that runs in any modern desktop browser (Chrome, Edge, Firefox, Safari) from a single HTML file.

Two characters who need each other cross one large level, the **Sunken Garden**, to wake a dry fountain:

- **Golem**: a huge, slow, mossy stone giant. Strong but heavy and clumsy.
- **Sprite**: a tiny, quick, glowing forest spirit. Fragile but fits anywhere.

**The goal:** recover **3 rune stones** scattered through the garden, set them into the fountain, then lift Sprite to the fountain's spout to wake it. Neither character can finish alone.

**Session length:** one big level, about 15–25 minutes for a first playthrough.

---

## 2. Hard requirements

1. **One file, runs in any browser.** Single `.html` file. The only external resources are Three.js (pinned version, from a CDN) and Google Fonts. All textures, sounds and models are **generated in code**: no image, model or audio files.
2. **Two play modes:**
   - **Same keyboard:** both players on one laptop. Works fully offline from the plain file, apart from the CDN.
   - **Online:** each player on their own laptop with a 4-letter room code. Works when the game is opened from its claude.ai link. If online isn't available, the game says so clearly and same-keyboard still works.
3. **Shared camera:** one camera that pans and zooms to keep both characters on screen.
4. **Clear on-screen controls and instructions:** a how-to-play section on the title screen, a control card always visible during play for each player (can be collapsed), contextual button prompts near the action, an objective tracker, and a pause menu that repeats the controls.
5. **Complete:** title screen, level, all puzzles solvable, an ending sequence, an end screen with stats, restart and back to menu. No placeholders, no "TODO", no dead buttons.
6. **No console errors.** Runs at a steady 60 fps on a normal laptop with integrated graphics.

---

## 3. Visual direction: realistic, not "AI slop"

The look is a **grounded, realistic late-afternoon ruin**, not cartoon, neon or glossy.

**Lighting**
- Low warm sun (about 35° elevation) with **soft real-time shadows**.
- Cool sky fill light (hemisphere light), ACES filmic tone mapping, sRGB output.
- Exponential **atmospheric fog** that matches the horizon color, so distances fade naturally.
- The Sprite carries a **small real light** that lights up dark crawl tunnels and nearby walls.
- Rune stones glow faintly and light their surroundings.

**Materials and textures** (all generated in code, with matching normal maps for surface relief)
- Weathered **stone brick walls** with mortar, color variation per brick and **moss** creeping in.
- Irregular **flagstone paving** (Voronoi stones with beveled edges) in the later areas.
- **Grass and dirt ground** with natural patchiness.
- **Rough rock** for cliffs, boulders and the Golem's body.
- **Wood grain** for the gate and drawbridge, **dark iron** for the portcullis and bands.
- Muted, natural palette: stone greys and beiges, olive and moss greens, warm sunlight, teal rune glow as the **only** saturated accent.

**Environment detail**
- Thousands of **grass blades** (instanced) that sway in the wind.
- Broken columns, rubble, urns, boulders, trees and cypresses outside the walls, distant hills in the fog.
- A real **ravine** cutting through the land, with cliff faces and water far below.
- Dust motes floating in the sunlight. Fireflies in the fountain chamber.

**Characters** (built from sculpted, noise-displaced shapes, not plain spheres and boxes)
- **Golem:** a body of chiseled rock chunks (legs, torso, shoulders, arms, fists), moss patches, amber glowing eye slit. Heavy walk with a body sway and arm swing. Lifts its arms to carry. **Collected runes glow in three chest sockets.**
- **Sprite:** about 40 cm tall, pale glowing body, translucent fluttering wings, soft halo, faint particle trail.

**UI style**
- Restrained, readable and game-appropriate: dark translucent slate panels, thin borders, an inscription-style serif for headings (Marcellus) and a clean sans for text (Work Sans).
- Key caps drawn as small outlined chips.
- No emoji, no rainbow gradients, no bouncy stickers.

---

## 4. The characters

| | **Golem** | **Sprite** |
|---|---|---|
| Size | 2.3 m tall, wide | 0.4 m tall, tiny |
| Speed | Slow (3.4 m/s) | Fast (5.2 m/s) |
| Jump | Low (1.4 m), can't jump while carrying | 1.1 m, **hold jump to glide** (slow fall, slower air speed) |
| Special | **Push** heavy blocks, **pick up and throw Sprite** (hold to charge: tap gives a short high lob, a full charge gives a long throw), **absorb rune stones**, weighs down **heavy pressure plates** | Fits through **small crawl holes**, pulls **levers**, turns **cranks**, nudges objects, presses **light plates**, can **stand on Golem's head** |
| Can't | Fit through small gaps, reach high ledges alone, cross wide gaps | Push or carry heavy things, press heavy plates, cross the ravine alone |

**Physics rules:** real gravity, solid collisions, step-up over small edges, blocks that fall when pushed off edges, Sprite can ride on Golem. If a character falls into the ravine, it respawns at the last checkpoint it reached.

---

## 5. The level: the Sunken Garden

The level is laid out from south to north and split into four connected areas. Each area teaches or tests something new.

### Area 1: The Courtyard (tutorial)
- **Start:** both characters at the south end. On-screen hints introduce movement.
- **Puzzle: the gate.** The north gate is shut. Its lever sits in a small sealed side room behind the east wall, reachable only through a **small crawl hole**. Sprite crawls through and pulls the lever, and the gate grinds open.
- **Rune 1, the ledge.** The rune rests on a 2.4 m stone ledge. Golem pushes a stone block next to the ledge, climbs onto the block, then onto the ledge, and absorbs the rune.
- Teaches: crawl holes, levers, pushing, climbing, absorbing runes.

### Area 2: The Ravine
- A **6 m chasm** with a raised drawbridge on the far side.
- **Puzzle: the drawbridge.** Golem picks up Sprite and **throws** it across. Sprite turns the **crank**, and the bridge lowers for Golem.
- **Rune 2, the column.** The rune sits on top of a tall 3.8 m column. Golem **lob-throws** Sprite up onto the column, Sprite **nudges** the rune off, it falls, and Golem absorbs it.
- Teaches: throwing, charged throws, air control, gliding.

### Area 3: The Waterworks
- Paved terrace with water channels, pipes and a heavy iron **portcullis** to the north.
- **Rune 3, the vault.** A sealed stone vault with only a small slot. Sprite crawls in and pulls a lever, and the rune rolls out through the slot to Golem.
- **Puzzle: the portcullis.** It opens only when **two pressure plates are held at the same time**: a **heavy plate** that needs Golem, and a **light plate** inside a walled alcove that only Sprite can enter. They are about 14 m apart. Holding both for about a second locks the mechanism open.
- Teaches: timing together and splitting up.

### Area 4: The Fountain Chamber (finale)
- A tall, columned chamber with a dry fountain at its center, three empty rune sockets on its rim, and fireflies.
- **Step 1:** Golem brings the runes to the fountain and sets them in. Each socket lights up.
- **Step 2:** the spout on top of the fountain's column must be woken. Golem throws Sprite up there, or Sprite climbs onto Golem's head on the rim and jumps.
- **Ending:** water bursts from the spout, the basin fills, light and particles rise, a musical swell plays. Then the end screen shows the time, falls, throws and a "Play again" button.

**Checkpoints** at the start of each area. **No timers or fail states** apart from falling.

---

## 6. Controls

### Same keyboard
| Action | **Golem** (left hand) | **Sprite** (right hand) |
|---|---|---|
| Move | W A S D | Arrow keys (or I J K L) |
| Jump | Space | Enter (or O) |
| Interact / grab / throw | E (hold to charge a throw) | Right Shift (or U) |

### Online (each player on their own laptop)
- Move: WASD or arrow keys
- Jump: Space (Sprite: hold to glide)
- Interact / grab / throw: E (Golem: hold to charge)

### Both modes
- **Esc** pauses and shows the controls. Online, it opens the menu without stopping the game.
- **H** hides or shows the control cards.
- **Gamepads** are supported: left stick moves, A jumps, X or B interacts. In same-keyboard mode the first pad is Golem and the second is Sprite.

Movement is relative to the camera, so up on the keyboard always means up on the screen.

---

## 7. On-screen guidance

- **Briefing screen before play starts:** shown every time you enter the game, same-keyboard or online. It covers the goal, each character's abilities with their exact keys side by side, how the throw works, and three quick tips. Same keyboard: each player presses their own jump key to mark themselves ready, then the level begins, so both people have seen their controls. Online: the briefing is part of the lobby, and the host starts once the partner has joined.
- **Objective tracker** (top left): the current main goal in one sentence, plus the three runes with their status (not found / carried / placed).
- **Contextual prompts** above each character's control card, for example "E Pick up Sprite", "Hold E Charge throw", "Right Shift Pull lever", "Hold jump to glide".
- **Throw charge meter** while Golem charges.
- **Plate status** in the Waterworks: two indicators and a lock-progress bar.
- **Short toasts** for events: "Gate opened", "Rune absorbed (2/3)", "Sprite fell, back to checkpoint".
- **First-time hints** that appear once, the first time a mechanic becomes relevant.

---

## 8. Online play

- Title screen → **Play online** → **Create room** (choose to play as Golem or Sprite) or **Join room** with the 4-letter code.
- The lobby shows the code, whether the partner has connected, and who plays whom. The host presses **Start**.
- **Host-authoritative:** the host's browser runs the simulation. The guest sends inputs and receives the world state about 30 times per second, smoothed with interpolation. Both players see the same thing.
- If the partner disconnects, the game pauses with a clear message and resumes when they come back.
- Uses the claude.ai page's built-in live room feature, with no server to run. When the file is opened outside claude.ai, the online buttons are disabled with an explanation.

---

## 9. Sound (all synthesized in code)

- **Ambience:** soft wind and occasional birdsong. Water ambience near the channels and ravine.
- **Golem:** heavy footstep thuds and stone grinding when pushing.
- **Sprite:** light chimes when jumping, and wing flutter while gliding.
- **World:** lever and crank clunks, a stone-door rumble, the drawbridge creak, the pressure-plate click, a rune chime chord, a splash when falling.
- **Ending:** rising water and a warm chord swell.
- Mute toggle with M.

---

## 10. Technical approach

- **Rendering:** Three.js (pinned UMD build from jsDelivr), WebGL with soft shadow maps, ACES tone mapping, sRGB.
- **Physics:** a custom, deterministic character controller built for this game: box-based world colliders, separate per-axis movement and collision, step-up, pushable blocks, moving doors and bridge, standing on Golem. No external physics engine, which keeps it small and reliable.
- **Fixed 60 Hz simulation step**, rendering at display rate.
- **Procedural assets:** canvas-generated color and normal maps with tileable noise and Voronoi, noise-displaced geometry for rocks and the Golem, instanced grass with a wind shader.
- **Performance:** instancing for grass, limited shadow-casting objects, the shadow camera follows the action, no light count changes at runtime (avoids shader recompile stutter).
- **Robustness:** handles window resizing and pauses cleanly when the tab is hidden. Shows a friendly message if WebGL or the CDN fails to load. Shows a "desktop only" note on touch devices.

---

## 11. Done means

- [ ] Opens from the plain HTML file and from the claude.ai link with no errors.
- [ ] Title screen, how to play, same-keyboard mode, online lobby, pause, ending and end screen all work.
- [ ] Every puzzle can be solved with only the intended co-op mechanics, and neither character can finish alone.
- [ ] Falling always respawns safely, and nothing can soft-lock the level (the block can't get permanently stuck, and runes that fall in the ravine return to a safe spot).
- [ ] Controls are always visible or one key away. Every interactable shows a prompt.
- [ ] The look reads as a realistic, lit, textured ruin and not as primitive shapes on a flat color.
- [ ] Tested by simulating the full solution path in code, plus a visual check in a browser.
