import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, TrendingUp, DollarSign, Loader2, Upload, X, Image, ShoppingBag, Truck, CheckCircle, Clock, XCircle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  tracking_number: string | null;
  created_at: string;
  buyer: {
    full_name: string | null;
    email: string;
  } | null;
  items: {
    id: string;
    quantity: number;
    price: number;
    product: {
      name: string;
    } | null;
  }[];
}

const SellerDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productBrand, setProductBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchCategories();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    // Check if user is a seller
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const hasSellerRole = roles?.some((r) => r.role === "seller");
    setIsSeller(hasSellerRole);

    if (!hasSellerRole) {
      toast({
        title: "Access Denied",
        description: "You need a seller account to access this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchProducts(session.user.id);
    fetchOrders(session.user.id);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    
    if (data) setCategories(data);
  };

  const fetchProducts = async (userId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, stock, status, created_at")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching products",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProducts(data || []);
    }
    setIsLoading(false);
  };

  const fetchOrders = async (userId: string) => {
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        price,
        order_id,
        product:products(name)
      `)
      .eq("seller_id", userId);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
      return;
    }

    if (!orderItems || orderItems.length === 0) {
      setOrders([]);
      return;
    }

    const orderIds = [...new Set(orderItems.map(item => item.order_id))];

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, status, total_amount, shipping_address, tracking_number, created_at, buyer_id")
      .in("id", orderIds)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return;
    }

    const buyerIds = [...new Set(ordersData?.map(o => o.buyer_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", buyerIds);

    const formattedOrders: Order[] = (ordersData || []).map(order => ({
      ...order,
      buyer: profiles?.find(p => p.id === order.buyer_id) || null,
      items: orderItems
        .filter(item => item.order_id === order.id)
        .map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          product: item.product
        }))
    }));

    setOrders(formattedOrders);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    
    const order = orders.find(o => o.id === orderId);
    
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Error updating order",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Order updated",
        description: `Order status changed to ${newStatus}`,
      });
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));

      // Send email notification to buyer
      if (order?.buyer?.email) {
        try {
          await supabase.functions.invoke("send-order-status-email", {
            body: {
              buyerEmail: order.buyer.email,
              buyerName: order.buyer.full_name || "Customer",
              orderId: orderId,
              newStatus: newStatus,
              items: order.items.map(item => ({
                name: item.product?.name || "Unknown Product",
                quantity: item.quantity,
                price: item.price
              }))
            }
          });
          console.log("Order status email sent");
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      }
    }
    
    setUpdatingOrderId(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
      processing: { variant: "secondary", icon: <Package className="h-3 w-3" /> },
      shipped: { variant: "default", icon: <Truck className="h-3 w-3" /> },
      delivered: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 capitalize">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast({
        title: "Too many images",
        description: "You can upload a maximum of 5 images per product",
        variant: "destructive",
      });
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (productId: string): Promise<string[]> => {
    const imageUrls: string[] = [];
    
    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}-${i}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }
      
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);
      
      imageUrls.push(data.publicUrl);
    }
    
    return imageUrls;
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Insert product first
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          seller_id: user.id,
          name: productName,
          description: productDescription,
          price: parseFloat(productPrice),
          stock: parseInt(productStock),
          brand: productBrand,
          category_id: selectedCategory || null,
          status: "active",
        })
        .select()
        .single();

      if (productError) throw productError;

      // Upload images if any
      if (selectedImages.length > 0) {
        setUploadingImages(true);
        const imageUrls = await uploadImages(product.id);
        
        // Insert image records
        for (let i = 0; i < imageUrls.length; i++) {
          await supabase.from("product_images").insert({
            product_id: product.id,
            image_url: imageUrls[i],
            is_primary: i === 0,
            display_order: i,
          });
        }
        setUploadingImages(false);
      }

      toast({
        title: "Product added!",
        description: "Your product has been successfully listed.",
      });

      // Reset form
      setProductName("");
      setProductDescription("");
      setProductPrice("");
      setProductStock("");
      setProductBrand("");
      setSelectedCategory("");
      setSelectedImages([]);

      // Refresh products
      fetchProducts(user.id);
    } catch (error: any) {
      toast({
        title: "Error adding product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setUploadingImages(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-4xl font-bold text-foreground mb-2">
                Seller Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage your products and track your sales
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold text-foreground">{products.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg gradient-secondary flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Listings</p>
                  <p className="text-2xl font-bold text-foreground">
                    {products.filter((p) => p.status === "active").length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg gradient-accent flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue (Soon)</p>
                  <p className="text-2xl font-bold text-foreground">$0.00</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList>
              <TabsTrigger value="products">My Products</TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-1">
                <ShoppingBag className="h-4 w-4" />
                Orders
                {orders.filter(o => o.status === "pending").length > 0 && (
                  <span className="ml-1 h-5 w-5 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
                    {orders.filter(o => o.status === "pending").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="add">Add Product</TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              {products.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No products yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding your first product to the marketplace
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="p-4">
                      <h3 className="font-semibold text-foreground mb-2">{product.name}</h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          Price: <span className="font-semibold text-foreground">${product.price}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Stock: <span className="font-semibold text-foreground">{product.stock}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Status: <span className="font-semibold text-foreground capitalize">{product.status}</span>
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders">
              {orders.length === 0 ? (
                <Card className="p-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No orders yet</h3>
                  <p className="text-muted-foreground">
                    When customers purchase your products, orders will appear here
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground">
                              Order #{order.id.slice(0, 8)}
                            </h3>
                            {getStatusBadge(order.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()} at{" "}
                            {new Date(order.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateOrderStatus(order.id, value)}
                            disabled={updatingOrderId === order.id}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          {updatingOrderId === order.id && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">Customer</p>
                          <p className="text-sm text-muted-foreground">
                            {order.buyer?.full_name || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.buyer?.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">Shipping Address</p>
                          <p className="text-sm text-muted-foreground">
                            {order.shipping_address}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-border pt-4">
                        <p className="text-sm font-medium text-foreground mb-2">Order Items</p>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {item.product?.name || "Unknown Product"} x{item.quantity}
                              </span>
                              <span className="font-medium text-foreground">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between mt-3 pt-3 border-t border-border">
                          <span className="font-medium text-foreground">Your Items Total</span>
                          <span className="font-bold text-foreground">
                            ${order.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="add">
              <Card className="p-6">
                <form onSubmit={handleAddProduct} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="product-name">Product Name *</Label>
                      <Input
                        id="product-name"
                        placeholder="Premium Wireless Headphones"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-brand">Brand</Label>
                      <Input
                        id="product-brand"
                        placeholder="TechAudio Pro"
                        value={productBrand}
                        onChange={(e) => setProductBrand(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-price">Price ($) *</Label>
                      <Input
                        id="product-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="299.99"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-stock">Stock *</Label>
                      <Input
                        id="product-stock"
                        type="number"
                        min="0"
                        placeholder="100"
                        value={productStock}
                        onChange={(e) => setProductStock(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-category">Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-description">Description</Label>
                    <Textarea
                      id="product-description"
                      placeholder="Describe your product in detail..."
                      rows={4}
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                    />
                  </div>

                  {/* Image Upload Section */}
                  <div className="space-y-4">
                    <Label>Product Images (Max 5)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <Image className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop images or click to upload
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                      </Button>
                    </div>

                    {selectedImages.length > 0 && (
                      <div className="grid grid-cols-5 gap-4">
                        {selectedImages.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full aspect-square object-cover rounded-lg border border-border"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            {index === 0 && (
                              <span className="absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {uploadingImages ? "Uploading Images..." : "Adding Product..."}
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5" />
                          Add Product
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SellerDashboard;
