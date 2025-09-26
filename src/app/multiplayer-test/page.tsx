import MultiplayerTest from '@/components/MultiplayerTest';

export default function MultiplayerTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Colyseus Server Integration Test</h1>
        <MultiplayerTest />
      </div>
    </div>
  );
}