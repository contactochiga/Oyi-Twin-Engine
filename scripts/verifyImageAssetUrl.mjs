import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({ server: { middlewareMode: true } });
try {
  const { imageAssetUrl } = await server.ssrLoadModule("/src/engine/components/spatial/imageAssetUrl.ts");
  assert.equal(imageAssetUrl("/vite/logo.png"), "/vite/logo.png");
  assert.equal(imageAssetUrl({ src: "/next/logo.png", width: 22, height: 22 }), "/next/logo.png");
  console.log("PASS Vite string / Next static image compatibility");
} finally { await server.close(); }
