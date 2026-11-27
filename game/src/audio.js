export class Audio{
 constructor(){this.muted=false;this.ctx=null;this.next=0;this.note=0;}
 unlock(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(C)this.ctx=new C();}if(this.ctx?.state==='suspended')this.ctx.resume();}
 tone(freq,duration=.15,type='sine',volume=.06,delay=0,endFreq){if(!this.ctx||this.muted)return;const t=this.ctx.currentTime+delay;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+duration);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+duration+.02);}
 play(name){if(name==='gobble'||name==='dash'){for(let i=0;i<4;i++)this.tone(330-i*25,.09,'triangle',.1,i*.07,110+i*20);}else if(name==='hit'){this.tone(130,.25,'sawtooth',.07,0,45);}else if(name==='collect')this.tone(780,.14,'sine',.055,0,1200);else if(name==='win'){[262,330,392,523].forEach((f,i)=>this.tone(f,.5,'triangle',.07,i*.18));}else this.tone(170,.7,'triangle',.08,0,70);}
 update(active){if(!this.ctx||!active||this.muted)return;if(this.ctx.currentTime>this.next){const notes=[196,247,294,330,392,330,294,247,196,165,196,247];this.tone(notes[this.note++%notes.length],.65,'sine',.025);if(this.note%4===0)this.tone(98,1.5,'sine',.022);this.next=this.ctx.currentTime+.65;}}
 toggle(){this.muted=!this.muted;return this.muted;}
}
