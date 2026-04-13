import { useEffect, useRef, useState } from 'react';
import { FONTS, TYPE } from './theme'
import { COLORS } from './colors';

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return width
}

export default function AddBook({
  isbn, setIsbn,
  onSearch, onConfirm,
  pendingBooks, setPendingBooks,
  message, submitting, onBack
}) {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [inputMode, setInputMode] = useState('isbn');
  const [scanError, setScanError] = useState('');
  const viewWidth = useWindowWidth();
  const isMobile = viewWidth < 640;

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    setScanError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5Qrcode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5Qrcode;
      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 120 } },
        (decodedText) => {
          setIsbn(decodedText);
          html5Qrcode.stop();
          setScanning(false);
          onSearch(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch {
      setScanError('Camera access denied or scanner unavailable.');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    setScanning(false);
  };

  // ── Book picker screen ──────────────────────────────
  if (pendingBooks && pendingBooks.length > 0) {
    return (
      <div style={styles.container}>
        <div style={styles.inner}>
          <button onClick={() => setPendingBooks([])} style={styles.backBtn}>← Back</button>
          <p style={styles.label}>SELECT A BOOK</p>
          <h1 style={styles.heading}>Which one<br />is it?</h1>
          {pendingBooks.map((book, i) => (
            <div key={i} style={styles.resultCard} onClick={() => onConfirm(book)}>
              {book.cover_image_url ? (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  style={styles.resultCover}
                />
              ) : (
                <div style={styles.resultCoverPlaceholder}>📖</div>
              )}
              <div style={styles.resultInfo}>
                <p style={styles.resultTitle}>{book.title}</p>
                <p style={styles.resultAuthor}>{book.author}</p>
                <p style={styles.resultMeta}>
                  {book.year_published} · {book.total_pages ? `${book.total_pages} pages` : 'Pages unknown'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main add book screen ────────────────────────────
  return (
    <div style={styles.container}>
      {/* Sticky App Bar */}
      <header style={styles.topBar}>
        <div style={{ ...styles.topBarInner, padding: isMobile ? '16px 12px' : '22px 24px' }}>
          <div style={styles.logoRow}>
            <span className="material-symbols-outlined" style={styles.logoIcon}>menu_book</span>
            <span style={styles.logoText}>CommonBook</span>
          </div>
          <button onClick={onBack} style={styles.backBtn}>← Back</button>
        </div>
      </header>

      <div style={styles.inner}>
      {/* Title */}
      <div style={styles.titleBlock}>
        <p style={styles.label}>NEW ENTRY</p>
        <h1 style={styles.heading}>Expand your<br />collection.</h1>
      </div>

      {/* Scanner */}
      <div style={styles.scanArea}>
        <div id="qr-reader" style={{ width: '100%', display: scanning ? 'block' : 'none' }} />
        {!scanning && (
          <div style={styles.scanPlaceholder}>
            <div style={styles.cornerTL} />
            <div style={styles.cornerTR} />
            <div style={styles.cornerBL} />
            <div style={styles.cornerBR} />
          </div>
        )}
        <button style={styles.scanBtn} onClick={scanning ? stopScanner : startScanner}>
          <span style={{ marginRight: '8px' }}>⌖</span>
          {scanning ? 'STOP SCANNING' : 'SCAN BOOK COVER OR ISBN'}
        </button>
      </div>

      <p style={styles.hint}>"Align the ISBN barcode within the frame for automatic cataloging."</p>

      {scanError && <p style={styles.error}>{scanError}</p>}

      {/* Divider */}
      <div style={styles.dividerRow}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerText}>OR ENTER MANUALLY</span>
        <div style={styles.dividerLine} />
      </div>

      {/* Toggle */}
      <div style={styles.toggleRow}>
        <button
          onClick={() => { setInputMode('isbn'); setIsbn(''); }}
          style={inputMode === 'isbn' ? styles.toggleActive : styles.toggleInactive}>
          ISBN
        </button>
        <button
          onClick={() => { setInputMode('title'); setIsbn(''); }}
          style={inputMode === 'title' ? styles.toggleActive : styles.toggleInactive}>
          TITLE
        </button>
      </div>

      {/* Input */}
      <div style={styles.fieldGroup}>
        <label style={styles.fieldLabel}>
          {inputMode === 'isbn' ? 'ISBN NUMBER' : 'BOOK TITLE'}
        </label>
        <input
          type="text"
          placeholder={inputMode === 'isbn' ? '978-3-16-148410-0' : 'e.g. Atomic Habits'}
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          style={styles.input}
        />
      </div>

      {message && (
        <p style={message.includes('Error') || message.includes('No book') ? styles.error : styles.successMsg}>
          {message}
        </p>
      )}

      {/* Catalog Button */}
      <button
        style={{
          ...styles.catalogBtn,
          backgroundColor: submitting ? COLORS.textFaint : COLORS.accent,
          cursor: submitting ? 'not-allowed' : 'pointer'
        }}
        onClick={onSearch}
        disabled={submitting}>
        {submitting ? 'SEARCHING...' : 'CATALOG BOOK →'}
      </button>
      </div> 
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: COLORS.bg,
    padding: '0',
    fontFamily: FONTS.body,
    width: '100%',
    maxWidth: '1600px',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  inner: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: '24px 20px 144px',
    width: '100%',
    boxSizing: 'border-box',
  },
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 40,
    backgroundColor: COLORS.bg,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  topBarInner: {
    maxWidth: '1600px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.textSoft,
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: FONTS.body,
    letterSpacing: '0.04em',
    padding: '4px 0',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: '7px' },
  logoIcon: {
    fontSize: '24px',
    color: COLORS.accent,
    fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
  },
  logoText: {
    fontFamily: FONTS.display,
    fontStyle: 'italic',
    fontSize: '24px',
    fontWeight: 700,
    color: COLORS.commonbookLogo,
  },
  titleBlock: { marginBottom: '24px' },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: COLORS.textSoft,
    marginBottom: '6px',
    margin: '0 0 6px',
  },
  heading: {
    fontFamily: FONTS.display,
    fontSize: '36px',
    fontWeight: 700,
    color: COLORS.text,
    lineHeight: 1.15,
    margin: 0,
  },
  scanArea: {
    position: 'relative',
    backgroundColor: COLORS.text,
    borderRadius: '16px',
    overflow: 'hidden',
    minHeight: '220px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '16px',
    marginBottom: '12px',
  },
  scanPlaceholder: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cornerTL: { position: 'absolute', top: '40px', left: '40px', width: '28px', height: '28px', borderTop: '2px solid rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,255,255,0.5)' },
  cornerTR: { position: 'absolute', top: '40px', right: '40px', width: '28px', height: '28px', borderTop: '2px solid rgba(255,255,255,0.5)', borderRight: '2px solid rgba(255,255,255,0.5)' },
  cornerBL: { position: 'absolute', bottom: '72px', left: '40px', width: '28px', height: '28px', borderBottom: '2px solid rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,255,255,0.5)' },
  cornerBR: { position: 'absolute', bottom: '72px', right: '40px', width: '28px', height: '28px', borderBottom: '2px solid rgba(255,255,255,0.5)', borderRight: '2px solid rgba(255,255,255,0.5)' },
  scanBtn: {
    position: 'relative', zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    border: 'none', borderRadius: '999px',
    padding: '12px 20px', fontSize: '12px',
    fontWeight: 700, letterSpacing: '0.1em',
    color: COLORS.text, cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  },
  hint: {
    fontStyle: 'italic', fontSize: '13px',
    color: COLORS.textSoft, marginBottom: '24px', lineHeight: 1.5,
  },
  dividerRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' },
  dividerLine: { flex: 1, height: '1px', backgroundColor:COLORS.border },
  dividerText: { fontSize: '10px', letterSpacing: '0.12em', color: COLORS.textFaint, whiteSpace: 'nowrap' },
  toggleRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
  toggleActive: {
    padding: '7px 20px', borderRadius: '999px',
    border: `1.5px solid ${COLORS.accent}`,
    backgroundColor: COLORS.accent, color: '#fff',
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer',
  },
  toggleInactive: {
    padding: '7px 20px', borderRadius: '999px',
    border: `1.5px solid ${COLORS.border}`,
    backgroundColor: 'transparent', color: COLORS.textSoft,
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', marginBottom: '16px' },
  fieldLabel: {
    fontSize: '11px', fontWeight: 600,
    letterSpacing: '0.1em', color: COLORS.textSoft, marginBottom: '6px',
  },
  input: {
    padding: '13px 14px',
    border: `1.5px solid ${COLORS.border}`, borderRadius: '8px',
    outline: 'none', color: COLORS.text,
    backgroundColor: COLORS.surface,
    fontFamily: FONTS.body,
    boxSizing: 'border-box', width: '100%',
  },
  error: { color: COLORS.error, fontSize: '13px', marginBottom: '12px' },
  successMsg: { color: COLORS.success, fontSize: '13px', marginBottom: '12px' },
  catalogBtn: {
    width: '100%', padding: '16px',
    backgroundColor: COLORS.accent, color: '#fff',
    border: 'none', borderRadius: '10px',
    fontSize: '13px', fontWeight: 700,
    letterSpacing: '0.12em', cursor: 'pointer',
    marginTop: '8px', boxSizing: 'border-box',
  },
  resultCard: {
    display: 'flex', gap: '14px',
    backgroundColor: COLORS.surface, borderRadius: '12px',
    padding: '14px', marginBottom: '10px',
    cursor: 'pointer', alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  resultCover: {
    width: '50px', height: '70px',
    objectFit: 'cover', borderRadius: '4px', flexShrink: 0,
  },
  resultCoverPlaceholder: {
    width: '50px', height: '70px',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '24px',
    backgroundColor: COLORS.cardBg, borderRadius: '4px', flexShrink: 0,
  },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: '15px', fontWeight: 600, color: COLORS.text, margin: '0 0 4px' },
  resultAuthor: { fontSize: '13px', color: COLORS.textSoft, margin: '0 0 4px' },
  resultMeta: { fontSize: '12px', color: COLORS.textFaint, margin: 0 },
};