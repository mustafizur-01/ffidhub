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
      ai_image_generations: {
        Row: {
          created_at: string
          id: string
          prompt: string | null
          source: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          prompt?: string | null
          source?: string
          success?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string | null
          source?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      auctions: {
        Row: {
          bid_count: number
          created_at: string
          current_bid: number | null
          current_bidder: string | null
          ends_at: string
          id: string
          listing_id: string
          min_increment: number
          seller_id: string
          settled_at: string | null
          start_price: number
          status: string
          updated_at: string
        }
        Insert: {
          bid_count?: number
          created_at?: string
          current_bid?: number | null
          current_bidder?: string | null
          ends_at: string
          id?: string
          listing_id: string
          min_increment?: number
          seller_id: string
          settled_at?: string | null
          start_price: number
          status?: string
          updated_at?: string
        }
        Update: {
          bid_count?: number
          created_at?: string
          current_bid?: number | null
          current_bidder?: string | null
          ends_at?: string
          id?: string
          listing_id?: string
          min_increment?: number
          seller_id?: string
          settled_at?: string | null
          start_price?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auctions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "id_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_transactions: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          id: string
          new_balance: number
          note: string | null
          previous_balance: number
          profile_id: string
          transaction_type: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          id?: string
          new_balance: number
          note?: string | null
          previous_balance: number
          profile_id: string
          transaction_type: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          id?: string
          new_balance?: number
          note?: string | null
          previous_balance?: number
          profile_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      buyer_reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          listing_id: string
          rating: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          listing_id: string
          rating: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          screenshot_url: string | null
          status: string
          updated_at: string
          user_id: string
          utr_number: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          utr_number: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          utr_number?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: []
      }
      id_listings: {
        Row: {
          account_login_id: string | null
          account_password: string | null
          binded_email: string | null
          contact_number: string
          created_at: string
          featured_until: string | null
          id: string
          id_level: number
          image_url: string | null
          is_email_binded: boolean
          key_items: string
          listing_type: string
          login_method: Database["public"]["Enums"]["login_method"]
          price: number
          security_code: string | null
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          account_login_id?: string | null
          account_password?: string | null
          binded_email?: string | null
          contact_number: string
          created_at?: string
          featured_until?: string | null
          id?: string
          id_level: number
          image_url?: string | null
          is_email_binded?: boolean
          key_items: string
          listing_type?: string
          login_method: Database["public"]["Enums"]["login_method"]
          price: number
          security_code?: string | null
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          account_login_id?: string | null
          account_password?: string | null
          binded_email?: string | null
          contact_number?: string
          created_at?: string
          featured_until?: string | null
          id?: string
          id_level?: number
          image_url?: string | null
          is_email_binded?: boolean
          key_items?: string
          listing_type?: string
          login_method?: Database["public"]["Enums"]["login_method"]
          price?: number
          security_code?: string | null
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          listing_id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          listing_id: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          listing_id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "id_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          amount: number
          buyer_id: string
          counter_amount: number | null
          created_at: string
          expires_at: string
          id: string
          listing_id: string
          message: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          counter_amount?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          listing_id: string
          message?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          counter_amount?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "id_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_verified_seller: boolean
          last_daily_claim_at: string | null
          referral_code: string
          referral_reward_claimed: boolean
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_verified_seller?: boolean
          last_daily_claim_at?: string | null
          referral_code: string
          referral_reward_claimed?: boolean
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_verified_seller?: boolean
          last_daily_claim_at?: string | null
          referral_code?: string
          referral_reward_claimed?: boolean
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          buyer_id: string
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          dispute_reason: string | null
          disputed_at: string | null
          id: string
          listing_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          listing_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          listing_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "id_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          listing_id: string
          rating: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          listing_id: string
          rating: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_verification_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          experience: string | null
          ff_uid: string
          full_name: string
          id: string
          in_game_name: string
          phone: string
          reason: string | null
          screenshot_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          experience?: string | null
          ff_uid: string
          full_name: string
          id?: string
          in_game_name: string
          phone: string
          reason?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          experience?: string | null
          ff_uid?: string
          full_name?: string
          id?: string
          in_game_name?: string
          phone?: string
          reason?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_reports: {
        Row: {
          admin_note: string | null
          category: string
          contact_email: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          category?: string
          contact_email: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          category?: string
          contact_email?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tournament_participants: {
        Row: {
          ff_name: string | null
          ff_uid: string | null
          id: string
          joined_at: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          ff_name?: string | null
          ff_uid?: string | null
          id?: string
          joined_at?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          ff_name?: string | null
          ff_uid?: string | null
          id?: string
          joined_at?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entry_fee: number
          game_mode: string
          game_name: string
          id: string
          image_url: string | null
          max_players: number
          prize_pool: number
          room_id: string | null
          room_password: string | null
          start_time: string
          status: Database["public"]["Enums"]["tournament_status"]
          title: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_fee?: number
          game_mode?: string
          game_name?: string
          id?: string
          image_url?: string | null
          max_players?: number
          prize_pool?: number
          room_id?: string | null
          room_password?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["tournament_status"]
          title: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_fee?: number
          game_mode?: string
          game_name?: string
          id?: string
          image_url?: string | null
          max_players?: number
          prize_pool?: number
          room_id?: string | null
          room_password?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          title?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verified_members: {
        Row: {
          created_at: string
          email: string
          id: string
          member_code: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          member_code: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          member_code?: string
        }
        Relationships: []
      }
      vip_subscriptions: {
        Row: {
          admin_note: string | null
          amount: number
          boosts_quota: number
          boosts_used: number
          created_at: string
          expires_at: string | null
          id: string
          screenshot_url: string | null
          started_at: string | null
          status: string
          tier: string
          updated_at: string
          user_id: string
          utr_number: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          boosts_quota?: number
          boosts_used?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          screenshot_url?: string | null
          started_at?: string | null
          status?: string
          tier: string
          updated_at?: string
          user_id: string
          utr_number?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          boosts_quota?: number
          boosts_used?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          screenshot_url?: string | null
          started_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
          utr_number?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_holder: string
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          status: string
          updated_at: string
          upi_id: string
          user_id: string
        }
        Insert: {
          account_holder: string
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          upi_id: string
          user_id: string
        }
        Update: {
          account_holder?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          upi_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_seller_verification: {
        Args: { _approve: boolean; _note?: string; _req_id: string }
        Returns: Json
      }
      admin_approve_vip: {
        Args: { _approve: boolean; _note?: string; _sub_id: string }
        Returns: Json
      }
      admin_resolve_dispute: {
        Args: { _action: string; _note?: string; _purchase_id: string }
        Returns: Json
      }
      claim_daily_reward: { Args: never; Returns: Json }
      claim_referral_reward: { Args: never; Returns: Json }
      confirm_purchase: { Args: { _purchase_id: string }; Returns: Json }
      create_auction: {
        Args: {
          _duration_hours: number
          _listing_id: string
          _start_price: number
        }
        Returns: Json
      }
      create_offer: {
        Args: { _amount: number; _listing_id: string; _message?: string }
        Returns: Json
      }
      dispute_purchase: {
        Args: { _purchase_id: string; _reason: string }
        Returns: Json
      }
      feature_listing: {
        Args: { _days: number; _listing_id: string }
        Returns: Json
      }
      generate_referral_code: { Args: never; Returns: string }
      get_active_vip: {
        Args: { _user_id: string }
        Returns: {
          boosts_quota: number
          boosts_used: number
          expires_at: string
          tier: string
        }[]
      }
      get_ai_image_stats: { Args: never; Returns: Json }
      get_featured_sellers: {
        Args: { _limit?: number }
        Returns: {
          active_listings: number
          avatar_url: string
          avg_rating: number
          display_name: string
          email: string
          total_sales: number
          user_id: string
        }[]
      }
      get_gold_vip_user_ids: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      get_listing_credentials: {
        Args: { _listing_id: string }
        Returns: {
          account_login_id: string
          account_password: string
          binded_email: string
          contact_number: string
          security_code: string
        }[]
      }
      get_marketplace_stats: { Args: never; Returns: Json }
      get_recently_sold_listings: {
        Args: { _limit?: number }
        Returns: {
          id: string
          id_level: number
          image_url: string
          is_email_binded: boolean
          key_items: string
          login_method: string
          price: number
          seller_id: string
          sold_at: string
        }[]
      }
      get_seller_public_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          is_verified_seller: boolean
          user_id: string
        }[]
      }
      get_seller_stats: { Args: { _user_id: string }; Returns: Json }
      get_tournament_credentials: {
        Args: { _tournament_id: string }
        Returns: {
          room_id: string
          room_password: string
        }[]
      }
      get_user_reputation: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_listing_sold: { Args: { _listing_id: string }; Returns: boolean }
      is_verified_seller: { Args: { _user_id: string }; Returns: boolean }
      mark_purchase_delivered: { Args: { _purchase_id: string }; Returns: Json }
      place_bid: {
        Args: { _amount: number; _auction_id: string }
        Returns: Json
      }
      purchase_vip_with_balance: { Args: { _tier: string }; Returns: Json }
      request_vip:
        | { Args: { _tier: string; _utr: string }; Returns: Json }
        | {
            Args: { _screenshot_url?: string; _tier: string; _utr: string }
            Returns: Json
          }
      request_withdrawal: {
        Args: { _account_holder: string; _amount: number; _upi_id: string }
        Returns: Json
      }
      respond_offer: {
        Args: { _action: string; _counter?: number; _offer_id: string }
        Returns: Json
      }
      settle_auction: { Args: { _auction_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      login_method: "FB" | "Google" | "VK"
      tournament_status: "upcoming" | "ongoing" | "completed" | "cancelled"
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
      app_role: ["admin", "user"],
      login_method: ["FB", "Google", "VK"],
      tournament_status: ["upcoming", "ongoing", "completed", "cancelled"],
    },
  },
} as const
