import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function Authentication() {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('login'); // 'login', 'register', 'reset', 'update'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState({ type: '', content: '' });

  // for the update-password view
  const [newPassword, setNewPassword] = useState('');

  const navigate = useNavigate();

  // --- AUTH STATE / PASSWORD RECOVERY HANDLING ---
  useEffect(() => {
    // 1) Try to let Supabase process tokens in the URL (if present).
    //    getSessionFromUrl exists in many auth-js versions; call safely if available.
    (async () => {
      try {
        if (supabase.auth.getSessionFromUrl) {
          // storeSession true will persist the session so updateUser can be called
          await supabase.auth.getSessionFromUrl({ storeSession: true });
        }
      } catch (err) {
        // not fatal — token may be invalid/expired, just log
        console.debug('getSessionFromUrl:', err);
      }
    })();

    // 2) Subscribe to auth state changes and look for PASSWORD_RECOVERY
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase emits "PASSWORD_RECOVERY" when the user lands via reset link
      if (event === 'PASSWORD_RECOVERY') {
        // show the "update password" UI in-place
        setView('update');
        setMessage({ type: 'info', content: 'Please enter a new password to update your account.' });
      }

      // If someone signs in normally, you might want to redirect
      if (event === 'SIGNED_IN') {
        navigate('/');
      }
    });

    return () => {
      // cleanup subscription (works across versions)
      try {
        authListener?.subscription?.unsubscribe?.();
      } catch (e) {
        // fallback: some versions return different structures
        if (authListener && typeof authListener.unsubscribe === 'function') authListener.unsubscribe();
      }
    };
  }, [navigate]);

  // --- LOGIN / REGISTER / RESET / UPDATE HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', content: '' });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage({ type: 'error', content: error.message });
    else navigate('/');
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', content: '' });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) setMessage({ type: 'error', content: error.message });
    else setMessage({ type: 'success', content: 'Confirmation email sent! Check your inbox.' });
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', content: '' });

    // Make sure the reset email redirects back to this auth component
    const redirectTo = `${window.location.origin}/authentication`; // adjust route if needed

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      setMessage({ type: 'error', content: error.message });
    } else {
      setMessage({
        type: 'success',
        content: 'Password reset email sent — check your inbox. When you click the link, you will be taken back here to set a new password.',
      });
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', content: '' });

    // This requires that a session was created from the recovery token (Supabase usually does this).
    // If session is missing, updateUser will fail with "Auth Session Missing".
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage({ type: 'error', content: error.message || 'Failed to update password.' });
    } else {
      setMessage({ type: 'success', content: 'Password updated. You can now sign in with your new password.' });
      setView('login');
      // optionally clear fields
      setPassword('');
      setNewPassword('');
    }

    setLoading(false);
  };

  // --- STYLES (kept from yours) ---
  const theme = {
    primaryHover: '#000000',
    primary: '#303030',
    background: '#f3f4f6',
    textMain: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    errorBg: '#FEF2F2',
    errorText: '#991B1B',
    successBg: '#ECFDF5',
    successText: '#065F46',
  };

  return (
    <div className="auth-container">
      <style>{`
        .auth-container { min-height: 100vh; display:flex; align-items:center; justify-content:center; background: linear-gradient(135deg, #D3D3D3 0%, #A0A0A0 100%); font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; }
        .auth-card { background: white; width:100%; max-width:420px; border-radius:16px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.1); padding:2.5rem; animation:fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0);} }
        .auth-input { width:100%; padding:0.75rem 1rem; border:1px solid ${theme.border}; border-radius:8px; font-size:0.95rem; margin-top:0.5rem; transition:all 0.2s; background-color:#F9FAFB; }
        .auth-input:focus { outline:none; border-color: ${theme.primary}; background-color:#fff; box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
        .auth-btn { width:100%; padding:0.875rem; background-color:${theme.primary}; color:white; border:none; border-radius:8px; font-weight:600; font-size:1rem; cursor:pointer; margin-top:1.5rem; transition: background-color 0.2s, transform 0.1s; }
        .auth-btn:hover { background-color:${theme.primaryHover}; }
        .auth-btn:active { transform: scale(0.98); }
        .auth-btn:disabled { opacity:0.7; cursor:not-allowed; }
        .link-btn { background:none; border:none; color:${theme.textSecondary}; font-size:0.875rem; cursor:pointer; transition: color 0.2s; margin-top:0.5rem; }
        .link-btn:hover { color: ${theme.primary}; text-decoration: underline; }
        .divider { border-top: 1px solid ${theme.border}; margin: 2rem 0 1.5rem 0; }
      `}</style>

      <div className="auth-card">
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <h2 style={{ fontSize:'1.75rem', fontWeight:'700', color: theme.textMain, marginBottom:'0.5rem' }}>
            {view === 'login' && 'Welcome Back'}
            {view === 'register' && 'Create Account'}
            {view === 'reset' && 'Reset Password'}
            {view === 'update' && 'Set a New Password'}
          </h2>
          <p style={{ color: theme.textSecondary, fontSize:'0.9rem' }}>
            {view === 'login' && 'Please enter your details to sign in.'}
            {view === 'register' && 'Get started with your free account.'}
            {view === 'reset' && 'Enter your email to receive a reset link.'}
            {view === 'update' && 'Choose a secure new password for your account.'}
          </p>
        </div>

        {message.content && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            backgroundColor: message.type === 'error' ? theme.errorBg : theme.successBg,
            color: message.type === 'error' ? theme.errorText : theme.successText,
            border: `1px solid ${message.type === 'error' ? '#FECACA' : '#A7F3D0'}`
          }}>
            {message.content}
          </div>
        )}

        {/* Form */}
        <form onSubmit={
            view === 'login' ? handleLogin :
            view === 'register' ? handleRegister :
            view === 'reset' ? handleResetPassword :
            handleUpdatePassword
        }>

          {view === 'register' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: theme.textMain }}>Full Name</label>
              <input className="auth-input" type="text" required placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}

          {(view === 'login' || view === 'register' || view === 'reset') && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: theme.textMain }}>Email Address</label>
              <input className="auth-input" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}

          {view === 'update' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: theme.textMain }}>New Password</label>
              <input className="auth-input" type="password" required placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          )}

          {view !== 'reset' && view !== 'update' && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: theme.textMain }}>Password</label>
              </div>
              <input className="auth-input" type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}

          {view === 'login' && (
             <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
                <button type="button" onClick={() => { setView('reset'); setMessage({ type:'', content:'' }); }} style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '0.8rem', cursor: 'pointer', fontWeight: '500' }}>
                  Forgot password?
                </button>
             </div>
          )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span>Loading...</span> : (
              <>
                {view === 'login' && 'Sign In'}
                {view === 'register' && 'Sign Up'}
                {view === 'reset' && 'Send Instructions'}
                {view === 'update' && 'Update Password'}
              </>
            )}
          </button>
        </form>

        <div className="divider"></div>

        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {view === 'login' && (
            <span style={{ fontSize:'0.9rem', color: theme.textSecondary }}>
              Don't have an account?{' '}
              <button className="link-btn" style={{ fontWeight:'600', color: theme.primary }} onClick={() => setView('register')}>Sign up</button>
            </span>
          )}

          {view === 'register' && (
            <span style={{ fontSize:'0.9rem', color: theme.textSecondary }}>
              Already have an account?{' '}
              <button className="link-btn" style={{ fontWeight:'600', color: theme.primary }} onClick={() => setView('login')}>Sign in</button>
            </span>
          )}

          {view === 'reset' && (
            <button className="link-btn" onClick={() => setView('login')}>&larr; Back to Sign In</button>
          )}

          {view === 'update' && (
            <button className="link-btn" onClick={() => setView('login')}>&larr; Cancel & Back to Sign In</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Authentication;
