import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [modalStep, setModalStep] = useState(1); // 1 = confirm, 2 = enter name

  const attemptLogin = async () => {
    setError('');

    // ── Validation ──
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

    // ── Basic email format check ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        return;
    }

    setLoading(true);

    // Step 1: Try to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
        const { error: signUpCheckError } = await supabase.auth.signUp({
        email,
        password: 'check-only-dummy-password-123!',
        });

        if (signUpCheckError?.message?.toLowerCase().includes('already registered') ||
            signUpCheckError?.message?.toLowerCase().includes('already exists')) {
        setError('Incorrect password. Please try again.');
        } else {
        setShowModal(true);
        }
    }

    setLoading(false);
  };

  const handleEmailLogin = (e) => {
    e.preventDefault();
    attemptLogin();
  };

  const handleConfirmSignUp = async () => {
    setLoading(true);
    setModalStep(1);

    const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
        data: { full_name: name }
        }
    });

    if (signUpError) {
        setError(signUpError.message);
        setShowModal(false);
    } else {
        setModalStep(3); // ✅ show success screen instead of alert()
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div style={styles.container}>

      {/* ── Custom Modal ── */}
      {showModal && (
        <div style={styles.overlay}>
            <div style={styles.modal}>
            <div style={styles.modalIcon}>📖</div>

            {modalStep === 1 ? (
                <>
                <h2 style={styles.modalTitle}>New to The Nook?</h2>
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
                    <button
                    style={styles.modalCancelBtn}
                    onClick={() => setModalStep(1)}
                    >
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

      {/* ── Logo + Title ── */}
      <div style={styles.header}>
        <span style={styles.icon}>📖</span>
        <h1 style={styles.title}>The Nook</h1>
      </div>

      <p style={styles.tagline}>Your quiet corner awaits.</p>

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
      <form onSubmit={handleEmailLogin} style={styles.form}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>EMAIL</label>
          <input
            type="email"
            placeholder="archivist@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>PASSWORD</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          <div style={{ textAlign: 'right', marginTop: '6px' }}>
            <span style={styles.forgotLink}>FORGOTTEN ACCESS?</span>
          </div>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* ── Door + Submit ── */}
        <div style={styles.submitArea}>
          <div
            onClick={attemptLogin}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label="Step inside"
          >
            <DoorIcon />
          </div>
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? 'OPENING...' : 'STEP INSIDE'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f4f0e8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 32px 40px',
    fontFamily: "'Inter', sans-serif",
  },
  // Modal overlay
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
    backgroundColor: '#f4f0e8',
    borderRadius: '16px',
    padding: '36px 32px',
    width: '100%',
    maxWidth: '340px',
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',   // ✅ add this
  },
  modalIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  modalTitle: {
    fontFamily: "'Lora', Georgia, serif",
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: '24px',
    color: '#1a1a1a',
    margin: '0 0 12px',
  },
  modalBody: {
    fontSize: '14px',
    color: '#555',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    width: '100%',             // ✅ add this
    boxSizing: 'border-box',   // ✅ add this
  },
  modalCancelBtn: {
    flex: 1,
    padding: '11px',
    borderRadius: '8px',
    border: '1.5px solid #ccc',
    backgroundColor: 'transparent',
    fontSize: '13px',
    fontWeight: 600,
    color: '#666',
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  modalConfirmBtn: {
    flex: 1,
    padding: '11px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1a1a1a',
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
    marginBottom: '16px',
  },
  icon: { fontSize: '36px' },
  title: {
    fontFamily: "'Lora', Georgia, serif",
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: '38px',
    color: '#1a1a1a',
    margin: 0,
  },
  tagline: {
    fontSize: '26px',
    fontWeight: 400,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: '32px',
    lineHeight: 1.3,
  },
  socialRow: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    maxWidth: '360px',
    marginBottom: '24px',
  },
  googleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fff',
    border: '1.5px solid #ddd',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    color: '#1a1a1a',
  },
  appleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#1a1a1a',
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
    marginBottom: '24px',
  },
  dividerLine: { flex: 1, height: '1px', backgroundColor: '#ccc' },
  dividerText: {
    fontSize: '10px',
    letterSpacing: '0.12em',
    color: '#999',
    whiteSpace: 'nowrap',
  },
  form: {
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column' },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#666',
    marginBottom: '6px',
  },
  input: {
    padding: '12px 14px',
    border: '1.5px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    backgroundColor: '#fff',
    outline: 'none',
    color: '#1a1a1a',
    fontFamily: "'Inter', sans-serif",
  },
  forgotLink: {
    fontSize: '10px',
    letterSpacing: '0.1em',
    color: '#888',
    cursor: 'pointer',
  },
  error: { color: '#c0392b', fontSize: '13px', textAlign: 'center' },
  submitArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '12px',
    gap: '8px',
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
  },
};

// ── SVG Icons ────────────────────────────────────────────
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

function DoorIcon() {
  return (
    <svg width="60" height="90" viewBox="0 0 60 90" fill="none">
      <rect x="5" y="5" width="50" height="82" rx="4" fill="#c49a6c" stroke="#8b6340" strokeWidth="2"/>
      <rect x="10" y="10" width="40" height="35" rx="2" fill="#b8895a" opacity="0.5"/>
      <rect x="10" y="50" width="40" height="32" rx="2" fill="#b8895a" opacity="0.5"/>
      <circle cx="42" cy="47" r="3" fill="#8b6340"/>
      <rect x="2" y="83" width="56" height="4" rx="2" fill="#8b6340"/>
    </svg>
  );
}