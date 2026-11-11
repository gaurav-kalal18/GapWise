'use strict';
// Conservative, deterministic reconstruction. Never associate a stack with an
// unrelated project or promote a technology-only declaration to implementation.
const LANGUAGE = /(?:^|[^\w])(?:typescript|javascript|python|java|c\+\+|c#|c language|golang|go|rust|ruby|php|kotlin|swift|scala|matlab|c|r)(?=$|[^\w])/i;
const START = /^\s*(?:[•●▪‣*–—-]\s+|\d+[.)]\s+)/;
const ACTION = /^(?:built|developed|implemented|created|designed|wrote|programmed|coded|deployed|tested|integrated|configured|containerized|containerised|provisioned|benchmarked|optimized|solved|trained|evaluated|managed|used|fixed|diagnosed|refactored|maintained|led|worked|applied|performed|automated|documented|reviewed|merged|committed|released|consumed|cleaned|processed|transformed)\b/i;
const title = s => /(?:\bgithub\b|\blive demo\b|\brepository\b)\s*(?:[—–|•]\s*(?:github|live demo|repository))*\s*$/i.test(s) && !ACTION.test(s);
const stack = s => /^(?:tech(?:nology|nologies)?(?: stack)?|stack|tools|languages)\s*:/i.test(s) || (!ACTION.test(s) && /[•|]/.test(s) && s.length<240 && s.split(/[•|]/).every(t=>t.trim().length>0&&t.trim().length<=45) && (LANGUAGE.test(s)||s.split(/[•|]/).length>=3));
const hasLanguageStack = s => String(s||'').replace(/^(?:tech(?:nology|nologies)?(?: stack)?|stack|tools|languages)\s*:\s*/i,'').split(/[•|,;]/).some(t=>/^(?:c|c\+\+|cpp|c#|c sharp|typescript|ts|javascript|js|python|java|golang|go|rust|ruby|php|kotlin|swift|scala|matlab|r)(?:\s+\d+(?:\.\d+)*)?$/i.test(t.trim()));
const compact = s => s.trim().replace(/\s+/g,' ');
function windows(profile) {
  const out=[];
  for(const source of ['projects','experience','codingProfiles','achievements','positions']) {
    const value=profile?.[source]; if(typeof value!=='string') continue;
    const lines=value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    let project=null, technologies=null, current=null;
    const flush=()=>{if(current){if(current.excerpt.length>=12 && current.excerpt.length<=2000)out.push(current);current=null;}};
    for(let i=0;i<lines.length;i++) {
      const raw=lines[i], bullet=START.test(raw), s=compact(raw.replace(START,''));
      if(!bullet && source==='projects' && (title(s)||(!ACTION.test(s)&&!stack(s)&&lines[i+1]&&stack(lines[i+1])))) {
        flush();project=s;technologies=null;continue;
      }
      if(!bullet && source==='projects' && stack(s)) {flush(); technologies=project?s:null;continue;}
      // Only join clear continuation lines. A new action or bullet starts a claim.
      if(!bullet && current && !/[.!?]$/.test(current.excerpt) && ((!ACTION.test(s) && /^[a-z(]/.test(s)) || /(?:[,;:]|\b(?:then|and|using|with|to))$/.test(current.excerpt))) {
        current.excerpt=compact(current.excerpt+' '+s);continue;
      }
      flush();
      // Unrecognized headings are hard boundaries; do not leak preceding stack.
      if(!bullet && source==='projects' && !ACTION.test(s)) {project=null;technologies=null;}
      current={source,excerpt:s,...(project?{project}:{}),...(technologies?{technologyContext:technologies}:{})};
    }
    flush();
  }
  return out;
}
module.exports={windows,LANGUAGE,hasLanguageStack};
