import { useState } from 'react';
import API from '../services/api';
import { useGapWise } from '../context/useGapWise';
import './AIRoadmapPanel.css';

export default function AIRoadmapPanel({hasGaps}) {
  const {candidateProfile,jobProfile} = useGapWise();
  const [confirmed,setConfirmed] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [items,setItems] = useState(null);
  if (!hasGaps) return null;

  async function personalize() {
    if (!confirmed || busy) return;
    setBusy(true);setError('');setItems(null);
    try {
      const {data} = await API.post('/ai/roadmap', {
        candidateProfile,jobProfile,syntheticDataConfirmed:true
      });
      if (!Array.isArray(data?.recommendations)) throw new Error('Invalid AI response.');
      setItems(data.recommendations);
    } catch(err) {
      setError(err.response?.data?.message || 'AI unavailable. Your original roadmap remains above.');
    } finally {setBusy(false);}
  }

  return <section className="gw-ai-panel" aria-labelledby="gw-ai-heading">
    <div className="gw-ai-panel-title"><span className="gw-ai-sparkle" aria-hidden="true">✧</span><div><span className="gw-ai-kicker">OPTIONAL AI PROTOTYPE</span><h3 id="gw-ai-heading">Personalize your next steps</h3></div></div>
    <p>Gemini can suggest implementation tasks based on your assessed gaps. It cannot change the score, evidence statuses, or the original roadmap.</p>
    <div className="gw-ai-notice" role="note"><strong>Synthetic test data only.</strong> If enabled, a limited set of gaps and project excerpts is sent to Google's Gemini API. Google's free tier may use submitted content to improve its products. Do not use this feature with an actual person's resume, contact details or other sensitive information.</div>
    <label className="gw-ai-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I confirm this assessment uses only synthetic, fictional candidate data, and I opt in to the external AI request.</span></label>
    <button className="gw-ai-button" type="button" disabled={!confirmed||busy||!candidateProfile||!jobProfile} onClick={personalize}>{busy?'Generating suggestions…':'✧ Personalize roadmap'}</button>
    {error && <p className="gw-ai-error" role="status">{error} The deterministic plan above is unchanged.</p>}
    {items && <div className="gw-ai-results" aria-live="polite"><h4>AI-generated suggestions — review before use</h4>{items.length?items.map((item,i)=><article key={`${item.skill}-${i}`}><strong>{item.skill}</strong>{item.project ? <div className="gw-ai-project"><span>Suggested project extension:</span> <b>{item.project.title}</b><p>Based on resume evidence: “{item.project.evidence?.[0]}”</p></div> : <div className="gw-ai-project gw-ai-project-generic">No relevant project evidence selected — suggested standalone exercise.</div>}<ul>{item.steps.map((step,j)=><li key={j}>{step}</li>)}</ul><p><b>Deliverable:</b> {item.deliverable}</p></article>):<p>No gaps require additional actions.</p>}</div>}
  </section>;
}
