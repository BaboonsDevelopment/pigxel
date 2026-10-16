const {test}=require('node:test');
const assert=require('node:assert/strict');
const {cleanAndAlign}=require('./fix-animation-alignment.cjs');

function pose(dx=0,dy=0,{wing=false,stray=false}={}){
  const size=32,pixels=Array.from({length:size},()=>Array(size).fill('.'));
  for(let y=9;y<=25;y++)for(let x=10;x<=19;x++)pixels[y+dy][x+dx]=(x+y)%3?'a':'b';
  if(wing)for(let x=20;x<=25;x++)pixels[14+dy][x+dx]='c';
  if(stray)pixels[2][2]='c';
  return pixels.map(row=>row.join(''));
}

test('generated poses keep their body on one x/y anchor without clipping or strays',()=>{
  const result=cleanAndAlign([
    pose(),pose(-3,-2,{wing:true,stray:true}),pose(2,-1),
  ],{artifactMaxPixels:8,maxShift:4,maxShiftX:5});
  assert.equal(result.report[1].removed,1);
  assert.deepEqual(result.report.map(r=>r.after),[25,25,25]);
  assert.deepEqual(result.report.map(r=>r.shiftX),[0,3,-2]);
  for(const frame of result.frames)for(let y=9;y<=25;y++)for(let x=10;x<=19;x++)
    assert.equal(frame[y][x],result.frames[0][y][x]);
  assert.equal(cleanAndAlign(result.frames,{artifactMaxPixels:8,maxShift:4,maxShiftX:5}).report.some(r=>r.shift||r.shiftX||r.removed),false);
});
