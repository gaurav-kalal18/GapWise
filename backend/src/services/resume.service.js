const cleanResumeText = text => String(text || '').replace(/\r\n?/g,'\n').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').replace(/ *\n */g,'\n').trim();
const headings = {
 education:/^education\s*:?$/i, skills:/^(?:technical |professional )?skills\s*:?$/i, projects:/^(?:personal |academic |selected |technical )?projects\s*:?$/i,
 experience:/^(?:(?:work|professional|internship|relevant) )?experience\s*:?$/i, achievements:/^(?:achievements|awards(?: and achievements)?)\s*:?$/i,
 coursework:/^(?:relevant )?coursework\s*:?$/i, codingProfiles:/^(?:coding|competitive programming) profiles\s*:?$/i,
 positions:/^(?:positions? of responsibility|leadership(?: experience)?)\s*:?$/i
};
function detectSections(text){
 const sections={contact:'',education:'',skills:'',projects:'',experience:'',achievements:'',coursework:'',codingProfiles:'',positions:'',other:''};let current='contact';
 for(const raw of String(text||'').split('\n')){const line=raw.trim();if(!line)continue;
  const inline=line.match(/^(?:relevant )?coursework\s*:\s*(.+)$/i);if(inline){current='coursework';sections[current]+=inline[1]+'\n';continue;}
  const heading=Object.keys(headings).find(key=>headings[key].test(line));if(heading){current=heading;continue;}
  sections[current]+=line+'\n';
 }
 for(const key of Object.keys(sections))sections[key]=sections[key].trim();return sections;
}
const extractResumeStructure=text=>{const cleanedText=cleanResumeText(text);return {cleanedText,sections:detectSections(cleanedText)};};
module.exports={cleanResumeText,detectSections,extractResumeStructure};
