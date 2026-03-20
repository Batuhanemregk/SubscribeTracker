/**
 * Supabase Database Types
 * 
 * These types match the database schema defined in implementation_plan.md
 * After creating the schema in Supabase, you can generate these types with:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          country: string;
          currency: string;
          is_pro: boolean;
          pro_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          country?: string;
          currency?: string;
          is_pro?: boolean;
          pro_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          country?: string;
          currency?: string;
          is_pro?: boolean;
          pro_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          currency: string;
          cycle: string;
          next_billing_date: string | null;
          category: string;
          icon_key: string;
          color_key: string;
          logo_url: string | null;
          status: string;
          source: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          currency: string;
          cycle: string;
          next_billing_date?: string | null;
          category?: string;
          icon_key?: string;
          color_key?: string;
          logo_url?: string | null;
          status?: string;
          source?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          amount?: number;
          currency?: string;
          cycle?: string;
          next_billing_date?: string | null;
          category?: string;
          icon_key?: string;
          color_key?: string;
          logo_url?: string | null;
          status?: string;
          source?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_catalog: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          logo_url: string | null;
          category: string;
          icon: string;
          color: string;
          prices: Json | null;
          plans: Json | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          domain?: string | null;
          logo_url?: string | null;
          category?: string;
          icon?: string;
          color?: string;
          prices?: Json | null;
          plans?: Json | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          domain?: string | null;
          logo_url?: string | null;
          category?: string;
          icon?: string;
          color?: string;
          prices?: Json | null;
          plans?: Json | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type ServiceCatalog = Database['public']['Tables']['service_catalog']['Row'];
