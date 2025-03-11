import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Fetch leaderboard data
        const { data: pointsData } = await supabase
          .rpc('calculate_leaderboard_points');

        if (!pointsData) {
          console.error('No leaderboard data returned');
          return;
        }

        // Get unique user IDs
        const userIds = pointsData.map(entry => entry.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }

        // Combine data
        const combinedData = pointsData.map(entry => {
          const profile = profiles.find(p => p.id === entry.user_id);
          return {
            ...entry,
            displayName: profile?.email?.split('@')[0] || 'Anonymous'
          };
        });

        setLeaderboardData(combinedData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLoading(false);
      }
    };

    fetchLeaderboard();

    const subscription = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'picks' },
        fetchLeaderboard
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-900">Leaderboard</h3>
      </div>
      <div className="w-full">
        <div className="overflow-hidden">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th scope="col" className="w-3/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th scope="col" className="w-2/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboardData.map((entry, index) => (
                <tr 
                  key={entry.user_id}
                  className={`${index < 3 ? 'bg-gradient-to-r' : ''} 
                    ${index === 0 ? 'from-yellow-50 to-white' : ''}
                    ${index === 1 ? 'from-gray-50 to-white' : ''}
                    ${index === 2 ? 'from-orange-50 to-white' : ''}
                    hover:bg-gray-50 transition-colors duration-200
                  `}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`
                        text-sm font-medium
                        ${index === 0 ? 'text-yellow-600' : ''}
                        ${index === 1 ? 'text-gray-600' : ''}
                        ${index === 2 ? 'text-orange-600' : 'text-gray-500'}
                      `}>
                        #{index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-medium">
                          {entry.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.displayName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`
                      px-3 py-1 rounded-full text-sm font-semibold
                      ${entry.total_points > 0 ? 'bg-green-100 text-green-800' : ''}
                      ${entry.total_points < 0 ? 'bg-red-100 text-red-800' : ''}
                      ${entry.total_points === 0 ? 'bg-gray-100 text-gray-800' : ''}
                    `}>
                      {entry.total_points > 0 ? '+' : ''}{entry.total_points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
