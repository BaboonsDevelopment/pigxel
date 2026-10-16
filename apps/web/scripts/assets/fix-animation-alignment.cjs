// Normalize generated animation frames after pixel conversion.
// Keeps the main connected silhouette, removes tiny disconnected artifacts,
// and anchors every pose to one ground line and one body position without scaling.
const fs=require('node:fs');
const path=require('node:path');

function registrationScore(reference,moving,dx,mode='body'){
  const h=reference.length,w=reference[0].length;
  let score=0;
  // The central body carries the registration. Wings, heads, and loose cloth
  // near the outer edge are free to move without dragging the entire sprite.
  const y0=mode==='ground'?Math.floor(h*.65):Math.floor(h*.22);
  const y1=mode==='ground'?h:Math.floor(h*.92);
  const x0=mode==='ground'?Math.floor(w*.08):Math.floor(w*.16);
  const x1=mode==='ground'?Math.floor(w*.92):Math.floor(w*.84);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const a=reference[y][x],xx=x-dx,b=xx>=0&&xx<w?moving[y][xx]:'.';
    if(a==='.'&&b==='.')continue;
    const weight=(1-Math.abs(x-(w-1)/2)/(w*.85))*(.6+.4*y/h);
    if(a!=='.'&&b!=='.')score+=weight*(a===b?4:.3);
    else score-=weight;
  }
  return score;
}

function alignHorizontal(frames,maxShiftX,margin=1,mode='body'){
  const w=frames[0][0].length,h=frames[0].length,reference=frames[0];
  const rawShifts=frames.map((frame,index)=>{
    if(index===0)return 0;
    const zero=registrationScore(reference,frame,0,mode);
    let best={dx:0,score:zero};
    for(let dx=-maxShiftX;dx<=maxShiftX;dx++){
      if(!dx)continue;
      const score=registrationScore(reference,frame,dx,mode);
      if(score>best.score+Math.abs(zero)*.005&&
        (score>best.score+.00001||Math.abs(dx)<Math.abs(best.dx)))best={dx,score};
    }
    return best.dx;
  });
  let left=w,right=-1;
  for(let i=0;i<frames.length;i++)for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(frames[i][y][x]!=='.'){
    left=Math.min(left,x+rawShifts[i]);right=Math.max(right,x+rawShifts[i]);
  }
  const minOffset=margin-left,maxOffset=w-1-margin-right;
  // A few outstretched wings already span the entire canvas. Shift without
  // clipping first, then squeeze all poses uniformly by at most the margin.
  const needsInset=minOffset>maxOffset;
  const offset=needsInset?Math.max(-left,Math.min(w-1-right,0)):Math.max(minOffset,Math.min(maxOffset,0));
  const shifts=rawShifts.map(dx=>dx+offset);
  let aligned=frames.map((frame,i)=>{
    const out=Array.from({length:h},()=>Array(w).fill('.'));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(frame[y][x]!=='.'){
      const xx=x+shifts[i];
      if(xx<0||xx>=w)throw Error(`Frame ${i+1}: horizontal alignment clips pixels`);
      out[y][xx]=frame[y][x];
    }
    return out.map(row=>row.join(''));
  });
  if(needsInset){
    const span=right-left;
    if(span<=0)throw Error('Cannot horizontally inset a one-column sprite');
    const shiftedLeft=left+offset;
    aligned=aligned.map(frame=>{
      const out=Array.from({length:h},()=>Array(w).fill('.'));
      for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(frame[y][x]!=='.'){
        const xx=margin+Math.round((x-shiftedLeft)*(w-1-2*margin)/span);
        out[y][xx]=frame[y][x];
      }
      return out.map(row=>row.join(''));
    });
  }
  return {frames:aligned,shifts,edgeAdjusted:needsInset};
}

function cleanAndAlign(frames,{artifactMaxPixels=64,maxShift=8,maxShiftX,groundLock=false}={}){
  if(!frames.length)return {frames,report:[]};
  const h=frames[0].length,w=frames[0][0].length;
  const parsed=frames.map((rows,index)=>{
    if(rows.length!==h||rows.some(row=>row.length!==w))throw Error(`Frame ${index+1}: inconsistent dimensions`);
    const pixels=rows.join('').split(''),seen=new Uint8Array(w*h),components=[];
    for(let start=0;start<pixels.length;start++){
      if(pixels[start]==='.'||seen[start])continue;
      const points=[start];seen[start]=1;
      for(let head=0;head<points.length;head++){
        const p=points[head],x=p%w,y=Math.floor(p/w);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if(!dx&&!dy)continue;
          const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;
          const q=yy*w+xx;if(!seen[q]&&pixels[q]!=='.'){seen[q]=1;points.push(q)}
        }
      }
      components.push(points);
    }
    if(!components.length)throw Error(`Frame ${index+1}: empty`);
    components.sort((a,b)=>b.length-a.length);
    let removed=0;
    for(const part of components.slice(1))if(part.length<=artifactMaxPixels){for(const p of part)pixels[p]='.';removed+=part.length}
    let bottom=-1;
    for(let p=0;p<pixels.length;p++)if(pixels[p]!=='.')bottom=Math.max(bottom,Math.floor(p/w));
    return {pixels,bottom,removed};
  });
  const baseline=Math.max(...parsed.map(frame=>frame.bottom));
  const report=[];
  const verticallyAligned=parsed.map((frame,index)=>{
    const shift=baseline-frame.bottom;
    if(shift>maxShift)throw Error(`Frame ${index+1}: ground line differs by ${shift}px (limit ${maxShift})`);
    const out=Array(w*h).fill('.');
    for(let p=0;p<frame.pixels.length;p++)if(frame.pixels[p]!=='.'){
      const y=Math.floor(p/w)+shift;
      if(y>=h)throw Error(`Frame ${index+1}: alignment clips pixels`);
      out[y*w+p%w]=frame.pixels[p];
    }
    report.push({frame:index+1,before:frame.bottom,after:baseline,shift,removed:frame.removed});
    return Array.from({length:h},(_,y)=>out.slice(y*w,(y+1)*w).join(''));
  });
  const horizontal=alignHorizontal(verticallyAligned,maxShiftX??(w>=128?12:6));
  const ground=groundLock?alignHorizontal(horizontal.frames,maxShiftX??(w>=128?12:6),1,'ground'):null;
  for(let i=0;i<report.length;i++){
    report[i].shiftX=horizontal.shifts[i]+(ground?.shifts[i]??0);
    report[i].edgeAdjusted=horizontal.edgeAdjusted||!!ground?.edgeAdjusted;
  }
  return {frames:ground?.frames??horizontal.frames,report};
}

function fixPack(packDir,{apply=false}={}){
  const manifest=JSON.parse(fs.readFileSync(path.join(packDir,'pack.json'),'utf8'));
  const results=[];
  for(const id of manifest.assets){
    const file=path.join(packDir,`${id}.json`),asset=JSON.parse(fs.readFileSync(file,'utf8'));
    let changed=false;
    for(const clip of asset.clips||[]){
      if(clip.kind!=='animation')continue;
      const result=cleanAndAlign(clip.frames,{groundLock:id==='halloween-lantern-keeper'||id==='halloween-harvest-scarecrow'});
      clip.frames=result.frames;
      changed ||= result.report.some(r=>r.shift||r.shiftX||r.removed||r.edgeAdjusted);
      results.push({id,clip:clip.name,changed,report:result.report});
    }
    if(apply&&changed)fs.writeFileSync(file,JSON.stringify(asset,null,2)+'\n');
  }
  return results;
}

if(require.main===module){
  const packDir=path.resolve(process.argv[2]||'');
  if(!process.argv[2]||!fs.existsSync(path.join(packDir,'pack.json'))){console.error('Usage: node fix-animation-alignment.cjs <pack-dir> [--apply]');process.exit(2)}
  const results=fixPack(packDir,{apply:process.argv.includes('--apply')});
  for(const {id,report} of results)console.log(id,report.map(r=>`y:${r.before}→${r.after} x:${r.shiftX>=0?'+':''}${r.shiftX}${r.removed?` -${r.removed} stray`:''}`).join(' | '));
  console.log(`${results.length} animation(s), ${results.filter(r=>r.changed).length} corrected${process.argv.includes('--apply')?' and saved':' (dry run)'}`);
}
module.exports={cleanAndAlign,fixPack};
