import { Home, Search, ShoppingBag, Heart, User } from "lucide-react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number | null;
}

const NavItem = ({ to, icon: Icon, label, badge }: NavItemProps) => (
  <RouterNavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-all relative flex-1 min-w-0",
        isActive ? "text-primary" : "text-muted-foreground"
      )
    }
  >
    {({ isActive }) => (
      <>
        <div className="relative">
          <Icon className={cn("h-5 w-5 transition-all", isActive && "scale-110")} />
          {isActive && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
          )}
          {badge && badge > 0 && (
            <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-secondary text-[10px] font-bold text-white flex items-center justify-center">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </div>
        <span className={cn("text-[10px] font-medium transition-all truncate", isActive && "font-semibold")}>
          {label}
        </span>
      </>
    )}
  </RouterNavLink>
);

const CartButton = ({ label, badge }: { label: string; badge: number }) => {
  const { setIsOpen } = useCart();
  
  return (
    <button
      onClick={() => setIsOpen(true)}
      className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-all relative flex-1 min-w-0 text-muted-foreground active:scale-95"
    >
      <div className="relative">
        <ShoppingBag className="h-5 w-5" />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-secondary text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium truncate">{label}</span>
    </button>
  );
};

const BottomNavbar = () => {
  const { totalItems } = useCart();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40 pb-safe">
      <div className="flex items-center justify-around h-16 px-1">
        <NavItem to="/" icon={Home} label={t("home")} />
        <NavItem to="/search" icon={Search} label={t("search") || "Search"} />
        <CartButton label="Cart" badge={totalItems} />
        <NavItem to="/wishlist" icon={Heart} label={t("wishlist") || "Wishlist"} />
        <NavItem to={user ? "/profile" : "/auth"} icon={User} label={user ? t("myProfile") : t("signIn")} />
      </div>
    </nav>
  );
};

export default BottomNavbar;
