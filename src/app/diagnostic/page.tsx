'use client';

import { DiagnosticTool } from '@/components/diagnostic/diagnostic-tool';

export default function DiagnosticPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">SyncroSpace Diagnostics</h1>
      <p className="mb-6 text-gray-600">
        This page provides diagnostic tools to verify that SyncroSpace features are working correctly.
      </p>
      <div className="flex justify-center">
        <DiagnosticTool />
      </div>
    </div>
  );
}