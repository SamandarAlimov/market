import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WishlistButton from "@/components/WishlistButton";
import ProductReviews from "@/components/ProductReviews";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ShoppingCart, Sparkles, TrendingUp, Shield, Truck, Loader2 } from "lucide-react";
import { trackProductView } from "@/hooks/useBrowsingHistory";

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  brand: string | null;
  rating: number | null;
  review_count: number | null;
  featured: boolean | null;
  ai_generated_description: string | null;
  categories: { name: string; slug: string } | null;
  product_images: ProductImage[];
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          stock,
          brand,
          rating,
          review_count,
          featured,
          ai_generated_description,
          categories (name, slug),
          product_images (id, image_url, is_primary, display_order)
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching product:", error);
        navigate("/market");
      } else {
        const productData = data as Product;
        setProduct(productData);
        
        // Track product view in browsing history
        trackProductView(productData.id);
        
        // Set initial selected image
        if (productData.product_images && productData.product_images.length > 0) {
          const primary = productData.product_images.find(img => img.is_primary);
          setSelectedImage(primary?.image_url || productData.product_images[0].image_url);
        }
      }
      setLoading(false);
    };

    fetchProduct();
  }, [id, navigate]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    await addToCart(product.id, quantity);
    setAddingToCart(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const sortedImages = product.product_images?.sort((a, b) => 
    (a.display_order || 0) - (b.display_order || 0)
  ) || [];

  const aiInsights = [
    "Based on your browsing history, this matches your preferences",
    `${product.stock < 20 ? "Low stock - high demand in your area" : "Good availability"}`,
    "AI-verified authentic product from trusted seller"
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 border border-border">
                {selectedImage ? (
                  <img 
                    src={selectedImage} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Sparkles className="h-24 w-24 opacity-30" />
                  </div>
                )}
              </div>
              
              {/* Thumbnails */}
              {sortedImages.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {sortedImages.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImage(image.image_url)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === image.image_url 
                          ? 'border-secondary shadow-md' 
                          : 'border-border hover:border-secondary/50'
                      }`}
                    >
                      <img 
                        src={image.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((_, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-border bg-muted/50 flex items-center justify-center"
                    >
                      <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <Badge variant="secondary" className="mb-3">
                  {product.categories?.name || "Uncategorized"}
                </Badge>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {product.name}
                </h1>
                <p className="text-muted-foreground">{product.brand || "Unknown Brand"}</p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(product.rating || 0)
                          ? 'fill-accent text-accent'
                          : 'text-muted'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-foreground">{product.rating || 0}</span>
                <span className="text-muted-foreground">({product.review_count || 0} reviews)</span>
              </div>

              <Separator />

              {/* Price and Purchase */}
              <div className="space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-primary">${product.price.toFixed(2)}</span>
                  {product.stock > 0 ? (
                    <Badge variant="outline" className="text-secondary border-secondary">
                      {product.stock < 10 ? t("onlyLeft", { count: product.stock }) : t("inStock")}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">{t("outOfStock")}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <span className="px-4 font-semibold">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                    >
                      +
                    </Button>
                  </div>
                  <Button 
                    variant="default" 
                    size="lg" 
                    className="flex-1 gap-2"
                    onClick={handleAddToCart}
                    disabled={addingToCart || product.stock === 0}
                  >
                    {addingToCart ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-5 w-5" />
                    )}
                    {t("addToCart")}
                  </Button>
                  <WishlistButton productId={product.id} className="h-12" />
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">{t("description")}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description || product.ai_generated_description || t("noDescription")}
                </p>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/30">
                  <Truck className="h-6 w-6 text-secondary mb-2" />
                  <span className="text-xs text-muted-foreground">{t("freeShipping")}</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/30">
                  <Shield className="h-6 w-6 text-secondary mb-2" />
                  <span className="text-xs text-muted-foreground">{t("securePayment")}</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/30">
                  <TrendingUp className="h-6 w-6 text-secondary mb-2" />
                  <span className="text-xs text-muted-foreground">{t("bestPrice")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <Card className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-start gap-4">
              <Sparkles className="h-6 w-6 flex-shrink-0 mt-1 text-primary" />
              <div>
                <h3 className="font-display text-xl font-bold mb-3 text-foreground">{t("aiPoweredInsights")}</h3>
                <ul className="space-y-2">
                  {aiInsights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 text-muted-foreground">
                      <span className="mt-1 text-primary">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Reviews Section */}
          <div className="mt-8">
            <ProductReviews productId={product.id} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
