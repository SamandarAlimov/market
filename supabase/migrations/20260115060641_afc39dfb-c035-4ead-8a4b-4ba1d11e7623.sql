-- Create browsing history table to track user product views
CREATE TABLE public.browsing_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    view_duration_seconds INTEGER DEFAULT 0
);

-- Create index for efficient queries
CREATE INDEX idx_browsing_history_user_id ON public.browsing_history(user_id);
CREATE INDEX idx_browsing_history_viewed_at ON public.browsing_history(viewed_at DESC);
CREATE INDEX idx_browsing_history_product_id ON public.browsing_history(product_id);

-- Enable RLS
ALTER TABLE public.browsing_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own browsing history
CREATE POLICY "Users can view their own browsing history"
ON public.browsing_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own browsing history
CREATE POLICY "Users can insert their own browsing history"
ON public.browsing_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own browsing history
CREATE POLICY "Users can delete their own browsing history"
ON public.browsing_history
FOR DELETE
USING (auth.uid() = user_id);