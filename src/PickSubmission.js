import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const PickSubmission = ({ contestId }) => {
  // Initialize an array for five picks
  const [picks, setPicks] = useState(['', '', '', '', '']);
  const [message, setMessage] = useState('');

  // Handle input changes for each pick
  const handleChange = (index, value) => {
    const newPicks = [...picks];
    newPicks[index] = value;
    setPicks(newPicks);
  };

  // Submit the picks to the 'picks' table
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ensure exactly 5 picks have been entered
    if (picks.filter(p => p.trim() !== '').length !== 5) {
      setMessage('Please enter exactly 5 picks.');
      return;
    }

    // Get the current user from Supabase auth
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.user) {
      setMessage('You must be logged in to submit picks.');
      return;
    }

    // Insert each pick into the 'picks' table
    const { error } = await supabase.from('picks').insert(
      picks.map((team) => ({
        contest_id: contestId,
        user_id: session.user.id,
        team_id: team, // Adjust this if you have a separate teams table or want to reference a team ID
      }))
    );

    if (error) {
      setMessage(`Error submitting picks: ${error.message}`);
    } else {
      setMessage('Picks submitted successfully!');
      // Optionally, clear the picks:
      setPicks(['', '', '', '', '']);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: '2rem 0' }}>
      <h3>Submit Your Picks</h3>
      {picks.map((pick, index) => (
        <input
          key={index}
          type="text"
          placeholder={`Pick ${index + 1}`}
          value={pick}
          onChange={(e) => handleChange(index, e.target.value)}
          required
          style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem' }}
        />
      ))}
      <button type="submit" style={{ padding: '0.5rem 1rem' }}>
        Submit Picks
      </button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default PickSubmission;
