import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  companyName: string;
  status: "verified" | "rejected" | "under_review";
  rejectionReason?: string;
  language?: "en" | "ar" | "fr";
}

const getEmailContent = (status: string, companyName: string, language: string = "en", rejectionReason?: string) => {
  const content = {
    verified: {
      en: {
        subject: `Congratulations! ${companyName} is now verified`,
        heading: "Your Company is Verified! 🎉",
        message: `Great news! Your company <strong>${companyName}</strong> has been successfully verified on Al Samos B2B Marketplace.`,
        details: "You now have access to all verified seller features and your company badge will be displayed on your products.",
        cta: "Start selling with confidence!"
      },
      ar: {
        subject: `تهانينا! تم التحقق من ${companyName}`,
        heading: "تم التحقق من شركتك! 🎉",
        message: `أخبار رائعة! تم التحقق بنجاح من شركتك <strong>${companyName}</strong> على سوق السموس للأعمال.`,
        details: "لديك الآن حق الوصول إلى جميع ميزات البائع المعتمد وسيتم عرض شارة شركتك على منتجاتك.",
        cta: "ابدأ البيع بثقة!"
      },
      fr: {
        subject: `Félicitations! ${companyName} est maintenant vérifié`,
        heading: "Votre entreprise est vérifiée! 🎉",
        message: `Bonne nouvelle! Votre entreprise <strong>${companyName}</strong> a été vérifiée avec succès sur Al Samos B2B Marketplace.`,
        details: "Vous avez maintenant accès à toutes les fonctionnalités de vendeur vérifié et votre badge d'entreprise sera affiché sur vos produits.",
        cta: "Commencez à vendre en toute confiance!"
      }
    },
    rejected: {
      en: {
        subject: `Verification Update for ${companyName}`,
        heading: "Verification Not Approved",
        message: `Unfortunately, we were unable to verify your company <strong>${companyName}</strong> at this time.`,
        details: rejectionReason 
          ? `<strong>Reason:</strong> ${rejectionReason}` 
          : "This may be due to incomplete documentation or discrepancies in the provided information. Please review your documents and resubmit for verification.",
        cta: "Update your documents and try again."
      },
      ar: {
        subject: `تحديث التحقق لـ ${companyName}`,
        heading: "لم يتم الموافقة على التحقق",
        message: `للأسف، لم نتمكن من التحقق من شركتك <strong>${companyName}</strong> في هذا الوقت.`,
        details: rejectionReason 
          ? `<strong>السبب:</strong> ${rejectionReason}` 
          : "قد يكون ذلك بسبب وثائق غير مكتملة أو تناقضات في المعلومات المقدمة. يرجى مراجعة مستنداتك وإعادة تقديمها للتحقق.",
        cta: "قم بتحديث مستنداتك وحاول مرة أخرى."
      },
      fr: {
        subject: `Mise à jour de vérification pour ${companyName}`,
        heading: "Vérification non approuvée",
        message: `Malheureusement, nous n'avons pas pu vérifier votre entreprise <strong>${companyName}</strong> pour le moment.`,
        details: rejectionReason 
          ? `<strong>Raison:</strong> ${rejectionReason}` 
          : "Cela peut être dû à une documentation incomplète ou à des divergences dans les informations fournies. Veuillez revoir vos documents et soumettre à nouveau.",
        cta: "Mettez à jour vos documents et réessayez."
      }
    },
    under_review: {
      en: {
        subject: `${companyName} Verification is Under Review`,
        heading: "Your Application is Being Reviewed 📋",
        message: `Your verification request for <strong>${companyName}</strong> is now being reviewed by our team.`,
        details: "We typically complete reviews within 2-3 business days. You will receive an email once the review is complete.",
        cta: "Thank you for your patience!"
      },
      ar: {
        subject: `${companyName} التحقق قيد المراجعة`,
        heading: "طلبك قيد المراجعة 📋",
        message: `طلب التحقق الخاص بك لـ <strong>${companyName}</strong> يتم مراجعته الآن من قبل فريقنا.`,
        details: "عادةً ما نكمل المراجعات خلال 2-3 أيام عمل. ستتلقى بريدًا إلكترونيًا بمجرد اكتمال المراجعة.",
        cta: "شكراً لصبركم!"
      },
      fr: {
        subject: `La vérification de ${companyName} est en cours d'examen`,
        heading: "Votre demande est en cours d'examen 📋",
        message: `Votre demande de vérification pour <strong>${companyName}</strong> est actuellement examinée par notre équipe.`,
        details: "Nous terminons généralement les examens dans les 2-3 jours ouvrables. Vous recevrez un email une fois l'examen terminé.",
        cta: "Merci de votre patience!"
      }
    }
  };

  const statusContent = content[status as keyof typeof content];
  return statusContent?.[language as keyof typeof statusContent] || statusContent?.en;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "verified": return "#22c55e";
    case "rejected": return "#ef4444";
    case "under_review": return "#eab308";
    default: return "#6b7280";
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, companyName, status, rejectionReason, language = "en" }: VerificationEmailRequest = await req.json();

    console.log(`Sending verification email to ${email} for company ${companyName} with status ${status}`);

    const emailContent = getEmailContent(status, companyName, language, rejectionReason);
    const statusColor = getStatusColor(status);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Al Samos B2B <onboarding@resend.dev>",
        to: [email],
        subject: emailContent.subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="width: 60px; height: 60px; background-color: ${statusColor}; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 28px;">${status === 'verified' ? '✓' : status === 'rejected' ? '✕' : '⏳'}</span>
                  </div>
                  <h1 style="color: #18181b; font-size: 24px; margin: 0;">${emailContent.heading}</h1>
                </div>
                
                <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  ${emailContent.message}
                </p>
                
                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
                  ${emailContent.details}
                </p>
                
                <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center;">
                  <p style="color: #18181b; font-weight: 600; margin: 0;">${emailContent.cta}</p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
                
                <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
                  © ${new Date().getFullYear()} Al Samos B2B Marketplace. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const responseData = await emailResponse.json();

    console.log("Email sent successfully:", responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
