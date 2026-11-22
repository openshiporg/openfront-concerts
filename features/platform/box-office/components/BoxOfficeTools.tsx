'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function OrderSearch({ initial, base = '/dashboard/platform/box-office', status }: { initial?: string; base?: string; status?: string }) {
  const router = useRouter(); const [q, setQ] = useState(initial || '');
  return (
    <form role="search" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const params = new URLSearchParams(); if (q.trim()) params.set('q', q.trim()); if (status) params.set('status', status); router.push(`${base}?${params}`); }}>
      <Input aria-label="Search orders" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number, name or email" className="h-11 min-w-0 max-w-sm text-base" />
      <Button type="submit" variant="outline" className="h-11">Find</Button>
    </form>
  );
}
