import React, { useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient';
import { AuthContext } from './AuthContext';
import TopBanner from './TopBanner';

const MyPicks = () => {
  const { user } = useContext(AuthContext);
  const [currentPicks, setCurrentPicks] = useState([]);
  const [pastPicks, setPastPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPicks = async () => {
    try {
      const currentTime = new Date();
      
      // Fetch all picks with related game and team data
      const { data: picks, error } = await supabase
        .from('picks')
        .select(`
          *,
          games:game_id(
            *,
            home_team:teams!home_team_id(*),
            away_team:teams!away_team_id(*)
          ),
          teams:team_id(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching picks:', error);
        return;
      }

      // Separate current and past picks based on game lock time
      const current = [];
      const past = [];

      picks.forEach(pick => {
        const gameStart = new Date(pick.games.start_time);
        if (currentTime < gameStart) {
          current.push(pick);
        } else {
          past.push(pick);
        }
      });

      setCurrentPicks(current);
      setPastPicks(past);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchPicks:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPicks();

    // Subscribe to picks changes
    const subscription = supabase
      .channel('my-picks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'picks',
          filter: `user_id=eq.${user.id}`
        },
        fetchPicks
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user.id]);

  const PicksList = ({ picks, title, emptyMessage }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      {picks.length === 0 ? (
        <p className="text-gray-500 text-center py-4">{emptyMessage}</p>
      ) : (
        <div className="space-y-4">
          {picks.map(pick => {
            const gameStarted = new Date() >= new Date(pick.games.start_time);
            const isGameComplete = pick.games.home_score !== null && pick.games.away_score !== null;
            
            // Calculate pick score
            let pickScore = pick.score ? pick.score : 0;
            if (isGameComplete) {
              const homeScore = pick.games.home_score;
              const awayScore = pick.games.away_score;
              const spread = pick.games.spread;              
            }

            const pickResult = pickScore > 0 ? 'win' : (pickScore < 0 ? 'loss' : 'push');

            return (
              <div 
                key={pick.id} 
                className={`
                  border rounded-lg p-4
                  ${isGameComplete 
                    ? (pickResult === 'win'
                      ? 'bg-green-50 border-green-200'
                      : pickResult === 'push'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200')
                    : 'bg-gray-50 border-gray-200'
                  }
                `}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      {pick.teams.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {pick.games.home_team.id === pick.teams.id ? 'vs' : '@'} {
                        pick.games.home_team.id === pick.teams.id 
                          ? pick.games.away_team.name 
                          : pick.games.home_team.name
                      }
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Spread: {pick.games.home_team.nickname} {Number(pick.games.spread) >= 0 ? '+' : ''}{pick.games.spread}
                    </p>
                    {gameStarted && pick.games.home_score !== null && pick.games.away_score !== null && (
                      <p className="text-sm text-gray-600 mt-1">
                        {pick.games.home_team.nickname} {pick.games.home_score} : {pick.games.away_score} {pick.games.away_team.nickname}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {new Date(pick.games.start_time).toLocaleDateString()}
                    </p>
                    {isGameComplete && (
                      <div className="flex flex-col items-end gap-1">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${pickResult === 'win' 
                            ? 'bg-green-100 text-green-800' 
                            : pickResult === 'push'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        `}>
                          {pickResult === 'win' ? 'Win' : pickResult === 'push' ? 'Push' : 'Loss'}
                        </span>
                        <span className="text-sm text-gray-600">
                          Pick Score: {pickScore > 0 ? '+' : ''}{pickScore}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBanner />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBanner />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PicksList 
          picks={currentPicks} 
          title="Current Picks" 
          emptyMessage="No current picks. Head to the dashboard to make some picks!" 
        />
        <PicksList 
          picks={pastPicks} 
          title="Past Picks" 
          emptyMessage="No past picks yet." 
        />
      </div>
    </div>
  );
};

export default MyPicks;
