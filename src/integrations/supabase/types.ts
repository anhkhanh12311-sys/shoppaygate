export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      balance_topups: {
        Row: {
          amount: number
          bank_reference: string | null
          created_at: string
          id: string
          merchant_id: string
          note: string | null
          source: string
          transfer_content: string | null
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          note?: string | null
          source?: string
          transfer_content?: string | null
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          note?: string | null
          source?: string
          transfer_content?: string | null
        }
        Relationships: []
      }
      bill_shares: {
        Row: {
          channel: string
          created_at: string
          id: string
          merchant_id: string
          recipient: string | null
          transaction_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          merchant_id: string
          recipient?: string | null
          transaction_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          merchant_id?: string
          recipient?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_paid_at: string | null
          merchant_id: string
          notes: string | null
          phone: string | null
          source: string | null
          tag: Database["public"]["Enums"]["customer_tag"]
          total_spent: number
          tx_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_paid_at?: string | null
          merchant_id: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          tag?: Database["public"]["Enums"]["customer_tag"]
          total_spent?: number
          tx_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_paid_at?: string | null
          merchant_id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          tag?: Database["public"]["Enums"]["customer_tag"]
          total_spent?: number
          tx_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_banks: {
        Row: {
          auto_route_enabled: boolean
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at: string
          current_daily_received: number
          daily_limit: number | null
          id: string
          is_default: boolean
          last_reset_date: string | null
          last_used_at: string | null
          merchant_id: string
          priority: number
          sepay_account_id: string | null
          sepay_api_key: string | null
          updated_at: string
        }
        Insert: {
          auto_route_enabled?: boolean
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at?: string
          current_daily_received?: number
          daily_limit?: number | null
          id?: string
          is_default?: boolean
          last_reset_date?: string | null
          last_used_at?: string | null
          merchant_id: string
          priority?: number
          sepay_account_id?: string | null
          sepay_api_key?: string | null
          updated_at?: string
        }
        Update: {
          auto_route_enabled?: boolean
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          created_at?: string
          current_daily_received?: number
          daily_limit?: number | null
          id?: string
          is_default?: boolean
          last_reset_date?: string | null
          last_used_at?: string | null
          merchant_id?: string
          priority?: number
          sepay_account_id?: string | null
          sepay_api_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_banks_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_banks_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_secrets: {
        Row: {
          merchant_id: string
          sepay_api_key: string | null
          updated_at: string
          webhook_api_key: string | null
          webhook_secret: string | null
        }
        Insert: {
          merchant_id: string
          sepay_api_key?: string | null
          updated_at?: string
          webhook_api_key?: string | null
          webhook_secret?: string | null
        }
        Update: {
          merchant_id?: string
          sepay_api_key?: string | null
          updated_at?: string
          webhook_api_key?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_secrets_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_secrets_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_staff: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          invited_at: string
          joined_at: string | null
          merchant_id: string
          permissions: Json
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string
          email: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          merchant_id: string
          permissions?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          merchant_id?: string
          permissions?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_staff_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_staff_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_stores: {
        Row: {
          address: string | null
          banner_url: string | null
          business_hours: string | null
          created_at: string
          description: string | null
          email: string | null
          facebook_url: string | null
          footer_text: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          logo_url: string | null
          merchant_id: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          show_stats: boolean
          slug: string
          store_name: string
          theme_style: string
          updated_at: string
          website_url: string | null
          zalo_url: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          business_hours?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          footer_text?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          logo_url?: string | null
          merchant_id: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_stats?: boolean
          slug: string
          store_name: string
          theme_style?: string
          updated_at?: string
          website_url?: string | null
          zalo_url?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          business_hours?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          footer_text?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          logo_url?: string | null
          merchant_id?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_stats?: boolean
          slug?: string
          store_name?: string
          theme_style?: string
          updated_at?: string
          website_url?: string | null
          zalo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_stores_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_stores_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_subscriptions: {
        Row: {
          auto_renew: boolean
          billing_cycle: string
          created_at: string
          expires_at: string | null
          id: string
          merchant_id: string
          plan_id: string
          quota_reset_at: string | null
          started_at: string
          status: string
          topup_callback_url: string | null
          topup_secret: string | null
          tx_quota_limit: number | null
          tx_quota_used: number
          tx_used: number
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          billing_cycle?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          merchant_id: string
          plan_id: string
          quota_reset_at?: string | null
          started_at?: string
          status?: string
          topup_callback_url?: string | null
          topup_secret?: string | null
          tx_quota_limit?: number | null
          tx_quota_used?: number
          tx_used?: number
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          billing_cycle?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          merchant_id?: string
          plan_id?: string
          quota_reset_at?: string | null
          started_at?: string
          status?: string
          topup_callback_url?: string | null
          topup_secret?: string | null
          tx_quota_limit?: number | null
          tx_quota_used?: number
          tx_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          auth_user_id: string
          balance: number
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          business_name: string
          created_at: string
          email: string
          id: string
          phone: string | null
          topup_code: string | null
          updated_at: string
          webhook_enabled: boolean | null
          webhook_url: string | null
        }
        Insert: {
          auth_user_id: string
          balance?: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          business_name: string
          created_at?: string
          email: string
          id?: string
          phone?: string | null
          topup_code?: string | null
          updated_at?: string
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          auth_user_id?: string
          balance?: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          business_name?: string
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          topup_code?: string | null
          updated_at?: string
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: string | null
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          id: string
          merchant_id: string
          note: string | null
          order_code: string | null
          paid_at: string | null
          payment_link_id: string | null
          payment_method: string | null
          shipping_fee: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          voucher_code: string | null
          voucher_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          merchant_id: string
          note?: string | null
          order_code?: string | null
          paid_at?: string | null
          payment_link_id?: string | null
          payment_method?: string | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          voucher_code?: string | null
          voucher_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          merchant_id?: string
          note?: string | null
          order_code?: string | null
          paid_at?: string | null
          payment_link_id?: string | null
          payment_method?: string | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          voucher_code?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_link_id_fkey"
            columns: ["payment_link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_static: boolean
          is_topup: boolean
          merchant_id: string
          selected_bank_id: string | null
          status: string
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_static?: boolean
          is_topup?: boolean
          merchant_id: string
          selected_bank_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_static?: boolean
          is_topup?: boolean
          merchant_id?: string
          selected_bank_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_selected_bank_id_fkey"
            columns: ["selected_bank_id"]
            isOneToOne: false
            referencedRelation: "merchant_banks"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_purchases: {
        Row: {
          amount_paid: number
          billing_cycle: string
          created_at: string
          expires_at: string | null
          id: string
          merchant_id: string
          paid_from: string
          plan_code: string
          plan_id: string
        }
        Insert: {
          amount_paid: number
          billing_cycle: string
          created_at?: string
          expires_at?: string | null
          id?: string
          merchant_id: string
          paid_from?: string
          plan_code: string
          plan_id: string
        }
        Update: {
          amount_paid?: number
          billing_cycle?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          merchant_id?: string
          paid_from?: string
          plan_code?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_purchases_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          gallery: Json | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          merchant_id: string
          name: string
          price: number
          sale_price: number | null
          sku: string | null
          slug: string | null
          sold_count: number
          sort_order: number
          stock: number
          unlimited_stock: boolean
          updated_at: string
          view_count: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          gallery?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          merchant_id: string
          name: string
          price?: number
          sale_price?: number | null
          sku?: string | null
          slug?: string | null
          sold_count?: number
          sort_order?: number
          stock?: number
          unlimited_stock?: boolean
          updated_at?: string
          view_count?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          gallery?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          merchant_id?: string
          name?: string
          price?: number
          sale_price?: number | null
          sku?: string | null
          slug?: string | null
          sold_count?: number
          sort_order?: number
          stock?: number
          unlimited_stock?: boolean
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_receipt_settings: {
        Row: {
          address: string | null
          auto_open_share: boolean
          closing: string | null
          created_at: string
          greeting: string | null
          hotline: string | null
          id: string
          logo_url: string | null
          merchant_id: string
          primary_color: string
          qr_maps_enabled: boolean
          qr_maps_url: string | null
          qr_zalo_enabled: boolean
          qr_zalo_url: string | null
          secondary_color: string
          shop_name: string | null
          slogan: string | null
          social_links: Json
          updated_at: string
          voucher_code: string | null
          voucher_enabled: boolean
          voucher_expiry_days: number
          voucher_max_uses: number | null
          voucher_text: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          auto_open_share?: boolean
          closing?: string | null
          created_at?: string
          greeting?: string | null
          hotline?: string | null
          id?: string
          logo_url?: string | null
          merchant_id: string
          primary_color?: string
          qr_maps_enabled?: boolean
          qr_maps_url?: string | null
          qr_zalo_enabled?: boolean
          qr_zalo_url?: string | null
          secondary_color?: string
          shop_name?: string | null
          slogan?: string | null
          social_links?: Json
          updated_at?: string
          voucher_code?: string | null
          voucher_enabled?: boolean
          voucher_expiry_days?: number
          voucher_max_uses?: number | null
          voucher_text?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          auto_open_share?: boolean
          closing?: string | null
          created_at?: string
          greeting?: string | null
          hotline?: string | null
          id?: string
          logo_url?: string | null
          merchant_id?: string
          primary_color?: string
          qr_maps_enabled?: boolean
          qr_maps_url?: string | null
          qr_zalo_enabled?: boolean
          qr_zalo_url?: string | null
          secondary_color?: string
          shop_name?: string | null
          slogan?: string | null
          social_links?: Json
          updated_at?: string
          voucher_code?: string | null
          voucher_enabled?: boolean
          voucher_expiry_days?: number
          voucher_max_uses?: number | null
          voucher_text?: string | null
          website?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          features: Json
          fee_percent: number
          id: string
          is_active: boolean
          monthly_tx_limit: number
          name: string
          price_monthly: number
          price_yearly: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          features?: Json
          fee_percent?: number
          id?: string
          is_active?: boolean
          monthly_tx_limit?: number
          name: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          features?: Json
          fee_percent?: number
          id?: string
          is_active?: boolean
          monthly_tx_limit?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      topup_callbacks: {
        Row: {
          amount: number
          attempt_count: number
          callback_url: string
          created_at: string
          customer_ref: string | null
          delivered_at: string | null
          error: string | null
          http_status: number | null
          id: string
          last_error: string | null
          merchant_id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          retry_count: number
          signature: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          attempt_count?: number
          callback_url: string
          created_at?: string
          customer_ref?: string | null
          delivered_at?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          last_error?: string | null
          merchant_id: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          retry_count?: number
          signature?: string | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          attempt_count?: number
          callback_url?: string
          created_at?: string
          customer_ref?: string | null
          delivered_at?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          last_error?: string | null
          merchant_id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          retry_count?: number
          signature?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          bank_reference: string | null
          created_at: string
          id: string
          merchant_id: string
          paid_at: string | null
          payment_link_id: string
          status: string
          transfer_content: string | null
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          paid_at?: string | null
          payment_link_id: string
          status?: string
          transfer_content?: string | null
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          paid_at?: string | null
          payment_link_id?: string
          status?: string
          transfer_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_link_id_fkey"
            columns: ["payment_link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voucher_redemptions: {
        Row: {
          created_at: string
          customer_phone: string | null
          discount_amount: number
          id: string
          merchant_id: string
          order_id: string | null
          voucher_id: string
        }
        Insert: {
          created_at?: string
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          merchant_id: string
          order_id?: string | null
          voucher_id: string
        }
        Update: {
          created_at?: string
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          merchant_id?: string
          order_id?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          merchant_id: string
          min_order: number
          name: string | null
          per_customer_limit: number | null
          starts_at: string | null
          type: Database["public"]["Enums"]["voucher_type"]
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          merchant_id: string
          min_order?: number
          name?: string | null
          per_customer_limit?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["voucher_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          merchant_id?: string
          min_order?: number
          name?: string | null
          per_customer_limit?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["voucher_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_key: string
          id: string
          payload: Json | null
          source: string
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          payload?: Json | null
          source?: string
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          payload?: Json | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      merchants_safe: {
        Row: {
          auth_user_id: string | null
          balance: number | null
          business_name: string | null
          created_at: string | null
          email: string | null
          id: string | null
          phone: string | null
          topup_code: string | null
          updated_at: string | null
          webhook_enabled: boolean | null
          webhook_url: string | null
        }
        Insert: {
          auth_user_id?: string | null
          balance?: number | null
          business_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          phone?: string | null
          topup_code?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          auth_user_id?: string | null
          balance?: number | null
          business_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          phone?: string | null
          topup_code?: string | null
          updated_at?: string | null
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_balance: {
        Args: { p_amount: number; p_merchant_id: string; p_note: string }
        Returns: number
      }
      admin_grant_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_revoke_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_set_merchant_webhook: {
        Args: {
          p_enabled: boolean
          p_merchant_id: string
          p_webhook_url: string
        }
        Returns: undefined
      }
      admin_upsert_merchant_callback: {
        Args: {
          p_callback_url: string
          p_merchant_id: string
          p_secret: string
        }
        Returns: undefined
      }
      admin_upsert_setting: {
        Args: {
          p_description?: string
          p_is_public?: boolean
          p_key: string
          p_value: Json
        }
        Returns: undefined
      }
      count_merchant_payment_links: {
        Args: {
          p_is_static?: boolean
          p_merchant_id: string
          p_status?: string
        }
        Returns: number
      }
      count_merchant_transactions: {
        Args: { p_merchant_id: string; p_status?: string }
        Returns: number
      }
      credit_merchant_balance: {
        Args: {
          p_amount: number
          p_bank_reference: string
          p_merchant_id: string
          p_note?: string
          p_source?: string
          p_transfer_content: string
        }
        Returns: string
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_bank_routing_stats: { Args: never; Returns: Json }
      get_customer_stats: { Args: never; Returns: Json }
      get_daily_revenue: {
        Args: { p_days?: number }
        Returns: {
          day: string
          revenue: number
          tx_count: number
        }[]
      }
      get_merchant_id_for_auth_user: { Args: never; Returns: string }
      get_merchant_signal_health: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      get_my_merchant_secrets: {
        Args: never
        Returns: {
          sepay_api_key: string
          webhook_api_key: string
          webhook_secret: string
        }[]
      }
      get_public_bill: {
        Args: { p_transaction_id: string }
        Returns: {
          amount: number
          bank_reference: string
          merchant_business_name: string
          merchant_id: string
          paid_at: string
          payment_code: string
          status: string
          transfer_content: string
          tx_id: string
        }[]
      }
      get_public_order: { Args: { p_order_id: string }; Returns: Json }
      get_public_payment_link: {
        Args: { p_code: string }
        Returns: {
          amount: number
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          code: string
          description: string
          id: string
          is_static: boolean
          is_topup: boolean
          merchant_business_name: string
          merchant_id: string
          status: string
        }[]
      }
      get_public_payment_status: { Args: { p_code: string }; Returns: string }
      get_public_receipt_settings: {
        Args: { p_merchant_id: string }
        Returns: {
          address: string
          closing: string
          greeting: string
          hotline: string
          logo_url: string
          primary_color: string
          qr_maps_enabled: boolean
          qr_maps_url: string
          qr_zalo_enabled: boolean
          qr_zalo_url: string
          secondary_color: string
          shop_name: string
          slogan: string
          social_links: Json
          voucher_code: string
          voucher_enabled: boolean
          voucher_expiry_days: number
          voucher_text: string
          website: string
        }[]
      }
      get_public_store_products: {
        Args: { p_slug: string }
        Returns: {
          category: string
          description: string
          id: string
          image_url: string
          is_featured: boolean
          merchant_id: string
          name: string
          price: number
          sale_price: number
          sold_count: number
          stock: number
          unlimited_stock: boolean
        }[]
      }
      get_store_stats: { Args: never; Returns: Json }
      get_top_merchants: {
        Args: { p_limit?: number }
        Returns: {
          business_name: string
          email: string
          merchant_id: string
          total_revenue: number
          tx_count: number
        }[]
      }
      get_topup_rental_dashboard: { Args: never; Returns: Json }
      get_voucher_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_product_view: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      insert_transaction_from_webhook: {
        Args: {
          p_amount: number
          p_bank_reference: string
          p_merchant_id: string
          p_paid_at: string
          p_payment_link_id: string
          p_status: string
          p_transfer_content: string
        }
        Returns: string
      }
      is_merchant_owner: { Args: { merchant_id: string }; Returns: boolean }
      link_bank_sepay: {
        Args: {
          p_bank_id: string
          p_sepay_account_id: string
          p_sepay_api_key: string
        }
        Returns: undefined
      }
      list_topup_callbacks: {
        Args: { p_limit?: number; p_status?: string }
        Returns: {
          amount: number
          attempt_count: number
          callback_url: string
          created_at: string
          customer_ref: string | null
          delivered_at: string | null
          error: string | null
          http_status: number | null
          id: string
          last_error: string | null
          merchant_id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          retry_count: number
          signature: string | null
          status: string
          transaction_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "topup_callbacks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pick_best_bank: {
        Args: { p_amount?: number; p_merchant_id: string }
        Returns: string
      }
      public_create_order:
        | {
            Args: {
              p_customer_address: string
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_items: Json
              p_merchant_id: string
              p_note: string
              p_shipping_fee: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_customer_address: string
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_items: Json
              p_merchant_id: string
              p_note: string
              p_shipping_fee: number
              p_voucher_code?: string
            }
            Returns: Json
          }
      record_bank_usage: {
        Args: { p_amount: number; p_bank_id: string }
        Returns: undefined
      }
      record_topup_quota_usage: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      regenerate_topup_secret: { Args: never; Returns: string }
      retry_topup_callback: {
        Args: { p_callback_id: string }
        Returns: undefined
      }
      subscribe_to_plan: {
        Args: { p_billing_cycle?: string; p_plan_code: string }
        Returns: string
      }
      subscribe_to_plan_paid: {
        Args: { p_billing_cycle?: string; p_plan_code: string }
        Returns: Json
      }
      sync_customers_from_transactions: { Args: never; Returns: number }
      update_bank_routing: {
        Args: {
          p_auto_route: boolean
          p_bank_id: string
          p_daily_limit: number
          p_priority: number
        }
        Returns: undefined
      }
      update_my_merchant_secrets: {
        Args: {
          p_clear_sepay?: boolean
          p_clear_webhook_api_key?: boolean
          p_clear_webhook_secret?: boolean
          p_sepay_api_key?: string
          p_webhook_api_key?: string
          p_webhook_secret?: string
        }
        Returns: undefined
      }
      update_topup_config: {
        Args: { p_callback_url: string; p_secret: string }
        Returns: undefined
      }
      upsert_customer_manual: {
        Args: {
          p_email: string
          p_full_name: string
          p_notes?: string
          p_phone: string
          p_tag?: Database["public"]["Enums"]["customer_tag"]
        }
        Returns: string
      }
      validate_voucher: {
        Args: {
          p_code: string
          p_merchant_id: string
          p_shipping_fee?: number
          p_subtotal: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      customer_tag: "new" | "regular" | "vip" | "blocked"
      order_status:
        | "pending"
        | "paid"
        | "shipping"
        | "completed"
        | "cancelled"
        | "refunded"
      voucher_type: "percent" | "fixed" | "freeship"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      customer_tag: ["new", "regular", "vip", "blocked"],
      order_status: [
        "pending",
        "paid",
        "shipping",
        "completed",
        "cancelled",
        "refunded",
      ],
      voucher_type: ["percent", "fixed", "freeship"],
    },
  },
} as const
