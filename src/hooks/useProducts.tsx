import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import { toast } from "sonner";

export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  gallery: string[] | null;
  stock: number;
  unlimited_stock: boolean;
  sku: string | null;
  sort_order: number;
  view_count: number;
  sold_count: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export const useProducts = () => {
  const { merchant } = useMerchant();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setProducts((data as any) || []);
    setLoading(false);
  }, [merchant]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!merchant) return null;
    const ext = file.name.split(".").pop();
    const path = `${merchant.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600", upsert: false,
    });
    if (error) { toast.error(error.message); return null; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async (payload: Partial<Product> & { id?: string }) => {
    if (!merchant) return;
    const body: any = {
      merchant_id: merchant.id,
      name: payload.name,
      description: payload.description || null,
      category: payload.category || null,
      price: Number(payload.price) || 0,
      sale_price: payload.sale_price ? Number(payload.sale_price) : null,
      image_url: payload.image_url || null,
      stock: Number(payload.stock) || 0,
      unlimited_stock: !!payload.unlimited_stock,
      sku: payload.sku || null,
      sort_order: Number(payload.sort_order) || 0,
      is_active: payload.is_active ?? true,
      is_featured: !!payload.is_featured,
    };
    if (payload.id) {
      const { error } = await supabase.from("products").update(body).eq("id", payload.id);
      if (error) return toast.error(error.message);
      toast.success("Đã cập nhật sản phẩm");
    } else {
      const { error } = await supabase.from("products").insert(body);
      if (error) return toast.error(error.message);
      toast.success("Đã thêm sản phẩm");
    }
    fetchAll();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xoá");
    fetchAll();
  };

  const toggleActive = async (id: string, value: boolean) => {
    await supabase.from("products").update({ is_active: value }).eq("id", id);
    fetchAll();
  };

  return { products, loading, fetchAll, uploadImage, save, remove, toggleActive };
};
