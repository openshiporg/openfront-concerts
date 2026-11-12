'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Pick the first and last day of the report (store clock). */
export function DrawerRangeForm({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [a, setA] = useState(from);
  const [b, setB] = useState(to);
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); router.push(`/dashboard/platform/box-office/drawers?from=${a}&to=${b || a}`); }}>
      <label className="flex min-w-0 flex-col gap-1 text-sm"><span className="text-muted-foreground">From</span><Input type="date" value={a} onChange={(e) => setA(e.target.value)} className="h-11 min-w-0" /></label>
      <label className="flex min-w-0 flex-col gap-1 text-sm"><span className="text-muted-foreground">To</span><Input type="date" value={b} onChange={(e) => setB(e.target.value)} className="h-11 min-w-0" /></label>
      <Button type="submit" variant="outline" className="h-11">Show</Button>
    </form>
  );
}
