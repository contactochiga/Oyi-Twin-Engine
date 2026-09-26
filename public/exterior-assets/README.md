# Luna exterior reference assets

These are decorative visual assets, not canonical equipment or operational truth.

- Midsize Sedan by MrJaneLAB, CC0: https://mrjanelab.itch.io/low-poly-midsize-sedan-lod-included
- Palm tree v2 by Yughues/Nobiax, CC0: https://opengameart.org/content/palm-tree-v2

Source readmes retained alongside this file. Changes and exact hashes are in sources.json. The offline conversion script is scripts/prepareExteriorHeroAssets.mjs; it accepts the two extracted source folders. Palm textures are converted from the supplied TGA files without resampling (1024px), to PNG for alpha colour and JPEG quality 85 for the normal map.

Runtime URLs are local. No credentials, remote assets, or decoder downloads are needed. Imported hierarchy, animation, metadata, cameras and lights are not mounted. Geometries/materials are copied and checked against fixed budgets/bounds. Source meshes are merged by material before export. Both LODs must load successfully; otherwise the inherited procedural representation remains. Missing palm textures also trigger fallback.
