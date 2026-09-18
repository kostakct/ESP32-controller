import React, { useState } from 'react';
import { X, Smartphone, QrCode, Copy, Check, ExternalLink, Download, HardDrive, ArrowRight } from 'lucide-react';

interface MobileTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileTestModal: React.FC<MobileTestModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = () => {
    if (currentUrl) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Simple QR code image URL generator via trusted API for quick camera scanning
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    currentUrl
  )}&bgcolor=ffffff&color=0284c7&margin=2`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-sky-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Otestovat na Android telefonu
              </h3>
              <p className="text-xs text-slate-500">
                Spusťte web přímo na svém mobilu jako aplikaci
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs sm:text-sm">
          {/* Method 1: QR Code Scan */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
              1. Způsob: Naskenujte fotoaparátem telefonu
            </span>
            <div className="inline-block p-2 bg-white rounded-2xl border-2 border-sky-200 shadow-sm">
              <img
                src={qrApiUrl}
                alt="QR Kód pro otevření na telefonu"
                className="w-44 h-44 mx-auto rounded-lg"
                loading="lazy"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Namiřte fotoaparát svého telefonu na QR kód a otevřete odkaz v prohlížeči Chrome.
            </p>
          </div>

          {/* Method 2: Copy Link */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
              2. Způsob: Zkopírovat přímý odkaz
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono text-slate-700 truncate"
              />
              <button
                onClick={handleCopyUrl}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-medium text-xs flex items-center gap-1 transition flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Zkopírováno' : 'Kopírovat'}</span>
              </button>
            </div>
          </div>

          {/* Android PWA tip */}
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3.5 space-y-1.5 text-sky-900">
            <div className="flex items-center gap-1.5 font-bold text-xs text-sky-800">
              <ArrowRight className="w-4 h-4 text-sky-600" />
              <span>Jak zapnout režim plné aplikace (bez adresního řádku):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-sky-900/90 pl-1">
              <li>Otevřete odkaz v Google Chrome na Androidu.</li>
              <li>Klikněte vpravo nahoře na <strong>tři tečky (Menu)</strong>.</li>
              <li>Zvolte <strong>„Přidat na plochu“</strong> nebo <strong>„Nainstalovat aplikaci“</strong>.</li>
              <li>Ikona <em>ESP eWeLink</em> se objeví na domovské obrazovce a poběží na celý displej!</li>
            </ol>
          </div>

          {/* Method 3: How to flash to ESP32 */}
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
              <HardDrive className="w-4 h-4" />
              <span>Stažení pro nahrání přímo do ESP32-S3 (LittleFS):</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              V Google AI Studio nahoře klikněte na menu a zvolte <strong>„Export ZIP“</strong>.
              Následně spusťte <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">npm run build</code> a složku <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">dist</code> nahrajte přes Arduino IDE / PlatformIO do paměti LittleFS na ESP32. ESP32-S3 pak tyto soubory servíruje v domácí síti úplně bez internetu!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
