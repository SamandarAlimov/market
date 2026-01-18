import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's browsing history with product details
    const { data: browsingHistory, error: historyError } = await supabase
      .from("browsing_history")
      .select(`
        product_id,
        viewed_at,
        products (
          id,
          name,
          description,
          price,
          brand,
          category_id,
          categories (name)
        )
      `)
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(20);

    if (historyError) {
      console.error("Error fetching browsing history:", historyError);
    }

    // Fetch user's wishlist
    const { data: wishlist, error: wishlistError } = await supabase
      .from("wishlists")
      .select(`
        product_id,
        products (
          id,
          name,
          description,
          price,
          brand,
          category_id,
          categories (name)
        )
      `)
      .eq("user_id", userId)
      .limit(10);

    if (wishlistError) {
      console.error("Error fetching wishlist:", wishlistError);
    }

    // Fetch all active products for recommendations
    const { data: allProducts, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        brand,
        rating,
        review_count,
        category_id,
        categories (name),
        product_images (image_url, is_primary)
      `)
      .eq("status", "active")
      .limit(50);

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }

    // Build context for AI
    const viewedProducts = browsingHistory?.map((h: any) => ({
      name: h.products?.name,
      category: h.products?.categories?.name,
      brand: h.products?.brand,
      price: h.products?.price
    })).filter((p: any) => p.name) || [];

    const wishlistProducts = wishlist?.map((w: any) => ({
      name: w.products?.name,
      category: w.products?.categories?.name,
      brand: w.products?.brand,
      price: w.products?.price
    })).filter((p: any) => p.name) || [];

    const availableProducts = allProducts?.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.categories?.name,
      brand: p.brand,
      price: p.price,
      rating: p.rating
    })) || [];

    // Call Lovable AI to get personalized recommendations
    const systemPrompt = `You are a product recommendation AI for Alsamos Market, a B2B marketplace. 
    Based on the user's browsing history and wishlist, recommend the best products from the available catalog.
    
    Return ONLY a JSON array of product IDs that you recommend, ordered by relevance.
    Format: ["id1", "id2", "id3", ...]
    
    Consider:
    - Products similar to what they viewed
    - Products in the same categories they browse
    - Products from brands they seem to prefer
    - Price range they typically look at
    - High-rated products in their interest areas
    
    If no browsing history, recommend popular/featured products.
    Return 4-8 product IDs.`;

    const userPrompt = `
    User's Recently Viewed Products:
    ${JSON.stringify(viewedProducts, null, 2)}
    
    User's Wishlist:
    ${JSON.stringify(wishlistProducts, null, 2)}
    
    Available Products to Recommend From:
    ${JSON.stringify(availableProducts, null, 2)}
    
    Based on this data, which products should I recommend to this user? Return only the JSON array of product IDs.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", recommendedIds: [] }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted", recommendedIds: [] }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "[]";
    
    // Parse the AI response to get product IDs
    let recommendedIds: string[] = [];
    try {
      // Extract JSON array from the response
      const jsonMatch = aiContent.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        recommendedIds = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      // Fallback to random products
      recommendedIds = availableProducts.slice(0, 6).map(p => p.id);
    }

    return new Response(
      JSON.stringify({ recommendedIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in ai-recommendations:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, recommendedIds: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
