'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { runCommand } from '../lib/commands';

export function ActionButton({ command, input, children, variant = 'outline', onDone }: { command: string; input: Record<string, unknown>; children: React.ReactNode; variant?: 'outline' | 'default' | 'destructive'; onDone?: (result: any) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button size="sm" variant={variant} disabled={pending} onClick={() => start(async () => {
        setError('');
        try { const result = await runCommand(command, input); onDone?.(result); router.refresh(); }
        catch (e: any) { setError(e.message); }
      })}>{pending ? 'Working…' : children}</Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
