import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TrustBadge from '../components/TrustBadge.jsx';
import './FarmProfile.css';

const PRACTICE_META = {
  noAntibiotics: { label: 'No Antibiotics',  icon: '🚫💊' },
  noPesticides:  { label: 'No Pesticides',    icon: '🌱'   },
  pastureRaised: { label: 'Pasture Raised',   icon: '🐄'   },
  organicFeed:   { label: 'Organic Feed',     icon: '🌾'   },
  nonGMO:        { label: 'Non-GMO',          icon: '🧬'   },
};

const CATEGORY_EMOJI = {
  vegetables: '🥦', fruits: '🍎', meat: '🥩', dairy: '🧀',
  eggs: '🥚', herbs: '🌿', honey: '🍯', grains: '🌾', other: '🛒',
};

function TrustBar({ label, score, max, color = 'var(--green-mid)' }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="fp-trust-bar-row">
      <div className="fp-trust-bar-header">
        <span className="fp-trust-bar-label">{label}</span>
        <span className="fp-trust-bar-value">{score}<small>/{max}</small></span>
      </div>
      <div className="fp-trust-bar-track">
        <div className="fp-trust-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProductMiniCard({ product, onAdd }) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="fp-product-card">
      <div className="fp-product-img-wrap">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="fp-product-img" loading="lazy" />
        ) : (
          <div className="fp-product-img-placeholder">
            {CATEGORY_EMOJI[product.category] || '🌿'}
          </div>
        )}
        <div className="fp-product-category-badge">
          {CATEGORY_EMOJI[product.category]} {product.category}
        </div>
      </div>
      <div className="fp-product-body">
        <div className="fp-product-name">{product.name}</div>
        {product.description && (
          <div className="fp-product-desc">{product.description}</div>
        )}
        <div className="fp-product-footer">
          <div className="fp-product-price">
            ${product.price.toFixed(2)}
            <span className="fp-product-unit">/{product.unit || 'ea'}</span>
          </div>
          <button
            className={`btn btn-primary fp-product-btn ${added ? 'fp-btn-added' : ''}`}
            onClick={handleAdd}
            disabled={added}
          >
            {added ? '✓ Added' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FarmProfile() {
  const { farmerId } = useParams();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [products, setProducts] = useState([]);
  const [trust, setTrust] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [farmRes, trustRes] = await Promise.all([
          fetch(`/api/farmers/${farmerId}`),
          fetch(`/api/trust/${farmerId}`),
        ]);
        if (!farmRes.ok) throw new Error('Farm not found');
        const farmData = await farmRes.json();
        setFarmer(farmData.farmer);
        setProducts(farmData.products || []);
        if (trustRes.ok) setTrust(await trustRes.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [farmerId]);

  function handleAddToCart(product) {
    if (!window.__cart) window.__cart = [];
    const existing = window.__cart.find((i) => i.productId === product._id);
    if (existing) {
      existing.quantity += 1;
    } else {
      window.__cart.push({ productId: product._id, quantity: 1, product });
    }
    setNotification(`${product.name} added to basket`);
    setTimeout(() => setNotification(null), 2200);
  }

  function shopThisFarm() {
    navigate(`/?search=${encodeURIComponent(farmer.farmName)}`);
  }

  if (loading) {
    return (
      <div className="fp-loading">
        <div className="fp-loading-spinner" />
        <p>Loading farm profile…</p>
      </div>
    );
  }

  if (error || !farmer) {
    return (
      <div className="fp-error">
        <div className="fp-error-icon">🌾</div>
        <h2>Farm not found</h2>
        <p>{error || 'This farm profile could not be loaded.'}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>← Browse Marketplace</Link>
      </div>
    );
  }

  const activePractices = Object.entries(farmer.practices || {}).filter(([, v]) => v).map(([k]) => k);
  const trustScore = trust?.total ?? 70;
  const c = trust?.components;

  const yearsLabel = farmer.yearsInOperation
    ? `${farmer.yearsInOperation} year${farmer.yearsInOperation !== 1 ? 's' : ''} farming`
    : null;

  return (
    <div className="farm-profile">
      {/* ── Hero ── */}
      <section className="fp-hero">
        <div className="container fp-hero-inner">
          <div className="fp-hero-text">
            <div className="fp-hero-breadcrumb">
              <Link to="/" className="fp-breadcrumb-link">Marketplace</Link>
              <span className="fp-breadcrumb-sep">›</span>
              <span>{farmer.farmName}</span>
            </div>
            <h1 className="fp-hero-name">{farmer.farmName}</h1>
            {farmer.location?.city && (
              <div className="fp-hero-location">
                📍 {farmer.location.city}, {farmer.location.state || 'CT'}
              </div>
            )}
            {farmer.name && (
              <div className="fp-hero-farmer">Run by {farmer.name}</div>
            )}
            <div className="fp-hero-meta">
              {yearsLabel && <span className="fp-meta-chip">🌱 {yearsLabel}</span>}
              {farmer.certifications?.map((cert) => (
                <span key={cert} className="fp-meta-chip fp-cert-chip">✓ {cert}</span>
              ))}
            </div>
            <div className="fp-hero-actions">
              <button className="btn btn-primary fp-shop-btn" onClick={shopThisFarm}>
                🛒 Shop This Farm
              </button>
              <Link to="/checkout" className="btn btn-ghost fp-basket-btn">
                🧺 View Basket
              </Link>
            </div>
          </div>

          <div className="fp-hero-trust">
            <TrustBadge score={trustScore} size="lg" showLabel />
            <div className="fp-trust-tagline">
              {trustScore >= 90 ? 'One of our most trusted farms'
                : trustScore >= 75 ? 'A verified, trusted partner farm'
                : trustScore >= 60 ? 'Verified and building community trust'
                : 'A newer farm growing their trust score'}
            </div>
          </div>
        </div>

        {farmer.profileImage && (
          <div className="fp-hero-image-strip">
            <img src={farmer.profileImage} alt={farmer.farmName} className="fp-hero-image" />
          </div>
        )}
      </section>

      {/* ── Body ── */}
      <div className="container fp-body">

        {/* About + Trust side by side */}
        <div className="fp-about-row">

          {/* Left: Bio + Practices */}
          <div className="fp-about-card">
            <h2 className="fp-section-title">About This Farm</h2>
            {farmer.bio ? (
              <p className="fp-bio">{farmer.bio}</p>
            ) : (
              <p className="fp-bio fp-bio-empty">No bio provided yet.</p>
            )}

            {activePractices.length > 0 && (
              <div className="fp-practices">
                <h3 className="fp-practices-title">Farming Practices</h3>
                <div className="fp-practices-grid">
                  {activePractices.map((key) => {
                    const meta = PRACTICE_META[key];
                    return (
                      <div key={key} className="fp-practice-badge">
                        <span className="fp-practice-icon">{meta?.icon}</span>
                        <span className="fp-practice-label">{meta?.label || key}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {farmer.averageRating && (
              <div className="fp-rating-row">
                <span className="fp-rating-stars">
                  {'★'.repeat(Math.round(farmer.averageRating))}{'☆'.repeat(5 - Math.round(farmer.averageRating))}
                </span>
                <span className="fp-rating-text">
                  {farmer.averageRating.toFixed(1)} · {farmer.reviewCount || 0} reviews · {farmer.totalOrders || 0} orders fulfilled
                </span>
              </div>
            )}
          </div>

          {/* Right: Trust breakdown */}
          {c && (
            <div className="fp-trust-card">
              <h2 className="fp-section-title">Trust Score Breakdown</h2>
              <div className="fp-trust-score-large">
                {trustScore}<span className="fp-trust-score-denom">/100</span>
              </div>
              <div className="fp-trust-bars">
                <TrustBar label={c.profileCompleteness.label} score={c.profileCompleteness.score} max={c.profileCompleteness.max} />
                <TrustBar label={c.transparency.label}        score={c.transparency.score}        max={c.transparency.max} />
                <TrustBar label={c.reliability.label}         score={c.reliability.score}         max={c.reliability.max} />
                <TrustBar label={c.community.label}           score={c.community.score}           max={c.community.max} />
              </div>
              <p className="fp-trust-note">
                Trust scores are calculated from profile completeness, farming practice transparency, order fulfillment reliability, and community ratings.
              </p>
            </div>
          )}
        </div>

        {/* Products */}
        <div className="fp-products-section">
          <div className="fp-products-header">
            <h2 className="fp-section-title">
              Products from {farmer.farmName}
              <span className="fp-product-count">{products.length} available</span>
            </h2>
          </div>

          {products.length === 0 ? (
            <div className="fp-no-products">
              <span>🌱</span>
              <p>No products currently in stock. Check back after the next harvest.</p>
            </div>
          ) : (
            <div className="fp-products-grid">
              {products.map((p) => (
                <ProductMiniCard key={p._id} product={p} onAdd={handleAddToCart} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Cart notification */}
      {notification && (
        <div className="cart-notification fade-in">🧺 {notification}</div>
      )}
    </div>
  );
}
