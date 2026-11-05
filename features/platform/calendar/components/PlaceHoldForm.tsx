'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SingleSelect from '@/components/ui/single-select';
import { PlatformDatePicker } from '../../components/PlatformDatePicker';
import { runTyped } from '../../lib/commands';

type Option = { value: string; label: string };

/** Ranked date hold for a venue day. The server refuses taken ranks, past dates and confirmed days. */
export function PlaceHoldForm({ venues, artists }: { venues: Option[]; artists: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [venueId, setVenueId] = useState(venues[0]?.value || '');
  const [artistId, setArtistId] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [expires, setExpires] = useState<Date | undefined>();
  const [rank, setRank] = useState('1');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>Place hold</Button>;
  const n = Number(rank);
  const ready = venueId && date && Number.isInteger(n) && n >= 1;
  const run = async () => {
    setPending(true); setError(''); setMessage('');
    try {
      const input: Record<string, unknown> = { idempotencyKey: key, venueId, date: format(date!, 'yyyy-MM-dd'), rank: n };
      if (artistId) input.artistId = artistId;
      if (expires) input.expiresAt = new Date(expires.getFullYear(), expires.getMonth(), expires.getDate(), 23, 59).toISOString();
      await runTyped('placeDateHold', 'OperatorCommandInput', input);
      setMessage(`Hold placed at rank ${n}.`); setKey(crypto.randomUUID()); router.refresh();
    } catch (e: any) { setError(e.message); }
    finally { setPending(false); }
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (
    <section className="w-full space-y-2 rounded-lg border p-4 sm:max-w-md">
      <h2 className="text-sm font-medium">Place hold</h2>
      <SingleSelect value={venueId} onChange={setVenueId} options={venues} placeholder="Venue" searchPlaceholder="Search venues" />
      <SingleSelect value={artistId} onChange={setArtistId} options={[{ value: '', label: 'Open (no artist)' }, ...artists]} placeholder="Artist" searchPlaceholder="Search artists" />
      <div className="flex flex-wrap items-center gap-2">
        <PlatformDatePicker value={date} onChange={setDate} placeholder="Show date" fromDate={today} className="h-9 text-sm" />
        <PlatformDatePicker value={expires} onChange={setExpires} placeholder="Expires (7 days)" fromDate={today} className="h-9 text-sm" />
        <Input value={rank} onChange={(e) => setRank(e.target.value)} inputMode="numeric" className="w-20" aria-label="Rank" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending || !ready} onClick={run}>{pending ? 'Working…' : 'Place hold'}</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
