import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface WishlistButtonProps {
  productId: string;
  className?: string;
  variant?: "default" | "icon";
}

const WishlistButton = ({ productId, className = "", variant = "default" }: WishlistButtonProps) => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    checkWishlist();
  }, [productId]);

  const checkWishlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    setIsInWishlist(!!data);
  };

  const toggleWishlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t("loginRequired"));
      return;
    }

    setLoading(true);

    if (isInWishlist) {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (!error) {
        setIsInWishlist(false);
        toast.success(t("removedFromWishlist"));
      }
    } else {
      const { error } = await supabase
        .from("wishlists")
        .insert({ user_id: user.id, product_id: productId });

      if (!error) {
        setIsInWishlist(true);
        toast.success(t("addedToWishlist"));
      }
    }

    setLoading(false);
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        onClick={toggleWishlist}
        disabled={loading}
      >
        <Heart
          className={`h-5 w-5 transition-colors ${isInWishlist ? "fill-red-500 text-red-500" : ""}`}
        />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      className={className}
      onClick={toggleWishlist}
      disabled={loading}
    >
      <Heart
        className={`h-4 w-4 mr-2 transition-colors ${isInWishlist ? "fill-red-500 text-red-500" : ""}`}
      />
      {isInWishlist ? t("removeFromWishlist") : t("addToWishlist")}
    </Button>
  );
};

export default WishlistButton;
