-- Create verification status enum
CREATE TYPE public.verification_status AS ENUM ('pending', 'under_review', 'verified', 'rejected');

-- Create company_profiles table
CREATE TABLE public.company_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  registration_number TEXT,
  tax_id TEXT,
  industry TEXT,
  company_size TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  description TEXT,
  logo_url TEXT,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_documents table
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_profiles
CREATE POLICY "Users can view their own company profile"
ON public.company_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company profile"
ON public.company_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company profile"
ON public.company_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all company profiles"
ON public.company_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all company profiles"
ON public.company_profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for company_documents
CREATE POLICY "Users can view their company documents"
ON public.company_documents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.company_profiles
  WHERE id = company_documents.company_id AND user_id = auth.uid()
));

CREATE POLICY "Users can upload their company documents"
ON public.company_documents FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.company_profiles
  WHERE id = company_documents.company_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete their company documents"
ON public.company_documents FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.company_profiles
  WHERE id = company_documents.company_id AND user_id = auth.uid()
));

CREATE POLICY "Admins can view all company documents"
ON public.company_documents FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public) VALUES ('company-documents', 'company-documents', false);

-- Storage policies
CREATE POLICY "Users can upload company documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their company documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their company documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all company documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-documents' AND has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_company_profiles_updated_at
BEFORE UPDATE ON public.company_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();