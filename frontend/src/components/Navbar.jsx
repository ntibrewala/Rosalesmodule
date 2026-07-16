import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const user = localStorage.getItem('tec_user') || 'USER'

  const handleLogout = () => {
    localStorage.removeItem('tec_token')
    localStorage.removeItem('tec_user')
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="dot" />
        <span>Raghav Polymers SalesModule</span>
      </div>
      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.35rem 0.8rem', 
          backgroundColor: 'rgba(255, 255, 255, 0.15)', 
          border: '1px solid rgba(255, 255, 255, 0.3)', 
          borderRadius: '2rem', 
          color: '#ffffff', 
          fontWeight: '500', 
          fontSize: '0.9rem' 
        }}>
          <span style={{ filter: 'brightness(1.5)' }}>👤</span> {user}
        </span>
        <button 
          id="logout-btn" 
          onClick={handleLogout} 
          style={{ 
             padding: '0.4rem 1.2rem', 
             fontSize: '0.85rem', 
             fontWeight: 'bold', 
             backgroundColor: '#ffffff', 
             color: '#800000', 
             border: 'none', 
             borderRadius: '2rem', 
             cursor: 'pointer',
             boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
             transition: 'transform 0.1s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
