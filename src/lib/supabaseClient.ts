import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Appka dál "nespadne", ale Supabase funkce nebudou fungovat, dokud
  // nejsou proměnné VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY nastavené -
  // lokálně v .env, při GitHub Pages buildu jako GitHub Actions Secrets.
  console.error(
    '[Supabase] Chybí VITE_SUPABASE_URL nebo VITE_SUPABASE_ANON_KEY. ' +
    'Zkontroluj .env (lokálně) nebo GitHub Actions Secrets (nasazení).'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

// Typy odpovídající tabulkám ze supabase_migration_s1.sql (Fáze S1).
// Rozšíří se, jakmile přibudou další sloupce/tabulky v dalších fázích.
export interface DeviceRow {
  id: string;
  board_id: string;
  name: string;
  type: string;
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

export interface ComponentRow {
  id: string;
  device_id: string;
  local_index: number;
  type: 'relay' | 'input' | 'sensor_temp' | 'sensor_humidity';
  name: string;
  sort_order: number;
  visible: boolean;
  created_at: string;
}

export interface ComponentStateRow {
  component_id: string;
  is_on: boolean | null;
  value: Record<string, unknown> | null;
  updated_at: string;
}
