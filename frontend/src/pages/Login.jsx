import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(username, password)
      localStorage.setItem('tec_token', res.data.token)
      localStorage.setItem('tec_user', res.data.username)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your HANA credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-orb orb-1" />
      <div className="login-bg-orb orb-2" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📊</div>
          <span>TEC Sales</span>
        </div>
        <p className="login-subtitle">
          Sign in with your <strong>SAP HANA</strong> credentials<br />
          to access the sales dashboard
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="username">HANA Username</label>
            <div className="input-icon-wrap">
              <span className="input-icon">👤</span>
              <input
                id="username"
                className="input"
                type="text"
                placeholder="e.g. SYSTEM"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password">Password</label>
            <div className="input-icon-wrap">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                className="input"
                type="password"
                placeholder="HANA password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="toast toast-error" style={{ position: 'relative', bottom: 'auto', right: 'auto', animation: 'none', marginTop: '0.25rem' }}>
              ⚠️ {error}
            </div>
          )}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: '0.9rem', height: '0.9rem' }} /> Authenticating…</> : '→ Sign In'}
          </button>
        </form>

        <div className="login-footer">
          Connecting to SAP HANA · RAGHAV_LIVE
        </div>
      </div>
    </div>
  )
}
