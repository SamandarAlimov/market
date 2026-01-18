import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBrowsingHistory = (productId: string | undefined) => {
  useEffect(() => {
    if (!productId) return;

    const trackView = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert browsing history entry
      await supabase.from("browsing_history").insert({
        user_id: user.id,
        product_id: productId,
      });
    };

    trackView();
  }, [productId]);
};

export const trackProductView = async (productId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("browsing_history").insert({
    user_id: user.id,
    product_id: productId,
  });
};
