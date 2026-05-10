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
      merchant_banks: {
        Row: {
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at: string
          id: string
          is_default: boolean
          merchant_id: string
          updated_at: string
        }
        Insert: {
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at?: string
          id?: string
          is_default?: boolean
          merchant_id: string
          updated_at?: string
        }
        Update: {
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_default?: boolean
          merchant_id?: string
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
          started_at: string
          status: string
          topup_callback_url: string | null
          topup_secret: string | null
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
          started_at?: string
          status?: string
          topup_callback_url?: string | null
          topup_secret?: string | null
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
          started_at?: string
          status?: string
          topup_callback_url?: string | null
          topup_secret?: string | null
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
          merchant_id: string
          payload: Json
          response_body: string | null
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
          merchant_id: string
          payload: Json
          response_body?: string | null
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
          merchant_id?: string
          payload?: Json
          response_body?: string | null
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
    }
    Views: {
      [_ in never]: never
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
      get_daily_revenue: {
        Args: { p_days?: number }
        Returns: {
          day: string
          revenue: number
          tx_count: number
        }[]
      }
      get_merchant_id_for_auth_user: { Args: never; Returns: string }
      get_my_merchant_secrets: {
        Args: never
        Returns: {
          sepay_api_key: string
          webhook_api_key: string
          webhook_secret: string
        }[]
      }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      subscribe_to_plan: {
        Args: { p_billing_cycle?: string; p_plan_code: string }
        Returns: string
      }
      subscribe_to_plan_paid: {
        Args: { p_billing_cycle?: string; p_plan_code: string }
        Returns: Json
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
