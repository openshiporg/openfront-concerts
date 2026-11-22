'use client';

import * as React from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Reads ticket QR codes with the device camera (Comedy Club's door scanner). Uses the browser's BarcodeDetector where it
 * reads QR codes (Chrome, Android); elsewhere (Safari, Firefox) frames go to a small canvas decoded with jsQR, loaded
 * only when the camera starts. The same code is ignored while it stays in view and for four seconds after.
 */
type Detect = (v: HTMLVideoElement) => Promise<string[]>;

async function makeDetector(): Promise<Detect> {
  const Native = (window as any).BarcodeDetector;
  if (Native && (await Native.getSupportedFormats?.().catch(() => []))?.includes('qr_code')) {
    const d = new Native({ formats: ['qr_code'] });
    return async (v) => (await d.detect(v)).map((c: any) => String(c.rawValue || ''));
  }
  const jsQR = (await import('jsqr')).default;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  return async (v) => {
    if (!v.videoWidth) return [];
    const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * scale); canvas.height = Math.round(v.videoHeight * scale);
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const hit = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
    return hit?.data ? [hit.data] : [];
  };
}

export function CameraScan({ onCode, busy }: { onCode: (code: string) => void; busy?: boolean }) {
  const [supported, setSupported] = React.useState(false);
  const [on, setOn] = React.useState(false);
  const [error, setError] = React.useState('');
  const video = React.useRef<HTMLVideoElement>(null);
  const handler = React.useRef(onCode); handler.current = onCode;
  const paused = React.useRef(false); paused.current = Boolean(busy);
  React.useEffect(() => { setSupported(typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null; let timer: ReturnType<typeof setTimeout> | null = null; let stopped = false;
    const recent = new Map<string, number>();
    (async () => {
      try {
        const detect = await makeDetector();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream; await video.current.play();
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            if (!paused.current) for (const raw of await detect(video.current)) {
              const v = raw.trim(); const now = Date.now();
              if (!v) continue;
              const seen = (recent.get(v) || 0) > now; recent.set(v, now + 4000);
              if (!seen) handler.current(v);
            }
          } catch { /* a frame that cannot be read is skipped */ }
          timer = setTimeout(tick, 250);
        };
        void tick();
      } catch (e: any) { setError(e?.name === 'NotAllowedError' ? 'Camera access was refused. Allow the camera for this site, or type the code.' : 'The camera could not be started. Type the code instead.'); setOn(false); }
    })();
    return () => { stopped = true; if (timer) clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [on]);
  if (!supported) return null;
  return (
    <div className="space-y-2">
      <Button type="button" variant={on ? 'outline' : 'default'} className="h-11 w-full sm:w-auto" onClick={() => { setError(''); setOn((v) => !v); }}>
        {on ? <CameraOff className="size-4" aria-hidden /> : <Camera className="size-4" aria-hidden />}{on ? 'Stop camera' : 'Scan with camera'}
      </Button>
      {on ? <video ref={video} muted playsInline aria-label="Camera view: hold the ticket's QR code in the square" className="aspect-square w-full max-w-sm rounded-lg bg-black object-cover" /> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
