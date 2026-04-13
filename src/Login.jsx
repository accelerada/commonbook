import { useState } from 'react';
import { supabase } from './supabaseClient';
import { COLORS } from './colors';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [modalStep, setModalStep] = useState(1);
  const [mode, setMode] = useState('signin');
  const [message, setMessage] = useState('');

  const attemptLogin = async () => {
    setError('');

    if (!email.trim() && !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      const { error: signUpCheckError } = await supabase.auth.signUp({
        email,
        password: 'check-only-dummy-password-123!',
      });

      if (
        signUpCheckError?.message?.toLowerCase().includes('already registered') ||
        signUpCheckError?.message?.toLowerCase().includes('already exists')
      ) {
        setError('Incorrect password. Please try again.');
      } else {
        setShowModal(true);
      }
    }

    setLoading(false);
  };

  const handleEmailSignIn = (e) => {
    e.preventDefault();
    attemptLogin();
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Reset link sent! Check your inbox.');
    }
    setLoading(false);
  };

  const handleConfirmSignUp = async () => {
    setLoading(true);
    setModalStep(1);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setShowModal(false);
    } else {
      setModalStep(3);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div style={styles.container}>

      {/* ── Modal ── */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            {modalStep === 1 ? (
              <>
                <h2 style={styles.modalTitle}>New to CommonBook?</h2>
                <p style={styles.modalBody}>
                  No account was found for <strong>{email}</strong>.<br />
                  Would you like to create one?
                </p>
                <div style={styles.modalButtons}>
                  <button
                    style={styles.modalCancelBtn}
                    onClick={() => { setShowModal(false); setModalStep(1); }}
                  >
                    Not yet
                  </button>
                  <button
                    style={styles.modalConfirmBtn}
                    onClick={() => setModalStep(2)}
                  >
                    Yes, create one
                  </button>
                </div>
              </>
            ) : modalStep === 2 ? (
              <>
                <h2 style={styles.modalTitle}>What shall we call you?</h2>
                <p style={styles.modalBody}>
                  Enter your name to personalise your reading room.
                </p>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ ...styles.input, marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}
                  autoFocus
                />
                <div style={styles.modalButtons}>
                  <button style={styles.modalCancelBtn} onClick={() => setModalStep(1)}>
                    Back
                  </button>
                  <button
                    style={styles.modalConfirmBtn}
                    onClick={handleConfirmSignUp}
                    disabled={!name.trim()}
                  >
                    Open my nook
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌿</div>
                <h2 style={styles.modalTitle}>Welcome, {name}!</h2>
                <p style={styles.modalBody}>
                  Your nook has been prepared.<br /><br />
                  We've sent a confirmation link to<br />
                  <strong>{email}</strong><br /><br />
                  Please verify your email, then come back to sign in.
                </p>
                <button
                  style={{ ...styles.modalConfirmBtn, width: '100%', boxSizing: 'border-box' }}
                  onClick={() => { setShowModal(false); setModalStep(1); }}
                >
                  Got it
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={styles.header}>
        <h1 style={styles.title}>CommonBook</h1>
        <p style={styles.subtitle}>A sanctuary for your favorite reads.</p>
        <div style={styles.iconWrap}>📚</div>
      </div>

      {/* ── Social Buttons ── */}
      <div style={styles.socialRow}>
        <button style={styles.googleBtn} onClick={handleGoogleLogin}>
          <GoogleIcon />
          <span>GOOGLE</span>
        </button>
        <button style={styles.appleBtn}>
          <AppleIcon />
          <span>APPLE</span>
        </button>
      </div>

      {/* ── Divider ── */}
      <div style={styles.dividerRow}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerText}>ENTRY VIA CREDENTIALS</span>
        <div style={styles.dividerLine} />
      </div>

      {/* ── Form ── */}
      <form
        onSubmit={mode === 'forgot' ? handleForgotPassword : handleEmailSignIn}
        style={styles.form}
      >
        {/* EMAIL */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <label style={styles.floatingLabel}>EMAIL</label>
          <input
            type="email"
            placeholder="commonbook@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* PASSWORD — hidden in forgot mode */}
        {mode !== 'forgot' && (
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <label style={styles.floatingLabel}>PASSWORD</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>
        )}

        {/* FORGOTTEN ACCESS */}
        {mode !== 'forgot' && (
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setMode('forgot'); setError(''); setMessage(''); }}
            style={styles.forgotLink}
          >
            FORGOTTEN ACCESS?
          </a>
        )}

        {error && <p style={styles.error}>{error}</p>}
        {message && <p style={styles.message}>{message}</p>}

        <button type="submit" style={styles.submitBtn} disabled={loading}>
          {loading ? 'LOADING...' : mode === 'forgot' ? 'SEND RESET LINK' : 'START EXPLORING'}
        </button>

        {mode === 'forgot' && (
          <button
            type="button"
            style={styles.backLink}
            onClick={() => { setMode('signin'); setMessage(''); setError(''); }}
          >
            Back to sign in
          </button>
        )}
      </form>

      <p style={styles.footer}>Welcome back to your personal sanctuary.</p>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: COLORS.bg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 32px 40px',
    fontFamily: '"Manrope", "Segoe UI", system-ui, sans-serif',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: COLORS.bg,
    borderRadius: '16px',
    padding: '36px 32px',
    width: '100%',
    maxWidth: '340px',
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
    fontFamily: '"Manrope", "Segoe UI", system-ui, sans-serif',
    boxSizing: 'border-box',
  },
  modalTitle: {
    fontFamily: "'Newsreader', Georgia, serif",
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: '24px',
    color: COLORS.text,
    margin: '0 0 12px',
  },
  modalBody: {
    fontSize: '14px',
    color: COLORS.textSoft,
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    boxSizing: 'border-box',
  },
  modalCancelBtn: {
    flex: 1,
    padding: '11px',
    borderRadius: '8px',
    border: `1.5px solid ${COLORS.border}`,
    backgroundColor: 'transparent',
    fontSize: '13px',
    fontWeight: 600,
    color: COLORS.textSoft,
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  modalConfirmBtn: {
    flex: 1,
    padding: '11px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: COLORS.text,
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '40px',
  },
  iconWrap: {
    fontSize: '36px',
    marginTop: '8px',
  },
  title: {
    fontFamily: "'Newsreader', Georgia, serif",
    fontStyle: 'italic',
    fontWeight: 700,
    fontSize: '38px',
    color: COLORS.text,
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: COLORS.textSoft,
    margin: 0,
  },
  socialRow: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    maxWidth: '360px',
    marginBottom: '36px',
  },
  googleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '13px',
    backgroundColor: '#fff',
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    color: COLORS.text,
  },
  appleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '13px',
    backgroundColor: COLORS.text,
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    color: '#fff',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    maxWidth: '360px',
    marginBottom: '36px',
  },
  dividerLine: { flex: 1, height: '1px', backgroundColor: COLORS.border },
  dividerText: {
    fontSize: '10px',
    letterSpacing: '0.12em',
    color: COLORS.textSoft,
    whiteSpace: 'nowrap',
  },
  form: {
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
  },
  floatingLabel: {
    position: 'absolute',
    top: -10,
    left: 12,
    backgroundColor: COLORS.bg,
    paddingInline: 4,
    fontSize: 11,
    letterSpacing: '0.08em',
    color: COLORS.textSoft,
    zIndex: 1,
    fontFamily: 'inherit',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'transparent',
    outline: 'none',
    color: COLORS.text,
    fontFamily: '"Manrope", "Segoe UI", system-ui, sans-serif',
    boxSizing: 'border-box',
  },
  forgotLink: {
    display: 'block',
    textAlign: 'right',
    fontSize: 11,
    letterSpacing: '0.08em',
    color: COLORS.textSoft,
    textDecoration: 'none',
    marginTop: 8,
    marginBottom: 40,
    cursor: 'pointer',
  },
  error: {
    color: '#c0392b',
    fontSize: '13px',
    textAlign: 'center',
    marginBottom: '12px',
  },
  message: {
    color: COLORS.olive,
    fontSize: '13px',
    textAlign: 'center',
    marginBottom: '12px',
  },
  submitBtn: {
    background: 'none',
    border: 'none',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.15em',
    color: '#c0622a',
    cursor: 'pointer',
    padding: '4px 0',
    textAlign: 'center',
  },
  backLink: {
    background: 'none',
    border: 'none',
    fontSize: '12px',
    color: COLORS.textSoft,
    cursor: 'pointer',
    marginTop: '12px',
    textAlign: 'center',
    textDecoration: 'underline',
  },
  footer: {
    fontSize: '13px',
    color: COLORS.textSoft,
    marginTop: '48px',
    textAlign: 'center',
  },
};

// ── SVG Icons ─────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.6 29.3 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.9 0 20.1-7.9 21-18.5.1-.8.1-1.7.1-2.5 0-1.3-.1-2.7-.4-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.5 5.1 29.5 3 24 3c-7.8 0-14.6 4.2-18.3 10.5z"/>
      <path fill="#4CAF50" d="M24 45c5.2 0 10-1.9 13.7-5.1l-6.3-5.3C29.3 36.3 26.8 37 24 37c-5.2 0-9.7-3.4-11.3-8H6.3C9.9 37.8 16.4 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 35.1 44 29.9 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 814 1000" fill="white">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 34.2.1 98.1 3.4 148.6 50zm-186-193.3c35.6-44.1 61-105.5 61-166.9 0-8.3-.6-16.6-2-24.3-57.5 2.2-126.7 38.2-167.4 86.6-32.1 37.4-63.3 98.8-63.3 161.2 0 9 1.4 18.1 2 20.9 3.8.6 10.3 1.3 16.8 1.3 51.9 0 115.3-33.5 152.9-78.8z"/>
    </svg>
  );
}