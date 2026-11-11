'use strict';
// Evidence of use, not verification of mastery. A stack is contextual evidence,
// not a license to credit every tool mentioned in it.
const taxonomy=require('./technology.taxonomy');
const norm=s=>String(s??'').trim().toLowerCase().replace(/\s+/g,' ');
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const namesFor=t=>[t.canonicalName,...(t.aliases||[])].filter(n=>n&&n.length>=2&&!['js','ts','node','render'].includes(norm(n)));
const token=names=>`(?:${names.map(esc).sort((a,b)=>b.length-a.length).join('|')})(?![\\w+#])`;
const has=(s,names)=>names.length>0&&new RegExp(`(?:^|[^\\w+#])${token(names)}`,'i').test(s||'');
const stackNames=s=>String(s||'').replace(/^(?:tech(?:nology|nologies)?(?: stack)?|stack|tools|languages)\s*:\s*/i,'').split(/[•|,;]/).map(norm);
const negative=/\b(?:not|never|without|planning|planned|intend|want to|learning|familiar with|assisted|observed|will|would|evaluated whether)\b/i;
const build='(?:built|implemented|developed|created|designed|wrote|programmed|coded)';
const object='(?:applications?|apps?|platforms?|services?|software|tools?|apis?|systems?|components?|features?|frameworks?|scripts?|modules?|algorithms?|programs?|functions?|code)';
const buildClaim=new RegExp(`\\b${build}\\s+(?:[\\w+.#-]+\\s+){0,7}${object}\\b`,'i');
const backendClaim=new RegExp(`\\b${build}\\s+(?:(?:an?|the|our|my|new|scalable|secure|distributed|transactional|REST(?:ful)?|GraphQL|internal|public|web|[0-9]+)\\s+){0,6}(?:backend|server|server-side|microservices?|services?|apis?)\\b`,'i');
const directUse=(text,names,verbs)=>new RegExp(`\\b${verbs}\\s+(?:(?:an?|the|our|my|managed|hosted|local|remote|cloud|new|existing|relational|distributed)\\s+){0,4}${token(names)}`,'i').test(text);
const via=(text,names)=>new RegExp(`\\b(?:using|with|in|via|through)\\s+(?:the\\s+)?${token(names)}`,'i').test(text);
const namedObject=(text,names,verbs,objects)=>new RegExp(`\\b${verbs}\\s+(?:(?!(?:for|to|of|about|and|or|with|using|in|on|that|which|tool|tools|application|applications|framework|frameworks|testing|test|tests|simulator|monitor|review|documentation|docs)\\b)[\\w+.#-]+\\s+){0,5}${token(names)}\\s+(?:${objects})\\b`,'i').test(text);
function qualify(t,option,text,stack,allStack){
 const names=namesFor(t); const category=option.category; if(!names.length)return false;
 const named=has(text,names);
 const implementation=buildClaim.test(text);
 const uniqueCategory=taxonomy.filter(x=>x.category===category&&namesFor(x).some(n=>allStack.includes(norm(n)))).length===1;
 if(category==='programming-language')return (implementation&&(via(text,names)||(stack&&uniqueCategory)))||directUse(text,names,'(?:coded in|programmed in|wrote code in)');
 if(category==='runtime')return (implementation&&via(text,names))||directUse(text,names,'(?:configured|used|integrated)')||(stack&&uniqueCategory&&backendClaim.test(text));
 if(['framework','framework-library','orm'].includes(category))return (implementation&&via(text,names))||directUse(text,names,'(?:integrated|configured|used)')||namedObject(text,names,build,'components?|services?|controllers?|routes?|modules?|applications?|apps?|middleware|models?|schemas?');
 if(category==='database'){
  // SQL is a query language, not interchangeable with a database product.
  if(option.id==='tech:sql')return named&&(/\b(?:wrote|executed|optimized|implemented|designed)\b.{0,45}\bSQL\s+(?:queries|statements|joins|procedures)\b/i.test(text)||directUse(text,names,'(?:queried|used)'));
  return directUse(text,names,'(?:provisioned|configured|queried|administered|migrated|used|integrated)')||namedObject(text,names,'(?:provisioned|configured|created|designed|implemented|optimized|migrated|queried|managed)','instances?|databases?|schemas?|tables?|collections?|queries|indexes|clusters?')||(/\b(?:wrote|executed|optimized|implemented|designed|created)\b.{0,70}\b(?:queries|schemas?|tables?|collections?|indexes)\b/i.test(text)&&via(text,names));
 }
 if(category==='api'){if(/\b(?:tested|testing|benchmark(?:ed|ing)?|simulat(?:ed|or|ion))\b/i.test(text))return false;return namedObject(text,names,'(?:built|developed|implemented|designed|integrated|consumed|created)','endpoints?|routes?|services?')||directUse(text,names,'(?:built|developed|implemented|designed|integrated|consumed|created)');}
 if(category==='devops')return directUse(text,names,'(?:configured|used|integrated)')||(/\b(?:containeri[sz]ed|orchestrated|deployed|configured)\b/i.test(text)&&via(text,names));
 if(category==='developer-tool'||category==='developer-platform')return directUse(text,names,'(?:used|configured|managed)')||namedObject(text,names,'(?:created|managed|merged|rebased|configured|used)','branches|repositories|commits|pull requests|workflows');
 if(['cloud-platform','deployment-platform'].includes(category))return (/\b(?:deployed|hosted|provisioned|configured)\b/i.test(text)&&new RegExp(`\\b(?:on|to|using|with|via)\\s+${token(names)}`,'i').test(text))||directUse(text,names,'(?:configured|used)');
 return false;
}
function assessTech(option,claims,skills){
 const t=taxonomy.find(t=>t.id===option.id)||{canonicalName:option.name};const names=namesFor(t),direct=[],partial=[];
 for(const c of claims){if(!['projects','experience'].includes(c.source)||negative.test(c.excerpt))continue;
  const allStack=stackNames(c.technologyContext), stack=names.some(n=>allStack.includes(norm(n))), named=has(c.excerpt,names);
  // Separate independent clauses so a deployment action cannot borrow a technology
  // mentioned only in an unrelated clause. Preserve full source excerpt for display.
  const clauses=c.excerpt.split(/;|,\s*(?:then\s+)?(?=(?:built|implemented|developed|created|designed|deployed|configured|provisioned|tested|used|integrated|managed|wrote|containeri[sz]ed)\b)|\s+and\s+(?=(?:built|implemented|developed|created|designed|deployed|configured|provisioned|tested|used|integrated|managed|wrote|containeri[sz]ed)\b)/i);
  if(clauses.some(s=>qualify(t,option,s,stack,allStack)))direct.push({...c,ruleId:`jd:technology-use:${option.category}`,strength:named?2:1});
  else if(named||stack)partial.push({...c,ruleId:'jd:technology-mentioned',strength:named?2:1});
 }
 for(const s of skills){if(s.skillId===option.id||names.some(n=>norm(n)===norm(s.canonicalName||s.name||s.skill)))partial.push({source:'extracted-skill',excerpt:s.canonicalName||s.name||s.skill,ruleId:'jd:declared-technology',strength:0});}
 const evidence=(direct.length?direct:partial).sort((a,b)=>b.strength-a.strength).slice(0,3).map(({strength,...e})=>e);
 return {status:direct.length?'demonstrated':partial.length?'partial':'not_demonstrated',evidence};
}
const guidance={ 'programming-language':'Implement and test a feature in this language; describe the code and outcome.',runtime:'Build a service or executable using this runtime and document its execution.',framework:'Implement a feature with the framework and document the components or services used.','framework-library':'Implement a feature with the library and describe its integration.',orm:'Implement persistence with the ORM and test a query or transaction.',database:'Provision or use the specified database, implement queries or a schema, and document the result.',api:'Implement or integrate documented API requests and test success and error cases.',devops:'Configure or deploy a workload with the specified tool and document the configuration.', 'developer-tool':'Demonstrate a concrete workflow using the tool; document the commands or changes.', 'developer-platform':'Document a repository or delivery workflow using the platform.', 'cloud-platform':'Provision and deploy a workload using the specified platform.', 'deployment-platform':'Deploy a working application and document configuration and verification.'};
function technologyGuidance(option){return option.id==='tech:sql'?'Write and test SQL queries, including joins or aggregations, and explain their results.':guidance[option.category]||'Document a concrete task completed with the specified technology.';}
module.exports={assessTech,technologyGuidance};
