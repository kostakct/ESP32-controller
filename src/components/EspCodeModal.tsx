import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Cpu, ShieldCheck } from 'lucide-react';
import { esp32FirmwareV13Code } from '../espCodeSnippet';

interface EspCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EspCodeModal: React.FC<EspCodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cppCode = esp32FirmwareV13Code;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cppCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">TEST SW ESP32 (.ino firmware)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Verze 13 NVS & Autonomous
                </span>
              </div>
              <p className="text-xs text-slate-400">Zdrojový kód pro Arduino IDE / ESP32-S3 desku s pamětí NVS a autonomním časováním</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Zkopírováno!' : 'Kopírovat kód'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-slate-800/60 px-5 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Cpu className="w-4 h-4 text-sky-400" /> ESP32-S3 (8x Relé, 4x Vstup)
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> NVS Flash paměť & Autonomní časování
            </span>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">
            firmware/ESP32_Controller_V13_NVS.ino
          </span>
        </div>

        {/* Code View Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 select-all leading-relaxed">
          <pre className="whitespace-pre">{cppCode}</pre>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400 text-[11px]">
            Tip: Klikněte na tlačítko <strong>„Kopírovat kód“</strong> a vložte jej přímo do Arduino IDE.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
