import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle,
  Trash2,
  Loader2,
  Camera
} from "lucide-react";

interface CompanyProfile {
  id: string;
  company_name: string;
  registration_number: string | null;
  tax_id: string | null;
  industry: string | null;
  company_size: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  description: string | null;
  logo_url: string | null;
  verification_status: 'pending' | 'under_review' | 'verified' | 'rejected';
}

interface CompanyDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  uploaded_at: string;
  verified: boolean;
}

const industries = [
  "Technology",
  "Manufacturing",
  "Retail",
  "Healthcare",
  "Finance",
  "Construction",
  "Agriculture",
  "Transportation",
  "Education",
  "Other"
];

const companySizes = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees"
];

const documentTypes = [
  { value: "business_license", label: "Business License" },
  { value: "tax_certificate", label: "Tax Certificate" },
  { value: "registration_certificate", label: "Registration Certificate" },
  { value: "other", label: "Other Document" }
];

export default function CompanyProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [formData, setFormData] = useState({
    company_name: "",
    registration_number: "",
    tax_id: "",
    industry: "",
    company_size: "",
    website: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    description: ""
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    await loadCompanyProfile(user.id);
    setLoading(false);
  };

  const loadCompanyProfile = async (userId: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error loading company profile:", profileError);
      return;
    }

    if (profileData) {
      setProfile(profileData as CompanyProfile);
      setFormData({
        company_name: profileData.company_name || "",
        registration_number: profileData.registration_number || "",
        tax_id: profileData.tax_id || "",
        industry: profileData.industry || "",
        company_size: profileData.company_size || "",
        website: profileData.website || "",
        address: profileData.address || "",
        city: profileData.city || "",
        country: profileData.country || "",
        phone: profileData.phone || "",
        description: profileData.description || ""
      });

      // Load documents
      const { data: docsData } = await supabase
        .from("company_documents")
        .select("*")
        .eq("company_id", profileData.id)
        .order("uploaded_at", { ascending: false });

      if (docsData) {
        setDocuments(docsData as CompanyDocument[]);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setSaving(true);

    try {
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from("company_profiles")
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq("id", profile.id);

        if (error) throw error;
        toast.success("Company profile updated successfully");
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from("company_profiles")
          .insert({
            user_id: user.id,
            ...formData
          })
          .select()
          .single();

        if (error) throw error;
        setProfile(data as CompanyProfile);
        toast.success("Company profile created successfully");
      }

      await loadCompanyProfile(user.id);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    if (!profile) {
      toast.error("Please save your company profile first");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("company-documents")
        .getPublicUrl(fileName);

      const { error: docError } = await supabase
        .from("company_documents")
        .insert({
          company_id: profile.id,
          document_type: documentType,
          document_name: file.name,
          file_url: urlData.publicUrl
        });

      if (docError) throw docError;

      toast.success("Document uploaded successfully");
      await loadCompanyProfile(user.id);
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split("/company-documents/");
      if (urlParts[1]) {
        await supabase.storage.from("company-documents").remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from("company_documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;

      setDocuments(documents.filter(d => d.id !== docId));
      toast.success("Document deleted");
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB for logos)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo size must be less than 5MB");
      return;
    }

    setUploadingLogo(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (profile?.logo_url) {
        const oldUrlParts = profile.logo_url.split("/company-logos/");
        if (oldUrlParts[1]) {
          await supabase.storage.from("company-logos").remove([oldUrlParts[1]]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      // Update profile with new logo URL
      if (profile) {
        const { error: updateError } = await supabase
          .from("company_profiles")
          .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
          .eq("id", profile.id);

        if (updateError) throw updateError;
        
        setProfile({ ...profile, logo_url: urlData.publicUrl });
        toast.success("Company logo updated successfully");
      } else {
        toast.error("Please save your company profile first");
      }
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!profile?.logo_url) return;

    try {
      // Delete from storage
      const urlParts = profile.logo_url.split("/company-logos/");
      if (urlParts[1]) {
        await supabase.storage.from("company-logos").remove([urlParts[1]]);
      }

      // Update profile
      const { error } = await supabase
        .from("company_profiles")
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({ ...profile, logo_url: null });
      toast.success("Logo removed");
    } catch (error: any) {
      console.error("Error removing logo:", error);
      toast.error("Failed to remove logo");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
            <Clock className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending Verification
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Company Profile</h1>
              <p className="text-muted-foreground">Manage your business information and verification</p>
            </div>
          </div>
          {profile && getStatusBadge(profile.verification_status)}
        </div>

        <div className="grid gap-6">
          {/* Company Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Company Logo
              </CardTitle>
              <CardDescription>Upload your company logo (max 5MB, JPG/PNG)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-2 border-border">
                    <AvatarImage src={profile?.logo_url || undefined} alt="Company logo" />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {formData.company_name ? formData.company_name.charAt(0).toUpperCase() : <Building2 className="w-8 h-8" />}
                    </AvatarFallback>
                  </Avatar>
                  {uploadingLogo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingLogo || !profile}
                      onClick={() => document.getElementById("logo-upload")?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {profile?.logo_url ? "Change Logo" : "Upload Logo"}
                    </Button>
                    {profile?.logo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  {!profile && (
                    <p className="text-xs text-muted-foreground">
                      Save your profile first to upload a logo
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic details about your company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Registration Number</Label>
                  <Input
                    id="registration_number"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="Business registration number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    placeholder="Tax identification number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_size">Company Size</Label>
                  <Select
                    value={formData.company_size}
                    onValueChange={(value) => setFormData({ ...formData, company_size: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySizes.map((size) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of your company..."
                  rows={4}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Company Profile"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Verification Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Verification Documents
              </CardTitle>
              <CardDescription>
                Upload documents to verify your company. Supported formats: PDF, JPG, PNG (max 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!profile && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Please save your company profile first before uploading documents
                  </p>
                </div>
              )}

              {profile && (
                <>
                  {/* Upload Section */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {documentTypes.map((docType) => (
                      <div key={docType.value} className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                        <Label className="text-sm font-medium mb-2 block">{docType.label}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, docType.value)}
                            disabled={uploading}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading document...
                    </div>
                  )}

                  <Separator />

                  {/* Uploaded Documents List */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Uploaded Documents</h4>
                    {documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                    ) : (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div 
                            key={doc.id} 
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{doc.document_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                                  {" • "}
                                  {new Date(doc.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.verified && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Verification Status Info */}
          {profile && profile.verification_status !== "verified" && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg h-fit">
                    <AlertCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Verification Process</h4>
                    <p className="text-sm text-muted-foreground">
                      To complete verification, please upload your business registration documents. 
                      Our team will review them within 2-3 business days. Verified companies 
                      receive a verification badge and increased trust from buyers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
