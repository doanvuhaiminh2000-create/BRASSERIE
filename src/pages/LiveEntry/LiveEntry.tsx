import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { TableMap } from './TableMap';
import { SessionFlow } from './SessionFlow';
import { TopBar } from './TopBar';

export function LiveEntry() {
  return (
    <div className="flex flex-col h-screen h-screen-safe bg-[var(--color-bg-main)]">
      <TopBar />
      <div className="flex-1 overflow-hidden relative pb-safe">
        <Routes>
          <Route path="/" element={<TableMap />} />
          <Route path="/table/:tableId" element={<SessionFlow />} />
        </Routes>
      </div>
    </div>
  );
}
