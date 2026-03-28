import './FilterSidebar.css';

const CATEGORIES = [
  { value: 'all', label: '🛒 All Products' },
  { value: 'vegetables', label: '🥦 Vegetables' },
  { value: 'fruits', label: '🍎 Fruits' },
  { value: 'meat', label: '🥩 Meat' },
  { value: 'dairy', label: '🧀 Dairy' },
  { value: 'eggs', label: '🥚 Eggs' },
  { value: 'herbs', label: '🌿 Herbs' },
  { value: 'honey', label: '🍯 Honey' },
  { value: 'grains', label: '🌾 Grains' },
];

const PRACTICES = [
  { key: 'noAntibiotics', label: 'No Antibiotics', icon: '🚫💊' },
  { key: 'noPesticides', label: 'No Pesticides', icon: '🌱' },
  { key: 'pastureRaised', label: 'Pasture Raised', icon: '🐄' },
  { key: 'organicFeed', label: 'Organic Feed', icon: '🌾' },
  { key: 'nonGMO', label: 'Non-GMO', icon: '🧬' },
];

export default function FilterSidebar({ filters, onChange, productCount, isOpen, onClose }) {
  function toggle(key) {
    onChange({ ...filters, [key]: !filters[key] });
  }

  function setCategory(cat) {
    onChange({ ...filters, category: cat });
  }

  function clearAll() {
    onChange({
      category: 'all',
      noAntibiotics: false,
      noPesticides: false,
      pastureRaised: false,
      organicFeed: false,
      nonGMO: false,
    });
  }

  const activeCount = Object.entries(filters).filter(([k, v]) => k !== 'category' && v).length
    + (filters.category !== 'all' ? 1 : 0);

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`filter-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Filter</h2>
          <div className="sidebar-header-right">
            {activeCount > 0 && (
              <button className="clear-btn" onClick={clearAll}>
                Clear all ({activeCount})
              </button>
            )}
            <button className="sidebar-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-count">{productCount} product{productCount !== 1 ? 's' : ''} found</p>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Product Type</h3>
          <ul className="category-list">
            {CATEGORIES.map((cat) => (
              <li key={cat.value}>
                <button
                  className={`category-btn ${filters.category === cat.value ? 'active' : ''}`}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Farm Practices</h3>
          <div className="practice-toggles">
            {PRACTICES.map((p) => (
              <label key={p.key} className={`practice-toggle ${filters[p.key] ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!filters[p.key]}
                  onChange={() => toggle(p.key)}
                />
                <span className="practice-toggle-icon">{p.icon}</span>
                <span className="practice-toggle-label">{p.label}</span>
                <span className="practice-toggle-check">{filters[p.key] ? '✓' : ''}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
