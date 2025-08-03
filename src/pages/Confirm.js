import React from 'react';
import { useNavigate } from 'react-router-dom';

function Confirm() {
  const navigate = useNavigate();

  const handleConfirm = () => {
    navigate('/success');
  };

  return (
    <div>
      <h1>Select Driver</h1>
      {/* You can improve this with actual bid selection logic */}
      <button onClick={handleConfirm}>Confirm Ride</button>
    </div>
  );
}

export default Confirm;
