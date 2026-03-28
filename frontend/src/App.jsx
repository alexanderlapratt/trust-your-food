import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Marketplace from './pages/Marketplace.jsx';
import FarmerListing from './pages/FarmerListing.jsx';
import Checkout from './pages/Checkout.jsx';
import RoutesPage from './pages/RoutesPage.jsx';
import './App.css';

function Nav() {
  const location = useLocation();
  return (
    <header className="app-header">
      <div className="container header-inner">
        <NavLink to="/" className="logo">
          <span className="logo-icon">🌿</span>
          <span className="logo-text">Trust Your Food</span>
        </NavLink>
        <nav className="main-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Browse
          </NavLink>
          <NavLink to="/sell" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Sell Your Harvest
          </NavLink>
          <NavLink to="/routes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Logistics
          </NavLink>
          <NavLink to="/checkout" className={({ isActive }) => isActive ? 'nav-link nav-link-cart active' : 'nav-link nav-link-cart'}>
            🧺 Basket
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="app">
      <Nav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Marketplace />} />
          <Route path="/sell" element={<FarmerListing />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/routes" element={<RoutesPage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <div className="container footer-inner">
          <span className="logo-text footer-logo">🌿 Trust Your Food</span>
          <p>Connecting New Haven farmers and neighbors since 2024.</p>
        </div>
      </footer>
    </div>
  );
}
