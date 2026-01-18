import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  Loader2, 
  Search, 
  LayoutGrid, 
  List,
  SlidersHorizontal,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ProductCard, { Product } from "@/components/market/ProductCard";
import ProductFilters from "@/components/market/ProductFilters";
import SortDropdown, { SortOption } from "@/components/market/SortDropdown";
import ProductQuickView from "@/components/ProductQuickView";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface FilterState {
  priceRange: [number, number];
  rating: number | null;
  brands: string[];
  inStock: boolean;
  featured: boolean;
}

const Market = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [maxPrice, setMaxPrice] = useState(1000);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 1000],
    rating: null,
    brands: [],
    inStock: false,
    featured: false,
  });
  
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { t } = useLanguage();

  // Extract unique brands from products
  const availableBrands = useMemo(() => {
    const brands = products
      .map(p => p.brand)
      .filter((brand): brand is string => brand !== null);
    return [...new Set(brands)].sort();
  }, [products]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) count++;
    if (filters.rating !== null) count++;
    if (filters.brands.length > 0) count++;
    if (filters.inStock) count++;
    if (filters.featured) count++;
    return count;
  }, [filters, maxPrice]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categoryParam && categories.length > 0) {
      const cat = categories.find(c => c.slug === categoryParam);
      if (cat) {
        setSelectedCategory(cat.name);
      }
    }
  }, [categoryParam, categories]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, categories]);

  // Update max price when products load
  useEffect(() => {
    if (products.length > 0) {
      const max = Math.max(...products.map(p => p.price));
      setMaxPrice(Math.ceil(max / 100) * 100);
      setFilters(prev => ({
        ...prev,
        priceRange: [0, Math.ceil(max / 100) * 100]
      }));
    }
  }, [products.length]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");
    
    if (data) {
      setCategories([{ id: "all", name: "All", slug: "all" }, ...data]);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        price,
        rating,
        review_count,
        status,
        featured,
        brand,
        stock,
        categories (name),
        product_images (id, image_url, is_primary)
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (selectedCategory !== "All") {
      const category = categories.find((c) => c.name === selectedCategory);
      if (category && category.id !== "all") {
        query = query.eq("category_id", category.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProducts((data as Product[]) || []);
    }
    
    setIsLoading(false);
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.categories?.name.toLowerCase().includes(query)
      );
    }

    // Price filter
    result = result.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Rating filter
    if (filters.rating !== null) {
      result = result.filter(p => p.rating >= filters.rating!);
    }

    // Brand filter
    if (filters.brands.length > 0) {
      result = result.filter(p => p.brand && filters.brands.includes(p.brand));
    }

    // Stock filter
    if (filters.inStock) {
      result = result.filter(p => p.stock > 0);
    }

    // Featured filter
    if (filters.featured) {
      result = result.filter(p => p.featured);
    }

    // Sort
    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "popular":
        result.sort((a, b) => b.review_count - a.review_count);
        break;
      case "newest":
      default:
        // Already sorted by created_at desc
        break;
    }

    return result;
  }, [products, searchQuery, filters, sortBy]);

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingToCart(productId);
    await addToCart(productId);
    setAddingToCart(null);
  };

  const handleQuickViewAddToCart = async (productId: string, quantity: number) => {
    for (let i = 0; i < quantity; i++) {
      await addToCart(productId);
    }
    setQuickViewProduct(null);
  };

  const clearAllFilters = () => {
    setFilters({
      priceRange: [0, maxPrice],
      rating: null,
      brands: [],
      inStock: false,
      featured: false,
    });
    setSearchQuery("");
    setSelectedCategory("All");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5" />
          <div className="container mx-auto px-4 py-12 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered Marketplace
              </Badge>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
                {t("marketplace")}
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Discover {products.length.toLocaleString()}+ products with smart recommendations, 
                real-time pricing, and instant delivery tracking.
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products, brands, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg bg-card border-border shadow-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                {categories.map((category) => (
                  <motion.button
                    key={category.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                      ${selectedCategory === category.name 
                        ? "bg-secondary text-white shadow-md" 
                        : "bg-muted hover:bg-muted/80 text-foreground"
                      }
                    `}
                  >
                    {category.name === "All" ? t("all") : category.name}
                  </motion.button>
                ))}
              </div>

              {/* Right Side Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <ProductFilters
                  brands={availableBrands}
                  maxPrice={maxPrice}
                  filters={filters}
                  onFiltersChange={setFilters}
                  activeFilterCount={activeFilterCount}
                />
                
                <SortDropdown value={sortBy} onChange={setSortBy} />
                
                {/* View Toggle */}
                <div className="hidden md:flex border border-border rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-none ${viewMode === "grid" ? "bg-muted" : ""}`}
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-none ${viewMode === "list" ? "bg-muted" : ""}`}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            <AnimatePresence>
              {(activeFilterCount > 0 || searchQuery || selectedCategory !== "All") && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-2 pt-4 overflow-hidden"
                >
                  <span className="text-sm text-muted-foreground">Active:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategory !== "All" && (
                      <Badge variant="secondary" className="gap-1">
                        {selectedCategory}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => setSelectedCategory("All")} 
                        />
                      </Badge>
                    )}
                    {searchQuery && (
                      <Badge variant="secondary" className="gap-1">
                        Search: {searchQuery}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => setSearchQuery("")} 
                        />
                      </Badge>
                    )}
                    {filters.rating !== null && (
                      <Badge variant="secondary" className="gap-1">
                        {filters.rating}+ Stars
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => setFilters(prev => ({ ...prev, rating: null }))} 
                        />
                      </Badge>
                    )}
                    {filters.inStock && (
                      <Badge variant="secondary" className="gap-1">
                        In Stock
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => setFilters(prev => ({ ...prev, inStock: false }))} 
                        />
                      </Badge>
                    )}
                    {filters.featured && (
                      <Badge variant="secondary" className="gap-1">
                        Featured
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => setFilters(prev => ({ ...prev, featured: false }))} 
                        />
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-destructive hover:text-destructive/80 ml-auto"
                  >
                    Clear All
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            {/* Results Count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filteredProducts.length}</span> products
              </p>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-secondary mb-4" />
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <SlidersHorizontal className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Try adjusting your filters or search query to find what you're looking for.
                </p>
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                layout
                className={`grid gap-6 ${
                  viewMode === "grid" 
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                    : "grid-cols-1"
                }`}
              >
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={index}
                      onAddToCart={handleAddToCart}
                      onQuickView={setQuickViewProduct}
                      isAddingToCart={addingToCart === product.id}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Load More */}
            {filteredProducts.length > 0 && filteredProducts.length >= 12 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-12 text-center"
              >
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Load More Products
                </Button>
              </motion.div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Product Quick View Modal */}
      <ProductQuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleQuickViewAddToCart}
      />
    </div>
  );
};

export default Market;