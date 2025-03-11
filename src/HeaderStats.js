import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const HeaderStats = ({ userId }) => {
  const [stats, setStats] = useState({
    username: '',
    userPoints: 0,
    activePicks: 0,
    userRank: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    console.log("Fetching stats for user:", userId);
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      // Fetch user points from leaderboard
      const { data: leaderboardData } = await supabase
        .rpc('calculate_leaderboard_points');
      
      const userEntry = leaderboardData?.find(entry => entry.user_id === userId);
      const userPoints = userEntry?.total_points || 0;
      const userRank = leaderboardData.findIndex(entry => entry.user_id === userId) + 1;

      // Fetch active picks count
      const { data: activePicks } = await supabase
        .from('picks')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Fetch total active users
      const { data, error } = await supabase
        .from('vw_unique_user_count')
        .select('*')
        .single();
      
      let totalUsers = 0;
      if (error) {
        console.error('Error fetching total users:', error);
      } else {
        totalUsers = data.total_users;
      }

      setStats({
        totalUsers: totalUsers || 0,
        userRank,
        userPoints,
        activePicks: activePicks?.length || 0,
        username: profile?.email?.split('@')[0] || 'Anonymous'
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to picks changes for this user
    const picksSubscription = supabase
      .channel('picks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'picks',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Picks changed:', payload);
          fetchStats();
        }
      )
      .subscribe();

    // Subscribe to games changes
    const gamesSubscription = supabase
      .channel('games-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games'
        },
        (payload) => {
          console.log('Game updated:', payload);
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up subscriptions");
      supabase.removeChannel(picksSubscription);
      supabase.removeChannel(gamesSubscription);
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Welcome back, {stats.username}!
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="text-blue-600 text-sm font-medium">Total Points</div>
          <div className="text-2xl font-bold text-blue-900">{stats.userPoints}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
          <div className="text-green-600 text-sm font-medium">Active Picks</div>
          <div className="text-2xl font-bold text-green-900">{stats.activePicks}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
          <div className="text-purple-600 text-sm font-medium">Your Rank</div>
          <div className="text-2xl font-bold text-purple-900">
            {stats.userRank === 0 ? '-' : `#${stats.userRank}`}
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg">
          <div className="text-gray-600 text-sm font-medium">Total Players</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
        </div>
      </div>
    </div>
  );
};

export default HeaderStats;
