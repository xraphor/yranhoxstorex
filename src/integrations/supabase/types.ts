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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          delivered_content: string | null
          id: string
          order_id: string
          product_id: string | null
          product_title: string
          quantity: number
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_content?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_title: string
          quantity?: number
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_content?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_title?: string
          quantity?: number
          unit_price_cents?: number
          updated_at?: string
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
          buyer_email: string
          created_at: string
          expires_at: string
          id: string
          paid_at: string | null
          pix_payload: string | null
          status: string
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_email: string
          created_at?: string
          expires_at?: string
          id?: string
          paid_at?: string | null
          pix_payload?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          buyer_email?: string
          created_at?: string
          expires_at?: string
          id?: string
          paid_at?: string | null
          pix_payload?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          author_name: string
          created_at: string
          id: string
          is_official: boolean
          message: string
          product_id: string | null
          rating: number
          user_id: string | null
        }
        Insert: {
          author_name: string
          created_at?: string
          id?: string
          is_official?: boolean
          message: string
          product_id?: string | null
          rating?: number
          user_id?: string | null
        }
        Update: {
          author_name?: string
          created_at?: string
          id?: string
          is_official?: boolean
          message?: string
          product_id?: string | null
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock_items: {
        Row: {
          content: string
          created_at: string
          delivered: boolean
          delivered_at: string | null
          id: string
          order_id: string | null
          product_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          delivered?: boolean
          delivered_at?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          delivered?: boolean
          delivered_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string
          featured: boolean
          id: string
          image_url: string | null
          images: string[]
          original_price_cents: number | null
          price_cents: number
          seller_id: string | null
          seller_name: string | null
          stock_count: number
          tags: string[]
          title: string
          updated_at: string
          warranty: string | null
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          images?: string[]
          original_price_cents?: number | null
          price_cents?: number
          seller_id?: string | null
          seller_name?: string | null
          stock_count?: number
          tags?: string[]
          title: string
          updated_at?: string
          warranty?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          images?: string[]
          original_price_cents?: number | null
          price_cents?: number
          seller_id?: string | null
          seller_name?: string | null
          stock_count?: number
          tags?: string[]
          title?: string
          updated_at?: string
          warranty?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_profiles: {
        Row: {
          created_at: string
          display_name: string
          pix_key: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          pix_key?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          pix_key?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          accent: string
          banner_subtitle: string
          banner_title: string
          custom_theme: Json | null
          id: number
          pix_key: string | null
          pix_payload: string | null
          social_links: Json
          support_link: string | null
          top_notice: string | null
          updated_at: string
        }
        Insert: {
          accent?: string
          banner_subtitle?: string
          banner_title?: string
          custom_theme?: Json | null
          id?: number
          pix_key?: string | null
          pix_payload?: string | null
          social_links?: Json
          support_link?: string | null
          top_notice?: string | null
          updated_at?: string
        }
        Update: {
          accent?: string
          banner_subtitle?: string
          banner_title?: string
          custom_theme?: Json | null
          id?: number
          pix_key?: string | null
          pix_payload?: string | null
          social_links?: Json
          support_link?: string | null
          top_notice?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wallet_entries: {
        Row: {
          amount_cents: number
          created_at: string
          description: string
          id: string
          kind: string
          order_id: string | null
          owner_type: string
          release_at: string
          user_id: string | null
          withdrawal_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string
          id?: string
          kind: string
          order_id?: string | null
          owner_type: string
          release_at?: string
          user_id?: string | null
          withdrawal_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string
          id?: string
          kind?: string
          order_id?: string | null
          owner_type?: string
          release_at?: string
          user_id?: string | null
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          owner_type: string
          pix_key: string
          processed_at: string | null
          seller_name: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          owner_type: string
          pix_key: string
          processed_at?: string | null
          seller_name?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          owner_type?: string
          pix_key?: string
          processed_at?: string | null
          seller_name?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_order: { Args: { p_order_id: string }; Returns: undefined }
      is_store_admin: { Args: never; Returns: boolean }
      process_withdrawal: {
        Args: { p_id: string; p_paid: boolean }
        Returns: undefined
      }
      request_withdrawal: {
        Args: { p_amount_cents: number; p_pix_key: string }
        Returns: string
      }
      wallet_balance: {
        Args: { p_owner?: string }
        Returns: {
          available_cents: number
          pending_cents: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
