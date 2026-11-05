'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import SingleSelect from '@/components/ui/single-select';
import { EditorPanel, Field, TextField, toCents, fromCents } from '../../components/EditorForm';

const CATEGORIES = ['venue_rent', 'production', 'security', 'stagehands', 'marketing', 'catering', 'insurance', 'ticketing', 'other'];
const label = (v: string) => v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
type Expense = { id: string; category: string; vendor: string; notes?: string; budgetCents: number; actualCents: number; isCapped: boolean };

/** Budget and actual per expense line; capped lines count toward the deal's expense cap at settlement. */
export function ExpenseEditor({ eventId, expense }: { eventId: string; expense?: Expense }) {
  const [category, setCategory] = useState(expense?.category || 'production');
  const [vendor, setVendor] = useState(expense?.vendor || '');
  const [budget, setBudget] = useState(expense ? fromCents(expense.budgetCents) : '');
  const [actual, setActual] = useState(expense ? fromCents(expense.actualCents) : '0.00');
  const [capped, setCapped] = useState(expense?.isCapped ?? true);
  const [notes, setNotes] = useState(expense?.notes || '');
  const build = () => {
    const data = { category, vendor: vendor.trim(), notes: notes.trim(), budgetCents: toCents(budget), actualCents: toCents(actual), isCapped: capped };
    if (Number.isNaN(data.budgetCents) || Number.isNaN(data.actualCents)) return 'Enter budget and actual in dollars.';
    return expense ? { expenseId: expense.id, data } : { eventId, data };
  };
  const id = `cap-${expense?.id || 'new'}`;
  return (
    <EditorPanel trigger={expense ? 'Edit' : 'Add expense'} variant={expense ? 'outline' : 'default'} title={expense ? `Edit ${label(expense.category)}` : 'New expense'} command="saveExpense" build={build}>
      <Field label="Category"><SingleSelect value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: label(c) }))} placeholder="Category" searchPlaceholder="Search" /></Field>
      <TextField label="Vendor" value={vendor} onChange={setVendor} />
      <TextField label="Budget ($)" value={budget} onChange={setBudget} inputMode="decimal" />
      <TextField label="Actual ($)" value={actual} onChange={setActual} inputMode="decimal" />
      <TextField label="Notes" value={notes} onChange={setNotes} wide />
      <div className="col-span-2 inline-flex items-center gap-2 text-sm"><Checkbox id={id} checked={capped} onCheckedChange={(v) => setCapped(v === true)} /><label htmlFor={id}>Counts toward the expense cap</label></div>
    </EditorPanel>
  );
}

/** Merch night: per-item count in/out sheet, soft and hard gross. The venue share uses the accepted deal split. */
export function MerchEditor({ eventId, current }: { eventId: string; current?: { softGrossCents: number; hardGrossCents: number; sellerFeeCents: number; countIn: Record<string, number> | null; countOut: Record<string, number> | null } | null }) {
  const initial = current?.countIn ? Object.keys(current.countIn).map((item) => ({ item, countIn: String(current.countIn![item]), countOut: String(current.countOut?.[item] ?? '') })) : [{ item: '', countIn: '', countOut: '' }];
  const [lines, setLines] = useState(initial);
  const [soft, setSoft] = useState(current ? fromCents(current.softGrossCents) : '');
  const [hard, setHard] = useState(current ? fromCents(current.hardGrossCents) : '0.00');
  const [fee, setFee] = useState(current ? fromCents(current.sellerFeeCents) : '0.00');
  const set = (i: number, k: 'item' | 'countIn' | 'countOut', v: string) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, [k]: v } : l));
  const build = () => {
    const filled = lines.filter((l) => l.item.trim() || l.countIn || l.countOut);
    const input: Record<string, unknown> = { eventId, softGrossCents: toCents(soft), hardGrossCents: toCents(hard), sellerFeeCents: toCents(fee) };
    if ([input.softGrossCents, input.hardGrossCents, input.sellerFeeCents].some((n) => Number.isNaN(n))) return 'Enter grosses in dollars.';
    if (filled.length) {
      if (filled.some((l) => !l.item.trim() || !/^\d+$/.test(l.countIn) || !/^\d+$/.test(l.countOut))) return 'Each counted item needs a name, count in and count out.';
      input.countIn = Object.fromEntries(filled.map((l) => [l.item.trim(), Number(l.countIn)]));
      input.countOut = Object.fromEntries(filled.map((l) => [l.item.trim(), Number(l.countOut)]));
    }
    return input;
  };
  return (
    <EditorPanel trigger={current ? 'Edit merch count' : 'Record merch'} variant={current ? 'outline' : 'default'} title="Merch count and gross" command="recordMerchSales" build={build}>
      <div className="col-span-2 space-y-2">
        <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-2 text-sm text-muted-foreground"><span>Item</span><span>In</span><span>Out</span></div>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-2">
            <Input value={l.item} onChange={(e) => set(i, 'item', e.target.value)} aria-label={`Item ${i + 1}`} placeholder="Tour tee" className="h-9 min-w-0" />
            <Input value={l.countIn} onChange={(e) => set(i, 'countIn', e.target.value)} aria-label={`Item ${i + 1} count in`} inputMode="numeric" className="h-9 min-w-0" />
            <Input value={l.countOut} onChange={(e) => set(i, 'countOut', e.target.value)} aria-label={`Item ${i + 1} count out`} inputMode="numeric" className="h-9 min-w-0" />
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { item: '', countIn: '', countOut: '' }])}>Add item</Button>
      </div>
      <TextField label="Soft gross ($)" value={soft} onChange={setSoft} inputMode="decimal" />
      <TextField label="Hard gross ($)" value={hard} onChange={setHard} inputMode="decimal" />
      <TextField label="Seller fee ($)" value={fee} onChange={setFee} inputMode="decimal" />
    </EditorPanel>
  );
}

/** Deposit paid to the artist before the show. Never more than the agreed deposit; counted at settlement. */
export function DepositEditor({ eventId, leftCents }: { eventId: string; leftCents: number }) {
  const [amount, setAmount] = useState(leftCents > 0 ? fromCents(leftCents) : '');
  const [method, setMethod] = useState('wire');
  const [reference, setReference] = useState('');
  const build = () => {
    const amountCents = toCents(amount);
    if (Number.isNaN(amountCents) || amountCents < 1) return 'Enter the deposit in dollars.';
    if (reference.trim().length < 3) return 'Enter the payment reference.';
    return { eventId, data: { amountCents, method, reference: reference.trim() } };
  };
  return (
    <EditorPanel trigger="Record deposit" title="Artist deposit paid" command="recordArtistDeposit" build={build}>
      <TextField label="Amount ($)" value={amount} onChange={setAmount} inputMode="decimal" />
      <Field label="Method"><SingleSelect value={method} onChange={setMethod} options={[{ value: 'wire', label: 'Wire' }, { value: 'ach', label: 'ACH' }, { value: 'check', label: 'Check' }, { value: 'cash', label: 'Cash' }]} placeholder="Method" searchPlaceholder="Search" /></Field>
      <TextField label="Reference" value={reference} onChange={setReference} wide placeholder="Wire confirmation or check number" />
    </EditorPanel>
  );
}
