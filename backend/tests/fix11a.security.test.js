'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {validateJD,validateJob,validateSkills,validateCandidate} = require('../src/middleware/request.validation');
const {isPDFBuffer,parsePdf} = require('../src/controllers/resume.controller');

test('input validators reject malformed and oversized requests', () => {
  assert.throws(()=>validateJD({description:23}),/Job description/);
  assert.throws(()=>validateJD({description:'x'.repeat(12001)}),/Job description/);
  assert.doesNotThrow(()=>validateJD({description:'Required:\n- Python'}));
  assert.throws(()=>validateJob({requiredSkills:{name:'Python'}}),/Invalid job/);
  assert.throws(()=>validateSkills({candidateSkills:['x'.repeat(121)]}),/Invalid skill/);
  assert.throws(()=>validateCandidate({candidateProfile:{skills:[]},jobProfile:null}),/profiles/);
  assert.throws(()=>validateCandidate({candidateProfile:{skills:'Python'},jobProfile:{}}),/candidate skills/);
  assert.doesNotThrow(()=>validateCandidate({candidateProfile:{skills:[], projects:'Built a demo.'},jobProfile:{requiredSkills:[]}}));
});

test('PDF signature check rejects mislabeled non-PDF bytes', () => {
  assert.equal(isPDFBuffer(Buffer.from('not a PDF')),false);
  assert.equal(isPDFBuffer(Buffer.from('%PDF-1.7\n')),true);
});

test('parser is destroyed after successful text extraction', async () => {
  let destroyed=0;
  class Parser { async getText(){return {text:'Resume data'};} async destroy(){destroyed++;} }
  assert.equal(await parsePdf(Buffer.from('%PDF-1.7'),Parser),'Resume data');
  assert.equal(destroyed,1);
});

test('parser is destroyed even if extraction throws', async () => {
  let destroyed=0;
  class Parser {async getText(){throw new Error('synthetic parse failure');}async destroy(){destroyed++;}}
  await assert.rejects(parsePdf(Buffer.from('%PDF-1.7'),Parser),/synthetic parse failure/);
  assert.equal(destroyed,1);
});

test('HTTP routes enforce PDF and JSON validation without writing an upload', async () => {
  const app=require('../src/app');
  const server=app.listen(0);
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api`;
  try {
    const invalid=await fetch(`${base}/jobs/analyze`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({description:23})});
    assert.equal(invalid.status,400);
    const malformed=await fetch(`${base}/jobs/analyze`,{method:'POST',headers:{'content-type':'application/json'},body:'{"oops":'});
    assert.equal(malformed.status,400);
    const invalidCandidate=await fetch(`${base}/analysis/candidate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({candidateProfile:{skills:'broken'},jobProfile:{}})});
    assert.equal(invalidCandidate.status,400);
    const form=new FormData();
    form.set('resume',new Blob(['not a pdf'],{type:'application/pdf'}),'resume.pdf');
    const badPdf=await fetch(`${base}/resume`,{method:'POST',body:form});
    assert.equal(badPdf.status,400);
    assert.match((await badPdf.json()).message,/Invalid PDF/);
    const docx=new FormData();
    docx.set('resume',new Blob(['not a pdf'],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),'resume.docx');
    assert.equal((await fetch(`${base}/resume`,{method:'POST',body:docx})).status,400);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
