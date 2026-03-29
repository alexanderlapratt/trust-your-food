import { useState, useRef, useEffect } from 'react';
import './FarmerListing.css';
import VoiceOnboarding from './VoiceOnboarding.jsx';

const CATEGORIES = ['vegetables', 'fruits', 'meat', 'dairy', 'eggs', 'herbs', 'honey', 'grains', 'other'];
const UNITS = ['lb', 'oz', 'kg', 'dozen', 'bunch', 'bag', 'jar', 'pint', 'quart', 'gallon', 'half-gal', 'pack', 'bird', 'log', 'ea'];

const PRACTICES = [
  { key: 'noAntibiotics', label: 'No Antibiotics', icon: '🚫💊', desc: 'No antibiotic use in animals' },
  { key: 'noPesticides', label: 'No Pesticides', icon: '🌱', desc: 'Chemical pesticide-free crops' },
  { key: 'pastureRaised', label: 'Pasture Raised', icon: '🐄', desc: 'Animals on pasture, not confined' },
  { key: 'organicFeed', label: 'Organic Feed', icon: '🌾', desc: 'Animals fed certified organic feed' },
  { key: 'nonGMO', label: 'Non-GMO', icon: '🧬', desc: 'No genetically modified organisms' },
];

const DEFAULT_FARMER = {
  name: '', farmName: '', email: '', phone: '', bio: '',
  location: { address: '', city: '', state: 'CT', zip: '' },
  yearsInOperation: '',
};

const DEFAULT_PRODUCT = {
  category: 'vegetables', name: '', description: '', quantity: '', unit: 'lb', price: '', availabilityDate: '',
};

const DEFAULT_PRACTICES = {
  noAntibiotics: false, noPesticides: false, pastureRaised: false, organicFeed: false, nonGMO: false,
};

export default function FarmerListing() {
  const [mode, setMode] = useState('voice'); // 'voice' | 'form'

  if (mode === 'voice') {
    return <VoiceOnboarding onSwitchToForm={() => setMode('form')} />;
  }

  return <FarmerListingForm onSwitchToVoice={() => setMode('voice')} />;
}

function FarmerListingForm({ onSwitchToVoice }) {
  const [farmerData, setFarmerData] = useState(DEFAULT_FARMER);
  const [productData, setProductData] = useState(DEFAULT_PRODUCT);
  const [practices, setPractices] = useState(DEFAULT_PRACTICES);
  const [step, setStep] = useState(1); // 1=farmer info, 2=product, 3=success
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState(null);
  const recognitionRef = useRef(null);
  const suggestionTimerRef = useRef(null);

  // Fetch price suggestion whenever category or name changes (debounced 600ms)
  useEffect(() => {
    clearTimeout(suggestionTimerRef.current);
    if (step !== 2) return;
    suggestionTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ category: productData.category });
        if (productData.name.trim().length > 2) params.set('name', productData.name.trim());
        const res = await fetch(`/api/products/price-suggestion?${params}`);
        const data = await res.json();
        setPriceSuggestion(data.sample_size > 0 ? data : null);
      } catch {
        setPriceSuggestion(null);
      }
    }, 600);
    return () => clearTimeout(suggestionTimerRef.current);
  }, [productData.category, productData.name, step]);

  function updateFarmer(field, value) {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFarmerData((p) => ({ ...p, [parent]: { ...p[parent], [child]: value } }));
    } else {
      setFarmerData((p) => ({ ...p, [field]: value }));
    }
  }

  function updateProduct(field, value) {
    setProductData((p) => ({ ...p, [field]: value }));
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(' ');
      updateFarmer('bio', (farmerData.bio ? farmerData.bio + ' ' : '') + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function togglePractice(key) {
    setPractices((p) => ({ ...p, [key]: !p[key] }));
  }

  // Rough trust score preview
  function previewScore() {
    let score = 0;
    const fields = [farmerData.name, farmerData.farmName, farmerData.email, farmerData.phone,
      farmerData.bio?.length > 20 ? 'bio' : '', farmerData.location.city, '', ''];
    score += (fields.filter(Boolean).length / 8) * 20;
    const trueCount = Object.values(practices).filter(Boolean).length;
    score += (trueCount / 5) * 40;
    score += 0.95 * 30; // default reliability
    score += (4.5 / 5) * 10; // default community
    return Math.round(score);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        farmer: {
          ...farmerData,
          practices,
          yearsInOperation: Number(farmerData.yearsInOperation) || 1,
        },
        product: {
          ...productData,
          quantity: Number(productData.quantity),
          price: Number(productData.price),
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

      const data = await res.json();
      setResult(data);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 3 && result) {
    const score = previewScore();
    return (
      <div className="farmer-listing">
        <div className="container listing-container">
          <div className="success-card fade-in">
            <div className="success-icon">🌿</div>
            <h2 className="success-title">You're on the map!</h2>
            <p className="success-sub">Your farm listing is live. Neighbors in New Haven can now find your products.</p>
            <div className="success-score-card">
              <div className="success-score-num">{score}</div>
              <div>
                <div className="success-score-label">Your Trust Score</div>
                <p className="success-score-tip">Complete more profile fields and enable more practices to increase your score.</p>
              </div>
            </div>
            <div className="success-details">
              <div className="success-detail-row">
                <span>Farm</span><strong>{result.farmer?.farmName}</strong>
              </div>
              <div className="success-detail-row">
                <span>Product</span><strong>{result.product?.name}</strong>
              </div>
              <div className="success-detail-row">
                <span>Price</span><strong>${Number(result.product?.price).toFixed(2)} / {result.product?.unit}</strong>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}
              onClick={() => { setStep(1); setFarmerData(DEFAULT_FARMER); setProductData(DEFAULT_PRODUCT); setPractices(DEFAULT_PRACTICES); setResult(null); }}>
              + Add Another Listing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="farmer-listing">
      <div className="listing-hero">
        <div className="container">
          <h1 className="listing-hero-title">List Your Harvest</h1>
          <p className="listing-hero-sub">Join the Trust Your Food network and sell directly to your neighbors.</p>
          <button className="listing-voice-switch" onClick={onSwitchToVoice}>
            🎙️ Switch to voice onboarding
          </button>
        </div>
      </div>

      <div className="container listing-container">
        {/* Step indicator */}
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
            <span>{step > 1 ? '✓' : '1'}</span>
            <div className="step-label">Your Farm</div>
          </div>
          <div className="step-line" />
          <div className={`step-dot ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
            <span>{step > 2 ? '✓' : '2'}</span>
            <div className="step-label">Your Product</div>
          </div>
        </div>

        <div className="listing-layout">
          <div className="listing-form-wrap">
            {/* Step 1: Farmer Info */}
            {step === 1 && (
              <div className="listing-form fade-in">
                <h2 className="form-section-title">About Your Farm</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Your Name *</label>
                    <input className="form-input" placeholder="Margaret Holloway" value={farmerData.name}
                      onChange={(e) => updateFarmer('name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Farm Name *</label>
                    <input className="form-input" placeholder="Holloway Heritage Farm" value={farmerData.farmName}
                      onChange={(e) => updateFarmer('farmName', e.target.value)} />
                  </div>
                </div>

                {/* Farm Bio + Voice Input */}
                <div className="form-group">
                  <div className="bio-label-row">
                    <label className="form-label">Farm Bio</label>
                    <button
                      type="button"
                      className={`mic-btn ${isRecording ? 'mic-btn-active' : ''}`}
                      onClick={startVoiceInput}
                    >
                      {isRecording
                        ? <><span className="mic-pulse" />Stop recording</>
                        : <>🎙️ Speak your farm story</>}
                    </button>
                  </div>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Tell customers about your farm, your story, and what makes your products special..."
                    value={farmerData.bio}
                    onChange={(e) => updateFarmer('bio', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" placeholder="you@yourfarm.com" value={farmerData.email}
                      onChange={(e) => updateFarmer('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" type="tel" placeholder="203-555-0100" value={farmerData.phone}
                      onChange={(e) => updateFarmer('phone', e.target.value)} />
                  </div>
                </div>

                <div className="form-row form-row-3">
                  <div className="form-group form-group-wide">
                    <label className="form-label">Street Address</label>
                    <input className="form-input" placeholder="44 Orchard Hill Rd" value={farmerData.location.address}
                      onChange={(e) => updateFarmer('location.address', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" placeholder="Hamden" value={farmerData.location.city}
                      onChange={(e) => updateFarmer('location.city', e.target.value)} />
                  </div>
                  <div className="form-group form-group-sm">
                    <label className="form-label">ZIP</label>
                    <input className="form-input" placeholder="06518" value={farmerData.location.zip}
                      onChange={(e) => updateFarmer('location.zip', e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Years in Operation</label>
                  <input className="form-input" type="number" min="0" placeholder="e.g. 5"
                    value={farmerData.yearsInOperation}
                    onChange={(e) => updateFarmer('yearsInOperation', e.target.value)}
                    style={{ maxWidth: 140 }} />
                </div>

                <h2 className="form-section-title" style={{ marginTop: 8 }}>Farm Practices</h2>
                <p className="form-section-hint">Check all that apply — these directly affect your Trust Score.</p>

                <div className="practices-grid">
                  {PRACTICES.map((p) => (
                    <label key={p.key} className={`practice-card ${practices[p.key] ? 'active' : ''}`}>
                      <input type="checkbox" checked={practices[p.key]} onChange={() => togglePractice(p.key)} />
                      <span className="practice-card-icon">{p.icon}</span>
                      <div>
                        <div className="practice-card-label">{p.label}</div>
                        <div className="practice-card-desc">{p.desc}</div>
                      </div>
                      <span className="practice-card-check">{practices[p.key] ? '✓' : ''}</span>
                    </label>
                  ))}
                </div>

                <div className="form-actions">
                  <button className="btn btn-primary" style={{ minWidth: 180 }}
                    onClick={() => setStep(2)}
                    disabled={!farmerData.name || !farmerData.farmName}>
                    Next: Add Product →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Product */}
            {step === 2 && (
              <div className="listing-form fade-in">
                <h2 className="form-section-title">Your Product</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-input form-select" value={productData.category}
                      onChange={(e) => updateProduct('category', e.target.value)}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group form-group-wide">
                    <label className="form-label">Product Name *</label>
                    <input className="form-input" placeholder="e.g. Heirloom Tomato Mix" value={productData.name}
                      onChange={(e) => updateProduct('name', e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input form-textarea"
                    placeholder="What makes this product special? Variety, flavor notes, how it's grown..."
                    value={productData.description}
                    onChange={(e) => updateProduct('description', e.target.value)}
                    rows={3} />
                </div>

                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input className="form-input" type="number" min="0" placeholder="e.g. 20" value={productData.quantity}
                      onChange={(e) => updateProduct('quantity', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select className="form-input form-select" value={productData.unit}
                      onChange={(e) => updateProduct('unit', e.target.value)}>
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price ($ / unit) *</label>
                    <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={productData.price}
                      onChange={(e) => updateProduct('price', e.target.value)} />
                  </div>
                </div>

                {priceSuggestion && (
                  <div className="price-suggestion-hint">
                    <span className="price-suggestion-text">
                      💡 Similar products sell for <strong>${priceSuggestion.suggested_min.toFixed(2)} – ${priceSuggestion.suggested_max.toFixed(2)}</strong> on Trust Your Food
                      {priceSuggestion.sample_size > 1 && <span className="price-suggestion-count"> ({priceSuggestion.sample_size} listings)</span>}
                    </span>
                    <button
                      type="button"
                      className="price-suggestion-btn"
                      onClick={() => updateProduct('price', priceSuggestion.average.toFixed(2))}
                    >
                      Use ${priceSuggestion.average.toFixed(2)}
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Availability Date</label>
                  <input className="form-input" type="date" value={productData.availabilityDate}
                    onChange={(e) => updateProduct('availabilityDate', e.target.value)}
                    style={{ maxWidth: 220 }} />
                </div>

                {error && <div className="form-error">{error}</div>}

                <div className="form-actions">
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn btn-primary" style={{ minWidth: 180 }}
                    onClick={handleSubmit}
                    disabled={submitting || !productData.name || !productData.quantity || !productData.price}>
                    {submitting ? 'Listing...' : '🌿 List My Farm'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trust score preview */}
          <div className="trust-preview-panel">
            <div className="trust-preview-card">
              <h3 className="trust-preview-title">Trust Score Preview</h3>
              <div className="trust-preview-score">{previewScore()}<span>/100</span></div>
              <div className="trust-preview-bars">
                <TrustBar label="Profile Completeness" max={20} value={(() => {
                  const fields = [farmerData.name, farmerData.farmName, farmerData.email, farmerData.phone,
                    farmerData.bio?.length > 20 ? 'x' : '', farmerData.location.city, '', ''];
                  return Math.round((fields.filter(Boolean).length / 8) * 20);
                })()} />
                <TrustBar label="Transparency" max={40} value={Math.round((Object.values(practices).filter(Boolean).length / 5) * 40)} />
                <TrustBar label="Reliability" max={30} value={29} note="95% default" />
                <TrustBar label="Community" max={10} value={9} note="4.5★ default" />
              </div>
              <p className="trust-preview-tip">
                💡 Fill out your bio, phone, and email to boost your Profile score. Enable more practices for a higher Transparency score.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustBar({ label, max, value, note }) {
  const pct = (value / max) * 100;
  return (
    <div className="trust-bar-row">
      <div className="trust-bar-header">
        <span className="trust-bar-label">{label}</span>
        <span className="trust-bar-value">{value}/{max} {note && <small>({note})</small>}</span>
      </div>
      <div className="trust-bar-track">
        <div className="trust-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
