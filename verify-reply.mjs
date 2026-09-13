// Spot-check Clara's capture voice against the live server (echo-voice-spec.md).
import fs from 'fs';
const html = fs.readFileSync('public/index.html', 'utf8');
const grab = (name) => {
  const i = html.indexOf('const ' + name + ' = `');
  const s = i + ('const ' + name + ' = `').length;
  return html.slice(s, html.indexOf('`;', s));
};
const CLARA_SYSTEM = grab('CLARA_SYSTEM_MIN');
const CAPTURE_CONTRACT = grab('CAPTURE_CONTRACT');

const cases = {
  greeting: 'hello',
  cutoff: 'the thing that keeps bugging me about the onboarding is that people land and',
  substantive: "I keep rebuilding the landing page instead of doing outbound. I tell myself the page has to convert before I send traffic, but I've redesigned it four times this month and sent maybe nine DMs total.",
  empty_corpus_dead: 'I had a fine day. Walked the dog. Nothing special.',
};

for (const [label, raw] of Object.entries(cases)) {
  const user = `## What I know about this person\n(nothing yet)\n\n## Coverage\n(empty corpus — no prior entries)\n\n## Their own words, retrieved for this moment\n(none yet — empty corpus)\n\n## Recent activity\nLast 7 days: 0 entries, avg length 0 chars.\nLast 30 days: 0 entries, avg length 0 chars.\nAll time: 0 entries.\n\n## Folders (reuse when one fits)\n(none yet)\n\n## Now\n"""${raw}"""\n\nReturn ONLY the JSON object.`;
  const r = await fetch('http://localhost:3001/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, temperature: 0.4, system: CLARA_SYSTEM + '\n\n' + CAPTURE_CONTRACT, messages: [{ role: 'user', content: user }] }),
  });
  const data = await r.json();
  if (!r.ok) { console.log(`\n=== ${label} === API ERROR:`, JSON.stringify(data).slice(0, 300)); continue; }
  const txt = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  let s = txt.replace(/```json|```/g, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    const o = JSON.parse(s);
    const banned = /(that makes sense|it sounds like|hold space|leverage|unpack|journey|!)/i.test(o.message || '');
    console.log(`\n=== ${label} ===`);
    console.log('mode:    ', o.mode);
    console.log('message: ', o.message);
    console.log('words:   ', String(o.message || '').split(/\s+/).filter(Boolean).length);
    console.log('RENDERS: ', !!String(o.message || '').trim());
    console.log('banned?: ', banned);
  } catch (e) { console.log(`\n=== ${label} === PARSE FAIL:`, e.message, '\nraw:', txt.slice(0, 300)); }
}
