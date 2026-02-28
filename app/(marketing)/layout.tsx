import "./marketing.css";
import { MarketingHeader } from "../../components/marketing/MarketingHeader";

export default function MarketingLayout({ children }:{ children: React.ReactNode }){
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      {children}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <p className="footer-copy">© {new Date().getFullYear()} Nuvo</p>
            <div className="footer-links">
              <a href="/security">Security</a>
              <a href="/pricing">Pricing</a>
              <a href="/solutions">Solutions</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
