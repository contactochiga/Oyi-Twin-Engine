/** Phase 3A decorative placement in the EXISTING Ground metre frame.
 * No new canonical room, asset, access rule, datum or route is defined here.
 * Bounds are shared by visual construction, route verification and the existing
 * conservative Explore admission callback. */
export interface GroundFurnishing {
  id: string; kind: 'sofa'|'chair'|'table'|'planter'|'desk'|'feature';
  x: number; z: number; width: number; depth: number; height: number; rotation?: number;
  palette?: 'cream'|'olive';
}
export const GROUND_FURNISHINGS: readonly GroundFurnishing[] = [
  {id:'concierge-desk',kind:'desk',x:4.65,z:6.35,width:1.05,depth:4.4,height:1.02},
  {id:'reception-feature',kind:'feature',x:6.94,z:7.2,width:.12,depth:3.4,height:4.15},
  {id:'lounge-west-sofa',kind:'sofa',x:-18.1,z:-5.1,width:3.15,depth:1.04,height:.82,palette:'cream'},
  {id:'lounge-west-chair',kind:'chair',x:-19.1,z:-1.45,width:1.04,depth:1.05,height:.87,rotation:Math.PI-.25,palette:'olive'},
  {id:'lounge-west-chair-2',kind:'chair',x:-16.7,z:-1.6,width:1.04,depth:1.05,height:.87,rotation:Math.PI+.25,palette:'cream'},
  {id:'lounge-west-table',kind:'table',x:-18,z:-3.2,width:1.25,depth:1.25,height:.36},
  {id:'lounge-east-sofa',kind:'sofa',x:-11.35,z:-4.5,width:2.75,depth:1.02,height:.82,rotation:-Math.PI/2,palette:'cream'},
  {id:'lounge-east-chair',kind:'chair',x:-12.1,z:-.5,width:1.04,depth:1.05,height:.87,rotation:2.75,palette:'olive'},
  {id:'lounge-east-table',kind:'table',x:-13,z:-2.6,width:1,depth:1,height:.38},
  {id:'lounge-planter-west',kind:'planter',x:-20.6,z:-5.5,width:.8,depth:.8,height:2.65},
  {id:'lounge-planter-east',kind:'planter',x:-10.6,z:1.5,width:.72,depth:.72,height:2.45},
  {id:'arrival-planter',kind:'planter',x:5.8,z:14.8,width:.8,depth:.8,height:2.8},
];
export function furnishingBounds(f: GroundFurnishing) {
 const c=Math.abs(Math.cos(f.rotation??0)),s=Math.abs(Math.sin(f.rotation??0));
 // Feature battens project 50mm beyond the stone's west face.
 if(f.kind==='feature')return {x:f.x-.025,z:f.z,width:f.width+.05,depth:f.depth};
 return {x:f.x,z:f.z,width:f.width*c+f.depth*s,depth:f.width*s+f.depth*c};
}
export const GROUND_FURNITURE_OBSTACLES=GROUND_FURNISHINGS.map(furnishingBounds);
export const GROUND_FINISH_LIMITS={pendantBottom:3.12,pendantTop:4.18,realLightCount:3,classification:'LUNA_REFERENCE_DESIGN',authority:'decorative-only'} as const;
