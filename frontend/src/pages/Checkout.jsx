import { useState } from 'react';
import { Link } from 'react-router-dom';
import TrustBadge from '../components/TrustBadge.jsx';
import './Checkout.css';

const DIRECT_FEE = 8.99;
const GROUP_FEE = 2.99;

export default function Checkout() {
  const [cart, setCart] = useState(window.__cart || []);
  const [form, setForm] = useState({ name: '', email: '', address: '' });
  const [deliveryType, setDeliveryType] = useState('group');
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  function updateQty(productId, delta) {
    setCart((prev) => {
      const updated = prev.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      );
      window.__cart = updated;
      return [...updated];
    });
  }

  function removeItem(productId) {
    setCart((prev) => {
      const updated = prev.filter((i) => i.productId !== productId);
      window.__cart = updated;
      return [...updated];
    });
  }

  const subtotal = cart.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);
  const deliveryFee = deliveryType === 'direct' ? DIRECT_FEE : GROUP_FEE;
  const total = subtotal + deliveryFee;

  // Group by farm
  const byFarm = cart.reduce((acc, item) => {
    const fn = item.product?.farmName || 'Unknown Farm';
    if (!acc[fn]) acc[fn] = { farmName: fn, score: item.product?.trustScore || 70, items: [] };
    acc[fn].items.push(item);
    return acc;
  }, {});

  async function handleCheckout() {
    if (!form.name || !form.email) {
      setError('Please enter your name and email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name,
          customerEmail: form.email,
          deliveryAddress: form.address,
          deliveryType,
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Order failed');
      }
      const data = await res.json();
      setOrder(data);
      window.__cart = [];
      setCart([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="order-success fade-in">
            <div className="order-success-icon">🌿</div>
            <h2>Order Confirmed!</h2>
            <p className="order-success-sub">Your farm-fresh order is on its way. Here's your delivery summary.</p>

            <div className="delivery-window-card">
              <div className="delivery-window-label">
                {order.deliveryType === 'direct' ? '⚡ Direct Delivery' : '🌿 Group Delivery'}
              </div>
              <div className="delivery-window-time">{order.deliveryWindow?.label}</div>
              <div className="delivery-window-note">
                {order.deliveryType === 'direct'
                  ? 'Your order has been dispatched via DoorDash Drive.'
                  : 'Your order combines with neighbors — one driver, multiple farms, shared cost.'}
              </div>
            </div>

            {order.routeSummary?.length > 0 && (
              <RouteViz stops={order.routeSummary} deliveryAddress={order.deliveryAddress} />
            )}

            <div className="order-items-summary">
              <h3>Order Summary</h3>
              {order.items?.map((item, i) => (
                <div key={i} className="order-summary-row">
                  <span>{item.productName} × {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="order-summary-row order-total">
                <span>Total</span>
                <span>${order.totalPrice?.toFixed(2)}</span>
              </div>
            </div>

            <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="empty-cart">
            <span className="empty-cart-icon">🧺</span>
            <h2>Your basket is empty</h2>
            <p>Head to the marketplace to discover fresh, local products.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Browse the Marketplace</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-hero">
        <div className="container">
          <h1 className="checkout-hero-title">Your Basket</h1>
          <p className="checkout-hero-sub">{cart.length} item{cart.length !== 1 ? 's' : ''} from {Object.keys(byFarm).length} farm{Object.keys(byFarm).length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="container checkout-layout">
        {/* Left: Cart Items */}
        <div className="checkout-items">
          {Object.values(byFarm).map((group) => (
            <div key={group.farmName} className="farm-group">
              <div className="farm-group-header">
                <div>
                  <h3 className="farm-group-name">{group.farmName}</h3>
                  <p className="farm-group-count">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</p>
                </div>
                <TrustBadge score={group.score} size="sm" showLabel={false} />
              </div>

              {group.items.map((item) => (
                <div key={item.productId} className="cart-item">
                  {item.product?.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="cart-item-img" />
                  ) : (
                    <div className="cart-item-img-placeholder">🌿</div>
                  )}
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.product?.name}</div>
                    <div className="cart-item-price">${item.product?.price?.toFixed(2)} / {item.product?.unit}</div>
                  </div>
                  <div className="cart-item-qty">
                    <button className="qty-btn" onClick={() => updateQty(item.productId, -1)}>−</button>
                    <span className="qty-value">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.productId, 1)}>+</button>
                  </div>
                  <div className="cart-item-total">${(item.product?.price * item.quantity).toFixed(2)}</div>
                  <button className="cart-item-remove" onClick={() => removeItem(item.productId)} title="Remove">✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right: Delivery Options + Checkout Form */}
        <div className="checkout-sidebar">
          {/* Delivery type selector */}
          <DeliveryOptions selected={deliveryType} onSelect={setDeliveryType} />

          {/* Checkout form */}
          <div className="checkout-form">
            <h3 className="checkout-form-title">Contact & Delivery</h3>
            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input className="form-input" placeholder="Full name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" placeholder="you@email.com" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <input className="form-input" placeholder="123 Elm St, New Haven, CT" value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>

            <div className="order-price-summary">
              <div className="order-price-row">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="order-price-row">
                <span>Delivery</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="order-price-row order-price-total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

            <button className="btn btn-primary checkout-btn" onClick={handleCheckout} disabled={submitting}>
              {submitting ? 'Placing Order...' : `Place Order · $${total.toFixed(2)}`}
            </button>
            <p className="checkout-note">
              By placing your order you agree to meet the delivery driver at the scheduled window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteViz({ stops, deliveryAddress }) {
  const allNodes = [
    ...stops.map((s, i) => ({ label: s.farmName, sub: s.address, num: s.order, type: 'farm' })),
    { label: 'Your Door', sub: deliveryAddress || 'As provided', num: null, type: 'home' },
  ];

  return (
    <div className="route-viz-card">
      <div className="route-viz-header">
        <h3 className="route-viz-title">Optimized Pickup Route</h3>
        <div className="route-efficiency-badge">
          🌿 {stops.length} farm{stops.length !== 1 ? 's' : ''} · 1 driver · carbon-efficient
        </div>
      </div>

      <div className="route-viz-flow">
        {allNodes.map((node, i) => (
          <div key={i} className="route-viz-step">
            <div className={`route-viz-node ${node.type === 'home' ? 'route-viz-node-home' : ''}`}>
              {node.type === 'home' ? '🏠' : node.num}
            </div>
            <div className="route-viz-label">{node.label}</div>
            <div className="route-viz-sub">{node.sub}</div>
            {i < allNodes.length - 1 && (
              <div className="route-viz-arrow">
                <svg width="32" height="14" viewBox="0 0 32 14" fill="none">
                  <line x1="0" y1="7" x2="26" y2="7" stroke="var(--green-mid)" strokeWidth="2" strokeDasharray="4 3">
                    <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1.2s" repeatCount="indefinite" />
                  </line>
                  <path d="M23 3L29 7L23 11" stroke="var(--green-mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getDirectTime() {
  const d = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
  const h = d.getHours();
  const m = d.getMinutes() < 30 ? '00' : '30';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `Today by ${h12}:${m} ${ampm}`;
}

function getGroupWindow() {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const deliveryDays = [4, 6];
  for (let i = 1; i <= 7; i++) {
    const c = new Date(now);
    c.setDate(now.getDate() + i);
    if (deliveryDays.includes(c.getDay())) {
      return `${days[c.getDay()]} ${c.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · 5–7 PM`;
    }
  }
  return 'Next available window';
}

function DeliveryOptions({ selected, onSelect }) {
  return (
    <div className="delivery-options">
      <h3 className="delivery-options-title">Delivery Method</h3>
      <div className="delivery-option-cards">

        <button
          className={`delivery-option-card ${selected === 'direct' ? 'delivery-option-selected' : ''}`}
          onClick={() => onSelect('direct')}
        >
          <div className="delivery-option-top">
            <div>
              <div className="delivery-option-icon">⚡</div>
              <div className="delivery-option-name">Direct Delivery</div>
              <div className="delivery-option-headline">Get it today</div>
            </div>
            <div className="delivery-option-right">
              <div className="delivery-option-badge delivery-badge-ondemand">On Demand</div>
              <div className="delivery-option-fee">${DIRECT_FEE.toFixed(2)}</div>
            </div>
          </div>
          <div className="delivery-option-time">🕐 {getDirectTime()}</div>
          <div className="delivery-option-detail">Dispatches via DoorDash Drive immediately after you order</div>
        </button>

        <button
          className={`delivery-option-card ${selected === 'group' ? 'delivery-option-selected' : ''}`}
          onClick={() => onSelect('group')}
        >
          <div className="delivery-option-top">
            <div>
              <div className="delivery-option-icon">🌿</div>
              <div className="delivery-option-name">Group Delivery</div>
              <div className="delivery-option-headline">Scheduled community delivery</div>
            </div>
            <div className="delivery-option-right">
              <div className="delivery-option-badge delivery-badge-bestvalue">Best Value</div>
              <div className="delivery-option-fee">${GROUP_FEE.toFixed(2)}</div>
            </div>
          </div>
          <div className="delivery-option-time">📅 {getGroupWindow()}</div>
          <div className="delivery-option-detail">Your order combines with neighbors — one driver, multiple farms, shared cost</div>
        </button>

      </div>
    </div>
  );
}
