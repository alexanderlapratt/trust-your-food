import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TrustBadge from './TrustBadge.jsx';
import './FarmCard.css';

function TrustModal({ product, onClose }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  async function loadExplanation() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/trust/${product.farmerId}/explain`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
      setData(await res.json());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Auto-load on mount
  useEffect(() => { loadExplanation(); }, []);

  const c = data?.breakdown?.components;

  return (
    <div className="trust-modal-overlay" onClick={onClose}>
      <div className="trust-modal" onClick={(e) => e.stopPropagation()}>
        <div className="trust-modal-header">
          <div>
            <h3 className="trust-modal-title">Trust Score: {product.trustScore || 70}/100</h3>
            <p className="trust-modal-farm">{product.farmName}</p>
          </div>
          <button className="trust-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="trust-modal-body">
          {loading && <div className="trust-modal-loading"><span className="trust-modal-spinner" />Analyzing score…</div>}
          {err && <div className="trust-modal-error">⚠️ {err}</div>}
          {data && (
            <>
              <div className="trust-modal-explanation">{data.explanation}</div>
              <div className="trust-modal-breakdown">
                {c && Object.values(c).map((comp) => (
                  <div key={comp.label} className="trust-breakdown-row">
                    <div className="trust-breakdown-label">{comp.label}</div>
                    <div className="trust-breakdown-bar-wrap">
                      <div className="trust-breakdown-bar" style={{ width: `${(comp.score / comp.max) * 100}%` }} />
                    </div>
                    <div className="trust-breakdown-score">{comp.score}/{comp.max}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const PRACTICE_LABELS = {
  noAntibiotics: { label: 'No Antibiotics', icon: '🚫💊' },
  noPesticides: { label: 'No Pesticides', icon: '🌱' },
  pastureRaised: { label: 'Pasture Raised', icon: '🐄' },
  organicFeed: { label: 'Organic Feed', icon: '🌾' },
  nonGMO: { label: 'Non-GMO', icon: '🧬' },
};

function distanceLabel(d) {
  if (!d && d !== 0) return null;
  return d < 1 ? `${Math.round(d * 10) / 10} mi` : `${Math.round(d)} mi away`;
}

export default function FarmCard({ product, onAddToCart }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [showTrustModal, setShowTrustModal] = useState(false);

  const practices = product.practices || {};
  const activePractices = Object.entries(practices).filter(([, v]) => v).map(([k]) => k);

  async function handleAdd() {
    setAdding(true);
    await onAddToCart(product);
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  const categoryEmoji = {
    vegetables: '🥦', fruits: '🍎', meat: '🥩', dairy: '🧀',
    eggs: '🥚', herbs: '🌿', honey: '🍯', grains: '🌾', other: '🛒',
  };

  return (
    <div className="farm-card fade-in">
      <div className="farm-card-image-wrap">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="farm-card-image" loading="lazy" />
        ) : (
          <div className="farm-card-image-placeholder">
            <span>{categoryEmoji[product.category] || '🌿'}</span>
          </div>
        )}
        <div className="farm-card-trust-overlay" onClick={() => setShowTrustModal(true)} title="Click to learn about this score">
          <TrustBadge score={product.trustScore || 70} size="sm" showLabel={false} />
        </div>
        <div className="farm-card-category-badge">
          {categoryEmoji[product.category]} {product.category}
        </div>
      </div>

      <div className="farm-card-body">
        <div className="farm-card-header">
          <div>
            <h3 className="farm-card-product">{product.name}</h3>
            <Link to={`/farm/${product.farmerId}`} className="farm-card-farm farm-card-farm-link">
              {product.farmName}
            </Link>
            {product.farmerBio && (
              <p className="farm-card-bio">{product.farmerBio}</p>
            )}
          </div>
          <div className="farm-card-price">${product.price.toFixed(2)}<span className="farm-card-unit">/{product.unit || 'ea'}</span></div>
        </div>

        {product.description && (
          <p className="farm-card-desc">{product.description}</p>
        )}

        {activePractices.length > 0 && (
          <div className="farm-card-practices">
            {activePractices.slice(0, 3).map((k) => (
              <span key={k} className="practice-chip" title={PRACTICE_LABELS[k]?.label}>
                {PRACTICE_LABELS[k]?.icon} {PRACTICE_LABELS[k]?.label}
              </span>
            ))}
            {activePractices.length > 3 && (
              <span className="practice-chip practice-chip-more">+{activePractices.length - 3} more</span>
            )}
          </div>
        )}

        <div className="farm-card-footer">
          <div className="farm-card-meta">
            <span className="farm-card-qty">
              {product.quantity} {product.unit} available
            </span>
            {product.farmerLocation?.city && (
              <span className="farm-card-location">
                📍 {product.farmerLocation.city}, CT
              </span>
            )}
          </div>
          <button
            className={`btn btn-primary farm-card-btn ${added ? 'btn-added' : ''}`}
            onClick={handleAdd}
            disabled={adding || added}
          >
            {added ? '✓ Added' : adding ? '...' : 'Add to Basket'}
          </button>
        </div>
      </div>
      {showTrustModal && <TrustModal product={product} onClose={() => setShowTrustModal(false)} />}
    </div>
  );
}
