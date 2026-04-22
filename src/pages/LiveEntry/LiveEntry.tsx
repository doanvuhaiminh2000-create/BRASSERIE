import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { TableMap } from './TableMap';
import { SessionFlow } from './SessionFlow';

export function LiveEntry() {
  return (
    <Routes>
      <Route path="/" element={<TableMap />} />
      <Route path="/table/:tableId" element={<SessionFlow />} />
    </Routes>
  );
}
