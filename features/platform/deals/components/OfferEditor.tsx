'use client';
import { useState } from 'react';
import SingleSelect from '@/components/ui/single-select';
import { PlatformDatePicker } from '../../components/PlatformDatePicker';
import { EditorPanel, Field, TextField, toCents, fromCents, toBps, fromBps } from '../../components/EditorForm';

const DEALS = [{ value: 'flat_guarantee', label: 'Flat guarantee' }, { value: 'versus', label: 'Guarantee vs percentage' }, { value: 'plus', label: 'Guarantee plus percentage' }, { value: 'door_deal', label: 'Door deal' }];
const BILLING = [{ value: 'headliner', label: 'Headliner' }, { value: 'co_headliner', label: 'Co-headliner' }, { value: 'support', label: 'Support' }, { value: 'opener', label: 'Opener' }];
export type OfferTerms = { id: string; status: string; version: number; dealType: string; guaranteeCents: number; percentageBps: number; promoterProfitBps: number; expenseCapCents: number; merchSplitBps: number; hardMerchSplitBps: number; hospitalityRiderCents: number; depositCents: number; depositDueAt: string | null; radiusClause: string; breakevenBasis: string; notes: string };

/**
 * Draft a new offer for an event's artist, edit a draft, or revise a sent/accepted/declined offer into a new version.
 * Mode follows the offer: none → new draft; draft → edit; otherwise → revision with a reason.
 */
export function OfferEditor({ eventId, artists, offer }: { eventId?: string; artists?: { value: string; label: string }[]; offer?: OfferTerms }) {
  const mode = !offer ? 'new' : offer.status === 'draft' ? 'edit' : 'revise';
  const [artistId, setArtistId] = useState('');
  const [billing, setBilling] = useState('support');
  const [dealType, setDealType] = useState(offer?.dealType || 'versus');
  const [guarantee, setGuarantee] = useState(offer ? fromCents(offer.guaranteeCents) : '');
  const [pct, setPct] = useState(offer ? fromBps(offer.percentageBps) : '');
  const [profit, setProfit] = useState(offer ? fromBps(offer.promoterProfitBps) : '0');
  const [cap, setCap] = useState(offer ? fromCents(offer.expenseCapCents) : '0.00');
  const [merch, setMerch] = useState(offer ? fromBps(offer.merchSplitBps) : '20');
  const [hard, setHard] = useState(offer ? fromBps(offer.hardMerchSplitBps) : '0');
  const [rider, setRider] = useState(offer ? fromCents(offer.hospitalityRiderCents) : '0.00');
  const [deposit, setDeposit] = useState(offer ? fromCents(offer.depositCents) : '0.00');
  const [due, setDue] = useState<Date | undefined>(offer?.depositDueAt ? new Date(offer.depositDueAt) : undefined);
  const [radius, setRadius] = useState(offer?.radiusClause || '');
  const [reason, setReason] = useState('');
  const flat = dealType === 'flat_guarantee', door = dealType === 'door_deal';
  const build = () => {
    const data: Record<string, unknown> = {
      dealType, guaranteeCents: door ? 0 : toCents(guarantee), percentageBps: flat ? 0 : toBps(pct), promoterProfitBps: toBps(profit), expenseCapCents: toCents(cap),
      merchSplitBps: toBps(merch), hardMerchSplitBps: toBps(hard), hospitalityRiderCents: toCents(rider), depositCents: toCents(deposit), radiusClause: radius.trim(),
      breakevenBasis: offer?.breakevenBasis || '', notes: offer?.notes || '',
    };
    if (Object.values(data).some((v) => typeof v === 'number' && Number.isNaN(v))) return 'Enter dollars as 1500.00 and percentages as 85 or 12.5.';
    if (due) data.depositDueAt = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 12).toISOString();
    if (mode === 'new') { if (!artistId) return 'Choose the artist.'; return { eventId, artistId, data: { ...data, billing } }; }
    if (mode === 'edit') return { offerId: offer!.id, data };
    if (!reason.trim()) return 'Give the reason for the new version.';
    return { offerId: offer!.id, data: { ...data, reason: reason.trim() } };
  };
  const title = mode === 'new' ? 'New offer' : mode === 'edit' ? `Edit draft v${offer!.version}` : `New version of v${offer!.version}`;
  return (
    <EditorPanel trigger={mode === 'new' ? 'Draft offer' : mode === 'edit' ? 'Edit terms' : 'New version'} variant={mode === 'new' ? 'default' : 'outline'} title={title} command={mode === 'new' ? 'draftOffer' : mode === 'edit' ? 'updateDraftOffer' : 'reviseOffer'} build={build}>
      {mode === 'new' ? <>
        <Field label="Artist"><SingleSelect value={artistId} onChange={setArtistId} options={artists || []} placeholder="Artist" searchPlaceholder="Search artists" /></Field>
        <Field label="Billing"><SingleSelect value={billing} onChange={setBilling} options={BILLING} placeholder="Billing" searchPlaceholder="Search" /></Field>
      </> : null}
      <Field label="Deal type" wide><SingleSelect value={dealType} onChange={setDealType} options={DEALS} placeholder="Deal type" searchPlaceholder="Search" /></Field>
      {!door ? <TextField label="Guarantee ($)" value={guarantee} onChange={setGuarantee} inputMode="decimal" /> : null}
      {!flat ? <TextField label={door ? 'Artist % of gross' : 'Artist % of net'} value={pct} onChange={setPct} inputMode="decimal" /> : null}
      {dealType === 'plus' || dealType === 'versus' ? <TextField label="Promoter profit %" value={profit} onChange={setProfit} inputMode="decimal" /> : null}
      <TextField label="Expense cap ($)" value={cap} onChange={setCap} inputMode="decimal" />
      <TextField label="Soft merch venue %" value={merch} onChange={setMerch} inputMode="decimal" />
      <TextField label="Hard merch venue %" value={hard} onChange={setHard} inputMode="decimal" />
      <TextField label="Hospitality rider ($)" value={rider} onChange={setRider} inputMode="decimal" />
      <TextField label="Deposit ($)" value={deposit} onChange={setDeposit} inputMode="decimal" />
      <Field label="Deposit due"><PlatformDatePicker value={due} onChange={setDue} placeholder="Due date" className="h-9 text-sm" /></Field>
      <TextField label="Radius clause" value={radius} onChange={setRadius} wide placeholder="No plays within 75 miles for 60 days" />
      {mode === 'revise' ? <TextField label="Reason for new version" value={reason} onChange={setReason} wide /> : null}
    </EditorPanel>
  );
}
