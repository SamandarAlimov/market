import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PromoEmailRequest {
  sellerId: string;
  subject: string;
  title: string;
  message: string;
  productIds?: string[];
  promoType: "new_product" | "sale" | "general";
}

const sendEmail = async (to: string, subject: string, html: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Alsamos Market <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  return response;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sellerId, subject, title, message, productIds, promoType }: PromoEmailRequest = await req.json();

    console.log("Received promo email request:", { sellerId, subject, promoType });

    const { data: sellerProfile, error: sellerError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", sellerId)
      .single();

    if (sellerError) {
      console.error("Error fetching seller:", sellerError);
      throw new Error("Seller not found");
    }

    let productHtml = "";
    if (productIds && productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select(`id, name, price, product_images (image_url, is_primary)`)
        .in("id", productIds);

      if (products) {
        productHtml = `
          <div style="margin: 20px 0;">
            <h3 style="color: #1e3a5f; margin-bottom: 15px;">Featured Products</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${products.map(p => {
                const primaryImg = p.product_images?.find((img: any) => img.is_primary);
                const imgUrl = primaryImg?.image_url || p.product_images?.[0]?.image_url || "";
                return `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">
                      ${imgUrl ? `<img src="${imgUrl}" alt="${p.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />` : ""}
                    </td>
                    <td style="padding: 10px;"><strong style="color: #1e3a5f;">${p.name}</strong></td>
                    <td style="padding: 10px; text-align: right;"><span style="color: #059669; font-weight: bold;">$${p.price.toFixed(2)}</span></td>
                  </tr>
                `;
              }).join("")}
            </table>
          </div>
        `;
      }
    }

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("order_id")
      .eq("seller_id", sellerId);

    if (!orderItems || orderItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No customers to send emails to", sentCount: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const orderIds = [...new Set(orderItems.map(item => item.order_id))];

    const { data: orders } = await supabase
      .from("orders")
      .select("buyer_id")
      .in("id", orderIds);

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No customers to send emails to", sentCount: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const buyerIds = [...new Set(orders.map(order => order.buyer_id))];

    const { data: customers } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", buyerIds);

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No customers to send emails to", sentCount: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending promo emails to ${customers.length} customers`);

    // Create notifications for each customer
    for (const customer of customers) {
      await supabase.from("notifications").insert({
        user_id: customer.id,
        title: title,
        message: message,
        type: "promotion",
        link: "/market"
      });
    }

    // Send emails
    let sentCount = 0;
    for (const customer of customers) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e3a5f; margin: 0;">Alsamos</h1>
              <p style="color: #666; font-size: 12px; margin: 5px 0;">MAKE IT REAL</p>
            </div>
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #059669 100%); padding: 30px; border-radius: 12px; color: white; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0;">${title}</h2>
              <p style="margin: 0; opacity: 0.9;">From ${sellerProfile.full_name || "A Trusted Seller"}</p>
            </div>
            <div style="padding: 20px; background: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0;">Hi ${customer.full_name || "Valued Customer"},</p>
              <p>${message}</p>
            </div>
            ${productHtml}
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://market.alsamos.com/market" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #059669 100%); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Shop Now</a>
            </div>
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
              <p>Alsamos Market — Discover, Shop, Sell, AI-powered.</p>
              <p>© 2024 Alsamos Corporation. All rights reserved.</p>
              <p><a href="mailto:alsamos.company@gmail.com" style="color: #1e3a5f;">alsamos.company@gmail.com</a> | <a href="tel:+998933007709" style="color: #1e3a5f;">+998 93 300 77 09</a></p>
            </div>
          </body>
          </html>
        `;
        await sendEmail(customer.email, subject, emailHtml);
        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${customer.email}:`, emailError);
      }
    }

    console.log(`Successfully sent ${sentCount} promo emails`);

    return new Response(
      JSON.stringify({ success: true, sentCount, totalCustomers: customers.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-promo-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);