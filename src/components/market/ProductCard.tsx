import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, Heart, Eye, Sparkles, Loader2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  rating: number;
  review_count: number;
  status: string;
  featured: boolean;
  brand: string | null;
  stock: number;
  description?: string | null;
  categories: { name: string } | null;
  product_images: ProductImage[];
}

interface ProductCardProps {
  product: Product;
  index: number;
  onAddToCart: (e: React.MouseEvent, productId: string) => Promise<void>;
  onAddToWishlist?: (productId: string) => void;
  onQuickView?: (product: Product) => void;
  isAddingToCart: boolean;
}

const ProductCard = ({ 
  product, 
  index, 
  onAddToCart, 
  onAddToWishlist,
  onQuickView,
  isAddingToCart 
}: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const isMobile = useIsMobile();

  const getProductImage = (): string | null => {
    if (!product.product_images || product.product_images.length === 0) return null;
    const primary = product.product_images.find(img => img.is_primary);
    return primary?.image_url || product.product_images[0]?.image_url || null;
  };

  const imageUrl = getProductImage();

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    onAddToWishlist?.(product.id);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(product);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // On mobile, open quick view instead of navigating
    if (isMobile && onQuickView) {
      e.preventDefault();
      onQuickView(product);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <NavLink to={`/market/${product.id}`} onClick={handleCardClick}>
        <Card
          className="group overflow-hidden border border-border hover:border-secondary/50 hover:shadow-lg transition-all duration-300 cursor-pointer h-full bg-card"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
            {imageUrl ? (
              <motion.img 
                src={imageUrl} 
                alt={product.name}
                className="w-full h-full object-cover"
                animate={{ scale: isHovered ? 1.08 : 1 }}
                transition={{ duration: 0.4 }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}

            {/* Overlay Actions */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />

            {/* Quick Actions */}
            <motion.div 
              className="absolute bottom-4 left-4 right-4 flex gap-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: isHovered ? 0 : 20, opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                size="sm"
                className="flex-1 bg-secondary hover:bg-secondary/90 text-white gap-2"
                onClick={(e) => onAddToCart(e, product.id)}
                disabled={isAddingToCart || product.stock === 0}
              >
                {isAddingToCart ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Add to Cart
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white text-foreground"
                onClick={handleQuickView}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* Wishlist Button */}
            <motion.button
              className={cn(
                "absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                isWishlisted 
                  ? "bg-destructive text-white" 
                  : "bg-white/90 text-foreground hover:bg-white"
              )}
              onClick={handleWishlist}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
            </motion.button>

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.featured && (
                <Badge className="bg-secondary text-white border-0 shadow-lg">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {product.stock < 10 && product.stock > 0 && (
                <Badge variant="destructive" className="shadow-lg">
                  Only {product.stock} left
                </Badge>
              )}
              {product.stock === 0 && (
                <Badge variant="outline" className="bg-muted/90 shadow-lg">
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Category & Brand */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-secondary uppercase tracking-wide">
                {product.categories?.name || "Uncategorized"}
              </span>
              {product.brand && (
                <span className="text-xs text-muted-foreground">{product.brand}</span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-foreground group-hover:text-secondary transition-colors line-clamp-2 min-h-[2.5rem]">
              {product.name}
            </h3>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "h-3.5 w-3.5",
                      i < Math.floor(product.rating) 
                        ? "fill-accent text-accent" 
                        : "text-muted-foreground/30"
                    )} 
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground">{product.rating}</span>
              <span className="text-sm text-muted-foreground">({product.review_count})</span>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-2xl font-bold text-primary">
                  ${product.price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </NavLink>
    </motion.div>
  );
};

export default ProductCard;