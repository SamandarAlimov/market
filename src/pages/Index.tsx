import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Sparkles, TrendingUp, Zap, ShoppingBag, Brain, Package, BarChart3, Bell, Settings, LogOut, Shield, Users, Store, Building2, Globe, Briefcase, ChevronRight, Clock, CheckCircle2, FileText, Headphones, Heart, Eye, MessageSquare, CreditCard, Truck, Star, Activity, Target, Award, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { AIRecommendations } from "@/components/AIRecommendations";
import PullToRefresh from "@/components/PullToRefresh";
import { motion } from "framer-motion";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  wishlistCount: number;
  cartItems: number;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    wishlistCount: 0,
    cartItems: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          checkUserRoles(session.user.id);
          fetchStats(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsSeller(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkUserRoles(session.user.id);
        fetchStats(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  const checkUserRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (data) {
      setIsAdmin(data.some(r => r.role === "admin"));
      setIsSeller(data.some(r => r.role === "seller"));
    }
  };

  const fetchStats = async (userId: string) => {
    const [ordersResult, wishlistResult, cartResult] = await Promise.all([
      supabase.from("orders").select("id, status").eq("buyer_id", userId),
      supabase.from("wishlists").select("id").eq("user_id", userId),
      supabase.from("cart_items").select("id").eq("user_id", userId),
    ]);

    setStats({
      totalOrders: ordersResult.data?.length || 0,
      pendingOrders: ordersResult.data?.filter(o => o.status === 'pending').length || 0,
      wishlistCount: wishlistResult.data?.length || 0,
      cartItems: cartResult.data?.length || 0,
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
  };

  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (user) {
      await Promise.all([
        fetchProfile(user.id),
        checkUserRoles(user.id),
        fetchStats(user.id),
      ]);
    }
    
    setRefreshKey(prev => prev + 1);
    
    toast({
      title: "Refreshed",
      description: "Content has been updated.",
    });
  }, [user, toast]);

  const categories = [
    { name: "Electronics", icon: "⚡", count: "15K+ items", color: "bg-blue-50 dark:bg-blue-950/30" },
    { name: "Fashion", icon: "👔", count: "23K+ items", color: "bg-purple-50 dark:bg-purple-950/30" },
    { name: "Home & Living", icon: "🏠", count: "18K+ items", color: "bg-amber-50 dark:bg-amber-950/30" },
    { name: "Sports & Fitness", icon: "⚽", count: "12K+ items", color: "bg-green-50 dark:bg-green-950/30" },
    { name: "Health & Beauty", icon: "💄", count: "9K+ items", color: "bg-pink-50 dark:bg-pink-950/30" },
    { name: "Automotive", icon: "🚗", count: "7K+ items", color: "bg-slate-50 dark:bg-slate-950/30" },
  ];

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Recommendations",
      description: "Get personalized product suggestions based on your preferences and shopping behavior."
    },
    {
      icon: TrendingUp,
      title: "Market Insights",
      description: "Real-time pricing trends and demand predictions to help you make informed decisions."
    },
    {
      icon: Sparkles,
      title: "Smart Search",
      description: "Find exactly what you need with our advanced AI-powered search and filtering."
    },
    {
      icon: Zap,
      title: "Instant Delivery",
      description: "Fast and reliable shipping with real-time tracking powered by AI logistics."
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  // Dashboard for authenticated users
  if (user && !loading) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen flex flex-col bg-muted/30">
          <Header />
          
          <main className="flex-1">
            {/* Hero Dashboard Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 gradient-hero" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h1v1H0z%22%20fill%3D%22rgba(255%2C255%2C255%2C0.03)%22%2F%3E%3C%2Fsvg%3E')]" />
              
              <motion.div 
                className="relative container mx-auto px-4 py-8 md:py-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <motion.h1 
                        className="text-2xl md:text-3xl lg:text-4xl font-bold text-white"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                      >
                        {getGreeting()}, {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}!
                      </motion.h1>
                      <div className="flex gap-2">
                        {isAdmin && (
                          <Badge className="bg-red-500/20 text-red-200 border-red-500/30 font-medium">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {isSeller && (
                          <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/30 font-medium">
                            <Store className="h-3 w-3 mr-1" />
                            Seller
                          </Badge>
                        )}
                      </div>
                    </div>
                    <motion.p 
                      className="text-white/70 text-base md:text-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      Welcome to your personalized dashboard
                    </motion.p>
                  </div>

                  <motion.div 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <Button variant="secondary" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                      <NavLink to="/notifications">
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                      </NavLink>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </motion.div>
                </div>

                {/* Stats Cards */}
                <motion.div 
                  className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-8"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div variants={itemVariants}>
                    <Card className="p-4 md:p-5 bg-white/10 backdrop-blur-sm border-white/10 hover:bg-white/15 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 md:h-6 md:w-6 text-blue-300" />
                        </div>
                        <div>
                          <p className="text-xl md:text-2xl font-bold text-white">{stats.totalOrders}</p>
                          <p className="text-xs md:text-sm text-white/60">Total Orders</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="p-4 md:p-5 bg-white/10 backdrop-blur-sm border-white/10 hover:bg-white/15 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                          <Clock className="h-5 w-5 md:h-6 md:w-6 text-amber-300" />
                        </div>
                        <div>
                          <p className="text-xl md:text-2xl font-bold text-white">{stats.pendingOrders}</p>
                          <p className="text-xs md:text-sm text-white/60">Pending</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="p-4 md:p-5 bg-white/10 backdrop-blur-sm border-white/10 hover:bg-white/15 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                          <Heart className="h-5 w-5 md:h-6 md:w-6 text-pink-300" />
                        </div>
                        <div>
                          <p className="text-xl md:text-2xl font-bold text-white">{stats.wishlistCount}</p>
                          <p className="text-xs md:text-sm text-white/60">Wishlist</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="p-4 md:p-5 bg-white/10 backdrop-blur-sm border-white/10 hover:bg-white/15 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <Package className="h-5 w-5 md:h-6 md:w-6 text-emerald-300" />
                        </div>
                        <div>
                          <p className="text-xl md:text-2xl font-bold text-white">{stats.cartItems}</p>
                          <p className="text-xs md:text-sm text-white/60">In Cart</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            <div className="container mx-auto px-4 py-8">
              {/* Admin Panel */}
              {isAdmin && (
                <motion.div 
                  className="mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">Administration</h2>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <NavLink to="/admin">
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </NavLink>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: BarChart3, title: "Dashboard", desc: "System overview", to: "/admin" },
                      { icon: Users, title: "Users", desc: "Manage accounts", to: "/admin" },
                      { icon: Package, title: "Products", desc: "Moderate listings", to: "/admin" },
                      { icon: FileText, title: "Reports", desc: "Analytics data", to: "/admin" },
                    ].map((item, index) => (
                      <NavLink key={index} to={item.to}>
                        <Card className="p-5 hover:border-red-500/50 hover:shadow-lg transition-all cursor-pointer bg-background group">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/10 flex items-center justify-center group-hover:from-red-500/20 group-hover:to-red-600/20 transition-all">
                              <item.icon className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{item.title}</h3>
                              <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </div>
                          </div>
                        </Card>
                      </NavLink>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Seller Panel */}
              {isSeller && (
                <motion.div 
                  className="mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">Seller Dashboard</h2>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <NavLink to="/seller">
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </NavLink>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { icon: TrendingUp, title: "Sales", desc: "Performance", to: "/seller" },
                      { icon: Package, title: "Inventory", desc: "Manage stock", to: "/seller" },
                      { icon: ShoppingBag, title: "Orders", desc: "Process orders", to: "/seller" },
                      { icon: BarChart3, title: "Analytics", desc: "Insights", to: "/seller" },
                      { icon: Building2, title: "Company", desc: "Business profile", to: "/company-profile" },
                    ].map((item, index) => (
                      <NavLink key={index} to={item.to}>
                        <Card className="p-5 hover:border-secondary/50 hover:shadow-lg transition-all cursor-pointer bg-background group">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/20 flex items-center justify-center group-hover:from-secondary/20 group-hover:to-secondary/30 transition-all">
                              <item.icon className="h-6 w-6 text-secondary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground group-hover:text-secondary transition-colors">{item.title}</h3>
                              <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </div>
                          </div>
                        </Card>
                      </NavLink>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Quick Actions */}
              <motion.div 
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: ShoppingBag, title: "Browse Market", desc: "Explore products", to: "/market", color: "from-blue-500/10 to-blue-600/10", hoverColor: "hover:border-blue-500/50", iconColor: "text-blue-600 dark:text-blue-400" },
                    { icon: Clock, title: "My Orders", desc: "Track shipments", to: "/profile", color: "from-amber-500/10 to-amber-600/10", hoverColor: "hover:border-amber-500/50", iconColor: "text-amber-600 dark:text-amber-400" },
                    { icon: Heart, title: "Wishlist", desc: "Saved items", to: "/wishlist", color: "from-pink-500/10 to-pink-600/10", hoverColor: "hover:border-pink-500/50", iconColor: "text-pink-600 dark:text-pink-400" },
                    { icon: Settings, title: "Settings", desc: "Account settings", to: "/profile", color: "from-slate-500/10 to-slate-600/10", hoverColor: "hover:border-slate-500/50", iconColor: "text-slate-600 dark:text-slate-400" },
                  ].map((item, index) => (
                    <NavLink key={index} to={item.to}>
                      <Card className={`p-5 ${item.hoverColor} hover:shadow-lg transition-all cursor-pointer bg-background group`}>
                        <div className="flex flex-col items-center text-center">
                          <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                            <item.icon className={`h-7 w-7 ${item.iconColor}`} />
                          </div>
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </Card>
                    </NavLink>
                  ))}
                </div>
              </motion.div>

              {/* AI Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <AIRecommendations userId={user.id} />
              </motion.div>

              {/* Categories */}
              <motion.div 
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Target className="h-4 w-4 text-secondary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Shop by Category</h2>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <NavLink to="/categories">
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </NavLink>
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {categories.map((category, index) => (
                    <NavLink
                      key={index}
                      to={`/market?category=${category.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                    >
                      <Card className={`group cursor-pointer overflow-hidden hover:border-secondary hover:shadow-lg transition-all text-center p-5 h-full bg-background`}>
                        <div className={`w-14 h-14 rounded-xl ${category.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                          <span className="text-2xl">{category.icon}</span>
                        </div>
                        <h3 className="font-medium text-foreground text-sm group-hover:text-secondary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">{category.count}</p>
                      </Card>
                    </NavLink>
                  ))}
                </div>
              </motion.div>

              {/* AI Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg gradient-secondary flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">AI-Powered Features</h2>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <NavLink to="/ai-features">
                      Explore <ChevronRight className="h-4 w-4 ml-1" />
                    </NavLink>
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {features.map((feature, index) => (
                    <Card key={index} className="p-5 bg-background hover:border-secondary hover:shadow-lg transition-all group">
                      <div className="h-11 w-11 rounded-xl gradient-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <feature.icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </div>
          </main>

          <Footer />
        </div>
      </PullToRefresh>
    );
  }

  // Introduction page for non-authenticated users
  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-background">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-secondary/5 to-transparent" />
          
          <div className="relative container mx-auto px-4 py-20 md:py-28">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-6 bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered B2B Marketplace
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                Transform Your Business with
                <span className="block text-secondary mt-2">Intelligent Procurement</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                Connect with verified suppliers, streamline your procurement process, and leverage AI-powered insights to make smarter purchasing decisions.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="h-12 px-8 text-base" asChild>
                  <NavLink to="/market">
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Browse Products
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </NavLink>
                </Button>
                <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
                  <NavLink to="/auth">
                    <Building2 className="h-5 w-5 mr-2" />
                    Become a Seller
                  </NavLink>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-medium">10,000+ Verified Sellers</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-medium">Global Shipping</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-medium">Secure Transactions</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Explore Categories
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Discover products across multiple categories from verified suppliers
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category, index) => (
                <NavLink
                  key={index}
                  to={`/market?category=${category.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                >
                  <Card className={`group cursor-pointer overflow-hidden hover:border-secondary hover:shadow-lg transition-all text-center p-6 h-full`}>
                    <div className={`w-16 h-16 rounded-xl ${category.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      <span className="text-3xl">{category.icon}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-secondary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{category.count}</p>
                  </Card>
                </NavLink>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by AI
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Smart Features for Modern Business
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Our AI technology enhances every aspect of your procurement experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="p-6 border border-border hover:border-secondary hover:shadow-lg transition-all">
                  <div className="h-12 w-12 rounded-lg gradient-secondary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Why Businesses Choose Alsamos Market
                </h2>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  We provide enterprise-grade solutions that help businesses streamline their procurement processes and build lasting supplier relationships.
                </p>
                
                <div className="space-y-4">
                  {[
                    { icon: Shield, title: "Verified Suppliers", desc: "All sellers go through rigorous verification" },
                    { icon: Globe, title: "Global Network", desc: "Access suppliers from around the world" },
                    { icon: Headphones, title: "24/7 Support", desc: "Dedicated support team always available" },
                    { icon: Briefcase, title: "Enterprise Ready", desc: "Bulk ordering and custom contracts" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 text-center bg-background">
                  <div className="text-4xl font-bold text-primary mb-2">10K+</div>
                  <p className="text-muted-foreground">Active Sellers</p>
                </Card>
                <Card className="p-6 text-center bg-background">
                  <div className="text-4xl font-bold text-primary mb-2">500K+</div>
                  <p className="text-muted-foreground">Products Listed</p>
                </Card>
                <Card className="p-6 text-center bg-background">
                  <div className="text-4xl font-bold text-primary mb-2">50+</div>
                  <p className="text-muted-foreground">Countries</p>
                </Card>
                <Card className="p-6 text-center bg-background">
                  <div className="text-4xl font-bold text-primary mb-2">99%</div>
                  <p className="text-muted-foreground">Satisfaction Rate</p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 gradient-primary relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-secondary rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl" />
          </div>
          
          <div className="relative container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Procurement?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses already using Alsamos Market to streamline their operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-12 px-8 bg-white text-primary hover:bg-white/90" asChild>
                <NavLink to="/auth">
                  Get Started Free
                  <ArrowRight className="h-5 w-5 ml-2" />
                </NavLink>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 border-white/30 text-white hover:bg-white/10" asChild>
                <NavLink to="/market">
                  Browse Products
                </NavLink>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
    </PullToRefresh>
  );
};

export default Index;