import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Filter, 
  X, 
  Star, 
  DollarSign, 
  Tag, 
  Sparkles,
  RotateCcw
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface FilterState {
  priceRange: [number, number];
  rating: number | null;
  brands: string[];
  inStock: boolean;
  featured: boolean;
}

interface ProductFiltersProps {
  brands: string[];
  maxPrice: number;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  activeFilterCount: number;
}

const ProductFilters = ({
  brands,
  maxPrice,
  filters,
  onFiltersChange,
  activeFilterCount,
}: ProductFiltersProps) => {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      priceRange: [0, maxPrice],
      rating: null,
      brands: [],
      inStock: false,
      featured: false,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const handleBrandToggle = (brand: string) => {
    setLocalFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand]
    }));
  };

  const handleRatingSelect = (rating: number) => {
    setLocalFilters(prev => ({
      ...prev,
      rating: prev.rating === rating ? null : rating
    }));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Filter className="h-4 w-4" />
          Filters
          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-secondary text-white text-xs flex items-center justify-center font-medium"
              >
                {activeFilterCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-secondary" />
            Advanced Filters
          </SheetTitle>
          <SheetDescription>
            Refine your search to find exactly what you need
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4 mt-6">
          <div className="space-y-6">
            {/* Price Range */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Price Range</Label>
              </div>
              <div className="px-2">
                <Slider
                  value={localFilters.priceRange}
                  onValueChange={(value) => setLocalFilters(prev => ({
                    ...prev,
                    priceRange: value as [number, number]
                  }))}
                  max={maxPrice}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>${localFilters.priceRange[0]}</span>
                  <span>${localFilters.priceRange[1]}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Rating Filter */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Minimum Rating</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {[4, 3, 2, 1].map((rating) => (
                  <Button
                    key={rating}
                    variant={localFilters.rating === rating ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleRatingSelect(rating)}
                    className="gap-1"
                  >
                    {rating}+ <Star className="h-3 w-3 fill-accent text-accent" />
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Brands */}
            {brands.length > 0 && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Brands</Label>
                  </div>
                  <div className="space-y-3">
                    {brands.map((brand) => (
                      <div key={brand} className="flex items-center space-x-3">
                        <Checkbox
                          id={`brand-${brand}`}
                          checked={localFilters.brands.includes(brand)}
                          onCheckedChange={() => handleBrandToggle(brand)}
                        />
                        <Label
                          htmlFor={`brand-${brand}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {brand}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Quick Filters */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Quick Filters</Label>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="in-stock"
                    checked={localFilters.inStock}
                    onCheckedChange={(checked) => setLocalFilters(prev => ({
                      ...prev,
                      inStock: checked as boolean
                    }))}
                  />
                  <Label htmlFor="in-stock" className="text-sm font-normal cursor-pointer">
                    In Stock Only
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="featured"
                    checked={localFilters.featured}
                    onCheckedChange={(checked) => setLocalFilters(prev => ({
                      ...prev,
                      featured: checked as boolean
                    }))}
                  />
                  <Label htmlFor="featured" className="text-sm font-normal cursor-pointer">
                    Featured Products
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleApply} className="flex-1 bg-secondary hover:bg-secondary/90">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default ProductFilters;