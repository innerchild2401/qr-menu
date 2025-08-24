'use client';

import { useState } from 'react';

export default function DebugPage() {
  const [email, setEmail] = useState('eu@eu.com');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const debugUser = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/debug/user-restaurant?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setDebugData(data);
      
      if (response.ok) {
        setMessage('Debug completed successfully');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const linkUserToRestaurant = async () => {
    if (!restaurantSlug) {
      setMessage('Please enter a restaurant slug');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/debug/user-restaurant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          restaurantSlug
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(`Success: ${data.message}`);
        // Refresh debug data
        await debugUser();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          🔧 User-Restaurant Debug Tool
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug User Restaurant Access</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="eu@eu.com"
              />
            </div>
            
            <button
              onClick={debugUser}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Debugging...' : 'Debug User'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Link User to Restaurant</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Restaurant Slug
              </label>
              <input
                type="text"
                value={restaurantSlug}
                onChange={(e) => setRestaurantSlug(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="restaurant-slug"
              />
            </div>
            
            <button
              onClick={linkUserToRestaurant}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Linking...' : 'Link User to Restaurant'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-md mb-6 ${
            message.startsWith('Error') 
              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' 
              : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
          }`}>
            {message}
          </div>
        )}

        {debugData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">User Information</h3>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-sm">
                  {JSON.stringify(debugData.user, null, 2)}
                </pre>
              </div>

              {debugData.userRecord && (
                <div>
                  <h3 className="text-lg font-medium mb-2">User Record (users table)</h3>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-sm">
                    {JSON.stringify(debugData.userRecord, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium mb-2">User Restaurants (user_restaurants table)</h3>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-sm">
                  {JSON.stringify(debugData.userRestaurants, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Owned Restaurants (restaurants.owner_id)</h3>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-sm">
                  {JSON.stringify(debugData.ownedRestaurants, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Enhanced Function Results</h3>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-sm">
                  {JSON.stringify(debugData.enhancedRestaurants, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">All Restaurants (first 10)</h3>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-sm">
                  {JSON.stringify(debugData.allRestaurants, null, 2)}
                </pre>
              </div>

              {debugData.errors && Object.values(debugData.errors).some(Boolean) && (
                <div>
                  <h3 className="text-lg font-medium mb-2 text-red-600">Errors</h3>
                  <pre className="bg-red-100 dark:bg-red-900 p-4 rounded-md overflow-x-auto text-sm text-red-700 dark:text-red-200">
                    {JSON.stringify(debugData.errors, null, 2)}
                  </pre>
                </div>
              )}

              {debugData.recommendations && debugData.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2 text-blue-600">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                    {debugData.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
