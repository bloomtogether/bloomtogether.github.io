# Big & Small

A two-player co-op puzzle adventure in the browser. A huge Giant and a tiny Sprite wake the Everbloom Vale, one root of the sleeping Heart Tree at a time. Neither can finish alone.

**Book 1: The Seven Roots.** You start in the Vale, an open hub around the Heart Tree. Four chapters are ready:

- **Chapter 1, The Sunken Garden:** three rune stones, a seesaw, a secret cellar, a flooded garden, the Hanging Orchard.
- **Chapter 2, The Lantern Mines** (opens after Chapter 1): dark caverns lit by the Sprite's light pulse. Crystal bridges that only hold while lit, a mine cart and track switch, a pulley lift, a boulder chase, a hidden crystal path and the Great Lantern.
- **Chapter 3, The Windmill Heights** (opens after Chapter 2): islands above the clouds. The Sprite rides rising winds and wind currents, the Giant wades a deep pond with the Sprite on its head, turns sails to steer the wind, and both ride a windmill wheel up to the High Orchard to restart the Great Windmill.
- **Chapter 4, The Frostmere Lake** (opens after Chapter 3): a frozen lake. Slippery ice, an ice block that slides until it hits something, thin ice that holds the Sprite but cracks under the Giant, a snowball that grows into a bridge, and the Sprite's glow that thaws frozen switches.
- **Chapter 5, The Mushroom Marsh** (opens after Chapter 4): a misty swamp of giant fungi. Springy mushrooms (hold jump as you land to bounce high; a Giant's slam throws whoever else is on the cap), dew lilies and seed-pods that grow vine bridges and a ladder, and Fog Hollow, whose boardwalk only rises near the Sprite's light.

Each chapter has memory petals, golden seeds and secrets. Progress saves on your laptop.

**Play:** https://bloomtogether.github.io/ on a laptop or desktop.

- **One keyboard:** Giant uses WASD, Space, E. Sprite uses the arrow keys, Enter, Right Shift.
- **Online (two laptops):** type your name, one player creates a room, the other joins with the 4-letter code. Browsers connect directly (WebRTC via PeerJS), no server needed.
- **Both:** Q / R turn the camera, M opens the map, Esc opens the menu (journal, map, settings), H hides the control cards, Shift+M mutes.
- **Giant ground pound:** jump, then press interact in mid-air.
- **Sprite light pulse:** press interact with nothing nearby.
- **Sprite rides the wind:** hold jump in a rising wind or a wind current.
- **Sprite thaws ice:** hold interact next to something frozen.
- **Online chat:** Enter to type, 1–4 for quick messages.

## For development

- Game source lives in `dev/src/` as numbered parts. Run `bash dev/build.sh` to join them into `game.js` (needs Node for the syntax check). It also stamps `index.html` with the build's fingerprint so an ordinary reload picks up a new build.
- Plans and design docs are in `dev/plans/`. `story-and-chapters-plan.md` is the current roadmap (Book 1: The Seven Roots, the Vale hub, eight chapters).
- Characters (`assets/models/giant.glb`, `sprite.glb`) are modelled, rigged and animated in Blender; the editable source is `dev/blender/characters.blend`. Props (Heart Tree, region gate, waystone, seesaw, petal, seed, bridge) are in `assets/models/`, modelled in Blender; the editable source is `dev/blender/phase1-props.blend`.
- Source parts: `02b-regions` (save, regions, props, collectibles, waystones), `02c-vale` (the hub), `02d-ch1x` (Chapter 1 additions), `02e-real` (realistic sky, ground, grass, trees, water), `02f-ch1real` (Chapter 1's realistic materials, trees and grass), `02g-orchard` (the Hanging Orchard), `02h-caves` (the Vale's side caves), `02i-mines` (Chapter 2: The Lantern Mines, dark regions), `02j-heights` (Chapter 3: The Windmill Heights, wind, wading), `02k-frost` (Chapter 4: The Frostmere Lake, ice, melting), `02l-marsh` (Chapter 5: The Mushroom Marsh, springy mushrooms, dew and seed-pods, the fog boardwalk), `06b-music`, `07b-story` (scenes, dialogue, memories, journal, map, settings).
- `window.__bs` exposes a small debug handle for scripted playthroughs (for example `__bs.startLocal()`, `__bs.travel(...)`, `__bs.stepSim(...)`).
- Scripted playthroughs: `dev/tests/ch1-playthrough.js`, `ch2-playthrough.js`, `ch3-playthrough.js`, `ch4-playthrough.js` and `ch5-playthrough.js` (run from the browser console, see the top of each file). `dev/tests/online-two.html` loads the game twice side by side to try an online room on one laptop.

## Credits

- Characters: modelled in Blender for this game. The Giant's riverstone uses [Poly Haven](https://polyhaven.com) Rock 01 and Concrete Moss by Rob Tuytel (CC0); the Sprite's petals and wings are painted in code.
- 3D engine: [Three.js](https://threejs.org) r149. Online: [PeerJS](https://peerjs.com).
- Prop textures: softened from [Poly Haven](https://polyhaven.com) (CC0): Bark Brown 02 and Sandstone Blocks 08 by Rob Tuytel, Wood Planks by Amal Kumar.
- Realistic world: [Poly Haven](https://polyhaven.com) (CC0) sky, ground, rock, masonry and Jacaranda tree; Chapter 1 walls use Sandstone Blocks 05 (Rob Tuytel) and floors Stone Floor (Dimitrios Savva).
- Everything else (levels, terrain, sounds, music, UI) is generated in code.
