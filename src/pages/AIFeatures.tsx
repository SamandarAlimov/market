import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageSquare, TrendingUp, ImagePlus, Search, ShieldCheck, BarChart3, Zap } from "lucide-react";

const AIFeatures = () => {
  const features = [
    {
      icon: Sparkles,
      title: "Personalized Recommendations",
      description: "AI-powered product suggestions tailored to your shopping preferences and browsing history",
      status: "Active",
      category: "Shopping"
    },
    {
      icon: MessageSquare,
      title: "AI Shopping Assistant",
      description: "24/7 intelligent chatbot to help you find products, answer questions, and guide your purchases",
      status: "Active",
      category: "Support"
    },
    {
      icon: TrendingUp,
      title: "Demand Prediction",
      description: "Smart forecasting for sellers to optimize inventory and pricing based on market trends",
      status: "Active",
      category: "Seller Tools"
    },
    {
      icon: ImagePlus,
      title: "Visual Enhancement",
      description: "Automatic image optimization, background removal, and professional photo enhancement",
      status: "Coming Soon",
      category: "Product Tools"
    },
    {
      icon: Search,
      title: "Semantic Search",
      description: "Natural language search that understands context and intent for better product discovery",
      status: "Active",
      category: "Shopping"
    },
    {
      icon: ShieldCheck,
      title: "Fraud Detection",
      description: "Advanced AI security monitoring to protect buyers and sellers from fraudulent activities",
      status: "Active",
      category: "Security"
    },
    {
      icon: BarChart3,
      title: "Smart Analytics",
      description: "Comprehensive insights and data visualization for sellers to track performance",
      status: "Coming Soon",
      category: "Analytics"
    },
    {
      icon: Zap,
      title: "Auto-Generated Descriptions",
      description: "AI-generated product descriptions and captions optimized for search and engagement",
      status: "Active",
      category: "Product Tools"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-secondary/5 to-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Intelligent Shopping Experience
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover how artificial intelligence transforms every aspect of your shopping journey—from personalized recommendations to fraud protection
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="group hover:shadow-2xl transition-all duration-300 border-border/50 hover:border-primary/50 bg-card/50 backdrop-blur-sm"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <Badge variant={feature.status === "Active" ? "default" : "secondary"}>
                        {feature.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {feature.category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CTA Section */}
          <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Experience AI-Powered Shopping
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join thousands of users who trust our AI to enhance their shopping experience with personalized recommendations and intelligent insights
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <a href="/market" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
                  <Search className="w-4 h-4" />
                  Start Shopping
                </a>
                <a href="/auth" className="inline-flex items-center gap-2 bg-background text-foreground border border-border px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors">
                  <Sparkles className="w-4 h-4" />
                  Become a Seller
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIFeatures;
