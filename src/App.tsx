import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import CartSidebar from "@/components/CartSidebar";
import AIChatbot from "@/components/AIChatbot";
import BottomNavbar from "@/components/BottomNavbar";
import Index from "./pages/Index";
import Market from "./pages/Market";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import SellerDashboard from "./pages/SellerDashboard";
import Categories from "./pages/Categories";
import AIFeatures from "./pages/AIFeatures";
import Checkout from "./pages/Checkout";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";
import AdminDashboard from "./pages/AdminDashboard";
import Notifications from "./pages/Notifications";
import Search from "./pages/Search";
import CompanyProfile from "./pages/CompanyProfile";
import OrderTracking from "./pages/OrderTracking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="pb-16 md:pb-0">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/market" element={<Market />} />
                  <Route path="/market/:id" element={<ProductDetail />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/ai-features" element={<AIFeatures />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/company-profile" element={<CompanyProfile />} />
                  <Route path="/order/:orderId" element={<OrderTracking />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/seller" element={<SellerDashboard />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <BottomNavbar />
              <CartSidebar />
              <AIChatbot />
            </BrowserRouter>
          </CartProvider>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
