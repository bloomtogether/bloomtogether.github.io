# Big & Small: The Sunken Garden

A two-player co-op puzzle adventure in the browser. A huge Giant and a tiny Sprite cross a sunken garden together to wake its dry fountain. Neither can finish alone.

**Play:** https://bloomtogether.github.io/ on a laptop or desktop.

- **One keyboard:** Giant uses WASD, Space, E. Sprite uses the arrow keys, Enter, Right Shift.
- **Online (two laptops):** type your name, one player creates a room, the other joins with the 4-letter code. Browsers connect directly (WebRTC via PeerJS), no server needed.
- **Both:** Q / R turn the camera, Esc opens the menu, H hides the control cards, M mutes.
- **Online chat:** Enter to type, 1–4 for quick messages.

## For development

- Game source lives in `dev/src/` as numbered parts. Run `bash dev/build.sh` to join them into `game.js` (needs Node for the syntax check).
- Plans and design docs are in `dev/plans/`. `story-and-chapters-plan.md` is the current roadmap (Book 1: The Seven Roots, the Vale hub, eight chapters).
- Characters are loaded from `assets/` (KayKit, CC0).

## Credits

- Characters: [KayKit Adventurers](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) by Kay Lousberg, CC0 (see `assets/KAYKIT-LICENSE.txt`).
- 3D engine: [Three.js](https://threejs.org) r149. Online: [PeerJS](https://peerjs.com).
- Everything else (level, textures, sounds, UI) is generated in code.
