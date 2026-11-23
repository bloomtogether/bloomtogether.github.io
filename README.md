# Big & Small

A two-player co-op puzzle adventure in the browser. A huge Giant and a tiny Sprite wake the Everbloom Vale, one root of the sleeping Heart Tree at a time. Neither can finish alone.

**Book 1: The Seven Roots.** You start in the Vale, an open hub around the Heart Tree. Chapter 1, The Sunken Garden, is ready: three rune stones, a seesaw, a secret cellar, a flooded garden, memory petals and golden seeds. Progress saves on your laptop.

**Play:** https://bloomtogether.github.io/ on a laptop or desktop.

- **One keyboard:** Giant uses WASD, Space, E. Sprite uses the arrow keys, Enter, Right Shift.
- **Online (two laptops):** type your name, one player creates a room, the other joins with the 4-letter code. Browsers connect directly (WebRTC via PeerJS), no server needed.
- **Both:** Q / R turn the camera, M opens the map, Esc opens the menu (journal, map, settings), H hides the control cards, Shift+M mutes.
- **Giant ground pound:** jump, then press interact in mid-air.
- **Online chat:** Enter to type, 1–4 for quick messages.

## For development

- Game source lives in `dev/src/` as numbered parts. Run `bash dev/build.sh` to join them into `game.js` (needs Node for the syntax check).
- Plans and design docs are in `dev/plans/`. `story-and-chapters-plan.md` is the current roadmap (Book 1: The Seven Roots, the Vale hub, eight chapters).
- Characters (`assets/models/giant.glb`, `sprite.glb`) are modelled, rigged and animated in Blender; the editable source is `dev/blender/characters.blend`. Props (Heart Tree, region gate, waystone, seesaw, petal, seed, bridge) are in `assets/models/`, modelled in Blender; the editable source is `dev/blender/phase1-props.blend`.
- Source parts: `02b-regions` (save, regions, props, collectibles, waystones), `02c-vale` (the hub), `02d-ch1x` (Chapter 1 additions), `06b-music`, `07b-story` (scenes, dialogue, memories, journal, map, settings).
- `window.__bs` exposes a small debug handle for scripted playthroughs (for example `__bs.startLocal()`, `__bs.travel(...)`, `__bs.stepSim(...)`).

## Credits

- Characters: modelled in Blender for this game. The Giant's riverstone uses [Poly Haven](https://polyhaven.com) Rock 01 and Concrete Moss by Rob Tuytel (CC0); the Sprite's petals and wings are painted in code.
- 3D engine: [Three.js](https://threejs.org) r149. Online: [PeerJS](https://peerjs.com).
- Prop textures: softened from [Poly Haven](https://polyhaven.com) (CC0): Bark Brown 02 and Sandstone Blocks 08 by Rob Tuytel, Wood Planks by Amal Kumar.
- Everything else (levels, terrain, sounds, music, UI) is generated in code.
