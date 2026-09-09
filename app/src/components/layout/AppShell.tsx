'use client';

import React from 'react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="main-content">{children}</main>
      <BottomNav />
    </div>
  );
};
