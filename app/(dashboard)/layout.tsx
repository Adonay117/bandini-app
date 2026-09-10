import { ReactNode } from 'react';
import { Layout } from '@/components/Layout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>;
}
