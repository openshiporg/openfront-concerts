'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SingleSelect from '@/components/ui/single-select';
import { ActionButton } from '../../components/ActionButton';
import { runTyped } from '../../lib/commands';

type Option = { value: string; label: string };
const AGES: Option[] = [{ value: 'all_ages', label: 'All ages' }, { value: '18_plus', label: '18+' }, { value: '21_plus', label: '21+' }];

/** Challenge, release, or confirm a hold into a draft event on a published chart. */
export function HoldActions({ holdId, status, charts, artist }: { holdId: string; status: string; charts: Option[]; artist?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(artist || '');
  const [chartId, setChartId] = useState(charts[0]?.value || '');
  const [doors, setDoors] = useState('19:00');
  const [show, setShow] = useState('20:00');
  const [age, setAge] = useState('all_ages');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [key] = useState(() => crypto.randomUUID());
  if (!['held', 'challenged'].includes(status)) return null;
  const confirm = async () => {
    setPending(true); setError('');
    try {
      const r = await runTyped('confirmHold', 'OperatorCommandInput', { idempotencyKey: key, holdId, title: title.trim(), seatingChartId: chartId, doorsTime: doors, showTime: show, ageRestriction: age });
      router.push(`/dashboard/platform/events/${r.eventId}`);
    } catch (e: any) { setError(e.message); setPending(false); }
  };
  return (
    <div className="flex w-full flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {status === 'held' ? <ActionButton command="challengeHold" input={{ holdId }}>Challenge</ActionButton> : null}
        <ActionButton command="releaseDateHold" input={{ holdId, reason: 'Released by promoter' }}>Release hold</ActionButton>
        {!open ? <Button size="sm" onClick={() => setOpen(true)}>Confirm</Button> : null}
      </div>
      {open ? (
        <div className="w-full space-y-2 rounded-md border p-3 sm:w-80">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" aria-label="Event title" />
          <SingleSelect value={chartId} onChange={setChartId} options={charts} placeholder="Published chart" emptyIndicator="No published chart for this venue." />
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm">Doors <Input value={doors} onChange={(e) => setDoors(e.target.value)} className="w-20" aria-label="Doors time" /></label>
            <label className="flex items-center gap-2 text-sm">Show <Input value={show} onChange={(e) => setShow(e.target.value)} className="w-20" aria-label="Show time" /></label>
          </div>
          <SingleSelect value={age} onChange={setAge} options={AGES} placeholder="Age" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending || !title.trim() || !chartId} onClick={confirm}>{pending ? 'Working…' : 'Confirm date'}</Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
