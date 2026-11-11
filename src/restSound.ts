// Original synthesized three-note cue, no downloaded sound assets.
let audio:AudioContext|null=null;
export async function unlockRestAudio():Promise<boolean>{
    try{audio??=new AudioContext();if(audio.state!=='running')await audio.resume();return audio.state==='running'}catch{return false}
}
export function playRestChime():boolean{
    if(!audio||audio.state!=='running'||document.visibilityState!=='visible')return false;
    const start=audio.currentTime;
    [660,880,1100].forEach((hz,i)=>{const osc=audio!.createOscillator(),gain=audio!.createGain();osc.type='sine';osc.frequency.value=hz;gain.gain.setValueAtTime(0,start+i*.17);gain.gain.linearRampToValueAtTime(.18,start+i*.17+.012);gain.gain.exponentialRampToValueAtTime(.001,start+i*.17+.2);osc.connect(gain);gain.connect(audio!.destination);osc.start(start+i*.17);osc.stop(start+i*.17+.22);});
    return true;
}
