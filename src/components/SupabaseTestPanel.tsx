import { useEffect, useState } from 'react';
import { Database, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase, type DeviceRow, type ComponentRow } from '../lib/supabaseClient';

/*
 * DOČASNÝ diagnostický panel pro Fázi S1 - ověřuje, že appka umí reálně
 * přečíst data ze Supabase (devices + components ze supabase_migration_s1.sql).
 * Nic z appky na tom zatím nezávisí (MQTT běží dál beze změny) - jde čistě
 * o potvrzení "appka <-> Supabase spojení funguje", než půjdeme do Fáze S2.
 * Až bude ověřeno, tenhle panel klidně z appky odstraníme.
 */
export function SupabaseTestPanel() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<string>('Zatím žádná živá změna nepřišla.');
  const [realtimeCount, setRealtimeCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data: devData, error: devErr } = await supabase.from('devices').select('*');
      if (devErr) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(`Chyba při čtení 'devices': ${devErr.message}`);
        }
        return;
      }

      const { data: compData, error: compErr } = await supabase.from('components').select('*');
      if (compErr) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(`Chyba při čtení 'components': ${compErr.message}`);
        }
        return;
      }

      if (!cancelled) {
        setDevices(devData ?? []);
        setComponents(compData ?? []);
        setStatus('ok');
      }
    }

    run();

    // Fáze S2: živá demonstrace Realtime - appka (nebo ESP32 v budoucnu)
    // zapisuje stav do component_state, a tenhle panel ukáže, že o tom
    // ví OKAMŽITĚ, bez nutnosti stránku obnovit.
    const channel = supabase
      .channel('component_state_test')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'component_state' },
        (payload) => {
          setRealtimeCount((c) => c + 1);
          const row = payload.new as { component_id?: string; is_on?: boolean | null };
          setLastRealtimeEvent(
            `${new Date().toLocaleTimeString('cs-CZ')} — prvek ${row.component_id?.slice(0, 8)}... -> is_on=${row.is_on}`
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-bold text-slate-800">Supabase — test připojení (Fáze S1)</h3>
      </div>

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Připojuji se k Supabase...
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Spojení selhalo</div>
            <div className="font-mono mt-0.5 break-words">{errorMsg}</div>
            <div className="mt-1.5 text-slate-500">
              Nejčastější příčiny: chybí/špatné VITE_SUPABASE_URL nebo
              VITE_SUPABASE_ANON_KEY (zkontroluj .env), nebo ještě nebyl
              spuštěný SQL skript (supabase_migration_s1.sql).
            </div>
          </div>
        </div>
      )}

      {status === 'ok' && (
        <div className="text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            Připojeno! Nalezeno {devices.length} zařízení, {components.length} prvků.
          </div>
          {devices.map((d) => (
            <div key={d.id} className="pl-5 text-slate-600">
              • <span className="font-semibold">{d.name}</span> ({d.board_id})
            </div>
          ))}

          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="font-bold text-slate-700">
              Realtime: {realtimeCount} živých změn přijato
            </div>
            <div className="font-mono text-[10.5px] text-slate-500 break-words">{lastRealtimeEvent}</div>
          </div>
        </div>
      )}
    </div>
  );
}
