import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ArrowLeft,
  RefreshCw,
  Bell,
  Copy,
  ExternalLink,
  CircleDot,
  PackageCheck,
  ClipboardList,
  Loader2
} from "lucide-react";

interface Order {
  id: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    price: number;
  } | null;
}

const ORDER_STATUSES = [
  { key: "pending", label: "Order Placed", icon: ClipboardList, description: "Your order has been received" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2, description: "Order confirmed by seller" },
  { key: "processing", label: "Processing", icon: Package, description: "Preparing your order" },
  { key: "shipped", label: "Shipped", icon: Truck, description: "On the way to you" },
  { key: "delivered", label: "Delivered", icon: PackageCheck, description: "Order delivered" },
];

const OrderTracking = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusHistory, setStatusHistory] = useState<{ status: string; timestamp: string }[]>([]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      setupRealtimeSubscription();
    }

    return () => {
      supabase.removeAllChannels();
    };
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      toast({
        title: "Error",
        description: "Could not fetch order details",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setOrder(orderData);

    // Fetch order items with product details
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        price,
        product:products (
          id,
          name,
          price
        )
      `)
      .eq("order_id", orderId);

    if (!itemsError && itemsData) {
      setOrderItems(itemsData as unknown as OrderItem[]);
    }

    // Build status history from order data
    buildStatusHistory(orderData);
    
    setLoading(false);
  };

  const buildStatusHistory = (orderData: Order) => {
    const history: { status: string; timestamp: string }[] = [
      { status: "pending", timestamp: orderData.created_at }
    ];
    
    const statusIndex = ORDER_STATUSES.findIndex(s => s.key === orderData.status);
    
    // Simulate historical statuses based on current status
    if (statusIndex > 0) {
      const createdDate = new Date(orderData.created_at);
      for (let i = 1; i <= statusIndex; i++) {
        const timestamp = new Date(createdDate.getTime() + i * 3600000); // Add hours
        history.push({ 
          status: ORDER_STATUSES[i].key, 
          timestamp: timestamp.toISOString() 
        });
      }
    }
    
    setStatusHistory(history);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Order updated:', payload);
          const newOrder = payload.new as Order;
          setOrder(newOrder);
          buildStatusHistory(newOrder);
          
          // Show notification for status change
          const statusInfo = ORDER_STATUSES.find(s => s.key === newOrder.status);
          toast({
            title: "Order Status Updated! 🎉",
            description: `Your order is now: ${statusInfo?.label || newOrder.status}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const copyTrackingNumber = () => {
    if (order?.tracking_number) {
      navigator.clipboard.writeText(order.tracking_number);
      toast({
        title: "Copied!",
        description: "Tracking number copied to clipboard",
      });
    }
  };

  const getCurrentStatusIndex = () => {
    if (!order) return 0;
    return ORDER_STATUSES.findIndex(s => s.key === order.status);
  };

  const getStatusColor = (statusKey: string, currentIndex: number) => {
    const statusIndex = ORDER_STATUSES.findIndex(s => s.key === statusKey);
    if (statusIndex < currentIndex) return "text-secondary bg-secondary/10";
    if (statusIndex === currentIndex) return "text-secondary bg-secondary";
    return "text-muted-foreground bg-muted";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find the order you're looking for.
            </p>
            <Button onClick={() => navigate("/profile")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex();

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-muted-foreground">
              Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={`px-4 py-2 text-sm font-medium ${
                order.status === 'delivered' ? 'bg-secondary/10 text-secondary border-secondary/30' :
                order.status === 'shipped' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                order.status === 'processing' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                'bg-muted text-muted-foreground'
              }`}
            >
              <CircleDot className="h-3 w-3 mr-2 animate-pulse" />
              {ORDER_STATUSES.find(s => s.key === order.status)?.label || order.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchOrder}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Tracker */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-secondary" />
                  Order Progress
                </h2>
                
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
                  <div 
                    className="absolute left-6 top-0 w-0.5 bg-secondary transition-all duration-500"
                    style={{ 
                      height: `${(currentStatusIndex / (ORDER_STATUSES.length - 1)) * 100}%` 
                    }}
                  />
                  
                  {/* Status Steps */}
                  <div className="space-y-8">
                    {ORDER_STATUSES.map((status, index) => {
                      const isCompleted = index < currentStatusIndex;
                      const isCurrent = index === currentStatusIndex;
                      const StatusIcon = status.icon;
                      
                      return (
                        <motion.div
                          key={status.key}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-start gap-4 relative"
                        >
                          <div 
                            className={`relative z-10 h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                              isCompleted || isCurrent 
                                ? 'bg-secondary text-white shadow-lg shadow-secondary/30' 
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {isCurrent && (
                              <span className="absolute inset-0 rounded-full animate-ping bg-secondary/40" />
                            )}
                            <StatusIcon className="h-5 w-5 relative z-10" />
                          </div>
                          
                          <div className="flex-1 pt-1">
                            <h3 className={`font-semibold ${
                              isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {status.label}
                            </h3>
                            <p className="text-sm text-muted-foreground">{status.description}</p>
                            {(isCompleted || isCurrent) && statusHistory.find(h => h.status === status.key) && (
                              <p className="text-xs text-secondary mt-1">
                                {new Date(statusHistory.find(h => h.status === status.key)!.timestamp).toLocaleString()}
                              </p>
                            )}
                          </div>
                          
                          {isCurrent && (
                            <Badge className="bg-secondary/10 text-secondary border-secondary/30">
                              Current
                            </Badge>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Order Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-secondary" />
                  Order Items ({orderItems.length})
                </h2>
                
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.product?.name || 'Product'}</h3>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">${Number(item.price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tracking Info */}
            {order.tracking_number && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-secondary" />
                    Tracking Information
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tracking Number</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm font-mono">
                          {order.tracking_number}
                        </code>
                        <Button size="icon" variant="ghost" onClick={copyTrackingNumber}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Button className="w-full" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Track with Carrier
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Shipping Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-secondary" />
                  Shipping Address
                </h2>
                <p className="text-muted-foreground whitespace-pre-line">
                  {order.shipping_address}
                </p>
              </Card>
            </motion.div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${(Number(order.total_amount) * 0.9).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${(Number(order.total_amount) * 0.1).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-secondary">${Number(order.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Need Help */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="p-6 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
                <h2 className="text-lg font-semibold mb-2">Need Help?</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Contact our support team for any questions about your order.
                </p>
                <Button variant="secondary" className="w-full">
                  <Bell className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderTracking;
