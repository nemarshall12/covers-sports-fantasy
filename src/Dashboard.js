// src/Dashboard.js
import React, { useContext, useState, useEffect } from 'react';
import HeaderStats from './HeaderStats';
import GameList from './GameList';
import Leaderboard from './Leaderboard';
import TopBanner from './TopBanner';
import { supabase } from './supabaseClient';
import { AuthContext } from './AuthContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [userPicks, setUserPicks] = useState([]);
  const [statsKey, setStatsKey] = useState(0);

  const fetchUserPicks = async () => {
    const { data, error } = await supabase
      .from('picks')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user picks:', error);
    } else {
      setUserPicks(data);
    }
  };

  useEffect(() => {
    fetchUserPicks();

    // Subscribe to picks changes
    const picksSubscription = supabase
      .channel('picks-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'picks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Pick change:', payload);
          fetchUserPicks();
          setStatsKey(prev => prev + 1);
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
        () => {
          setStatsKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(picksSubscription);
      supabase.removeChannel(gamesSubscription);
    };
  }, [user.id]);

  const handlePick = async (game, teamId) => {
    const gameStart = new Date(game.start_time);
    const currentTime = new Date();
    if (currentTime >= gameStart) {
      setMessage("Picks are locked for this game");
      setMessageType('error');
      return;
    }

    try {
      // Delete any existing pick for this game
      const existingPick = userPicks.find(pick => pick.game_id === game.id);
      if (existingPick) {
        const { error: deleteError } = await supabase
          .from('picks')
          .delete()
          .eq('id', existingPick.id);

        if (deleteError) {
          setMessage('Error updating pick');
          setMessageType('error');
          return;
        }

        // If we're deleting the pick (clicking same team), stop here
        if (teamId === null || existingPick.team_id === teamId) {
          setMessage('Pick removed successfully!');
          setMessageType('success');
          setTimeout(() => setMessage(''), 3000);
          
          // Update local state immediately
          setUserPicks(prev => prev.filter(p => p.id !== existingPick.id));
          setStatsKey(prev => prev + 1); // Force HeaderStats refresh
          return;
        }
      }

      // Insert new pick if we're not just deleting
      if (teamId !== null) {
        const { data: newPick, error: insertError } = await supabase
          .from('picks')
          .insert([{
            game_id: game.id,
            user_id: user.id,
            team_id: teamId,
          }])
          .select()
          .single();

        if (insertError) {
          setMessage(`Error submitting pick: ${insertError.message}`);
          setMessageType('error');
          return;
        }

        setMessage('Pick submitted successfully!');
        setMessageType('success');
        setTimeout(() => setMessage(''), 3000);

        // Update local state immediately
        if (newPick) {
          setUserPicks(prev => {
            const filtered = prev.filter(p => p.game_id !== game.id);
            return [...filtered, newPick];
          });
          setStatsKey(prev => prev + 1); // Force HeaderStats refresh
        }
      }
    } catch (error) {
      console.error('Error handling pick:', error);
      setMessage('An unexpected error occurred');
      setMessageType('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBanner />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <HeaderStats key={statsKey} userId={user.id} />
          
          {message && (
            <div 
              className={`
                rounded-lg p-4 flex items-center justify-between
                ${messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}
                transition-all duration-500 ease-in-out
              `}
            >
              <div className="flex items-center">
                {messageType === 'success' ? (
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                )}
                {message}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <GameList onPick={handlePick} currentUserPicks={userPicks} />
            </div>
            <div className="lg:col-span-1">
              <Leaderboard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
