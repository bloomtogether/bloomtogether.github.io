# Big & Small: visual overhaul plan (v2)

What changes and why, based on your first playthrough. The level, the puzzles, the controls and online play stay the same. This is a new look, new characters, a new camera and new UI.

---

## 1. Fix the headaches first

The main causes were noise, shimmer and camera motion. All of these change:

- **No spiky grass.** The thousands of thin blades shimmered and flickered as the camera moved. The ground becomes soft, smooth grass color with a few rounded tufts and flowers.
- **No noisy textures.** Busy stone, moss and dirt patterns are replaced with clean, flat-shaded surfaces with gentle color variation.
- **Smooth edges.** Antialiasing is on and sharpness is tuned for Retina screens.
- **Calm camera.** Smooth follow with no jitter, no screen shake, no constant zooming in and out, and a fixed comfortable distance.
- **Softer lighting.** Lower contrast, no harsh dark shadows, bright daytime sky.
- **Steady 60 fps** on a normal laptop.

## 2. Art style: bright and stylized

- Chunky, rounded shapes and clean colors, in the style of mobile strategy and adventure games.
- **Palette:** warm sandstone walls, fresh greens, teal water, blue sky, and soft orange and mint as the two player colors.
- **Soft cartoon shading** with gentle shadows, and a thin dark outline around the characters so they always stand out.
- **The camera sits higher** and looks down more, so you see more of the area and less wall.

## 3. New characters (free CC0 models)

Both come from the **KayKit Adventurers pack by Kay Lousberg**. It's CC0, so it's free to use with no credit required, and it comes from the official KayKit GitHub. It has 75 animations. Using one pack means both characters match in style.

| | **Giant** (the big player) | **Sprite** (the small player) |
|---|---|---|
| Model | KayKit **Barbarian**, a burly bearded strongman, scaled up to giant size (about 2.3 m) | KayKit **Rogue (hooded)**, shrunk to about 45 cm and recolored mint and white |
| Extra touches | Orange ground ring | Glowing wings, a soft light, a sparkle trail and a mint ground ring |
| Animations | Idle, walk, run, jump, pick up, carry, throw, push, interact | Idle, run, jump, glide, interact (lever, crank) |

The giant is an **original use of a free model**, not a copy of the Clash Royale Giant, but it has the same chunky, friendly, big-fisted feel.

## 4. Camera: see-through walls plus rotation

- **Walls fade out** automatically whenever they're between the camera and either character.
- **Outlines through walls:** if a character is still hidden, its outline shows through in its player color (orange or mint).
- **Rotate the camera** in smooth 90° turns with **Q** and **R**. Movement keys always follow the screen, so "up" stays "up" after rotating.
  - **Online:** each player rotates their own view.
  - **Same keyboard:** either player can rotate the shared view.

## 5. Make important things obvious

- **Crawl holes** get a stone arch frame, a glowing mint rim and a small floating Sprite icon, so they say "only Sprite fits here".
- **Levers, cranks and pressure plates** are brightly colored and pulse gently when they're the next thing to use.
- **Rune stones** get a stronger glow and a floating marker.
- **Off-screen marker:** if your partner is ever off-screen, an arrow at the screen edge points to them.

## 6. New UI

- Brighter, friendlier panels with rounded corners, color-coded per player (Giant orange, Sprite mint).
- **Fixes the overlap from your screenshot.** Hints move to the top center and never cover the control cards.
- Control cards are smaller, and **H** hides them.
- A smaller objective panel that's easier to skim.
- The title, briefing, pause and end screens are restyled to match.

## 7. Player names

- **Before playing, each player types a name** (up to 16 characters).
  - **Online:** you enter your own name before you create or join a room.
  - **Same keyboard:** the briefing screen has a name box for each character.
- The game **remembers your name** on that laptop, so next time it's already filled in.
- **Where names show up:**
  - A **floating name tag** above each character, in that player's color.
  - The **lobby**, for example "Anya joined and plays Sprite."
  - The control cards, for example "Sam, Giant".
  - Event messages, for example "Anya pulled the lever".
  - The end screen.

## 8. In-game chat (online)

- **Press Enter** to open the chat box, type, then press **Enter** to send. **Esc** cancels.
  - While you type, your character stands still, so letters don't move it.
  - Online, Sprite jumps with **Space**, so Enter is free for chat.
- **Messages appear** in a small chat panel in the bottom-left that fades after a few seconds, and as a **speech bubble above your character**.
- **Quick messages:** press **1** to **4** to send a one-key shout without typing: "Over here!", "Throw me!", "Wait for me", "Got it!".
  - Each shows as a bubble and plays a soft sound, so your partner notices.
- Chat also works **in the lobby**, before the game starts.
- **Safety:** messages show as plain text only, so nothing typed can break the page. The length limit is 140 characters, and there's a short cooldown to stop spam.
- **Same keyboard:** there's no chat, since you're sitting together. Names still show.

## 9. Files I'd download

All of these come from the official KayKit GitHub repo, `KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0` (CC0):

| File | Size |
|---|---|
| `Barbarian.glb` | 3.6 MB |
| `Rogue_Hooded.glb` | 3.6 MB |
| `barbarian_texture.png` | 15 KB |
| `rogue_texture.png` | 17 KB |
| `LICENSE.txt` | 1 KB |

These go in your `bloomtogether` repo next to the game. Three.js's model loader (`GLTFLoader`) loads from the same CDN as the game engine. The game opens in about the same time; the models add roughly 7 MB on first load and are cached after that.

## 10. Testing before I push

- The scripted full-level run still reaches the ending with the new characters.
- Each wall fades correctly at the crawl hole, ledge, vault and alcove.
- Camera rotation keeps the controls matched to the screen.
- Online play between two browsers on the live link: create, join, play, sync.
- Names show in the lobby, on the name tags and on the end screen. Chat messages and quick messages reach the other player, both in the lobby and while playing. Typing in chat never moves your character.
- Screenshots of each area, checked for readability and no shimmer.
