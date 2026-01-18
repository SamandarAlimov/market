import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { User, Package, Settings, Loader2, Save, Calendar, MapPin, CreditCard, Eye, Truck } from "lucide-react";

interface Order {
  id: string;
  total_amount: number;
  status: string;
  shipping_address: string;
  tracking_number: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await Promise.all([
      fetchProfile(session.user.id),
      fetchOrders(session.user.id)
    ]);
    setIsLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
    }
  };

  const fetchOrders = async (userId: string) => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });

    if (data) setOrders(data);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("profileUpdated"),
        description: t("profileUpdatedDesc"),
      });
      await fetchProfile(user.id);
    }
    
    setIsSaving(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/20 text-yellow-500";
      case "processing": return "bg-blue-500/20 text-blue-500";
      case "shipped": return "bg-purple-500/20 text-purple-500";
      case "delivered": return "bg-green-500/20 text-green-500";
      case "cancelled": return "bg-red-500/20 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-secondary to-primary text-white">
                    {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left">
                  <h1 className="font-display text-3xl font-bold text-foreground">
                    {profile?.full_name || t("welcomeUser")}
                  </h1>
                  <p className="text-muted-foreground">{profile?.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                    <Badge variant="secondary">
                      <Package className="h-3 w-3 mr-1" />
                      {orders.length} {t("ordersCount")}
                    </Badge>
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      {t("memberSince")} {formatDate(profile?.id ? user?.created_at || "" : "")}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="orders" className="gap-2">
                <Package className="h-4 w-4" />
                {t("orderHistory")}
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                {t("accountSettings")}
              </TabsTrigger>
            </TabsList>

            {/* Order History Tab */}
            <TabsContent value="orders">
              {orders.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{t("noOrdersYet")}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t("startShoppingDesc")}
                  </p>
                  <Button onClick={() => navigate("/market")}>
                    {t("browseProducts")}
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="overflow-hidden hover:border-secondary/50 transition-all">
                      <CardHeader className="bg-muted/30 py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                              <Package className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">{t("orderNumber")}</p>
                              <p className="font-mono text-sm font-medium text-foreground">
                                {order.id.slice(0, 8).toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => navigate(`/order/${order.id}`)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Track Order
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-start gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">{t("orderDate")}</p>
                              <p className="text-sm font-medium text-foreground">{formatDate(order.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">{t("shippingTo")}</p>
                              <p className="text-sm font-medium text-foreground line-clamp-2">{order.shipping_address}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">{t("totalAmount")}</p>
                              <p className="text-sm font-bold text-secondary">${order.total_amount.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        {order.tracking_number && (
                          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">{t("trackingNumber")}</p>
                              <p className="font-mono text-sm font-medium text-foreground">{order.tracking_number}</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => navigate(`/order/${order.id}`)}
                              className="gap-2"
                            >
                              <Truck className="h-4 w-4" />
                              Live Tracking
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Account Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t("personalInformation")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("email")}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile?.email || ""}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">{t("emailCannotChange")}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="full-name">{t("fullName")}</Label>
                        <Input
                          id="full-name"
                          placeholder={t("enterFullName")}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t("phoneNumber")}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder={t("enterPhoneNumber")}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSaving} className="gap-2">
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {t("saveChanges")}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;