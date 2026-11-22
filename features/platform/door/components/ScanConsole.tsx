'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runCommand } from '../../lib/commands';
import { StatusLabel } from '../../components/ui-bits';

export function ScanConsole({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [code, setCode] = useState(''); const [gate, setGate] = useState('Gate A'); const [last, setLast] = useState<any>(null); const [error, setError] = useState('');
  async function scan() {
    setError('');
    try { const result = await runCommand('scanTicket', { eventId, ticketCode: code.trim().toUpperCase(), gate }); setLast(result); setCode(''); router.refresh(); }
    catch (e: any) { setError(e.message); }
  }
  return (
    <div className="space-y-3">
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); scan(); }}>
        <Input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ticket code" className="max-w-xs" aria-label="Ticket code" />
        <Input value={gate} onChange={(e) => setGate(e.target.value)} className="w-28" aria-label="Gate" />
        <Button type="submit">Scan</Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {last ? <div className="flex items-center gap-3 rounded-lg border p-3"><StatusLabel status={last.result === 'admitted' ? 'confirmed' : 'void'} /><span className="font-mono text-sm uppercase">{last.result}</span><span className="text-sm text-muted-foreground">{last.admitted} admitted</span></div> : null}
    </div>
  );
}
