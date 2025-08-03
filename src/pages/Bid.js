import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Bid() {
  const [bids, setBids] = useState([]);
  const [timer, setTimer] = useState(60); // 1-minute bidding
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    if (timer <= 0) {
      clearInterval(interval);
      navigate('/confirm');
    }
    return () => clearInterval(interval);
  }, [timer, navigate]);

  // Dummy bids (simulate drivers bidding)
  useEffect(() => {
    const dummyBids = [
      { driver: 'Alice', price: 150, rating: 4.5 },
      { driver: 'Bob', price: 120, rating: 4.7 },
      { driver: 'Charlie', price: 140, rating: 4.2 },
    ];
    setBids(dummyBids);
  }, []);

  return (
    <div>
      <h1>Bidding in Progress ({timer}s)</h1>
      <ul>
        {bids.map((bid, index) => (
          <li key={index}>
            {bid.driver}: ₹{bid.price} ⭐{bid.rating}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Bid;
