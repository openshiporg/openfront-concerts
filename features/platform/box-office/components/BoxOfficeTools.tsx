'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function OrderSearch({ initial }: { initial?: string }) {
  const router = useRouter(); const [q, setQ] = useState(initial || '');
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); router.push(`/dashboard/platform/box-office?q=${encodeURIComponent(q)}`); }}>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number or email" className="max-w-sm" />
      <Button type="submit" variant="outline">Find</Button>
    </form>
  );
}
