'use client';

import { useState, useEffect } from 'react';
import { networkManager } from '@/lib/colyseus-network';
import { useAppSelector } from '@/lib/redux/hooks';

export default function MultiplayerTest() {
  const [connected, setConnected] = useState(false);
  // Use singleton instance
  const [testMessage, setTestMessage] = useState('');
  const [currentOffice, setCurrentOfficeState] = useState('');
  
  const messages = useAppSelector((state) => state.chat.messages);
  const playerPosition = useAppSelector((state) => state.room.playerPosition);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      networkManager.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    try {
      const success = await networkManager.joinPublicRoom({
        username: 'TestUser',
        avatar: 'default',
        isMicOn: true,
        isWebcamOn: true
      });
      setConnected(success);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleDisconnect = () => {
    networkManager.disconnect();
    setConnected(false);
  };

  const handleSendMessage = () => {
    if (testMessage.trim()) {
      networkManager.sendGlobalMessage('TestUser', testMessage);
      setTestMessage('');
    }
  };

  const handleJoinOffice = (office: string) => {
    networkManager.joinOffice(office as any, 'TestUser');
    setCurrentOfficeState(office);
  };

  const handleLeaveOffice = () => {
    if (currentOffice) {
      networkManager.leaveOffice(currentOffice as any, 'TestUser');
      setCurrentOfficeState('');
    }
  };

  const handleUpdatePosition = () => {
    const newPos = {
      x: Math.random() * 800,
      y: Math.random() * 600
    };
    networkManager.updatePlayerPosition(newPos.x, newPos.y, 'idle');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Multiplayer Server Test</h2>
      
      <div className="mb-4">
        <p className="mb-2">Connection Status: 
          <span className={connected ? 'text-green-600' : 'text-red-600'}>
            {connected ? ' Connected' : ' Disconnected'}
          </span>
        </p>
        
        {!connected ? (
          <button
            onClick={handleConnect}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Connect to Server
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Disconnect
          </button>
        )}
      </div>

      {connected && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Player Position</h3>
            <p>X: {playerPosition.x}, Y: {playerPosition.y}</p>
            <button
              onClick={handleUpdatePosition}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
            >
              Random Position
            </button>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Office Management</h3>
            <p>Current Office: {currentOffice || 'None'}</p>
            <div className="space-x-2 mb-2">
              {['conference-a', 'brainstorm', 'collaboration', 'coffee'].map((office) => (
                <button
                  key={office}
                  onClick={() => handleJoinOffice(office)}
                  className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded text-sm"
                >
                  Join {office}
                </button>
              ))}
            </div>
            {currentOffice && (
              <button
                onClick={handleLeaveOffice}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                Leave Office
              </button>
            )}
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Chat Test</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter test message..."
                className="flex-1 border border-gray-300 rounded px-3 py-1"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
              >
                Send
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Recent Messages</h3>
            <div className="bg-gray-100 p-3 rounded max-h-40 overflow-y-auto">
              {messages.slice(-10).map((msg, index) => (
                <div key={msg.id || index} className="mb-1">
                  <span className="font-semibold text-blue-600">{msg.username}:</span>
                  <span className="ml-2">{msg.message}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    ({msg.type})
                  </span>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-gray-500">No messages yet...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}