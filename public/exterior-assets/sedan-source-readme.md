
# Midsize Sedan — by MrJaneLAB

Thanks for downloading! Here's what's included in this asset and how it's organized.

## Contents

- **FBX/** — Ready-to-import models, one file per color (LOD0 / full detail).
  - **FBX/LOD1/** — Mid-detail versions for distance-based LOD systems.
  - **FBX/LOD2/** — Low-detail versions for distant/background use.
- **Blend/** — Native Blender source file, includes all 6 color variants and all 3 LOD levels, aligned and separated by color.
- **Renders/** — Preview images.

## Triangle count

- (LOD0): 4,293 tris (wheels and body); 1,158 body and 632 per wheel
- (LOD1): 3,025 tris  (wheels and body); 1,259 body and 441 per wheel
- (LOD2): 907 tris  (wheels and body)
- Materials: Material-based, no external texture maps required
- Formats: .fbx (export-ready), .blend (native Blender source)
- Colors included: White, Red, Blue (to be specific, Silver Frost, Midnight Red and Indigo Blue)

## Usage Notes

- Wheels are separate objects from the body, intended for independent rotation/physics setups.
- Materials are shared across color variants where applicable (e.g. wheels, glass, trim), only the body paint differs per color.
- For the Unity Store download, Materials are neatly organized under `Materials/` folder. In Unity or Blender, if you want to change Body color, create a new material and replace the current `[color]-metallic` material.
- LOD1 and LOD2 are optional; most engines will work fine using only the LOD0 files if you don't need a LOD system.

## License

CC0 — free for commercial and non-commercial use. Attribution optional, but appreciated!

## Credits

Created by MrJaneLAB

https://mrjanelab.itch.io

Enjoy, and if you use this in something, I'd genuinely love to see it!
