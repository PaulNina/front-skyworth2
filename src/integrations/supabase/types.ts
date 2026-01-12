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
      admin_audit: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      campaign_settings: {
        Row: {
          campaign_name: string
          campaign_subtitle: string | null
          created_at: string
          draw_date: string
          end_date: string
          finalists_count: number | null
          id: string
          is_active: boolean | null
          min_age: number | null
          preselected_count: number | null
          start_date: string
          terms_url: string | null
          updated_at: string
        }
        Insert: {
          campaign_name?: string
          campaign_subtitle?: string | null
          created_at?: string
          draw_date: string
          end_date: string
          finalists_count?: number | null
          id?: string
          is_active?: boolean | null
          min_age?: number | null
          preselected_count?: number | null
          start_date: string
          terms_url?: string | null
          updated_at?: string
        }
        Update: {
          campaign_name?: string
          campaign_subtitle?: string | null
          created_at?: string
          draw_date?: string
          end_date?: string
          finalists_count?: number | null
          id?: string
          is_active?: boolean | null
          min_age?: number | null
          preselected_count?: number | null
          start_date?: string
          terms_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_purchases: {
        Row: {
          admin_notes: string | null
          admin_status: string | null
          birth_date: string
          ci_back_url: string | null
          ci_front_url: string | null
          ci_number: string
          city: string
          created_at: string
          department: string | null
          email: string
          full_name: string
          ia_detail: Json | null
          ia_score: number | null
          ia_status: string | null
          id: string
          invoice_number: string
          invoice_url: string | null
          phone: string
          product_id: string
          purchase_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          serial_number: string
          terms_accepted: boolean
          terms_accepted_at: string | null
          tickets_count: number | null
          tickets_issued_at: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_status?: string | null
          birth_date: string
          ci_back_url?: string | null
          ci_front_url?: string | null
          ci_number: string
          city: string
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          ia_detail?: Json | null
          ia_score?: number | null
          ia_status?: string | null
          id?: string
          invoice_number: string
          invoice_url?: string | null
          phone: string
          product_id: string
          purchase_date: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          serial_number: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          tickets_count?: number | null
          tickets_issued_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_status?: string | null
          birth_date?: string
          ci_back_url?: string | null
          ci_front_url?: string | null
          ci_number?: string
          city?: string
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          ia_detail?: Json | null
          ia_score?: number | null
          ia_status?: string | null
          id?: string
          invoice_number?: string
          invoice_url?: string | null
          phone?: string
          product_id?: string
          purchase_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          serial_number?: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          tickets_count?: number | null
          tickets_issued_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          id: string
          issued_at: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          owner_purchase_id: string | null
          owner_sale_id: string | null
          owner_type: string
          product_id: string | null
          serial_number: string
          status: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          issued_at?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_purchase_id?: string | null
          owner_sale_id?: string | null
          owner_type: string
          product_id?: string | null
          serial_number: string
          status?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          issued_at?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_purchase_id?: string | null
          owner_sale_id?: string | null
          owner_type?: string
          product_id?: string | null
          serial_number?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_owner_purchase_id_fkey"
            columns: ["owner_purchase_id"]
            isOneToOne: false
            referencedRelation: "client_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_owner_sale_id_fkey"
            columns: ["owner_sale_id"]
            isOneToOne: false
            referencedRelation: "seller_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_products"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_results: {
        Row: {
          created_at: string
          draw_date: string
          executed_by: string
          finalists_count: number | null
          id: string
          preselected_count: number | null
          status: string | null
          total_participants: number | null
          total_tickets: number | null
        }
        Insert: {
          created_at?: string
          draw_date: string
          executed_by: string
          finalists_count?: number | null
          id?: string
          preselected_count?: number | null
          status?: string | null
          total_participants?: number | null
          total_tickets?: number | null
        }
        Update: {
          created_at?: string
          draw_date?: string
          executed_by?: string
          finalists_count?: number | null
          id?: string
          preselected_count?: number | null
          status?: string | null
          total_participants?: number | null
          total_tickets?: number | null
        }
        Relationships: []
      }
      draw_winners: {
        Row: {
          created_at: string
          draw_id: string
          id: string
          is_notified: boolean | null
          owner_email: string
          owner_name: string
          owner_phone: string | null
          position: number | null
          prize_description: string | null
          ticket_id: string
          winner_type: string
        }
        Insert: {
          created_at?: string
          draw_id: string
          id?: string
          is_notified?: boolean | null
          owner_email: string
          owner_name: string
          owner_phone?: string | null
          position?: number | null
          prize_description?: string | null
          ticket_id: string
          winner_type: string
        }
        Update: {
          created_at?: string
          draw_id?: string
          id?: string
          is_notified?: boolean | null
          owner_email?: string
          owner_name?: string
          owner_phone?: string | null
          position?: number | null
          prize_description?: string | null
          ticket_id?: string
          winner_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_winners_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draw_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_winners_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_items: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          item_type: string
          search_vector: unknown
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          item_type: string
          search_vector?: unknown
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          item_type?: string
          search_vector?: unknown
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          content: string | null
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          recipient: string
          related_purchase_id: string | null
          related_sale_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          recipient: string
          related_purchase_id?: string | null
          related_sale_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient?: string
          related_purchase_id?: string | null
          related_sale_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_related_purchase_id_fkey"
            columns: ["related_purchase_id"]
            isOneToOne: false
            referencedRelation: "client_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_related_sale_id_fkey"
            columns: ["related_sale_id"]
            isOneToOne: false
            referencedRelation: "seller_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          channel: string
          content_html: string | null
          content_text: string
          created_at: string
          id: string
          is_active: boolean | null
          placeholders: string[] | null
          subject: string | null
          template_key: string
          template_name: string
          updated_at: string
        }
        Insert: {
          channel?: string
          content_html?: string | null
          content_text: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          placeholders?: string[] | null
          subject?: string | null
          template_key: string
          template_name: string
          updated_at?: string
        }
        Update: {
          channel?: string
          content_html?: string | null
          content_text?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          placeholders?: string[] | null
          subject?: string | null
          template_key?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      participant_tickets: {
        Row: {
          created_at: string
          id: string
          issued_at: string
          purchase_id: string | null
          ticket_code: string
          ticket_id: string | null
          tier: string
        }
        Insert: {
          created_at?: string
          id?: string
          issued_at?: string
          purchase_id?: string | null
          ticket_code: string
          ticket_id?: string | null
          tier: string
        }
        Update: {
          created_at?: string
          id?: string
          issued_at?: string
          purchase_id?: string | null
          ticket_code?: string
          ticket_id?: string | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_tickets_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "client_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "ticket_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          coupon_multiplier: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          model_name: string
          points_value: number | null
          screen_size: number | null
          ticket_multiplier: number | null
          tier: string
          updated_at: string
        }
        Insert: {
          coupon_multiplier?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          model_name: string
          points_value?: number | null
          screen_size?: number | null
          ticket_multiplier?: number | null
          tier: string
          updated_at?: string
        }
        Update: {
          coupon_multiplier?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          model_name?: string
          points_value?: number | null
          screen_size?: number | null
          ticket_multiplier?: number | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          ci_number: string | null
          city: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          ci_number?: string | null
          city?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          ci_number?: string | null
          city?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      secure_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_encrypted: boolean | null
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      seller_sales: {
        Row: {
          client_name: string
          client_phone: string | null
          created_at: string
          id: string
          invoice_number: string
          is_verified: boolean | null
          points_earned: number | null
          product_id: string
          sale_date: string
          seller_id: string
          serial_number: string
        }
        Insert: {
          client_name: string
          client_phone?: string | null
          created_at?: string
          id?: string
          invoice_number: string
          is_verified?: boolean | null
          points_earned?: number | null
          product_id: string
          sale_date: string
          seller_id: string
          serial_number: string
        }
        Update: {
          client_name?: string
          client_phone?: string | null
          created_at?: string
          id?: string
          invoice_number?: string
          is_verified?: boolean | null
          points_earned?: number | null
          product_id?: string
          sale_date?: string
          seller_id?: string
          serial_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking_by_city"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          store_city: string
          store_department: string | null
          store_name: string
          total_points: number | null
          total_sales: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          store_city: string
          store_department?: string | null
          store_name: string
          total_points?: number | null
          total_sales?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          store_city?: string
          store_department?: string | null
          store_name?: string
          total_points?: number | null
          total_sales?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_pool: {
        Row: {
          assigned_at: string | null
          created_at: string
          id: string
          is_assigned: boolean | null
          ticket_code: string
          tier: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          id?: string
          is_assigned?: boolean | null
          ticket_code: string
          tier: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          id?: string
          is_assigned?: boolean | null
          ticket_code?: string
          tier?: string
        }
        Relationships: []
      }
      tickets_assigned: {
        Row: {
          assigned_at: string
          id: string
          owner_email: string
          owner_name: string
          owner_phone: string | null
          owner_type: string
          purchase_id: string | null
          sale_id: string | null
          ticket_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          owner_email: string
          owner_name: string
          owner_phone?: string | null
          owner_type: string
          purchase_id?: string | null
          sale_id?: string | null
          ticket_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          owner_email?: string
          owner_name?: string
          owner_phone?: string | null
          owner_type?: string
          purchase_id?: string | null
          sale_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tickets_assigned_sale"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "seller_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "client_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_serial_registry: {
        Row: {
          buyer_purchase_id: string | null
          buyer_registered_at: string | null
          buyer_status: string | null
          created_at: string
          id: string
          product_id: string | null
          registered_at: string | null
          registered_by_purchase_id: string | null
          seller_id: string | null
          seller_registered_at: string | null
          seller_sale_id: string | null
          seller_status: string | null
          serial_number: string
          status_serial: string
          ticket_multiplier: number
          tier: string
          updated_at: string
        }
        Insert: {
          buyer_purchase_id?: string | null
          buyer_registered_at?: string | null
          buyer_status?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          registered_at?: string | null
          registered_by_purchase_id?: string | null
          seller_id?: string | null
          seller_registered_at?: string | null
          seller_sale_id?: string | null
          seller_status?: string | null
          serial_number: string
          status_serial?: string
          ticket_multiplier?: number
          tier?: string
          updated_at?: string
        }
        Update: {
          buyer_purchase_id?: string | null
          buyer_registered_at?: string | null
          buyer_status?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          registered_at?: string | null
          registered_by_purchase_id?: string | null
          seller_id?: string | null
          seller_registered_at?: string | null
          seller_sale_id?: string | null
          seller_status?: string | null
          serial_number?: string
          status_serial?: string
          ticket_multiplier?: number
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_serial_registry_buyer_purchase_id_fkey"
            columns: ["buyer_purchase_id"]
            isOneToOne: false
            referencedRelation: "client_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_serial_registry_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_serial_registry_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_serial_registry_registered_by_purchase_id_fkey"
            columns: ["registered_by_purchase_id"]
            isOneToOne: false
            referencedRelation: "client_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_serial_registry_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_serial_registry_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_serial_registry_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking_by_city"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_serial_registry_seller_sale_id_fkey"
            columns: ["seller_sale_id"]
            isOneToOne: false
            referencedRelation: "seller_sales"
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
      v_seller_ranking: {
        Row: {
          full_name: string | null
          id: string | null
          ranking_position: number | null
          store_city: string | null
          store_name: string | null
          total_points: number | null
          total_sales: number | null
        }
        Relationships: []
      }
      v_seller_ranking_by_city: {
        Row: {
          city_ranking: number | null
          full_name: string | null
          id: string | null
          store_city: string | null
          store_name: string | null
          total_points: number | null
          total_sales: number | null
        }
        Relationships: []
      }
      v_top_products: {
        Row: {
          id: string | null
          model_name: string | null
          product_ranking: number | null
          screen_size: number | null
          tier: string | null
          total_registrations: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_coupon_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rpc_assign_tickets: {
        Args: {
          p_count: number
          p_owner_email: string
          p_owner_name: string
          p_owner_phone?: string
          p_purchase_id: string
          p_tier: string
        }
        Returns: {
          ticket_code: string
        }[]
      }
      rpc_city_rankings: {
        Args: never
        Returns: {
          city: string
          rank_position: number
          total_points: number
          total_sales: number
          total_sellers: number
        }[]
      }
      rpc_kb_search: {
        Args: { max_results?: number; query_text: string }
        Returns: {
          category: string
          content: string
          id: string
          rank: number
          title: string
        }[]
      }
      rpc_public_rankings: {
        Args: never
        Returns: {
          display_name: string
          rank_position: number
          ranking_type: string
          store_city: string
          total_points: number
          total_sales: number
        }[]
      }
      rpc_register_buyer_serial: {
        Args: {
          p_birth_date: string
          p_ci_back_url?: string
          p_ci_front_url?: string
          p_ci_number: string
          p_city: string
          p_department: string
          p_email: string
          p_full_name: string
          p_invoice_number: string
          p_invoice_url?: string
          p_phone: string
          p_purchase_date: string
          p_serial_number: string
        }
        Returns: Json
      }
      rpc_register_seller_serial: {
        Args: {
          p_client_name: string
          p_client_phone?: string
          p_invoice_number?: string
          p_sale_date?: string
          p_seller_id: string
          p_serial_number: string
        }
        Returns: Json
      }
      rpc_request_seller_role: { Args: never; Returns: boolean }
      rpc_run_draw: {
        Args: {
          p_draw_id: string
          p_finalists_count?: number
          p_preselected_count?: number
        }
        Returns: Json
      }
      rpc_validate_serial: { Args: { p_serial: string }; Returns: Json }
      rpc_validate_serial_v2: {
        Args: { p_for_type?: string; p_serial: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "user"
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
      app_role: ["admin", "seller", "user"],
    },
  },
} as const
