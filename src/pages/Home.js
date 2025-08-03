import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // You might store pickup/drop in localStorage or a context
    navigate('/bid');
  };

  return (
    <div>
      <h1>Cab Booking</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Pickup location"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Drop location"
          value={drop}
          onChange={(e) => setDrop(e.target.value)}
          required
        />
        <button type="submit">Start Bidding</button>
      </form>
    </div>
  );
}

export default Home;
