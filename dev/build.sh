#!/bin/bash
# Joins dev/src/*.js (in order) into ../game.js and syntax-checks it.
# Usage: bash dev/build.sh   (from anywhere)
cd "$(dirname "$0")"
OUT=../game.js
{
  echo "// Big & Small. Built from dev/src/*.js by dev/build.sh. Three.js r149 (ES modules), characters and props modelled in Blender with Poly Haven textures (CC0)."
  echo "import * as THREE from 'three';"
  echo "import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';"
  echo "import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';"
  echo "import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';"
  echo "import {Water} from 'three/addons/objects/Water.js';"
  echo "(() => {"
  echo '"use strict";'
  for f in src/01-core.js src/02-world.js src/02b-regions.js src/02c-vale.js src/02d-ch1x.js src/02e-real.js src/02f-ch1real.js src/02g-orchard.js src/02h-caves.js src/03-chars.js src/04-sim.js src/05-input.js src/06-audio.js src/06b-music.js src/07-hud.js src/07b-story.js src/08-visuals.js src/09-net.js src/10-main.js; do cat "$f"; echo; done
  echo "})();"
} > "$OUT"
# check it as an ES module (the browser loads it as one); a plain --check can miss errors
TMP=$(mktemp -t bsXXXX).mjs; cp "$OUT" "$TMP"; node --check "$TMP" 2>&1 && echo BUILD_OK; rm -f "$TMP"
