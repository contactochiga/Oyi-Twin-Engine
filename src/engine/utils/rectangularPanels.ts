import type { BoxSpec } from "./geometryUtils";

export interface PanelOpening { x: number; y: number; width: number; height: number }
/** Axis-aligned XY panel minus explicit rectangular openings. No CSG dependency.
 * Returns non-overlapping solid cells; useful for authored wall/shaft apertures. */
export function rectangularPanels(width: number, height: number, thickness: number, openings: readonly PanelOpening[]): BoxSpec[] {
  const x0 = -width / 2, x1 = width / 2, y0 = -height / 2, y1 = height / 2;
  const xs = [...new Set([x0, x1, ...openings.flatMap(o => [Math.max(x0, o.x - o.width / 2), Math.min(x1, o.x + o.width / 2)])])].filter(x => x >= x0 && x <= x1).sort((a,b) => a-b);
  const ys = [...new Set([y0, y1, ...openings.flatMap(o => [Math.max(y0, o.y - o.height / 2), Math.min(y1, o.y + o.height / 2)])])].filter(y => y >= y0 && y <= y1).sort((a,b) => a-b);
  const boxes: BoxSpec[] = [];
  for (let i=1; i<xs.length; i++) for (let j=1; j<ys.length; j++) {
    const x=(xs[i-1]+xs[i])/2, y=(ys[j-1]+ys[j])/2;
    if (openings.some(o => Math.abs(x-o.x)<o.width/2 && Math.abs(y-o.y)<o.height/2)) continue;
    boxes.push({ size: [xs[i]-xs[i-1], ys[j]-ys[j-1], thickness], position: [x,y,0] });
  }
  return boxes;
}
