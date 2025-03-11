import React, { useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient';
import { AuthContext } from './AuthContext';

const GameList = ({ onPick, currentUserPicks }) => {
  const [todayGames, setTodayGames] = useState([]);
  const [yesterdayGames, setYesterdayGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  const fetchGames = async () => {
    try {
      const today = new Date().toLocaleDateString('sv-SE', {
        timeZone: 'America/Chicago'
      });
      
      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('sv-SE', {
        timeZone: 'America/Chicago'
      });

      // Fetch today's games
      const { data: todayData, error: todayError } = await supabase
        .from('games')
        .select(`
          *, 
          home_team:teams!home_team_id(*), 
          away_team:teams!away_team_id(*),
          picks(
            id,
            team_id,
            user_id,
            score
          )
        `)
        .eq('game_date', today)
        .order('start_time', { ascending: true });

      if (todayError) {
        console.error('Error fetching today\'s games:', todayError);
        return;
      }

      // Fetch yesterday's games
      const { data: yesterdayData, error: yesterdayError } = await supabase
        .from('games')
        .select(`
          *, 
          home_team:teams!home_team_id(*), 
          away_team:teams!away_team_id(*),
          picks(
            id,
            team_id,
            user_id,
            score
          )
        `)
        .eq('game_date', yesterdayStr)
        .order('start_time', { ascending: true });

      if (yesterdayError) {
        console.error('Error fetching yesterday\'s games:', yesterdayError);
        return;
      }

      console.log('Fetched today\'s games:', todayData);
      console.log('Fetched yesterday\'s games:', yesterdayData);
      console.log('Current user picks:', currentUserPicks);
      setTodayGames(todayData || []);
      setYesterdayGames(yesterdayData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchGames:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();

    // Subscribe to games changes
    const gameSubscription = supabase
      .channel('public:games')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games' },
        (payload) => {
          console.log('Game updated:', payload);
          fetchGames();
        }
      )
      .subscribe();

    const picksSubscription = supabase
      .channel('public:picks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'picks' },
        (payload) => {
          console.log('Pick updated:', payload);
          fetchGames();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameSubscription);
      supabase.removeChannel(picksSubscription);
    };
  }, []);

  const getContrastColor = (hexcolor) => {
    if (!hexcolor) return '#FFFFFF';
    const r = parseInt(hexcolor.slice(1,3), 16);
    const g = parseInt(hexcolor.slice(3,5), 16);
    const b = parseInt(hexcolor.slice(5,7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const handlePickClick = (game, teamId) => {
    const userPickForGame = currentUserPicks?.find(pick => pick.game_id === game.id);
    if (userPickForGame && userPickForGame.team_id === teamId) {
      // If clicking the same team, delete the pick
      onPick(game, null);
    } else {
      // Otherwise make or change the pick
      onPick(game, teamId);
    }
  };

  const GameSection = ({ title, games }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        <img 
          src="https://assets.underdogfantasy.com/web/landing-page/ud-logo_light.png" 
          alt="Underdog Covers" 
          className="h-8"
        />
      </div>

      <div className="space-y-6">
        {games.map((game) => {
          const gameStart = new Date(game.start_time);
          const picksLocked = new Date() >= gameStart;
          const userPickForGame = currentUserPicks?.find(pick => pick.game_id === game.id);
          const isLive = picksLocked && !game.ended_flag;
          const userPickScore = game.picks?.find(pick => pick.user_id === userPickForGame?.user_id)?.score;
          
          return (
            <div
              key={game.id}
              className="bg-gray-50 rounded-xl p-6 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-gray-900">
                          {game.home_team.name} vs {game.away_team.name}
                        </p>
                        {game.ended_flag && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Final
                          </span>
                        )}
                        {isLive && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                            Live
                          </span>
                        )}
                      </div>
                      {picksLocked ? (
                        <div>
                          <p className="text-sm text-gray-600 mt-1">
                            {game.home_team.nickname} {game.home_score ?? '0'} : {game.away_score ?? '0'} {game.away_team.nickname}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Spread: {game.home_team.nickname} {Number(game.spread) >= 0 ? '+' : ''}{game.spread}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 mt-1">
                          Spread: {game.home_team.nickname} {Number(game.spread) >= 0 ? '+' : ''}{game.spread}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      {picksLocked && (
                        <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full mb-2">
                          Locked
                        </span>
                      )}
                      {picksLocked && userPickForGame && game.picks && (
                        <span className={`text-lg font-bold ${userPickScore > 0 ? 'text-green-600' : userPickScore < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          Score: {userPickScore > 0 ? '+' : ''}{userPickScore}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-gray-600">
                    <p>
                      {gameStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {[game.home_team, game.away_team].map((team) => {
                    const isTeamPicked = userPickForGame?.team_id === team.id;
                    const buttonStyle = {
                      backgroundColor: picksLocked ? '#E5E7EB' : team.primary_color || '#4F46E5',
                      color: picksLocked ? (isTeamPicked ? team.secondary_color || getContrastColor(team.primary_color) : '#6B7280') : (team.secondary_color || getContrastColor(team.primary_color || '#4F46E5')),
                      opacity: isTeamPicked ? 1 : (picksLocked ? 0.7 : 0.9),
                    };

                    return (
                      <button
                        key={team.id}
                        onClick={() => !picksLocked && handlePickClick(game, team.id)}
                        disabled={picksLocked}
                        style={buttonStyle}
                        className={`
                          w-full h-16 rounded-lg font-semibold shadow-sm
                          transition-all duration-200 flex items-center justify-center
                          ${picksLocked ? 'cursor-not-allowed' : 'hover:opacity-100'}
                          ${isTeamPicked ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                        `}
                      >
                        <span className="flex items-center gap-2">
                          {isTeamPicked && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {picksLocked && !isTeamPicked ? 'Not Selected' : team.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <GameSection title="Today's Games" games={todayGames} />
      <GameSection title="Yesterday's Games" games={yesterdayGames} />
    </div>
  );
};

export default GameList;
