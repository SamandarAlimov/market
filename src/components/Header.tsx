import { Search, ShoppingCart, User, Menu, LogOut, Shield, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import NotificationBell from "@/components/NotificationBell";
import ChatInterface from "@/components/chat/ChatInterface";
import alsamosLogo from "@/assets/alsamos-logo.png";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { totalItems, setIsOpen } = useCart();
  const { t } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRoles(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          checkUserRoles(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setIsSeller(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (data) {
      setIsAdmin(data.some(r => r.role === "admin"));
      setIsSeller(data.some(r => r.role === "seller"));
    } else {
      setIsAdmin(false);
      setIsSeller(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: t("signOut"),
      description: "You've been successfully signed out.",
    });
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <img src={alsamosLogo} alt="Alsamos" className="h-10 w-10" />
            <div className="flex flex-col">
              <span className="font-display text-xl font-bold text-primary">Alsamos</span>
              <span className="text-[10px] font-medium text-muted-foreground -mt-1">MAKE IT REAL</span>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink 
              to="/" 
              className="text-sm font-medium text-foreground hover:text-secondary transition-smooth"
              activeClassName="text-secondary"
            >
              {t("home")}
            </NavLink>
            <NavLink 
              to="/market" 
              className="text-sm font-medium text-foreground hover:text-secondary transition-smooth"
              activeClassName="text-secondary"
            >
              {t("market")}
            </NavLink>
            <NavLink 
              to="/categories" 
              className="text-sm font-medium text-foreground hover:text-secondary transition-smooth"
              activeClassName="text-secondary"
            >
              {t("categories")}
            </NavLink>
            <NavLink 
              to="/ai-features" 
              className="text-sm font-medium text-foreground hover:text-secondary transition-smooth"
              activeClassName="text-secondary"
            >
              {t("aiFeatures")}
            </NavLink>
            <NavLink 
              to="/seller" 
              className="text-sm font-medium text-foreground hover:text-secondary transition-smooth"
              activeClassName="text-secondary"
            >
              {t("sellers")}
            </NavLink>
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md">
            <NavLink to="/search" className="relative w-full">
              <div className="relative w-full cursor-pointer">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <div className="pl-10 pr-4 py-2 bg-muted/50 border border-border/50 rounded-md text-muted-foreground text-sm hover:bg-muted transition-colors">
                  Search products, categories, AI features...
                </div>
              </div>
            </NavLink>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSelector />
            {user && <NotificationBell />}
            {user && <ChatInterface currentUserId={user.id} />}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden md:inline-flex h-9 w-9 relative">
                    <User className="h-4 w-4" />
                    {isAdmin && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive flex items-center justify-center">
                        <Shield className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    My Account
                    {isAdmin && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Admin
                      </Badge>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <NavLink to="/admin" className="cursor-pointer flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-destructive" />
                          Admin Panel
                        </NavLink>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <NavLink to="/seller" className="cursor-pointer">
                      {t("myDashboard")}
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/profile" className="cursor-pointer">
                      {t("myProfile")}
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
                <NavLink to="/auth">{t("signIn")}</NavLink>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-secondary text-[10px] font-bold text-white flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-3">
          <NavLink to="/search" className="block">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <div className="pl-10 pr-4 py-2 bg-muted/50 border border-border/50 rounded-md text-muted-foreground text-sm">
                Search...
              </div>
            </div>
          </NavLink>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border py-4 space-y-3">
            <NavLink 
              to="/" 
              className="block text-sm font-medium text-foreground hover:text-secondary transition-smooth py-2"
            >
              {t("home")}
            </NavLink>
            <NavLink 
              to="/market" 
              className="block text-sm font-medium text-foreground hover:text-secondary transition-smooth py-2"
            >
              {t("market")}
            </NavLink>
            <NavLink 
              to="/categories" 
              className="block text-sm font-medium text-foreground hover:text-secondary transition-smooth py-2"
            >
              {t("categories")}
            </NavLink>
            <NavLink 
              to="/ai-features" 
              className="block text-sm font-medium text-foreground hover:text-secondary transition-smooth py-2"
            >
              {t("aiFeatures")}
            </NavLink>
            <NavLink 
              to="/seller" 
              className="block text-sm font-medium text-foreground hover:text-secondary transition-smooth py-2"
            >
              {t("sellers")}
            </NavLink>
            {user ? (
              <>
                {isAdmin && (
                  <NavLink 
                    to="/admin" 
                    className="block text-sm font-medium text-destructive hover:text-destructive/80 transition-smooth py-2 flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </NavLink>
                )}
                {isSeller && (
                  <NavLink 
                    to="/seller" 
                    className="block text-sm font-medium text-secondary hover:text-secondary/80 transition-smooth py-2"
                  >
                    Seller Dashboard
                  </NavLink>
                )}
                <NavLink 
                  to="/profile" 
                  className="block text-sm font-medium text-foreground hover:text-secondary transition-smooth py-2"
                >
                  {t("myProfile")}
                </NavLink>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left text-sm font-medium text-destructive hover:text-destructive/80 transition-smooth py-2"
                >
                  {t("signOut")}
                </button>
              </>
            ) : (
              <NavLink 
                to="/auth" 
                className="block text-sm font-medium text-foreground hover:text-secondary transition-smooth py-2"
              >
                {t("signIn")}
              </NavLink>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
