// src/ContestList.js
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const ContestList = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContests = async () => {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error(error);
      else setContests(data);
      setLoading(false);
    };

    fetchContests();
  }, []);

  if (loading) return <p>Loading contests...</p>;

  return (
    <div>
      <h2>Current Contests</h2>
      <ul>
        {contests.map((contest) => (
          <li key={contest.id}>
            {contest.name} — Starts: {new Date(contest.start_time).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContestList;
