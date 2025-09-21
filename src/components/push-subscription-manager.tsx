import { useEffect, useState } from 'react';

export default function PushSubscriptionManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  async function subscribeUser() {
    if (!isSupported) return;
    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: '<YOUR_PUBLIC_VAPID_KEY>' // Replace with your VAPID public key
    });
    // Send subscription to backend for storage
    await fetch('/api/save-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
    setSubscribed(true);
  }

  async function unsubscribeUser() {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        setSubscribed(false);
      }
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Push Notification Subscription</h2>
      {isSupported ? (
        <div>
          {subscribed ? (
            <button onClick={unsubscribeUser} className="bg-red-500 text-white px-4 py-2">Unsubscribe</button>
          ) : (
            <button onClick={subscribeUser} className="bg-green-500 text-white px-4 py-2">Subscribe</button>
          )}
        </div>
      ) : (
        <div>Push notifications are not supported in your browser.</div>
      )}
    </div>
  );
}
