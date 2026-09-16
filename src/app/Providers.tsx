'use client';

import { SessionProvider } from 'next-auth/react';
import { LiveblocksProvider } from '@liveblocks/react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        {children}
      </LiveblocksProvider>
    </SessionProvider>
  );
}
