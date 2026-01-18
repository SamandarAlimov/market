import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface WishlistItem {
  id: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    price: number;
    brand: string | null;
    product_images: { image_url: string; is_primary: boolean }[];
  };
}

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { t } = useLanguage();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("wishlists")
      .select(`
        id,
        product_id,
        products (
          id,
          name,
          price,
          brand,
          product_images (image_url, is_primary)
        )
      `)
      .eq("user_id", user.id);

    if (!error && data) {
      setWishlistItems(data as unknown as WishlistItem[]);
    }
    setLoading(false);
  };

  const removeFromWishlist = async (id: string) => {
    const { error } = await supabase.from("wishlists").delete().eq("id", id);
    if (!error) {
      setWishlistItems(prev => prev.filter(item => item.id !== id));
      toast.success(t("removedFromWishlist"));
    }
  };

  const handleAddToCart = async (productId: string) => {
    await addToCart(productId, 1);
  };

  const getProductImage = (images: { image_url: string; is_primary: boolean }[]) => {
    if (!images || images.length === 0) return "/placeholder.svg";
    const primary = images.find(img => img.is_primary);
    return primary?.image_url || images[0]?.image_url || "/placeholder.svg";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{t("wishlist")}</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("emptyWishlist")}</h2>
            <p className="text-muted-foreground mb-6">{t("emptyWishlistDescription")}</p>
            <Link to="/market">
              <Button>{t("browseProducts")}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlistItems.map(item => (
              <Card key={item.id} className="group overflow-hidden">
                <Link to={`/product/${item.product_id}`}>
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={getProductImage(item.products.product_images)}
                      alt={item.products.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </Link>
                <CardContent className="p-4">
                  <Link to={`/product/${item.product_id}`}>
                    <h3 className="font-semibold hover:text-primary transition-colors line-clamp-1">
                      {item.products.name}
                    </h3>
                  </Link>
                  {item.products.brand && (
                    <p className="text-sm text-muted-foreground">{item.products.brand}</p>
                  )}
                  <p className="text-lg font-bold text-primary mt-2">
                    ${item.products.price.toFixed(2)}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAddToCart(item.product_id)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      {t("addToCart")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFromWishlist(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Wishlist;
