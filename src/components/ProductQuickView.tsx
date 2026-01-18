import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  ShoppingCart, 
  Heart, 
  Share2, 
  Minus, 
  Plus, 
  Check, 
  X,
  ChevronRight,
  Sparkles,
  Truck,
  Shield,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

interface Product {
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

interface ProductQuickViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (productId: string, quantity: number) => Promise<void>;
  onAddToWishlist?: (productId: string) => void;
}

const ProductQuickView = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onAddToWishlist,
}: ProductQuickViewProps) => {
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!product) return null;

  const images = product.product_images || [];
  const currentImage = images[currentImageIndex]?.image_url;

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    try {
      await onAddToCart(product.id, quantity);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    onAddToWishlist?.(product.id);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const increaseQuantity = () => {
    if (quantity < product.stock) setQuantity(quantity + 1);
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh] focus:outline-none">
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{product.name}</DrawerTitle>
          </DrawerHeader>

          {/* Image Gallery */}
          <div className="relative">
            <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full"
                >
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="h-20 w-20 text-muted-foreground/20" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Image Thumbnails */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentImageIndex
                        ? "bg-white w-6"
                        : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            )}

            {/* Close Button */}
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/20 text-white hover:bg-black/40"
              >
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.featured && (
                <Badge className="bg-secondary text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {product.stock < 10 && product.stock > 0 && (
                <Badge variant="destructive">Only {product.stock} left</Badge>
              )}
              {product.stock === 0 && (
                <Badge variant="outline" className="bg-muted/90">
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="p-4 space-y-4">
            {/* Category & Brand */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-secondary uppercase tracking-wide">
                {product.categories?.name || "Uncategorized"}
              </span>
              {product.brand && (
                <span className="text-sm text-muted-foreground">{product.brand}</span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-foreground">{product.name}</h2>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.floor(product.rating)
                        ? "fill-accent text-accent"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{product.rating}</span>
              <span className="text-sm text-muted-foreground">
                ({product.review_count} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">
                ${product.price.toFixed(2)}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {product.description}
              </p>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">Quantity</span>
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  className="p-2 hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 font-medium min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={increaseQuantity}
                  disabled={quantity >= product.stock}
                  className="p-2 hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="text-sm text-muted-foreground">
                {product.stock} available
              </span>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-border">
              <div className="flex flex-col items-center text-center gap-1">
                <Truck className="h-5 w-5 text-secondary" />
                <span className="text-[10px] text-muted-foreground">Free Shipping</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <Shield className="h-5 w-5 text-secondary" />
                <span className="text-[10px] text-muted-foreground">Secure Payment</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1">
                <RotateCcw className="h-5 w-5 text-secondary" />
                <span className="text-[10px] text-muted-foreground">30-Day Returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DrawerFooter className="border-t border-border bg-background pb-safe">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-12 w-12 shrink-0",
                isWishlisted && "border-destructive text-destructive"
              )}
              onClick={handleWishlist}
            >
              <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => {
                navigator.share?.({
                  title: product.name,
                  url: `/market/${product.id}`,
                });
              }}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              className="flex-1 h-12 bg-secondary hover:bg-secondary/90 text-white gap-2"
              onClick={handleAddToCart}
              disabled={isAddingToCart || product.stock === 0}
            >
              {isAddingToCart ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </motion.div>
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart - ${(product.price * quantity).toFixed(2)}
                </>
              )}
            </Button>
          </div>
          <NavLink to={`/market/${product.id}`} className="w-full">
            <Button variant="ghost" className="w-full h-10 text-muted-foreground">
              View Full Details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </NavLink>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ProductQuickView;
