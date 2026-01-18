import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  brand: string | null;
  rating: number | null;
  categories: { name: string } | null;
  product_images: { image_url: string; is_primary: boolean }[];
}

export const AIRecommendations = ({ userId }: { userId: string }) => {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);

        // Call the edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-recommendations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ userId }),
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            toast({
              title: "Rate limited",
              description: "Please try again in a moment.",
              variant: "destructive",
            });
          }
          throw new Error("Failed to fetch recommendations");
        }

        const data = await response.json();
        const recommendedIds = data.recommendedIds || [];

        if (recommendedIds.length > 0) {
          // Fetch full product details
          const { data: products, error } = await supabase
            .from("products")
            .select(`
              id,
              name,
              price,
              brand,
              rating,
              categories (name),
              product_images (image_url, is_primary)
            `)
            .in("id", recommendedIds)
            .eq("status", "active");

          if (error) throw error;

          // Sort products by the order returned by AI
          const sortedProducts = recommendedIds
            .map((id: string) => products?.find((p) => p.id === id))
            .filter(Boolean) as Product[];

          setRecommendations(sortedProducts);
        } else {
          // Fallback: fetch featured/popular products
          const { data: fallbackProducts } = await supabase
            .from("products")
            .select(`
              id,
              name,
              price,
              brand,
              rating,
              categories (name),
              product_images (image_url, is_primary)
            `)
            .eq("status", "active")
            .order("rating", { ascending: false })
            .limit(6);

          setRecommendations(fallbackProducts || []);
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        // Fallback to featured products on error
        const { data: fallbackProducts } = await supabase
          .from("products")
          .select(`
            id,
            name,
            price,
            brand,
            rating,
            categories (name),
            product_images (image_url, is_primary)
          `)
          .eq("status", "active")
          .order("rating", { ascending: false })
          .limit(6);

        setRecommendations(fallbackProducts || []);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId, toast]);

  const getProductImage = (product: Product) => {
    const primaryImage = product.product_images?.find((img) => img.is_primary);
    return primaryImage?.image_url || product.product_images?.[0]?.image_url || "/placeholder.svg";
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <h2 className="text-lg font-semibold text-foreground">AI Recommendations</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Analyzing your preferences...</span>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recommended for You</h2>
            <p className="text-xs text-muted-foreground">Powered by AI based on your activity</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <NavLink to="/market">
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </NavLink>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {recommendations.slice(0, 6).map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <NavLink to={`/product/${product.id}`}>
              <Card className="overflow-hidden hover:border-primary/50 transition-all group cursor-pointer h-full">
                <div className="aspect-square relative overflow-hidden bg-muted">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.rating && product.rating >= 4.5 && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                      Top Rated
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {product.categories?.name || "Uncategorized"}
                  </p>
                  <h3 className="font-medium text-foreground text-sm line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="font-semibold text-primary">
                    ${product.price.toLocaleString()}
                  </p>
                </div>
              </Card>
            </NavLink>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
