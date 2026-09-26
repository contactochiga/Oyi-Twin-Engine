/** Vite emits a URL string; Next hosts may supply StaticImageData. */
export function imageAssetUrl(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}
