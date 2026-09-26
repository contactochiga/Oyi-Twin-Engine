import {furnishingBounds,type GroundFurnishing} from './groundInterior/groundInteriorLayout';
/** Presentation only, in the existing L01 datum frame. No new canonical assets. */
export const L01_FURNISHINGS:readonly GroundFurnishing[]=[
 {id:'lounge-primary-sofa',kind:'sofa',x:16,z:-5.8,width:3.15,depth:1.04,height:.82,palette:'cream'},
 {id:'lounge-primary-chair',kind:'chair',x:17,z:-2.65,width:1.04,depth:1.05,height:.87,rotation:Math.PI+.2,palette:'olive'},
 {id:'lounge-primary-table',kind:'table',x:16,z:-4.15,width:1.25,depth:1.25,height:.36},
 {id:'lounge-social-sofa',kind:'sofa',x:12.4,z:-10.25,width:2.65,depth:1.04,height:.82,palette:'cream'},
 {id:'lounge-social-chair',kind:'chair',x:15.6,z:-9.8,width:1.04,depth:1.05,height:.87,rotation:-Math.PI/2,palette:'olive'},
 {id:'lounge-social-table',kind:'table',x:13.2,z:-8.55,width:.9,depth:.9,height:.4},
 {id:'lounge-planter',kind:'planter',x:18,z:1.8,width:.72,depth:.72,height:2.45},
 {id:'pool-planter',kind:'planter',x:-18,z:1.8,width:.72,depth:.72,height:2.45},
 {id:'gallery-planter',kind:'planter',x:8.25,z:3.65,width:.72,depth:.72,height:2.45},
];
export const L01_POOL_STUDY={x:-15.3,z:-5,width:3.8,depth:9,surfaceY:.055,edgeWidth:.14,classification:'POOL VISUAL DESIGN INTENT — NON-ENGINEERED / NON-OPERATIONAL',structuralBasin:false,operationalAsset:false} as const;
export const L01_LOUNGERS=[{x:-11.6,z:-3.5,width:.85,depth:2.1},{x:-11.6,z:-7,width:.85,depth:2.1}];
export const L01_OBSTACLES=[...L01_FURNISHINGS.map(furnishingBounds),...L01_LOUNGERS,{x:L01_POOL_STUDY.x,z:L01_POOL_STUDY.z,width:L01_POOL_STUDY.width+2*L01_POOL_STUDY.edgeWidth,depth:L01_POOL_STUDY.depth+2*L01_POOL_STUDY.edgeWidth},{x:18.79,z:-8.5,width:.28,depth:4}];
