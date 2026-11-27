export const LANES = [-2.8, 0, 2.8];
export const FINISH = 1500;
export const ZONES = [
  {name:'FARMYARD', speed:8, ground:0xa7a05a, road:0xc29560, sky:0xf1d5a0},
  {name:'BARN', speed:11, ground:0x987d45, road:0x9b6746, sky:0xeac289},
  {name:'KITCHEN', speed:14, ground:0x9c886b, road:0xc1b59b, sky:0xeadcc3},
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
