'use client';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ActionButton } from '../../components/ActionButton';
import { PlatformDatePicker } from '../../components/PlatformDatePicker';
import { EditorPanel, Field, TextField, toCents, fromCents } from '../../components/EditorForm';

type Section = { id: string; name: string; kind: string; capacity: number };
type Level = { id: string; name: string; priceCents: number; feeCents: number; facilityFeeCents: number; capacity: number; perOrderLimit: number; status: string; sections: { id: string }[] };
type Phase = { id: string; name: string; priceCents: number; quantity: number; sort: number; startsAt: string | null; sold: number };

/** Create or edit a price level: name, face price, fees, capacity, per-order limit and chart sections. */
export function PriceLevelEditor({ eventId, sections, level }: { eventId: string; sections: Section[]; level?: Level }) {
  const [name, setName] = useState(level?.name || '');
  const [price, setPrice] = useState(level ? fromCents(level.priceCents) : '');
  const [fee, setFee] = useState(level ? fromCents(level.feeCents) : '0.00');
  const [facility, setFacility] = useState(level ? fromCents(level.facilityFeeCents) : '0.00');
  const [capacity, setCapacity] = useState(level ? String(level.capacity) : '');
  const [limit, setLimit] = useState(level ? String(level.perOrderLimit) : '8');
  const [chosen, setChosen] = useState<string[]>(level?.sections.map((s) => s.id) || []);
  const build = () => {
    const data = { name: name.trim(), priceCents: toCents(price), feeCents: toCents(fee), facilityFeeCents: toCents(facility), capacity: Number(capacity), perOrderLimit: Number(limit), sectionIds: chosen };
    if (!data.name) return 'Name the level.';
    if ([data.priceCents, data.feeCents, data.facilityFeeCents].some(Number.isNaN)) return 'Enter prices in dollars, e.g. 45.00.';
    if (!Number.isInteger(data.capacity) || data.capacity < 1 || !Number.isInteger(data.perOrderLimit) || data.perOrderLimit < 1) return 'Capacity and per-order limit are whole numbers.';
    if (!chosen.length) return 'Choose at least one section.';
    return level ? { levelId: level.id, data } : { eventId, data };
  };
  return (
    <EditorPanel trigger={level ? 'Edit' : 'Add price level'} variant={level ? 'outline' : 'default'} title={level ? `Edit ${level.name}` : 'New price level'} command="savePriceLevel" build={build}>
      <TextField label="Name" value={name} onChange={setName} wide />
      <TextField label="Price ($)" value={price} onChange={setPrice} inputMode="decimal" />
      <TextField label="Service fee ($)" value={fee} onChange={setFee} inputMode="decimal" />
      <TextField label="Facility fee ($)" value={facility} onChange={setFacility} inputMode="decimal" />
      <TextField label="Capacity" value={capacity} onChange={setCapacity} inputMode="numeric" />
      <TextField label="Per-order limit" value={limit} onChange={setLimit} inputMode="numeric" />
      <Field label="Sections" wide>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {sections.length ? sections.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-2">
              <Checkbox id={`sec-${level?.id || 'new'}-${s.id}`} checked={chosen.includes(s.id)} onCheckedChange={(v) => setChosen((c) => v ? [...c, s.id] : c.filter((x) => x !== s.id))} />
              <label htmlFor={`sec-${level?.id || 'new'}-${s.id}`}>{s.name} <span className="text-muted-foreground">({s.kind === 'ga' ? 'GA' : 'reserved'}, {s.capacity})</span></label>
            </span>
          )) : <span className="text-muted-foreground">The event has no chart sections.</span>}
        </div>
      </Field>
    </EditorPanel>
  );
}

/** Add or edit a tiered price phase (early bird → tier 1 → tier 2). The first started phase with room sells. */
export function PhaseEditor({ levelId, phase, nextSort }: { levelId: string; phase?: Phase; nextSort: number }) {
  const [name, setName] = useState(phase?.name || '');
  const [price, setPrice] = useState(phase ? fromCents(phase.priceCents) : '');
  const [qty, setQty] = useState(phase ? String(phase.quantity) : '');
  const [sort, setSort] = useState(String(phase?.sort ?? nextSort));
  const [starts, setStarts] = useState<Date | undefined>(phase?.startsAt ? new Date(phase.startsAt) : undefined);
  const build = () => {
    const data: Record<string, unknown> = { name: name.trim(), priceCents: toCents(price), quantity: Number(qty), sort: Number(sort) };
    if (!data.name) return 'Name the phase.';
    if (Number.isNaN(data.priceCents)) return 'Enter the phase price in dollars.';
    if (!Number.isInteger(data.quantity) || (data.quantity as number) < 1 || !Number.isInteger(data.sort)) return 'Quantity and order are whole numbers.';
    if (starts) data.startsAt = new Date(starts.getFullYear(), starts.getMonth(), starts.getDate()).toISOString();
    return phase ? { phaseId: phase.id, data } : { levelId, data };
  };
  return (
    <EditorPanel trigger={phase ? `Edit ${phase.name}` : 'Add phase'} title={phase ? `Edit ${phase.name}` : 'New phase'} command="savePricePhase" build={build}>
      <TextField label="Name" value={name} onChange={setName} wide />
      <TextField label="Price ($)" value={price} onChange={setPrice} inputMode="decimal" />
      <TextField label="Quantity" value={qty} onChange={setQty} inputMode="numeric" />
      <TextField label="Order" value={sort} onChange={setSort} inputMode="numeric" />
      <Field label="Starts (today if empty)"><PlatformDatePicker value={starts} onChange={setStarts} placeholder="Start date" className="h-9 text-sm" /></Field>
    </EditorPanel>
  );
}

export function LevelStatusActions({ levelId, status }: { levelId: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === 'active' ? <ActionButton command="setPriceLevelStatus" input={{ levelId, data: { status: 'paused' } }}>Pause</ActionButton> : null}
      {status === 'paused' ? <ActionButton command="setPriceLevelStatus" input={{ levelId, data: { status: 'active' } }}>Resume</ActionButton> : null}
      {status !== 'closed' ? <ActionButton command="setPriceLevelStatus" variant="destructive" input={{ levelId, data: { status: 'closed' } }}>Close</ActionButton> : null}
    </div>
  );
}
