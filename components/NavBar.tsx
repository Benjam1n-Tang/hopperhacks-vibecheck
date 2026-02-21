import React from 'react';

const NavBar = () => {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        background: '#222',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>VibeCheck</div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {/* Clerk Auth Placeholder */}
        <button
          style={{
            background: '#fff',
            color: '#222',
            border: 'none',
            borderRadius: '4px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Sign In / Sign Up
        </button>
        <button
          style={{
            background: '#ff5252',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
