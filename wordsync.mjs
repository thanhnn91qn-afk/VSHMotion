/**
 * Cue each list line / chart bar to the moment its words are spoken.
 *
 * A reveal that lands 200 ms after the word naming it reads as lag; on the word
 * it reads as the voice causing it (product-launch-motion's "word-locked sync").
 * Lines used to be spread evenly over the narration instead.
 *
 * The TTS server returns no word timings, and Whisper does not fit in this
 * machine's memory. Vietnamese makes a lighter route possible: one written word
 * is one syllable, and the exact text being read is known. So:
 *   1. silencedetect splits the recording into spoken stretches;
 *   2. the text splits into phrases at punctuation; when the two counts agree,
 *      phrase k is stretch k, otherwise syllables are spread over speech time;
 *   3. each line is matched to where its words occur in the narration, rare
 *      words weighing more ("tim mạch" beats "người bệnh", said in every line).
 * Accurate to a phrase boundary, roughly a syllable inside a phrase - well inside
 * the 200 ms that reads as lag.
 */

const PUNCT = /[.,!?;:…]/;
const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Spoken stretches [start, end] in seconds, from ffmpeg silencedetect. */
async function speechStretches(exec, wav, dur) {
  const { stderr } = await exec("ffmpeg", ["-hide_banner", "-i", wav,
    "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"], { maxBuffer: 1 << 24 });
  const sil = [];
  let open = null;
  for (const line of stderr.split("\n")) {
    const a = line.match(/silence_start: ([\d.]+)/);
    const b = line.match(/silence_end: ([\d.]+)/);
    if (a) open = Number(a[1]);
    if (b) { sil.push([open ?? 0, Number(b[1])]); open = null; }
  }
  if (open !== null) sil.push([open, dur]);
  const out = [];
  let t = 0;
  for (const [s, e] of sil) {
    if (s - t > 0.05) out.push([t, s]);
    t = e;
  }
  if (dur - t > 0.05) out.push([t, dur]);
  return out;
}

/** Narration tokens with the phrase each belongs to. */
function tokenize(text) {
  const toks = [];
  let phrase = 0;
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const w = norm(raw);
    if (w) toks.push({ w, phrase });
    if (PUNCT.test(raw)) phrase++;
  }
  return toks;
}

/** Time (s) at which token k starts. */
function tokenTimes(toks, stretches) {
  const nPhr = toks.length ? toks[toks.length - 1].phrase + 1 : 0;
  const times = new Array(toks.length);
  if (nPhr === stretches.length) {
    // one spoken stretch per phrase: exact at every boundary
    for (let p = 0; p < nPhr; p++) {
      const idx = toks.map((t, k) => (t.phrase === p ? k : -1)).filter((k) => k >= 0);
      const [s, e] = stretches[p];
      idx.forEach((k, j) => { times[k] = s + (j / idx.length) * (e - s); });
    }
    return times;
  }
  // otherwise spread syllables evenly over speech time, skipping the pauses
  const total = stretches.reduce((a, [s, e]) => a + (e - s), 0);
  toks.forEach((_, k) => {
    let at = (k / toks.length) * total;
    for (const [s, e] of stretches) {
      if (at <= e - s) { times[k] = s + at; return; }
      at -= e - s;
    }
    times[k] = stretches.length ? stretches[stretches.length - 1][1] : 0;
  });
  return times;
}

/**
 * Milliseconds at which each item should start revealing, or null when nothing
 * in the narration could be matched (the engine then falls back to even spacing).
 */
export async function phraseCues(exec, wav, voice, items, dur, lead = 0.12) {
  const toks = tokenize(voice);
  if (!toks.length || !items.length) return null;
  const stretches = await speechStretches(exec, wav, dur);
  if (!stretches.length) return null;
  const times = tokenTimes(toks, stretches);

  const freq = {};
  for (const t of toks) freq[t.w] = (freq[t.w] || 0) + 1;
  const weight = (w) => (freq[w] ? 1 / freq[w] : 0);

  const cues = [];
  let from = 0;
  for (const item of items) {
    const want = [...new Set(String(item).split(/\s+/).map(norm).filter((w) => w && !/^\d+$/.test(w)))];
    let best = { score: 0, at: -1 };
    for (let j = from; j < toks.length; j++) {
      // a window about as long as the item, plus a little slack for filler words
      const win = toks.slice(j, j + want.length + 3).map((t) => t.w);
      if (!want.includes(toks[j].w)) continue;          // anchor on a word the item names
      const score = want.reduce((a, w) => a + (win.includes(w) ? weight(w) : 0), 0);
      if (score > best.score + 1e-9) best = { score, at: j };
    }
    if (best.at < 0 || best.score < 0.3) { cues.push(null); continue; }
    // Land on the start of the phrase that names the item, not on the naming
    // word itself: "ba nghìn năm trăm linh tám người bệnh tim mạch" is all one
    // item, and its bar should rise as the number begins, not at "tim mạch".
    const first = toks.findIndex((t) => t.phrase === toks[best.at].phrase);
    cues.push(Math.max(300, Math.round((times[first] - lead) * 1000)));
    from = best.at + 1;
  }
  if (!cues.some((c) => c !== null)) return null;

  // Items on screen but not in the narration (a script can show more than it
  // says) are slotted between their matched neighbours, so the order on screen
  // never breaks. Even spacing used to put them before line one.
  const endMs = Math.max(600, (dur - 0.8) * 1000);
  for (let i = 0; i < cues.length; i++) {
    if (cues[i] !== null) continue;
    let j = i;
    while (j < cues.length && cues[j] === null) j++;
    const lo = i === 0 ? 600 : cues[i - 1];
    const hi = j < cues.length ? cues[j] : endMs;
    for (let k = i; k < j; k++) cues[k] = Math.round(lo + ((k - i + 1) * (hi - lo)) / (j - i + 1));
    i = j - 1;
  }
  // strictly ordered, at least 250 ms apart
  for (let i = 1; i < cues.length; i++) if (cues[i] < cues[i - 1] + 250) cues[i] = cues[i - 1] + 250;
  return cues;
}
