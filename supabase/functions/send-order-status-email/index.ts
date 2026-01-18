import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderStatusEmailRequest {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  newStatus: string;
  items: { name: string; quantity: number; price: number }[];
}

const getStatusMessage = (status: string): { subject: string; heading: string; message: string; color: string } => {
  const statusConfig: Record<string, { subject: string; heading: string; message: string; color: string }> = {
    processing: {
      subject: "Your order is being processed",
      heading: "Order Processing! 📦",
      message: "Great news! Your order is now being prepared by the seller. We'll notify you once it ships.",
      color: "#3b82f6"
    },
    shipped: {
      subject: "Your order has been shipped",
      heading: "Order Shipped! 🚚",
      message: "Your order is on its way! You'll receive it soon. Track your package for real-time updates.",
      color: "#8b5cf6"
    },
    delivered: {
      subject: "Your order has been delivered",
      heading: "Order Delivered! ✅",
      message: "Your order has been successfully delivered. We hope you love your purchase!",
      color: "#22c55e"
    },
    cancelled: {
      subject: "Your order has been cancelled",
      heading: "Order Cancelled ❌",
      message: "Unfortunately, your order has been cancelled. If you have any questions, please contact support.",
      color: "#ef4444"
    },
    pending: {
      subject: "Order status update",
      heading: "Order Update 📋",
      message: "Your order status has been updated to pending.",
      color: "#f59e0b"
    }
  };

  return statusConfig[status] || statusConfig.pending;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Order status email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { buyerEmail, buyerName, orderId, newStatus, items }: OrderStatusEmailRequest = await req.json();
    
    console.log(`Sending order status email to ${buyerEmail} for order ${orderId}, status: ${newStatus}`);

    const statusInfo = getStatusMessage(newStatus);
    const shortOrderId = orderId.slice(0, 8).toUpperCase();

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <div style="background: ${statusInfo.color}; padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
                  ${statusInfo.heading}
                </h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                  Hi ${buyerName || 'there'},
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                  ${statusInfo.message}
                </p>
                
                <!-- Order Info -->
                <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Order Number</p>
                  <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">#${shortOrderId}</p>
                </div>

                <!-- Order Items -->
                <h3 style="color: #111827; font-size: 16px; margin: 0 0 16px;">Order Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                  <thead>
                    <tr style="background: #f9fafb;">
                      <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase;">Item</th>
                      <th style="padding: 12px; text-align: center; color: #6b7280; font-size: 12px; text-transform: uppercase;">Qty</th>
                      <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 12px; text-transform: uppercase;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" style="padding: 12px; font-weight: 600; color: #111827;">Total</td>
                      <td style="padding: 12px; text-align: right; font-weight: 600; color: #111827;">$${totalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                  Thank you for shopping with Alsamos!
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © 2026 Alsamos. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Alsamos <onboarding@resend.dev>",
        to: [buyerEmail],
        subject: `${statusInfo.subject} - Order #${shortOrderId}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending order status email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
