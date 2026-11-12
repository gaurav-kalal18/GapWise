'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {prepareContext,validateOutput,personalizeRoadmap,assertRequest,callGemini} = require('../src/services/ai.roadmap.service');
const profile = {skills:[],projects:'Demo Project GitHub — Live Demo\nPython • Node.js\n• Built an application in Python.\n• Implemented a backend service using Node.js.'};
const job = {title:'Backend engineer'};
const analysis = {roadmap:[{skill:'Software testing',priority:'high',evidenceStatus:'partial',actions:['Write tests for errors.']},{skill:'Security fundamentals',priority:'medium',evidenceStatus:'not_demonstrated',actions:['Implement access controls.']}]};
const answer = c => ({recommendations:c.gaps.map(g=>({skill:g.skill,steps:['Write a small working feature.','Test the new behavior and edge cases.'],deliverable:'A working example and documented test results.'}))});
test('requires explicit synthetic-only opt-in',()=>assert.throws(()=>assertRequest({candidateProfile:profile,jobProfile:job}),/synthetic test data/i));
test('rejects oversized request',()=>assert.throws(()=>assertRequest({candidateProfile:{projects:'x'.repeat(30000)},jobProfile:job,syntheticDataConfirmed:true}),/exceeds/i));
test('server analysis overrides spoofed browser gaps and scores',async()=>{
 let seen;
 const out = await personalizeRoadmap({syntheticDataConfirmed:true,candidateProfile:profile,jobProfile:job,readiness:{score:100},roadmap:[{skill:'Wrong'}]}, {analyze:()=>analysis,generate:async c=>(seen=c,answer(c))});
 assert.deepEqual(out.recommendations.map(x=>x.skill),['Software testing','Security fundamentals']);
 assert.equal(seen.gaps[0].priority,'high');
 assert.equal(out.recommendations[0].evidenceStatus,'partial');
 assert.equal(out.recommendations[1].evidenceStatus,'not_demonstrated');
});
test('redacts emails and URLs and limits forwarded project context',()=>{
 const c=prepareContext({...profile,projects:'Demo GitHub — Live Demo\nJava • Python\n• Built an app; contact dev@example.com, see https://example.com/projects.'},job,analysis);
 assert.doesNotMatch(JSON.stringify(c),/dev@example.com|https:\/\/example.com/);
 assert.equal(c.gaps.length,2);
});
test('rejects changed skills, incomplete entries or invented extra gaps',()=>{
 const c=prepareContext(profile,job,analysis);
 assert.throws(()=>validateOutput({recommendations:[{skill:'Unrelated',steps:['A very useful implementation step','A second detailed implementation step'],deliverable:'Document tested behavior.'}]},c.gaps));
 assert.throws(()=>validateOutput({recommendations:[{...answer(c).recommendations[0],skill:c.gaps[0].skill}]},c.gaps));
});
test('provider request is JSON-structured and includes auth only in header',async()=>{
 const c=prepareContext(profile,job,analysis);let args;
 const out=await callGemini(c,{apiKey:'test-secret',fetchImpl:async(url,options)=>{args={url,options};return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(answer(c))}]}}]})};}});
 assert.equal(out.recommendations.length,2);
 assert.equal(args.options.headers['x-goog-api-key'],'test-secret');
 assert.equal(args.options.body.includes('test-secret'),false);
 assert.equal(JSON.parse(args.options.body).generationConfig.responseMimeType,'application/json');
});
test('provider failure leaves deterministic assessment untouched',async()=>{
 const original=JSON.stringify(analysis);
 await assert.rejects(personalizeRoadmap({syntheticDataConfirmed:true,candidateProfile:profile,jobProfile:job}, {analyze:()=>analysis,generate:async()=>{throw new Error('rate limited');}}),/unavailable/);
 assert.equal(JSON.stringify(analysis),original);
});
