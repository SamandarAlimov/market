-- Add rejection_reason column to company_profiles
ALTER TABLE public.company_profiles 
ADD COLUMN rejection_reason TEXT;