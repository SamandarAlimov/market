-- Allow sellers to view orders that contain their products
CREATE POLICY "Sellers can view orders with their items"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM order_items
    WHERE order_items.order_id = orders.id
    AND order_items.seller_id = auth.uid()
  )
);

-- Allow sellers to update order status for orders containing their items
CREATE POLICY "Sellers can update orders with their items"
ON public.orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM order_items
    WHERE order_items.order_id = orders.id
    AND order_items.seller_id = auth.uid()
  )
);