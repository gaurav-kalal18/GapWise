'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const taxonomy=require('../src/services/technology.taxonomy');
const {buildJobProfile,analyzeJD}=require('../src/services/jd.assessment.service');
const ids=new Set(taxonomy.map(t=>t.id));
test('taxonomy IDs and aliases remain unique',()=>{
 assert.equal(ids.size,taxonomy.length);
 const aliases=new Map();for(const t of taxonomy)for(const x of [t.canonicalName,...t.aliases]){
  const k=x.trim().toLowerCase();if(['js','ts','node','render'].includes(k))continue;
  if(aliases.has(k))assert.equal(aliases.get(k),t.id,`Alias collision: ${k}`);else aliases.set(k,t.id);
 }
});
test('expanded technical vocabulary recognized in JD',()=>{
 const names=['Spring Boot','Django','FastAPI','Vue','Angular','Pandas','NumPy','scikit-learn','PyTorch','TensorFlow','Matplotlib','Jest'];
 const job=buildJobProfile({description:'Required Skills:\n'+names.map(s=>'- '+s).join('\n')});
 assert.equal(job.requiredSkills.length,names.length);assert.equal(job.unresolvedRequirements.length,0);
});
test('data library explicit transformation demonstrates, stack alone partial',()=>{
 const job=buildJobProfile({description:'Required Skills:\n- Pandas'});
 const yes=analyzeJD({projects:'ETL Tool GitHub\nPython • Pandas\n• Cleaned customer data using Pandas and imputed missing values.'},job,[]);
 const no=analyzeJD({projects:'ETL Tool GitHub\nPython • Pandas\n• Built an unrelated web application.'},job,[]);
 assert.equal(yes.matches[0]?.skill,'Pandas');assert.equal(no.gaps[0]?.evidenceStatus,'partial');
});
test('ML framework needs a model action, unrelated UI does not count',()=>{
 const job=buildJobProfile({description:'Required Skills:\n- PyTorch'});
 const yes=analyzeJD({projects:'Classifier GitHub\nPython • PyTorch\n• Trained a classifier using PyTorch on labeled data.'},job,[]);
 const no=analyzeJD({projects:'Viewer GitHub\nReact • PyTorch\n• Built a dashboard to monitor PyTorch training jobs.'},job,[]);
 assert.equal(yes.matches[0]?.skill,'PyTorch');assert.equal(no.gaps[0]?.evidenceStatus,'partial');
});
test('one ML framework never implies a different ML framework',()=>{
 const job=buildJobProfile({description:'Required Skills:\n- TensorFlow'});
 const out=analyzeJD({projects:'Classifier GitHub\nPython • PyTorch\n• Trained a neural network using PyTorch.'},job,[]);
 assert.equal(out.gaps[0]?.evidenceStatus,'not_demonstrated');
});
test('visualization and testing require actions',()=>{
 const job=buildJobProfile({description:'Required Skills:\n- Matplotlib\n- Jest'});
 const out=analyzeJD({projects:'Reports GitHub\nPython • Matplotlib • Jest\n• Created charts using Matplotlib.\n• Wrote unit tests using Jest.'},job,[]);
 assert.equal(out.matches.length,2);
});
