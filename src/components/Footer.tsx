import { NavLink } from "@/components/NavLink";
import { Mail, Phone } from "lucide-react";
import alsamosLogo from "@/assets/alsamos-logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={alsamosLogo} alt="Alsamos" className="h-12 w-12" />
              <div>
                <h3 className="font-display text-2xl font-bold text-primary">Alsamos</h3>
                <p className="text-xs text-muted-foreground">MAKE IT REAL</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Discover, Shop, and Sell Smarter with AI. Your premium marketplace for everything.
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Marketplace</h4>
            <nav className="space-y-2">
              <NavLink to="/market" className="block text-sm text-muted-foreground hover:text-secondary transition-smooth">
                Browse Products
              </NavLink>
              <NavLink to="/categories" className="block text-sm text-muted-foreground hover:text-secondary transition-smooth">
                Categories
              </NavLink>
              <NavLink to="/seller" className="block text-sm text-muted-foreground hover:text-secondary transition-smooth">
                Become a Seller
              </NavLink>
              <NavLink to="/ai" className="block text-sm text-muted-foreground hover:text-secondary transition-smooth">
                AI Features
              </NavLink>
            </nav>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <nav className="space-y-2">
              <NavLink to="/help" className="block text-sm text-muted-foreground hover:text-secondary transition-smooth">
                Help Center
              </NavLink>
              <NavLink to="/terms" className="block text-sm text-muted-foreground hover:text-secondary transition-smooth">
                Terms of Service
              </NavLink>
              <NavLink to="/privacy" className="block text-sm text-muted-foreground hover:text-secondary transition-smooth">
                Privacy Policy
              </NavLink>
              <NavLink to="/contact" className="block text-sm text-muted-foreground hover:text-secondary transition-smooth">
                Contact Us
              </NavLink>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Contact</h4>
            <div className="space-y-3">
              <a 
                href="mailto:alsamos.company@gmail.com" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary transition-smooth"
              >
                <Mail className="h-4 w-4" />
                alsamos.company@gmail.com
              </a>
              <a 
                href="tel:+998933007709" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary transition-smooth"
              >
                <Phone className="h-4 w-4" />
                +998 93 300 77 09
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 Alsamos Corporation. All rights reserved.
            </p>
            <div className="flex gap-4">
              <span className="text-xs text-muted-foreground">Powered by Alsamos Cloud & AI</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
