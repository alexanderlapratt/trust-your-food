import { useState, useEffect } from 'react';
import './RoutesPage.css';

// ─── Static farm geography ─────────────────────────────────────────────────
const FARMS = [
  { id: 'riverstone', name: 'Riverstone Dairy',     city: 'Cheshire',   x: 142, y: 42,  color: '#2d6a4f', emoji: '🐄' },
  { id: 'holloway',   name: 'Holloway Heritage',     city: 'Hamden',     x: 220, y: 148, color: '#1a3a2a', emoji: '🥕' },
  { id: 'worthfarm',  name: 'WorthFarm Honey',       city: 'Woodbridge', x: 90,  y: 200, color: '#52796f', emoji: '🍯' },
  { id: 'elmcity',    name: 'Elm City Bakehouse',    city: 'New Haven',  x: 178, y: 280, color: '#40916c', emoji: '🍞' },
  { id: 'stoneacre',  name: 'Stone Acre Farm',       city: 'Branford',   x: 360, y: 308, color: '#74c69d', emoji: '🥒' },
  { id: 'pratt',      name: "Pratt's Pasture",       city: 'Orange',     x: 58,  y: 308, color: '#95d5b2', emoji: '🥩' },
];

const ROUTE_STOPS = [
  { farmId: 'riverstone', stopNum: 1 },
  { farmId: 'holloway',   stopNum: 2 },
  { farmId: 'worthfarm',  stopNum: 3 },
  { farmId: 'elmcity',    stopNum: 4 },
  { farmId: 'pratt',      stopNum: 5 },
  { farmId: 'stoneacre',  stopNum: 6 },
];

const DEMO_CUSTOMERS = [
  { x: 195, y: 256 }, { x: 250, y: 290 }, { x: 310, y: 270 }, { x: 160, y: 310 },
];

// ─── Demo data ─────────────────────────────────────────────────────────────
const DEMO_SCHEDULED = [
  {
    window: 'Thursday Apr 2 · 5–7 PM',
    savings: 18.00,
    orders: [
      { id: 'ORD-4821', customer: 'Alex Rivera',   address: '44 Crown St, New Haven, CT',    items: ['Country Sourdough Loaf ×2', 'Pumpkin Pie ×1'],                              farms: ['Elm City Bakehouse'],                         total: 36.00, deliveryFee: 2.99, status: 'confirmed' },
      { id: 'ORD-4822', customer: 'Sam Patel',     address: '211 Whalley Ave, New Haven, CT',items: ['Jersey Whole Milk ×2', 'Greek-Style Yogurt ×1', 'Pasture-Raised Eggs ×1'], farms: ['Riverstone Dairy', 'Holloway Heritage Farm'],  total: 33.99, deliveryFee: 2.99, status: 'confirmed' },
      { id: 'ORD-4823', customer: 'Jordan Kim',    address: '73 Prospect St, New Haven, CT', items: ['Fresh Cucumbers ×3', 'Honeycrisp Apples ×2', 'Wildflower Raw Honey ×1'],   farms: ['Stone Acre Farm', 'WorthFarm Honey & Herbs'], total: 32.49, deliveryFee: 2.99, status: 'ready' },
    ],
  },
  {
    window: 'Saturday Apr 4 · 10 AM–12 PM',
    savings: 12.00,
    orders: [
      { id: 'ORD-4830', customer: 'Taylor Brooks', address: '155 Elm St, New Haven, CT',     items: ['Grass-Fed Ground Beef ×2', 'Heritage Pork Chops ×1'],                       farms: ["Pratt's Pasture"],                            total: 44.99, deliveryFee: 2.99, status: 'pending' },
      { id: 'ORD-4831', customer: 'Morgan Lee',    address: '89 Orange St, New Haven, CT',   items: ['Delicata Squash ×2', 'Bartlett Pears ×2', 'Pecan Pie ×1'],                  farms: ['Stone Acre Farm', 'Elm City Bakehouse'],      total: 36.99, deliveryFee: 2.99, status: 'pending' },
    ],
  },
];

const DEMO_ON_DEMAND = [
  { id: 'ORD-4835', customer: 'Casey Wu',     address: '312 Chapel St, New Haven, CT', items: ['Whole Pasture Chicken ×1', 'Pasture-Raised Eggs ×1'], farms: ['Holloway Heritage Farm'], total: 43.99, deliveryFee: 8.99, status: 'confirmed', dispatchStatus: 'pending' },
  { id: 'ORD-4836', customer: 'Riley Nguyen', address: '18 Audubon St, New Haven, CT', items: ['Pecan Pie ×1', 'Dinner Rolls ×2'],                   farms: ['Elm City Bakehouse'],     total: 42.99, deliveryFee: 8.99, status: 'confirmed', dispatchStatus: 'pending' },
];

// ─── MapSVG ────────────────────────────────────────────────────────────────
function MapSVG({ isDemo }) {
  const routeCoords = ROUTE_STOPS.map((s) => {
    const farm = FARMS.find((f) => f.id === s.farmId);
    return `${farm.x},${farm.y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 440 360" className="routes-map-svg" aria-label="Delivery route map">
      <rect width="440" height="360" fill="#f0f4ef" rx="12" />
      <path d="M320,340 Q360,330 420,310 L440,360 L0,360 Z" fill="#c8dde8" opacity="0.5" />
      {isDemo && <text x="428" y="18" textAnchor="end" fontSize="10" fill="#999" fontStyle="italic">Demo</text>}

      <polyline points={routeCoords} fill="none" stroke="#2d6a4f" strokeWidth="2.5"
        strokeDasharray="6 4" strokeLinecap="round" opacity="0.7">
        <animate attributeName="stroke-dashoffset" from="60" to="0" dur="2s" repeatCount="indefinite" />
      </polyline>

      {DEMO_CUSTOMERS.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="7" fill="#f4a261" opacity="0.85" />
          <text x={c.x} y={c.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white">🏠</text>
        </g>
      ))}

      {ROUTE_STOPS.map((stop) => {
        const farm = FARMS.find((f) => f.id === stop.farmId);
        return (
          <g key={farm.id}>
            <circle cx={farm.x} cy={farm.y} r="18" fill={farm.color} opacity="0.92" />
            <text x={farm.x} y={farm.y - 3} textAnchor="middle" dominantBaseline="middle" fontSize="13">{farm.emoji}</text>
            <circle cx={farm.x + 11} cy={farm.y - 11} r="9" fill="#1a3a2a" />
            <text x={farm.x + 11} y={farm.y - 11} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white" fontWeight="bold">{stop.stopNum}</text>
            <text x={farm.x} y={farm.y + 26} textAnchor="middle" fontSize="9" fill="#1a3a2a" fontWeight="600">{farm.city}</text>
          </g>
        );
      })}

      <g transform="translate(12,12)">
        <rect width="130" height="52" rx="6" fill="white" opacity="0.88" />
        <circle cx="14" cy="14" r="7" fill="#2d6a4f" opacity="0.9" />
        <text x="26" y="18" fontSize="9" fill="#1a3a2a" fontWeight="500">Farm pickup stop</text>
        <circle cx="14" cy="32" r="6" fill="#f4a261" opacity="0.85" />
        <text x="26" y="36" fontSize="9" fill="#1a3a2a" fontWeight="500">Customer delivery</text>
        <line x1="8" y1="48" x2="24" y2="48" stroke="#2d6a4f" strokeWidth="2" strokeDasharray="4 3" />
        <text x="30" y="51" fontSize="9" fill="#1a3a2a" fontWeight="500">Optimized route</text>
      </g>
    </svg>
  );
}

// ─── Dispatch button (shared by both panels) ────────────────────────────────
function DispatchBtn({ provider, label, windowLabel, orders, variant }) {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  async function dispatch() {
    setState('loading');
    setErrMsg('');
    try {
      const res = await fetch('/api/routes/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, windowLabel, orders }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Dispatch failed');
      setResult(await res.json());
      setState('success');
    } catch (e) {
      setErrMsg(e.message);
      setState('error');
    }
  }

  if (state === 'success' && result) {
    const estTime = result.estimated_delivery_time
      ? new Date(result.estimated_delivery_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '';
    return (
      <div className="dispatch-success">
        <span>✓ Dispatched — {result.delivery_id} — Est. {estTime}</span>
        <a href={result.tracking_url} target="_blank" rel="noreferrer" className="dispatch-track-link">Track →</a>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="dispatch-error">
        ⚠️ {errMsg}
        <button className="dispatch-retry-link" onClick={() => setState('idle')}>Retry</button>
      </div>
    );
  }

  return (
    <button
      className={`dispatch-btn ${variant === 'outlined' ? 'dispatch-btn-uber' : 'dispatch-btn-dd'}`}
      onClick={dispatch}
      disabled={state === 'loading'}
    >
      {state === 'loading' && <span className="dispatch-spinner" />}
      {label}
      {variant === 'outlined' && <span className="dispatch-beta-badge">Beta</span>}
    </button>
  );
}

// ─── Status chip ────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const map = { confirmed: ['Confirmed', 'chip-confirmed'], ready: ['Ready to Pack', 'chip-ready'], pending: ['Pending', 'chip-pending'] };
  const [label, cls] = map[status] || [status, ''];
  return <span className={`order-status-chip ${cls}`}>{label}</span>;
}

// ─── Order card (shared) ────────────────────────────────────────────────────
function OrderCard({ order }) {
  return (
    <div className="batch-order-card">
      <div className="batch-order-top">
        <div>
          <span className="batch-order-id">{order.id}</span>
          <span className="batch-order-name">{order.customer}</span>
        </div>
        <StatusChip status={order.status} />
      </div>
      <div className="batch-order-addr">📍 {order.address}</div>
      <div className="batch-order-items">
        {order.items.map((item, i) => <span key={i} className="batch-item-chip">{item}</span>)}
      </div>
      <div className="batch-order-footer">
        <div className="batch-order-farms">
          {order.farms.map((f, i) => <span key={i} className="batch-farm-tag">{f}</span>)}
        </div>
        <div className="batch-order-total">${order.total.toFixed(2)}</div>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function RoutesPage() {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/routes')
      .then((r) => r.json())
      .then(setRouteData)
      .catch(() => setRouteData({ hasRealOrders: false, scheduledWindows: [], onDemandOrders: [] }))
      .finally(() => setLoading(false));
  }, []);

  const isDemo = !routeData?.hasRealOrders;
  const scheduledWindows = isDemo ? DEMO_SCHEDULED : (routeData?.scheduledWindows || []);
  const onDemandOrders   = isDemo ? DEMO_ON_DEMAND  : (routeData?.onDemandOrders   || []);

  const totalScheduled  = scheduledWindows.reduce((s, w) => s + w.orders.length, 0);
  const totalOnDemand   = onDemandOrders.length;
  const totalSavings    = scheduledWindows.reduce((s, w) => s + (w.savings || 0), 0);

  return (
    <div className="routes-page">
      <section className="routes-hero">
        <div className="container">
          <h1 className="routes-hero-title">Logistics Dashboard</h1>
          <p className="routes-hero-sub">Route optimization and delivery dispatch for the New Haven farm network.</p>
        </div>
      </section>

      <div className="container routes-body">
        {/* Stats */}
        <div className="routes-stats">
          <div className="routes-stat-card">
            <div className="routes-stat-num">{FARMS.length}</div>
            <div className="routes-stat-label">Active Farms</div>
          </div>
          <div className="routes-stat-card">
            <div className="routes-stat-num">{loading ? '—' : totalScheduled}</div>
            <div className="routes-stat-label">Scheduled Orders</div>
          </div>
          <div className="routes-stat-card">
            <div className="routes-stat-num">{loading ? '—' : totalOnDemand}</div>
            <div className="routes-stat-label">On-Demand Orders</div>
          </div>
          <div className="routes-stat-card routes-stat-highlight">
            <div className="routes-stat-num">${loading ? '—' : totalSavings.toFixed(0)}</div>
            <div className="routes-stat-label">Saved vs Individual Delivery</div>
          </div>
        </div>

        {isDemo && (
          <div className="routes-demo-notice">
            📍 Demo Route — no live orders yet. Place an order from the marketplace to see real data here.
          </div>
        )}

        <div className="routes-two-panels">

          {/* ── Panel 1: Scheduled Routes ── */}
          <div className="routes-panel">
            <div className="panel-header">
              <h2 className="panel-title">🌿 Scheduled Routes</h2>
              <div className="panel-subtitle">Group delivery batches</div>
            </div>

            <MapSVG isDemo={isDemo} />

            <div className="map-route-summary">
              {ROUTE_STOPS.map((stop) => {
                const farm = FARMS.find((f) => f.id === stop.farmId);
                return (
                  <div key={farm.id} className="map-route-stop">
                    <span className="map-route-num">{stop.stopNum}</span>
                    <span className="map-route-emoji">{farm.emoji}</span>
                    <span className="map-route-name">{farm.name}</span>
                    <span className="map-route-city">{farm.city}</span>
                  </div>
                );
              })}
            </div>

            {loading ? (
              <div className="routes-loading">Loading…</div>
            ) : scheduledWindows.length === 0 ? (
              <div className="routes-empty">No scheduled deliveries.</div>
            ) : (
              scheduledWindows.map((win, wi) => (
                <div key={wi} className="batch-window">
                  <div className="batch-window-header">
                    <div className="batch-window-time">📅 {win.window}</div>
                    <div className="batch-window-count">{win.orders.length} order{win.orders.length !== 1 ? 's' : ''}</div>
                  </div>

                  {win.savings > 0 && (
                    <div className="batch-savings-badge">
                      💚 Group delivery saved this batch ${win.savings.toFixed(2)} vs individual deliveries
                    </div>
                  )}

                  {win.orders.map((order) => <OrderCard key={order.id} order={order} />)}

                  <div className="dispatch-row">
                    <DispatchBtn
                      provider="doordash"
                      label="Dispatch Route"
                      windowLabel={win.window}
                      orders={win.orders}
                      variant="solid"
                    />
                    <DispatchBtn
                      provider="uber"
                      label="Dispatch via Uber Direct"
                      windowLabel={win.window}
                      orders={win.orders}
                      variant="outlined"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Panel 2: On-Demand ── */}
          <div className="routes-panel">
            <div className="panel-header">
              <h2 className="panel-title">⚡ On-Demand</h2>
              <div className="panel-subtitle">Direct DoorDash Drive orders</div>
            </div>

            {loading ? (
              <div className="routes-loading">Loading…</div>
            ) : onDemandOrders.length === 0 ? (
              <div className="routes-empty-ondemand">
                <div className="routes-empty-icon">⚡</div>
                <p>No direct delivery orders yet.</p>
                <p className="routes-empty-hint">When customers choose Direct Delivery at checkout, orders appear here for immediate DoorDash dispatch.</p>
              </div>
            ) : (
              onDemandOrders.map((order) => (
                <div key={order.id} className="batch-window ondemand-card">
                  <div className="batch-window-header">
                    <div className="ondemand-header-left">
                      <span className="doordash-drive-badge">DoorDash Drive</span>
                      <span className="batch-window-time">{order.customer}</span>
                    </div>
                    <StatusChip status={order.status} />
                  </div>

                  <OrderCard order={order} />

                  <div className="dispatch-row">
                    <DispatchBtn
                      provider="doordash"
                      label="Dispatch Now"
                      windowLabel={`direct-${order.id}`}
                      orders={[order]}
                      variant="solid"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
