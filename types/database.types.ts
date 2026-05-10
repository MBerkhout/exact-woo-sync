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
      tenants: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tenant_members: {
        Row: {
          tenant_id: string;
          user_id: string;
          role: "admin" | "viewer";
          created_at: string;
        };
        Insert: {
          tenant_id: string;
          user_id: string;
          role?: "admin" | "viewer";
          created_at?: string;
        };
        Update: {
          role?: "admin" | "viewer";
          created_at?: string;
        };
        Relationships: [];
      };
      tenant_invites: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          role: "admin" | "viewer";
          token_hash: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          email: string;
          role?: "admin" | "viewer";
          token_hash: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          email?: string;
          role?: "admin" | "viewer";
          token_hash?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      connectors: {
        Row: {
          id: string;
          tenant_id: string;
          kind: string;
          name: string;
          config: Json;
          secrets_ref: string | null;
          version: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          kind: string;
          name: string;
          config?: Json;
          secrets_ref?: string | null;
          version?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          kind?: string;
          name?: string;
          config?: Json;
          secrets_ref?: string | null;
          version?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      connector_pairs: {
        Row: {
          id: string;
          tenant_id: string;
          source_connector_id: string;
          target_connector_id: string;
          feature_toggles: Json;
          settings: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          source_connector_id: string;
          target_connector_id: string;
          feature_toggles?: Json;
          settings?: Json;
          created_at?: string;
        };
        Update: {
          feature_toggles?: Json;
          settings?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      oauth_states: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          state: string;
          connector_id: string;
          region: string;
          env: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          state: string;
          connector_id: string;
          region: string;
          env: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          expires_at?: string;
        };
        Relationships: [];
      };
      sync_logs: {
        Row: {
          id: string;
          tenant_id: string;
          pair_id: string | null;
          connector_id: string | null;
          direction: string;
          entity_kind: string | null;
          entity_id: string | null;
          status: string;
          http_status: number | null;
          duration_ms: number | null;
          redacted_payload: Json | null;
          error: Json | null;
          created_at: string;
          expires_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tenant_role: "admin" | "viewer";
    };
    CompositeTypes: Record<string, never>;
  };
}
