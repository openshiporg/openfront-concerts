'use client';

import * as React from 'react';
import QRCode from 'qrcode';

/** A scannable code for one ticket. It carries the ticket's scan secret, which the door accepts like a typed ticket code. */
export function TicketQr({ value, label }: { value: string; label: string }) {
  const [svg, setSvg] = React.useState('');
  React.useEffect(() => {
    let live = true;
    if (!/^[0-9A-Za-z-]{6,128}$/.test(value || '')) { setSvg(''); return; }
    QRCode.toString(value, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
      .then((s) => { if (live) setSvg(s); })
      .catch(() => { if (live) setSvg(''); });
    return () => { live = false; };
  }, [value]);
  if (!svg) return <div className="size-36 shrink-0 rounded-md bg-white" aria-hidden />;
  // the SVG comes from the local encoder over a validated value, never from user-supplied markup
  return <div role="img" aria-label={label} data-testid="ticket-qr" className="size-36 shrink-0 rounded-md bg-white [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
