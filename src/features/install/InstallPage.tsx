import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Printer,
  Share,
  Chrome,
  Apple,
  CheckCircle2,
} from 'lucide-react';

export const InstallPage: React.FC = () => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aimfitness.app';

  useEffect(() => {
    // Generate QR code for the application URL
    QRCode.toDataURL(currentUrl, {
      width: 400,
      margin: 1,
      color: {
        dark: '#0f1117',
        light: '#ffffff',
      },
    }).then((url) => {
      setQrDataUrl(url);
    });

    // Capture PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [currentUrl]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in py-2">
      {/* Controls header (hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">App Installation Poster</h1>
          <p className="text-xs text-slate-400">
            Print this poster for the AIM Fitness gym wall or front desk counter
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isInstalled && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" /> Installed
            </span>
          )}
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/30 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Install on This Device</span>
            </button>
          )}

          <button
            onClick={handlePrintPoster}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-aim-400" />
            <span>Print Wall Poster</span>
          </button>
        </div>
      </div>

      {/* WALL POSTER CONTAINER (Formatted for crisp A4 portrait printing) */}
      <div className="flex justify-center">
        <div
          id="gym-wall-poster"
          className="w-full max-w-[500px] bg-dark-950 rounded-3xl border-2 border-dark-750 p-8 shadow-2xl flex flex-col items-center text-center space-y-6 print:border-none print:shadow-none print:p-4 print:max-w-none"
        >
          {/* Logo & Headline */}
          <div className="space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-aim-500/20 border-2 border-aim-500/40 flex items-center justify-center mx-auto text-aim-500 font-black text-2xl shadow-lg shadow-aim-500/20">
              AIM
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              AIM FITNESS <span className="text-aim-500">APP</span>
            </h2>
            <p className="text-xs sm:text-sm text-aim-400 font-bold uppercase tracking-widest">
              Ratnagiri • Offline Member Portal & ID
            </p>
          </div>

          {/* Large QR Code */}
          <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-aim-500 max-w-[280px]">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="AIM Fitness App QR"
                className="w-full h-auto aspect-square object-contain"
              />
            )}
          </div>

          <div className="text-xs text-slate-300 font-medium">
            Scan with your phone camera to open & install the official app.
          </div>

          {/* STEP BY STEP GUIDES */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
            {/* Android */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Chrome className="w-4 h-4 text-emerald-400" />
                <span>Android (Chrome)</span>
              </div>
              <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside">
                <li>Scan QR with Camera or Chrome.</li>
                <li>Tap menu (<strong>⋮</strong>) in Chrome.</li>
                <li>Tap <strong>&ldquo;Install App&rdquo;</strong> or <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</li>
              </ol>
            </div>

            {/* iPhone */}
            <div className="p-4 rounded-2xl bg-dark-900 border border-dark-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Apple className="w-4 h-4 text-slate-200" />
                <span>iPhone (Safari)</span>
              </div>
              <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside">
                <li>Scan QR using Camera app.</li>
                <li>Open page in <strong>Safari</strong>.</li>
                <li>Tap <strong>Share</strong> (<Share className="w-3 h-3 inline mx-0.5" />) ➔ <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</li>
              </ol>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-2 text-[11px] text-slate-400 border-t border-dark-850 w-full flex items-center justify-between">
            <span>Instagram: @aimfitness_ratnagiri</span>
            <span className="text-aim-400 font-semibold">Aim High. Train Hard.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
