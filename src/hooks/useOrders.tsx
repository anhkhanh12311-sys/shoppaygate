import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import { toast } from "sonner";

export type OrderStatus = "pending" | "paid" | "shipping" | "completed" | "cancelled" | "refunded";

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_code: string;
  merchant_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  note: string | null;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payment_method: string | null;
  channel: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface OrderStats {
  products: number;
  orders_today: number;
  revenue_today: number;
  pending_orders: number;
  total_revenue: number;
  low_stock: number;
}

export const useOrders = () => {
  const { merchant } = useMerchant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    products: 0, orders_today: 0, revenue_today: 0,
    pending_orders: 0, total_revenue: 0, low_stock: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    const [{ data: list }, { data: st }] = await Promise.all([
      supabase.from("orders").select("*").eq("merchant_id", merchant.id).order("created_at", { ascending: false }).limit(100),
      supabase.rpc("get_store_stats"),
    ]);
    setOrders((list as any) || []);
    if (st) setStats(st as unknown as OrderStats);
    setLoading(false);
  }, [merchant]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    const patch: any = { status };
    if (status === "paid" || status === "completed") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã cập nhật trạng thái");
    fetchAll();
  };

  const getItems = async (orderId: string): Promise<OrderItem[]> => {
    const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    return (data as any) || [];
  };

  return { orders, stats, loading, fetchAll, updateStatus, getItems };
};
