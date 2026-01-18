import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { NavLink } from "@/components/NavLink";
import { Search as SearchIcon, Star, Filter, X, Loader2, ShoppingCart, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  rating: number | null;
  review_count: number | null;
  stock: number;
  brand: string | null;
  featured: boolean | null;
  category_id: string | null;
  product_images: { image_url: string; is_primary: boolean }[];
  categories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const { toast } = useToast();

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [minRating, setMinRating] = useState(searchParams.get("rating") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "relevance");

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, priceRange, minRating, sortBy, searchQuery]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from("products")
      .select(`
        id, name, price, rating, review_count, stock, brand, featured, category_id,
        product_images (image_url, is_primary),
        categories (name)
      `)
      .eq("status", "active")
      .gte("price", priceRange[0])
      .lte("price", priceRange[1]);

    // Search query filter
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`);
    }

    // Category filter
    if (selectedCategory && selectedCategory !== "all") {
      query = query.eq("category_id", selectedCategory);
    }

    // Rating filter
    if (minRating && minRating !== "all") {
      query = query.gte("rating", parseFloat(minRating));
    }

    // Sorting
    switch (sortBy) {
      case "price-low":
        query = query.order("price", { ascending: true });
        break;
      case "price-high":
        query = query.order("price", { ascending: false });
        break;
      case "rating":
        query = query.order("rating", { ascending: false, nullsFirst: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      default:
        query = query.order("featured", { ascending: false }).order("rating", { ascending: false, nullsFirst: false });
    }

    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }
    setIsLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: searchQuery });
    fetchProducts();
  };

  const handleAddToCart = async (productId: string) => {
    await addToCart(productId, 1);
    toast({
      title: t("addedToCart"),
      description: t("itemAddedSuccessfully"),
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setPriceRange([0, 10000]);
    setMinRating("all");
    setSortBy("relevance");
    setSearchParams({});
  };

  const getProductImage = (product: Product) => {
    const primaryImage = product.product_images?.find(img => img.is_primary);
    return primaryImage?.image_url || product.product_images?.[0]?.image_url || "/placeholder.svg";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="font-display text-4xl font-bold text-foreground mb-4">
              {t("searchProducts") || "Search Products"}
            </h1>
            <form onSubmit={handleSearch} className="flex gap-4 max-w-2xl">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("searchPlaceholder") || "Search products, brands, categories..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <Button type="submit" size="lg" className="gap-2">
                <SearchIcon className="h-5 w-5" />
                {t("search") || "Search"}
              </Button>
            </form>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className={`lg:w-72 shrink-0 ${showFilters ? "block" : "hidden lg:block"}`}>
              <Card className="p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    {t("filters")}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    {t("clearAll") || "Clear All"}
                  </Button>
                </div>

                {/* Category Filter */}
                <div className="space-y-4 mb-6">
                  <Label>{t("category") || "Category"}</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("all")}</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-4 mb-6">
                  <Label>{t("priceRange") || "Price Range"}</Label>
                  <div className="px-2">
                    <Slider
                      value={priceRange}
                      min={0}
                      max={10000}
                      step={50}
                      onValueChange={(value) => setPriceRange(value as [number, number])}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="space-y-4 mb-6">
                  <Label>{t("minimumRating") || "Minimum Rating"}</Label>
                  <Select value={minRating} onValueChange={setMinRating}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("all")}</SelectItem>
                      <SelectItem value="4">4+ ★</SelectItem>
                      <SelectItem value="3">3+ ★</SelectItem>
                      <SelectItem value="2">2+ ★</SelectItem>
                      <SelectItem value="1">1+ ★</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-4">
                  <Label>{t("sortBy") || "Sort By"}</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">{t("relevance") || "Relevance"}</SelectItem>
                      <SelectItem value="price-low">{t("priceLowHigh") || "Price: Low to High"}</SelectItem>
                      <SelectItem value="price-high">{t("priceHighLow") || "Price: High to Low"}</SelectItem>
                      <SelectItem value="rating">{t("topRated") || "Top Rated"}</SelectItem>
                      <SelectItem value="newest">{t("newest") || "Newest"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            </aside>

            {/* Results Section */}
            <div className="flex-1">
              {/* Mobile Filter Toggle */}
              <div className="lg:hidden mb-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>
              </div>

              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("searching") || "Searching..."}
                    </span>
                  ) : (
                    <>
                      {products.length} {t("productsFound") || "products found"}
                      {searchQuery && (
                        <span className="ml-1">
                          {t("for") || "for"} "<strong>{searchQuery}</strong>"
                        </span>
                      )}
                    </>
                  )}
                </p>
                {searchQuery && (
                  <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                    <X className="h-4 w-4 mr-1" />
                    {t("clearSearch") || "Clear Search"}
                  </Button>
                )}
              </div>

              {/* Product Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="aspect-square bg-muted" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <Card className="p-12 text-center">
                  <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">
                    {t("noProductsFound") || "No products found"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("tryDifferentSearch") || "Try adjusting your search or filters"}
                  </p>
                  <Button onClick={clearFilters}>
                    {t("clearFilters") || "Clear Filters"}
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                      <NavLink to={`/market/${product.id}`} className="block">
                        <div className="relative aspect-square overflow-hidden">
                          <img 
                            src={getProductImage(product)} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {product.featured && (
                            <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {t("featured")}
                            </Badge>
                          )}
                          {product.stock > 0 && product.stock <= 5 && (
                            <Badge variant="destructive" className="absolute top-2 right-2">
                              {t("lowStock")}
                            </Badge>
                          )}
                        </div>
                      </NavLink>
                      <div className="p-4">
                        <NavLink to={`/market/${product.id}`}>
                          <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-secondary transition-colors">
                            {product.name}
                          </h3>
                        </NavLink>
                        {product.categories && (
                          <p className="text-xs text-muted-foreground mb-2">{product.categories.name}</p>
                        )}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center text-amber-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="ml-1 text-sm font-medium">
                              {product.rating?.toFixed(1) || "N/A"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            ({product.review_count || 0})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-primary">
                            ${product.price.toFixed(2)}
                          </span>
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.preventDefault();
                              handleAddToCart(product.id);
                            }}
                            disabled={product.stock === 0}
                            className="gap-1"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            {t("add")}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Search;