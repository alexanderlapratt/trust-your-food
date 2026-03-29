import { useState, useRef, useEffect, useCallback } from 'react';
import './VoiceOnboarding.css';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PRACTICES_LIST = [
  { key: 'noAntibiotics', label: 'No Antibiotics', icon: '🚫💊' },
  { key: 'noPesticides',  label: 'No Pesticides',  icon: '🌱' },
  { key: 'pastureRaised', label: 'Pasture Raised',  icon: '🐄' },
  { key: 'organicFeed',   label: 'Organic Feed',    icon: '🌾' },
  { key: 'nonGMO',        label: 'Non-GMO',         icon: '🧬' },
];

const STEP_LABELS = [
  'Your Name', 'Farm Name', 'Farm Story', 'Product',
  'Description', 'Quantity', 'Price', 'Practices', 'Availability', 'Review',
];

const UNIT_MAP = {
  pound: 'lb', pounds: 'lb', lbs: 'lb', lb: 'lb',
  dozen: 'dozen', dozens: 'dozen',
  ounce: 'oz', ounces: 'oz', oz: 'oz',
  jar: 'jar', jars: 'jar',
  pint: 'pint', pints: 'pint',
  quart: 'quart', quarts: 'quart',
  gallon: 'gallon', gallons: 'gallon',
  bunch: 'bunch', bunches: 'bunch',
  bag: 'bag', bags: 'bag',
  pack: 'pack', packs: 'pack',
  bird: 'bird', birds: 'bird',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  each: 'ea', piece: 'ea', pieces: 'ea',
  log: 'log', logs: 'log',
  loaf: 'loaf', loaves: 'loaf',
  egg: 'dozen', eggs: 'dozen',
};

const DEFAULT_DATA = {
  farmerName: '', farmName: '', bio: '',
  productName: '', description: '',
  quantity: '', unit: 'lb', price: '',
  practices: { noAntibiotics: false, noPesticides: false, pastureRaised: false, organicFeed: false, nonGMO: false },
  availabilityDate: '',
  priceSuggestion: null,
  category: 'vegetables',
};

// Fields shown in the review edit list: { step, label }
const EDIT_FIELDS = [
  { step: 0, label: 'Your Name' },
  { step: 1, label: 'Farm Name' },
  { step: 2, label: 'Farm Story' },
  { step: 3, label: 'Product' },
  { step: 4, label: 'Description' },
  { step: 5, label: 'Quantity / Unit' },
  { step: 6, label: 'Price' },
  { step: 7, label: 'Practices' },
  { step: 8, label: 'Availability' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function guessCategory(name) {
  const n = name.toLowerCase();
  if (/beef|pork|chicken|turkey|lamb|meat|broth|bone|sausage/.test(n)) return 'meat';
  if (/egg/.test(n)) return 'eggs';
  if (/milk|cheese|yogurt|dairy|cream|butter|chevre|goat/.test(n)) return 'dairy';
  if (/honey/.test(n)) return 'honey';
  if (/basil|herb|thyme|rosemary|oregano|sage|dill|parsley|cilantro/.test(n)) return 'herbs';
  if (/bread|sourdough|roll|loaf|muffin|bagel|croissant/.test(n)) return 'grains';
  if (/apple|pear|peach|berry|plum|cherry|grape|melon|fruit|citrus/.test(n)) return 'fruits';
  if (/pie|cake|cookie|pastry|tart|brownie|dessert/.test(n)) return 'other';
  return 'vegetables';
}

function parseQuantityUnit(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s+(\w+(?:-\w+)?)/i);
  if (match) {
    const qty = parseFloat(match[1]);
    const word = match[2].toLowerCase();
    return { quantity: qty, unit: UNIT_MAP[word] || word };
  }
  const numOnly = text.match(/(\d+(?:\.\d+)?)/);
  if (numOnly) return { quantity: parseFloat(numOnly[1]), unit: 'lb' };
  return null;
}

function parsePrice(text) {
  const match = text.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  return match ? parseFloat(match[1]) : null;
}

function parsePracticesSpeech(text, current) {
  const t = text.toLowerCase();
  const u = { ...current };
  if (/no antibiotic|antibiotic.free/.test(t)) u.noAntibiotics = true;
  if (/no pesticide|pesticide.free/.test(t))   u.noPesticides = true;
  if (/pasture.raised|pasture raised|grass.fed|grass fed/.test(t)) u.pastureRaised = true;
  if (/organic feed/.test(t)) u.organicFeed = true;
  if (/non.gmo|no gmo|gmo.free/.test(t)) u.nonGMO = true;
  if (/\ball\b/.test(t)) Object.keys(u).forEach(k => (u[k] = true));
  if (/\bnone\b/.test(t)) Object.keys(u).forEach(k => (u[k] = false));
  return u;
}

function parseDate(text) {
  const t = text.toLowerCase();
  const today = new Date();
  const add = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };
  if (/\btoday\b/.test(t)) return add(0);
  if (/tomorrow/.test(t)) return add(1);
  if (/two week|2 week/.test(t)) return add(14);
  if (/next week|one week|a week/.test(t)) return add(7);
  if (/three day|3 day/.test(t)) return add(3);
  const MONTHS = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };
  const mMatch = text.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i
  );
  if (mMatch) {
    const d = new Date(today.getFullYear(), MONTHS[mMatch[1].toLowerCase()], parseInt(mMatch[2]));
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }
  const parsed = new Date(text);
  if (!isNaN(parsed) && parsed > today) return parsed.toISOString().split('T')[0];
  return add(3);
}

// Clear stored data for steps [fromStep, toStep] inclusive — used when going back
function clearDataRange(fromStep, toStep, d) {
  const c = { ...d };
  for (let s = fromStep; s <= toStep; s++) {
    switch (s) {
      case 0: c.farmerName = ''; break;
      case 1: c.farmName = ''; break;
      case 2: c.bio = ''; break;
      case 3: c.productName = ''; c.category = 'vegetables'; break;
      case 4: c.description = ''; break;
      case 5: c.quantity = ''; c.unit = 'lb'; c.priceSuggestion = null; break;
      case 6: c.price = ''; break;
      case 7: c.practices = { noAntibiotics: false, noPesticides: false, pastureRaised: false, organicFeed: false, nonGMO: false }; break;
      case 8: c.availabilityDate = ''; break;
    }
  }
  return c;
}

function formatFieldValue(d, step) {
  switch (step) {
    case 0: return d.farmerName || '—';
    case 1: return d.farmName || '—';
    case 2: return d.bio ? (d.bio.length > 55 ? d.bio.slice(0, 55) + '…' : d.bio) : '—';
    case 3: return d.productName || '—';
    case 4: return d.description ? (d.description.length > 55 ? d.description.slice(0, 55) + '…' : d.description) : '—';
    case 5: return d.quantity ? `${d.quantity} ${d.unit}` : '—';
    case 6: return d.price ? `$${Number(d.price).toFixed(2)}` : '—';
    case 7: {
      const active = PRACTICES_LIST.filter(p => d.practices[p.key]).map(p => p.label);
      return active.length > 0 ? active.join(', ') : 'None';
    }
    case 8:
      return d.availabilityDate
        ? new Date(d.availabilityDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—';
    default: return '—';
  }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function VoiceOnboarding({ onSwitchToForm }) {
  const [stepIndex, setStepIndex]           = useState(0);
  const [data, setData]                     = useState(DEFAULT_DATA);
  const [chatHistory, setChatHistory]       = useState([]);
  const [listening, setListening]           = useState(false);
  const [stillListening, setStillListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [textInput, setTextInput]           = useState('');
  const [processing, setProcessing]         = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [error, setError]                   = useState(null);
  const [showEditList, setShowEditList]     = useState(false);
  const [redoCount, setRedoCount]           = useState(0);

  const speechSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  const synthSupported  = 'speechSynthesis' in window;

  const recognitionRef    = useRef(null);
  const voicesRef         = useRef([]);
  const chatEndRef        = useRef(null);
  const stepRef           = useRef(stepIndex);
  const dataRef           = useRef(data);
  const returnToReviewRef = useRef(false);
  const silenceTimerRef   = useRef(null);
  const stillTimerRef     = useRef(null);
  const currentAudioRef   = useRef(null);
  const redoCountRef      = useRef(0);   // consecutive redo presses
  const redoBaseStepRef   = useRef(-1);  // step index when first redo was pressed

  stepRef.current = stepIndex;
  dataRef.current = data;

  // ── Load TTS voices ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!synthSupported) return;
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [synthSupported]);

  // ── Auto-scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, liveTranscript]);

  // ── Chat helpers ───────────────────────────────────────────────────────────

  const addAI = useCallback((text) => {
    setChatHistory(h => [...h, { role: 'ai', text, id: Date.now() + Math.random() }]);
  }, []);

  const addUser = useCallback((text) => {
    setChatHistory(h => [...h, { role: 'user', text, id: Date.now() + Math.random() }]);
  }, []);

  // ── TTS: ElevenLabs proxy → SpeechSynthesis fallback ──────────────────────

  const speak = useCallback((text) => {
    // Cancel any ongoing speech
    window.speechSynthesis?.cancel();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Try ElevenLabs via backend
    fetch('/api/agent/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('ElevenLabs unavailable');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
        };
        audio.play().catch(() => { /* autoplay blocked — silent */ });
      })
      .catch(() => {
        // Fallback: Web Speech API
        if (!synthSupported) return;
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.05;
        u.pitch = 1.0;
        u.volume = 1.0;
        const voices = voicesRef.current;
        u.voice =
          voices.find(v =>
            v.lang.startsWith('en') &&
            /samantha|zira|susan|karen|moira|tessa|victoria|fiona|female/i.test(v.name)
          ) ||
          voices.find(v => v.lang === 'en-US') ||
          voices[0] ||
          null;
        window.speechSynthesis.speak(u);
      });
  }, [synthSupported]);

  // ── Prompts ────────────────────────────────────────────────────────────────

  const getPrompt = useCallback((idx, d) => {
    switch (idx) {
      case 0: return "Hi! I'm here to help you list your products on Trust Your Food. What's your name?";
      case 1: return `Nice to meet you, ${d.farmerName}! What's the name of your farm?`;
      case 2: return `Tell me a little about ${d.farmName} — what makes your farm special?`;
      case 3: return 'What product would you like to list today?';
      case 4: return "How would you describe it? For example, how it's raised or grown.";
      case 5: return "How much do you have available, and what unit? For example: '20 dozen eggs' or '15 pounds of beef'.";
      case 6:
        return d.priceSuggestion
          ? `Similar products sell for $${d.priceSuggestion.suggested_min.toFixed(2)} to $${d.priceSuggestion.suggested_max.toFixed(2)} on Trust Your Food. What price per ${d.unit} would you like to set?`
          : `What price per ${d.unit} would you like to set?`;
      case 7: return "What farming practices apply? Tap the badges or say them out loud — say 'done' when ready.";
      case 8: return "Almost done! When will this be available? Say 'tomorrow', 'next week', or give a date.";
      case 9: {
        const active = PRACTICES_LIST.filter(p => d.practices[p.key]).map(p => p.label).join(', ');
        return (
          `Here's your listing. ${d.farmName} listing ${d.productName} for $${Number(d.price).toFixed(2)} per ${d.unit}.` +
          (active ? ` Practices: ${active}.` : '') +
          ` Say "publish" to go live, or tap Publish below. Tap "Change" to edit any field.`
        );
      }
      default: return '';
    }
  }, []);

  // ── Advance to next step ───────────────────────────────────────────────────

  const advanceTo = useCallback((nextIdx, newData) => {
    const prompt = getPrompt(nextIdx, newData);
    setTimeout(() => {
      addAI(prompt);
      speak(prompt);
      setStepIndex(nextIdx);
      if (nextIdx === 9) setShowEditList(false);
    }, 700);
  }, [getPrompt, addAI, speak]);

  // ── Redo: go back consecutively (improvement 4) ───────────────────────────
  //
  //  redoCount == 0  →  first press: re-ask current step (no navigation)
  //  redoCount >= 1  →  each press: go back one more step, clear that step's data

  const triggerRedo = useCallback((currentIdx, currentData) => {
    let targetIdx;
    let shouldClear = false;

    if (redoCountRef.current === 0) {
      // First redo — just re-ask the same question
      redoBaseStepRef.current = currentIdx;
      redoCountRef.current = 1;
      setRedoCount(1);
      targetIdx = currentIdx;
    } else {
      // Second+ redo — step back one more from the original base step
      redoCountRef.current += 1;
      setRedoCount(redoCountRef.current);
      const stepsBack = redoCountRef.current - 1;
      targetIdx = Math.max(0, redoBaseStepRef.current - stepsBack);
      shouldClear = true;
    }

    // Remove the most recent user bubble (their last answer) from chat
    setChatHistory(h => {
      const copy = [...h];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === 'user') { copy.splice(i, 1); break; }
      }
      return copy;
    });

    // Clear data for all steps from targetIdx up to the base step
    let nextData = currentData;
    if (shouldClear) {
      nextData = clearDataRange(targetIdx, redoBaseStepRef.current, currentData);
      setData(nextData);
      dataRef.current = nextData;
    }

    const isGoingBack = targetIdx < currentIdx;
    const prefix = isGoingBack
      ? `Going back to ${STEP_LABELS[targetIdx]}.`
      : 'Sure! Let me re-ask.';
    const prompt = getPrompt(targetIdx, nextData);

    setTimeout(() => {
      addAI(`${prefix} ${prompt}`);
      speak(`${prefix} ${prompt}`);
      if (targetIdx !== currentIdx) setStepIndex(targetIdx);
    }, 300);
  }, [getPrompt, addAI, speak]);

  // ── LLM interpretation (improvement 1) ────────────────────────────────────

  // Returns { text: string, category?: string }
  const interpretAnswer = useCallback(async (rawText, stepIdx, d) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.warn('[interpretAnswer] timed out after 5s, falling back to raw input');
      controller.abort();
    }, 5000);
    try {
      console.log(`[interpretAnswer] step=${stepIdx} (${STEP_LABELS[stepIdx]}) sending raw="${rawText.slice(0,60)}"`);
      const res = await fetch('/api/agent/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: getPrompt(stepIdx, d),
          step: STEP_LABELS[stepIdx],
          rawText,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const body = await res.json();
        console.log(`[interpretAnswer] response:`, body);
        if (body.cleaned && body.cleaned.trim()) {
          return { text: body.cleaned.trim(), category: body.category || null };
        }
      } else {
        console.warn(`[interpretAnswer] HTTP ${res.status} from /api/agent/interpret`);
      }
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') {
        console.warn('[interpretAnswer] aborted (timeout) — using raw input');
      } else {
        console.error('[interpretAnswer] fetch error:', e.message);
      }
    }
    return { text: rawText, category: null };
  }, [getPrompt]);

  // ── Submit listing ─────────────────────────────────────────────────────────

  const submitListing = useCallback(async (d) => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        farmer: {
          name: d.farmerName,
          farmName: d.farmName,
          bio: d.bio,
          location: { city: 'New Haven', state: 'CT' },
          practices: d.practices,
          yearsInOperation: 1,
        },
        product: {
          name: d.productName,
          category: d.category,
          description: d.description,
          quantity: Number(d.quantity) || 10,
          unit: d.unit,
          price: Number(d.price) || 0,
          availabilityDate:
            d.availabilityDate || new Date(Date.now() + 3 * 86400000).toISOString(),
        },
      };
      const res = await fetch('/api/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Submission failed');
      }
      setSubmitted(true);
      speak('Your listing is live! Customers can now find your products on Trust Your Food.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [speak]);

  // ── Process farmer answer ──────────────────────────────────────────────────

  const processAnswer = useCallback(async (answer, idx, d) => {
    const raw = answer.trim();
    if (!raw) return;

    // ── Redo detection — checked before LLM interpretation ───────────────────
    const isRedo = /\b(redo|again|repeat|start over|go back|try again)\b/i.test(raw);
    if (isRedo) {
      setLiveTranscript('');
      setTextInput('');
      triggerRedo(idx, d);
      return;
    }

    // Real answer — reset consecutive redo counter
    redoCountRef.current = 0;
    setRedoCount(0);

    setProcessing(true);
    console.log(`[processAnswer] step=${idx} (${STEP_LABELS[idx]}) raw="${raw.slice(0,80)}"`);

    // ── LLM interpretation (improvement 1) — skip for practices & confirm ──
    let cleaned = raw;
    let llmCategory = null;
    if (idx !== 7 && idx !== 9) {
      console.log(`[processAnswer] calling interpretAnswer...`);
      const result = await interpretAnswer(raw, idx, d);
      cleaned = result.text;
      llmCategory = result.category || null;
      console.log(`[processAnswer] interpretAnswer done — cleaned="${cleaned.slice(0,60)}" category=${llmCategory}`);
    }

    addUser(cleaned);
    setLiveTranscript('');
    setTextInput('');

    let nd = { ...d };
    let next = idx + 1;

    switch (idx) {
      case 0:
        nd.farmerName = cleaned
          .replace(/^(i'm|my name is|i am|it's|this is|name is)\s+/i, '')
          .replace(/[.,!?]$/, '')
          .trim();
        break;

      case 1:
        nd.farmName = cleaned
          .replace(/^(it's called|we're called|the name is|it's|this is)\s+/i, '')
          .replace(/[.,!?]$/, '')
          .trim();
        break;

      case 2:
        nd.bio = cleaned;
        break;

      case 3:
        nd.productName = cleaned;
        // Use LLM-detected category if available, else fall back to regex guess
        nd.category = llmCategory || guessCategory(cleaned);
        console.log(`[processAnswer] product="${nd.productName}" category="${nd.category}"`);
        break;

      case 4:
        nd.description = cleaned;
        break;

      case 5: {
        const parsed = parseQuantityUnit(cleaned);
        if (parsed) {
          nd.quantity = parsed.quantity;
          nd.unit = parsed.unit;
        } else {
          nd.quantity = cleaned;
        }
        // Fetch price suggestion for step 6 (5s timeout — never block advance)
        try {
          const params = new URLSearchParams({ category: nd.category });
          if (nd.productName.trim().length > 2) params.set('name', nd.productName.trim());
          console.log(`[processAnswer] fetching price suggestion for category="${nd.category}"...`);
          const psController = new AbortController();
          const psTimeout = setTimeout(() => {
            console.warn('[processAnswer] price-suggestion timed out after 5s, skipping');
            psController.abort();
          }, 5000);
          const r = await fetch(`/api/products/price-suggestion?${params}`, { signal: psController.signal });
          clearTimeout(psTimeout);
          const s = await r.json();
          console.log(`[processAnswer] price suggestion result:`, s);
          if (s.sample_size > 0) nd.priceSuggestion = s;
        } catch (e) {
          if (e.name !== 'AbortError') console.warn('[processAnswer] price-suggestion error:', e.message);
        }
        break;
      }

      case 6: {
        const price = parsePrice(cleaned);
        nd.price = price !== null ? price : cleaned;
        break;
      }

      case 7: {
        nd.practices = parsePracticesSpeech(cleaned, nd.practices);
        const t = cleaned.toLowerCase();
        if (/done|next|continue|that.s it|finished|move on|skip/.test(t)) {
          next = 8;
        } else {
          const activeCount = Object.values(nd.practices).filter(Boolean).length;
          const ack =
            activeCount > 0
              ? `Got it — ${activeCount} practice${activeCount > 1 ? 's' : ''} selected. Say 'done' or tap Continue when ready.`
              : "Okay, no practices selected. Say 'done' or tap Continue when ready.";
          setTimeout(() => addAI(ack), 400);
          setData(nd);
          setProcessing(false);
          return;
        }
        break;
      }

      case 8:
        nd.availabilityDate = parseDate(cleaned);
        break;

      case 9: {
        const t = cleaned.toLowerCase();
        if (/publish|yes|confirm|go live|looks good|correct|submit|do it/.test(t)) {
          setData(nd);
          setProcessing(false);
          submitListing(nd);
          return;
        } else if (/back|no|change|edit|fix/.test(t)) {
          setShowEditList(true);
          setProcessing(false);
          addAI('Which field would you like to change? Tap an Edit button below.');
          return;
        }
        break;
      }
    }

    setData(nd);
    setProcessing(false);

    // ── Return to review if editing a field (improvement 5) ──
    const nextStep = (returnToReviewRef.current && next !== idx) ? 9 : next;
    console.log(`[processAnswer] done — advancing to step ${nextStep} (${STEP_LABELS[nextStep] ?? 'complete'})`);
    if (returnToReviewRef.current && next !== idx) {
      returnToReviewRef.current = false;
      advanceTo(9, nd);
    } else {
      advanceTo(next, nd);
    }
  }, [addUser, addAI, advanceTo, submitListing, interpretAnswer, getPrompt, speak, triggerRedo]);

  // ── Edit a specific field from review (improvement 5) ─────────────────────

  const editField = useCallback((stepIdx) => {
    returnToReviewRef.current = true;
    setShowEditList(false);
    const prompt = getPrompt(stepIdx, dataRef.current);
    setTimeout(() => {
      addAI(`Let's update that. ${prompt}`);
      speak(`Let's update that. ${prompt}`);
      setStepIndex(stepIdx);
    }, 200);
  }, [getPrompt, addAI, speak]);

  // ── Silence timer helpers (improvement 3) ─────────────────────────────────

  const clearSilenceTimers = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    clearTimeout(stillTimerRef.current);
    setStillListening(false);
  }, []);

  const resetSilenceTimers = useCallback((rec) => {
    clearSilenceTimers();
    // "still listening…" indicator after 1500 ms of silence
    stillTimerRef.current = setTimeout(() => setStillListening(true), 1500);
    // Auto-stop after 2500 ms of silence
    silenceTimerRef.current = setTimeout(() => {
      setStillListening(false);
      rec.stop();
    }, 2500);
  }, [clearSilenceTimers]);

  // ── Speech recognition (improvement 3: continuous + silence detection) ────

  const startListening = useCallback(() => {
    if (!speechSupported || listening) return;
    window.speechSynthesis?.cancel();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = '';

    rec.onstart = () => resetSilenceTimers(rec);

    rec.onresult = (e) => {
      let interim = '';
      finalText = '';
      for (const result of e.results) {
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setLiveTranscript(finalText || interim);
      if (finalText || interim) resetSilenceTimers(rec);
    };

    rec.onend = () => {
      clearSilenceTimers();
      setListening(false);
      if (finalText.trim()) {
        processAnswer(finalText, stepRef.current, dataRef.current);
      }
    };

    rec.onerror = (e) => {
      console.warn('Speech error:', e.error);
      clearSilenceTimers();
      setListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setLiveTranscript('');
  }, [speechSupported, listening, processAnswer, resetSilenceTimers, clearSilenceTimers]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    clearSilenceTimers();
    setListening(false);
  }, [clearSilenceTimers]);

  const toggleMic = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  // ── Text fallback ──────────────────────────────────────────────────────────

  const handleTextSubmit = useCallback((e) => {
    e.preventDefault();
    if (textInput.trim()) processAnswer(textInput, stepRef.current, dataRef.current);
  }, [textInput, processAnswer]);

  // ── Redo button handler — delegates to triggerRedo ────────────────────────

  const handleRedo = useCallback(() => {
    triggerRedo(stepRef.current, dataRef.current);
  }, [triggerRedo]);

  // ── Init: speak first question ─────────────────────────────────────────────

  useEffect(() => {
    const prompt = getPrompt(0, DEFAULT_DATA);
    addAI(prompt);
    const t = setTimeout(() => speak(prompt), 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset flow ─────────────────────────────────────────────────────────────

  const resetFlow = useCallback(() => {
    setSubmitted(false);
    setStepIndex(0);
    setData(DEFAULT_DATA);
    setChatHistory([]);
    setError(null);
    setShowEditList(false);
    setRedoCount(0);
    returnToReviewRef.current = false;
    redoCountRef.current = 0;
    redoBaseStepRef.current = -1;
    const prompt = getPrompt(0, DEFAULT_DATA);
    setTimeout(() => { addAI(prompt); speak(prompt); }, 100);
  }, [getPrompt, addAI, speak]);

  // ─────────────────────────── RENDER ───────────────────────────────────────

  if (submitted) {
    return (
      <div className="vo-page vo-success-page">
        <div className="vo-success-card">
          <div className="vo-success-icon">🌿</div>
          <h2>You're on the map!</h2>
          <p>
            Your listing for <strong>{data.productName}</strong> from{' '}
            <strong>{data.farmName}</strong> is now live on Trust Your Food.
          </p>
          <button className="vo-btn-primary" onClick={() => (window.location.href = '/')}>
            Browse Marketplace
          </button>
          <button className="vo-btn-ghost" onClick={resetFlow}>
            + List Another Product
          </button>
        </div>
      </div>
    );
  }

  const currentPrompt = getPrompt(stepIndex, data);
  const isConfirmStep = stepIndex === 9;
  const isPracticesStep = stepIndex === 7;

  return (
    <div className={`vo-page${listening ? ' vo-is-listening' : ''}`}>

      {/* ── Header ── */}
      <div className="vo-header">
        <span className="vo-logo">🌿 Trust Your Food</span>
        <div className="vo-progress">
          <span className="vo-step-label">{STEP_LABELS[stepIndex]}</span>
          <div className="vo-progress-track">
            <div
              className="vo-progress-fill"
              style={{ width: `${((stepIndex + 1) / 10) * 100}%` }}
            />
          </div>
          <span className="vo-step-count">{stepIndex + 1}/10</span>
        </div>
        <button className="vo-form-link" onClick={onSwitchToForm}>
          Switch to form
        </button>
      </div>

      {/* ── Chat history ── */}
      <div className="vo-chat">
        {chatHistory.map(msg => (
          <div key={msg.id} className={`vo-bubble vo-bubble-${msg.role}`}>
            {msg.role === 'ai' && <span className="vo-avatar">🌿</span>}
            <span className="vo-bubble-text">{msg.text}</span>
          </div>
        ))}

        {/* Live transcript preview */}
        {listening && liveTranscript && (
          <div className="vo-bubble vo-bubble-user vo-bubble-live">
            <span className="vo-bubble-text">{liveTranscript}</span>
          </div>
        )}

        {/* Practices badges — step 7 */}
        {isPracticesStep && (
          <div className="vo-practices-panel">
            <div className="vo-practices-grid">
              {PRACTICES_LIST.map(p => (
                <button
                  key={p.key}
                  className={`vo-practice-badge${data.practices[p.key] ? ' active' : ''}`}
                  onClick={() =>
                    setData(d => ({
                      ...d,
                      practices: { ...d.practices, [p.key]: !d.practices[p.key] },
                    }))
                  }
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                  {data.practices[p.key] && <span className="vo-check">✓</span>}
                </button>
              ))}
            </div>
            <button
              className="vo-continue-btn"
              onClick={() => {
                if (returnToReviewRef.current) {
                  returnToReviewRef.current = false;
                  const reviewPrompt = getPrompt(9, data);
                  addAI(reviewPrompt);
                  speak(reviewPrompt);
                  setStepIndex(9);
                  setShowEditList(false);
                } else {
                  const prompt = getPrompt(8, data);
                  addAI(prompt);
                  speak(prompt);
                  setStepIndex(8);
                }
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Preview card — step 9 (improvement 5) */}
        {isConfirmStep && (
          <div className="vo-preview-card">
            <div className="vo-preview-header">
              <span className="vo-preview-farm">{data.farmName}</span>
              <span className="vo-preview-cat">{data.category}</span>
            </div>
            <h3 className="vo-preview-name">{data.productName}</h3>
            <p className="vo-preview-desc">{data.description}</p>
            <div className="vo-preview-meta">
              <span className="vo-preview-price">
                ${Number(data.price).toFixed(2)} / {data.unit}
              </span>
              <span className="vo-preview-qty">
                {data.quantity} {data.unit} available
              </span>
            </div>
            {data.availabilityDate && (
              <div className="vo-preview-date">
                📅 Available{' '}
                {new Date(data.availabilityDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })}
              </div>
            )}
            {Object.values(data.practices).some(Boolean) && (
              <div className="vo-preview-practices">
                {PRACTICES_LIST.filter(p => data.practices[p.key]).map(p => (
                  <span key={p.key} className="vo-preview-pill">
                    {p.icon} {p.label}
                  </span>
                ))}
              </div>
            )}
            {error && <div className="vo-error">{error}</div>}

            <div className="vo-preview-actions">
              <button
                className="vo-btn-primary"
                onClick={() => submitListing(data)}
                disabled={submitting}
              >
                {submitting ? 'Publishing…' : '🌿 Publish Listing'}
              </button>
              <button
                className="vo-btn-ghost"
                onClick={() => setShowEditList(e => !e)}
              >
                ✏️ Change
              </button>
            </div>

            {/* Per-field edit list (improvement 5) */}
            {showEditList && (
              <div className="vo-edit-list">
                <p className="vo-edit-list-title">What would you like to change?</p>
                {EDIT_FIELDS.map(({ step, label }) => (
                  <div key={step} className="vo-edit-row">
                    <div className="vo-edit-row-info">
                      <span className="vo-edit-label">{label}</span>
                      <span className="vo-edit-value">{formatFieldValue(data, step)}</span>
                    </div>
                    <button className="vo-edit-btn" onClick={() => editField(step)}>
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Current question banner ── */}
      {!isConfirmStep && (
        <div className="vo-question-banner">
          <p className="vo-question-text">{currentPrompt}</p>
        </div>
      )}

      {/* ── Controls ── */}
      {!isConfirmStep && (
        <div className="vo-controls">

          {/* Waveform / still-listening indicator (improvement 3) */}
          {listening && (
            <div className="vo-waveform">
              {stillListening ? (
                <span className="vo-still-listening">still listening…</span>
              ) : (
                [0.0, 0.15, 0.3, 0.15, 0.0].map((delay, i) => (
                  <span
                    key={i}
                    className="vo-wave-bar"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))
              )}
            </div>
          )}

          {/* Mic button */}
          <button
            className={`vo-mic-btn${listening ? ' active' : ''}`}
            onClick={toggleMic}
            disabled={processing || submitting}
            aria-label={listening ? 'Stop recording' : 'Start recording'}
          >
            {processing ? '⏳' : listening ? '⏹' : '🎙️'}
          </button>
          <p className="vo-mic-hint">
            {processing ? 'Processing…' : listening ? 'Tap to stop' : 'Tap to speak'}
          </p>

          {/* Redo button — label changes after first press */}
          {stepIndex > 0 && !listening && !processing && (
            <button
              className={`vo-redo-btn${redoCount >= 1 ? ' vo-redo-btn-active' : ''}`}
              onClick={handleRedo}
              title={redoCount >= 1 ? 'Go back one more step' : 'Re-ask the current question'}
            >
              {redoCount >= 1 ? '↩ Go Back Further' : '↩ Redo'}
            </button>
          )}

          {/* Text input fallback */}
          <form className="vo-text-row" onSubmit={handleTextSubmit}>
            <input
              className="vo-text-input"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={speechSupported ? 'Or type here…' : 'Type your answer…'}
              disabled={processing}
            />
            <button
              type="submit"
              className="vo-text-send"
              disabled={!textInput.trim() || processing}
            >
              →
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
