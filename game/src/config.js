export const LANES = [-2.8, 0, 2.8];
export const FINISH = 1500;
export const ZONES = [
  {name:'FARMYARD', speed:8, ground:0x65502b, road:0xb46b32, sky:0xf3ad79},
  {name:'BARN', speed:11, ground:0x6b4226, road:0x996032, sky:0x7d4428},
  {name:'KITCHEN', speed:14, ground:0x9c886b, road:0xc1b59b, sky:0x9a6440},
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
