import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import FarmCard from '../components/FarmCard.jsx';
import FilterSidebar from '../components/FilterSidebar.jsx';
import ChatDrawer from '../components/ChatDrawer.jsx';
import './Marketplace.css';

const INITIAL_FILTERS = {
  category: 'all',
  noAntibiotics: false,
  noPesticides: false,
  pastureRaised: false,
  organicFeed: false,
  nonGMO: false,
};

// In-memory cart stored on window for cross-page sharing
if (!window.__cart) window.__cart = [];

export default function Marketplace() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const location = useLocation();
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [cartCount, setCartCount] = useState(window.__cart.length);
  const [notification, setNotification] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.category !== 'all') params.set('category', filters.category);
      ['noAntibiotics', 'noPesticides', 'pastureRaised', 'organicFeed', 'nonGMO'].forEach((k) => {
        if (filters[k]) params.set(k, 'true');
      });

      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  async function handleAddToCart(product) {
    const existing = window.__cart.find((i) => i.productId === product._id);
    if (existing) {
      existing.quantity += 1;
    } else {
      window.__cart.push({ productId: product._id, quantity: 1, product });
    }
    setCartCount(window.__cart.length);
    setNotification(`${product.name} added to basket`);
    setTimeout(() => setNotification(null), 2200);
  }

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== 'category' && v).length
    + (filters.category !== 'all' ? 1 : 0);

  return (
    <div className="marketplace">
      {/* Hero */}
      <section className="marketplace-hero">
        <div className="container">
          <h1 className="hero-title">Farm Fresh,<br />Honestly Grown</h1>
          <p className="hero-sub">Every farm has a trust score. You decide what matters.</p>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search farms, produce, herbs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="container marketplace-body">
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          productCount={products.length}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="marketplace-content">
          {/* Toolbar */}
          <div className="marketplace-toolbar">
            <button className="filter-toggle-btn" onClick={() => setSidebarOpen(true)}>
              ⚙️ Filters {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
            </button>
            <p className="results-label">
              {loading ? 'Loading...' : `${products.length} item${products.length !== 1 ? 's' : ''} available`}
            </p>
          </div>

          {error && (
            <div className="error-banner">
              <strong>Could not load products.</strong> Make sure the backend is running and MongoDB is connected.
              <br /><small>{error}</small>
              <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={fetchProducts}>Retry</button>
            </div>
          )}

          {loading ? (
            <div className="loading-grid">
              {[...Array(6)].map((_, i) => <div key={i} className="card-skeleton" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🌾</span>
              <h3>No products found</h3>
              <p>Try adjusting your filters or check back after the next harvest.</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <FarmCard key={p._id} product={p} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating notification */}
      {notification && (
        <div className="cart-notification fade-in">
          🧺 {notification}
        </div>
      )}

      {/* AI Chat */}
      <button
        className={`chat-float-btn ${chatOpen ? 'active' : ''}`}
        onClick={() => setChatOpen(true)}
        title="Farm-to-Table AI Assistant"
        aria-label="Open AI shopping assistant"
      >
        {chatOpen ? '✕' : '🌿'}
      </button>

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        products={products}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
