import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Package, BarChart3, Shield, Trash2, CheckCircle, XCircle, Building2, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Database } from "@/integrations/supabase/types";

type VerificationStatus = Database["public"]["Enums"]["verification_status"];

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
}

interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  created_at: string;
  seller_id: string;
}

interface CompanyProfile {
  id: string;
  company_name: string;
  user_id: string;
  verification_status: VerificationStatus;
  created_at: string;
  industry: string | null;
  country: string | null;
  registration_number: string | null;
  tax_id: string | null;
  profile?: { email: string; full_name: string | null };
}

interface CompanyDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  verified: boolean | null;
}

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, revenue: 0, pendingVerifications: 0 });
  const [selectedCompanyDocs, setSelectedCompanyDocs] = useState<CompanyDocument[]>([]);
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [companyToReject, setCompanyToReject] = useState<CompanyProfile | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast.error(t("adminAccessDenied"));
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchData();
  };

  const fetchData = async () => {
    // Fetch users with their roles
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles && roles) {
      const usersWithRoles = profiles.map(profile => ({
        ...profile,
        roles: roles.filter(r => r.user_id === profile.id).map(r => r.role)
      }));
      setUsers(usersWithRoles);
    }

    // Fetch all products (admin can see all)
    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (productsData) {
      setProducts(productsData);
    }

    // Fetch company profiles for verification
    const { data: companiesData } = await supabase
      .from("company_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (companiesData) {
      // Fetch profile info for each company
      const profileIds = companiesData.map(c => c.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", profileIds);

      const companiesWithProfiles = companiesData.map(company => ({
        ...company,
        profile: profilesData?.find(p => p.id === company.user_id)
      }));
      setCompanies(companiesWithProfiles);
    }

    // Fetch stats
    const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: productCount } = await supabase.from("products").select("*", { count: "exact", head: true });
    const { count: orderCount } = await supabase.from("orders").select("*", { count: "exact", head: true });
    const { data: revenueData } = await supabase.from("orders").select("total_amount");
    const { count: pendingCount } = await supabase
      .from("company_profiles")
      .select("*", { count: "exact", head: true })
      .in("verification_status", ["pending", "under_review"]);

    const totalRevenue = revenueData?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

    setStats({
      users: userCount || 0,
      products: productCount || 0,
      orders: orderCount || 0,
      revenue: totalRevenue,
      pendingVerifications: pendingCount || 0
    });

    setLoading(false);
  };

  const updateProductStatus = async (productId: string, status: string) => {
    const { error } = await supabase
      .from("products")
      .update({ status })
      .eq("id", productId);

    if (!error) {
      toast.success(t("productStatusUpdated"));
      fetchData();
    }
  };

  const deleteProduct = async (productId: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (!error) {
      toast.success(t("productDeleted"));
      fetchData();
    }
  };

  const updateVerificationStatus = async (companyId: string, status: VerificationStatus, reason?: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;

    const updateData: { verification_status: VerificationStatus; verified_at?: string | null; rejection_reason?: string | null } = {
      verification_status: status
    };
    
    if (status === "verified") {
      updateData.verified_at = new Date().toISOString();
      updateData.rejection_reason = null;
    } else if (status === "rejected") {
      updateData.verified_at = null;
      updateData.rejection_reason = reason || null;
    } else {
      updateData.verified_at = null;
      updateData.rejection_reason = null;
    }

    const { error } = await supabase
      .from("company_profiles")
      .update(updateData)
      .eq("id", companyId);

    if (!error) {
      toast.success(t("verificationStatusUpdated"));
      
      // Send email notification
      if (company.profile?.email) {
        try {
          await supabase.functions.invoke("send-verification-status-email", {
            body: {
              email: company.profile.email,
              companyName: company.company_name,
              status: status,
              rejectionReason: reason,
              language: "en"
            }
          });
          console.log("Verification status email sent successfully");
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError);
        }
      }
      
      fetchData();
    } else {
      toast.error(t("error"));
    }
  };

  const openRejectionDialog = (company: CompanyProfile) => {
    setCompanyToReject(company);
    setRejectionReason("");
    setRejectionDialogOpen(true);
  };

  const handleRejectWithReason = async () => {
    if (!companyToReject) return;
    
    if (!rejectionReason.trim()) {
      toast.error(t("rejectionReasonRequired"));
      return;
    }
    
    await updateVerificationStatus(companyToReject.id, "rejected", rejectionReason.trim());
    setRejectionDialogOpen(false);
    setCompanyToReject(null);
    setRejectionReason("");
  };

  const viewCompanyDocuments = async (companyId: string) => {
    const { data: docs } = await supabase
      .from("company_documents")
      .select("*")
      .eq("company_id", companyId);
    
    setSelectedCompanyDocs(docs || []);
    setDocsDialogOpen(true);
  };

  const getVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500">{t("verified")}</Badge>;
      case "rejected":
        return <Badge variant="destructive">{t("rejected")}</Badge>;
      case "under_review":
        return <Badge className="bg-yellow-500">{t("underReview")}</Badge>;
      default:
        return <Badge variant="secondary">{t("pending")}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{t("adminDashboard")}</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("totalUsers")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("totalProducts")}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.products}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("totalOrders")}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("totalRevenue")}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.revenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">{t("userManagement")}</TabsTrigger>
            <TabsTrigger value="products">{t("productModeration")}</TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center gap-2">
              {t("companyVerification")}
              {stats.pendingVerifications > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {stats.pendingVerifications}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("users")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("email")}</TableHead>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("roles")}</TableHead>
                      <TableHead>{t("joined")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.full_name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.roles.map(role => (
                              <Badge key={role} variant={role === "admin" ? "default" : "secondary"}>
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("products")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("productName")}</TableHead>
                      <TableHead>{t("price")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("created")}</TableHead>
                      <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={product.status === "active" ? "default" : "secondary"}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {product.status !== "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateProductStatus(product.id, "active")}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {product.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateProductStatus(product.id, "inactive")}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t("companyVerification")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("companyName")}</TableHead>
                      <TableHead>{t("ownerEmail")}</TableHead>
                      <TableHead>{t("industry")}</TableHead>
                      <TableHead>{t("country")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("submitted")}</TableHead>
                      <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map(company => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.company_name}</TableCell>
                        <TableCell>{company.profile?.email || "-"}</TableCell>
                        <TableCell>{company.industry || "-"}</TableCell>
                        <TableCell>{company.country || "-"}</TableCell>
                        <TableCell>{getVerificationBadge(company.verification_status)}</TableCell>
                        <TableCell>{new Date(company.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewCompanyDocuments(company.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {company.verification_status !== "verified" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => updateVerificationStatus(company.id, "verified")}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {company.verification_status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => openRejectionDialog(company)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {company.verification_status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-600 hover:text-yellow-700"
                                onClick={() => updateVerificationStatus(company.id, "under_review")}
                              >
                                {t("markUnderReview")}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {companies.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {t("noCompaniesFound")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Documents Dialog */}
        <Dialog open={docsDialogOpen} onOpenChange={setDocsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("companyDocuments")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCompanyDocs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{t("noDocumentsUploaded")}</p>
              ) : (
                selectedCompanyDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.document_name}</p>
                        <p className="text-sm text-muted-foreground">{doc.document_type}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.file_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t("viewDocument")}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Rejection Reason Dialog */}
        <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("rejectCompany")}</DialogTitle>
              <DialogDescription>
                {companyToReject?.company_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">{t("rejectionReason")}</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder={t("rejectionReasonPlaceholder")}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{rejectionReason.length}/500</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button variant="destructive" onClick={handleRejectWithReason}>
                {t("confirmRejection")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
