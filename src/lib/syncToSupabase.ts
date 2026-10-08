import { supabase } from './supabaseClient';

/*
 * =============================================================================
 * FÁZE S2 — zrcadlení reálného stavu (z MQTT telemetrie) do Supabase.
 * =============================================================================
 * Appka už umí reálný stav relé/vstupů z ESP32 (přes MQTT) - tenhle modul ho
 * navíc zapisuje i do Supabase `component_state`, aby:
 *   1) šlo ověřit, že zápisová cesta appka -> Supabase funguje,
 *   2) existovala reálná data pro Realtime demo (více zařízení vidí totéž),
 *   3) bylo co "přepnout" ve Fázi S3, až zápis převezme přímo ESP32 (Edge
 *      Function), appka jen přestane volat tyhle funkce a začne Supabase
 *      jen číst.
 *
 * Appka se podle zápisu sem (zatím) VŮBEC neřídí - je to čistě jednosměrné
 * zrcadlo pro ověření, ne zdroj pravdy. Chyby zápisu se jen zalogují do
 * konzole, appka kvůli nim nikdy nic nepřeruší.
 * =============================================================================
 */

let componentIdMap: Record<string, string> | null = null;
let loadingPromise: Promise<void> | null = null;

async function loadComponentMap(boardId: string): Promise<void> {
  const { data: device, error: devErr } = await supabase
    .from('devices')
    .select('id')
    .eq('board_id', boardId)
    .single();

  if (devErr || !device) {
    console.error('[Supabase sync] Zařízení nenalezeno:', devErr?.message);
    componentIdMap = {};
    return;
  }

  const { data: components, error: compErr } = await supabase
    .from('components')
    .select('id, local_index, type')
    .eq('device_id', device.id);

  if (compErr || !components) {
    console.error('[Supabase sync] Prvky nenalezeny:', compErr?.message);
    componentIdMap = {};
    return;
  }

  const map: Record<string, string> = {};
  for (const c of components) {
    map[`${c.type}:${c.local_index}`] = c.id;
  }
  componentIdMap = map;
  console.log(`[Supabase sync] Načteno ${components.length} prvků pro ${boardId}.`);
}

/** Zavolej jednou při startu appky (board_id pilotní desky). */
export function initSupabaseSync(boardId: string) {
  if (!loadingPromise) {
    loadingPromise = loadComponentMap(boardId);
  }
  return loadingPromise;
}

async function upsertState(key: string, isOn: boolean | null, value: Record<string, unknown> | null = null) {
  if (!componentIdMap) return; // ještě nenačteno - zápis se jednoduše vynechá
  const componentId = componentIdMap[key];
  if (!componentId) return; // tenhle prvek v Supabase zatím neexistuje (v pořádku, jen se přeskočí)

  const { error } = await supabase
    .from('component_state')
    .upsert({ component_id: componentId, is_on: isOn, value, updated_at: new Date().toISOString() });

  if (error) {
    console.warn(`[Supabase sync] Zápis stavu selhal (${key}):`, error.message);
  }
}

export function syncRelayState(localIndex: number, isOn: boolean) {
  void upsertState(`relay:${localIndex}`, isOn);
}

export function syncInputState(localIndex: number, isActive: boolean) {
  void upsertState(`input:${localIndex}`, isActive);
}
