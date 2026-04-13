import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
// import { COLORS } from './colors';

const COLORS = {
  bg: '#fbf9f4',
  surface: '#FCFAF6',
  surfaceStrong: '#FFFFFF',
  border: '#DED7CB',
  olive: '#7D836D',
  tagBg: '#E6E2D7',
  coverBg: '#e1e0dc',
  gold: '#C8B27D',
  red: '#dd2121ff',
  text: '#2F2F2F',
  textSoft: '#7E7A73',
  secondaryBtn: '#EFE8DA',
  shadow: '0 10px 26px rgba(80, 68, 52, 0.08)'
}



function BookDetail({ book, session, onBack, onBookUpdated }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [descExpanded, setDescExpanded] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(null)
  const [notes, setNotes] = useState('')
  const [currentPageInput, setCurrentPageInput] = useState('0')

  const [quotes, setQuotes] = useState([])
  const [showAddQuote, setShowAddQuote] = useState(false)
  const [newQuoteText, setNewQuoteText] = useState('')
  const [newQuotePage, setNewQuotePage] = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  

  useEffect(() => {
    if (!book) return
    setRating(typeof book.rating === 'number' ? book.rating : 0)
    setNotes(book.notes || '')
    setCurrentPageInput(
      typeof book.current_page === 'number' ? String(book.current_page) : '0'
    )
    fetchQuotes()
  }, [book?.id])

  const fetchQuotes = async () => {
    if (!book?.id || !session?.user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('book_id', book.id)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Fetch quotes error:', error)
      setMessage(`Error loading quotes: ${error.message}`)
      setQuotes([])
    } else {
      setQuotes(data || [])
    }
    setLoading(false)
  }

  const displayRating = hoverRating ?? rating

  const synopsis = useMemo(() => {
    if (!book?.description) return 'No synopsis available yet.'
    return book.description
  }, [book])

  const totalPages = useMemo(() => {
    return typeof book?.total_pages === 'number' ? book.total_pages : 0
  }, [book])

  const currentPage = useMemo(() => {
    const parsed = parseInt(currentPageInput, 10)
    if (Number.isNaN(parsed) || parsed < 0) return 0
    if (totalPages > 0) return Math.min(parsed, totalPages)
    return parsed
  }, [currentPageInput, totalPages])

  const progressPercent = useMemo(() => {
    if (!totalPages || totalPages <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((currentPage / totalPages) * 100)))
  }, [currentPage, totalPages])

  const normalizeCoverUrl = (url) => {
    if (!url) return ''
    return url.replace('http://', 'https://')
  }

  const getGenreLabel = (genre) => {
    if (!genre) return 'General'
    return genre.split(',')[0].trim()
  }

  const getheartFill = (heartCount, activeValue) => {
    if (activeValue >= heartCount) return '100%'
    if (activeValue >= heartCount - 0.5) return '50%'
    return '0%'
  }

  const getRatingFromEvent = (heartCount, event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const isLeftHalf = x < rect.width / 2
    return isLeftHalf ? heartCount - 0.5 : heartCount
  }

  const handleHeartMove = (heartCount, event) => {
    setHoverRating(getRatingFromEvent(heartCount, event))
  }

  const handleHeartClick = (heartCount, event) => {
    setRating(getRatingFromEvent(heartCount, event))
  }

  const handleAddQuote = async () => {
    if (!book?.id || !session?.user || !newQuoteText.trim()) return
    const parsedPage = newQuotePage.trim() ? parseInt(newQuotePage, 10) : null
    if (newQuotePage.trim() && Number.isNaN(parsedPage)) {
      setMessage('Page number must be a valid number')
      return
    }
    const payload = {
      book_id: book.id,
      user_id: session.user.id,
      text: newQuoteText.trim(),
      page_number: parsedPage
    }
    const { data, error } = await supabase
      .from('quotes')
      .insert(payload)
      .select()
      .single()
    if (error) {
      console.error('Add quote error:', error)
      setMessage(`Error adding quote: ${error.message}`)
      return
    }
    setQuotes((prev) => [data, ...prev])
    setNewQuoteText('')
    setNewQuotePage('')
    setShowAddQuote(false)
    setMessage('Quote saved')
    const { data: aiResult, error: aiError } = await supabase.functions.invoke('categorize-quote', {
      body: { quoteId: data.id }
    })
    if (aiError) {
      console.error('AI categorization error:', aiError)
      return
    }
    console.log('AI categorization result:', aiResult)
    fetchQuotes()
  }

  const handleDeleteQuote = async (quoteId) => {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId)
      .eq('user_id', session.user.id)
    if (error) {
      console.error('Delete quote error:', error)
      setMessage(`Error deleting quote: ${error.message}`)
      return
    }
    setQuotes((prev) => prev.filter((quote) => quote.id !== quoteId))
  }

  const handleDeleteBook = async () => {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', book.id)
      .eq('user_id', session.user.id)
    if (error) {
      setMessage(`Error deleting book: ${error.message}`)
      setShowDeleteConfirm(false)
      return
    }
    if (onBookUpdated) onBookUpdated(null, book.id)
    setTimeout(() => { onBack() }, 100)
  }

  const saveBookDetails = async () => {
    if (!book?.id || !session?.user) return
    setSaving(true)
    setMessage('')
    const payload = {
      notes,
      rating,
      current_page: currentPage,
      updated_at: new Date().toISOString()
    }
    const { data, error } = await supabase
      .from('books')
      .update(payload)
      .eq('id', book.id)
      .eq('user_id', session.user.id)
      .select()
      .single()
    if (error) {
      console.error('Save book error:', error)
      setMessage(`Error saving book: ${error.message}`)
      setSaving(false)
      return
    }
    setSaving(false)
    setMessage('Changes saved')
    if (onBookUpdated) onBookUpdated(data)
  }

  if (!book) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <button onClick={onBack} style={styles.secondaryPill}>← Back</button>
          <div style={{ marginTop: '24px', color: COLORS.text }}>No book selected.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>

      {/* Sticky Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← CommonBook</button>
        <div style={styles.avatarCircle}>
          {session?.user?.user_metadata?.avatar_url ? (
            <img src={session.user.user_metadata.avatar_url} alt="avatar" style={styles.avatarImg} />
          ) : (
            <span style={{ fontSize: '0.85rem', color: COLORS.textSoft }}>👤</span>
          )}
        </div>
      </div>

      <div style={styles.container}>

        {/* Message */}
        {message && <div style={styles.message}>{message}</div>}

        {/* Book Info */}
        <div style={styles.bookCard}>
          <h2 style={styles.bookTitle}>{book.title}</h2>
          <div style={styles.author}>{book.author || 'Unknown author'}</div>
          <div style={styles.year}>{book.year_published || ''}</div>

          {/* Cover — centered */}
          <div style={styles.coverFrame}>
            {book.cover_image_url ? (
              <img
                src={normalizeCoverUrl(book.cover_image_url)}
                alt={book.title}
                style={styles.coverImage}
              />
            ) : (
              <div style={styles.coverFallback}>📖</div>
            )}
          </div>

          {/* ── Synopsis ── */}
          <div style={styles.descWrap}>
            <p style={{
              ...styles.description,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: descExpanded ? 'unset' : 4,
              overflow: descExpanded ? 'visible' : 'hidden',
            }}>
              {synopsis}
            </p>

            {book?.description && (
              <button
                type="button"
                onClick={() => setDescExpanded(prev => !prev)}
                style={styles.readMoreBtn}
              >
                {descExpanded ? 'Show Less' : 'Read More'}
              </button>
            )}
          </div>

          {/* Meta */}
          <div style={styles.bookMeta}>
            {book.total_pages ? (
              <div style={styles.metaRow}>{book.total_pages} pages</div>
            ) : null}
            <div style={styles.genreTag}>{getGenreLabel(book.genre).toUpperCase()}</div>
            <div style={styles.progressText}>
              {progressPercent}% · {currentPage} OF {book.total_pages || '—'} PAGES
            </div>
          </div>
        </div>

        {/* My Thoughts */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>My Thoughts</h3>
          <div style={styles.label}>How much do I love this book</div>

          <div style={styles.ratingRow}>
            <div style={styles.heartsWrap} onMouseLeave={() => setHoverRating(null)}>
              {[1, 2, 3, 4, 5].map((heartCount) => {
                const fill = getheartFill(heartCount, displayRating)
                return (
                  <div
                    key={heartCount}
                    style={styles.heartHitArea}
                    onMouseMove={(e) => handleHeartMove(heartCount, e)}
                    onClick={(e) => handleHeartClick(heartCount, e)}
                    role="button"
                    aria-label={`Love ${heartCount}`}
                  >
                    <span style={styles.heartBase}>♥</span>
                    <span style={{ ...styles.heartFill, width: fill }}>♥</span>
                  </div>
                )
              })}
            </div>
            <div style={styles.ratingValue}>{displayRating.toFixed(1)} / 5</div>
          </div>

          <div style={styles.fieldLabel}>CURRENT READING PROGRESS (PAGE NUMBER)</div>
          <input
            type="number"
            min="0"
            max={book.total_pages || undefined}
            value={currentPageInput}
            onChange={(e) => setCurrentPageInput(e.target.value)}
            style={styles.pageInput}
            placeholder="Enter current page"
          />

          <div style={styles.fieldLabel}>NOTES & THOUGHTS</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did I think about this book?"
            style={styles.textarea}
          />
        </section>

        {/* Saved Quotes */}
        <section style={styles.section}>
          <div style={styles.quoteHeader}>
            <h3 style={styles.sectionTitle}>Saved Quotes</h3>
            <button
              type="button"
              style={styles.primaryPillSmall}
              onClick={() => setShowAddQuote((prev) => !prev)}
            >
              + Add New Quote
            </button>
          </div>

          {showAddQuote && (
            <div style={styles.addQuoteBox}>
              <textarea
                value={newQuoteText}
                onChange={(e) => setNewQuoteText(e.target.value)}
                placeholder="Enter a quote you want to remember"
                style={styles.quoteTextarea}
              />
              <input
                type="number"
                min="0"
                value={newQuotePage}
                onChange={(e) => setNewQuotePage(e.target.value)}
                placeholder="Page number"
                style={styles.pageInput}
              />
              <div style={styles.addQuoteActions}>
                <button
                  type="button"
                  style={styles.secondaryPillSmall}
                  onClick={() => {
                    setShowAddQuote(false)
                    setNewQuoteText('')
                    setNewQuotePage('')
                  }}
                >
                  Cancel
                </button>
                <button type="button" style={styles.primaryPillSmall} onClick={handleAddQuote}>
                  Save Quote
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={styles.emptyQuoteText}>Loading quotes...</div>
          ) : quotes.length > 0 ? (
            <div style={styles.quoteList}>
              {quotes.map((quote) => (
                <div key={quote.id} style={styles.quoteCard}>
                  <div style={styles.quoteText}>"{quote.text}"</div>

                  {quote.mood && (
                    <div style={styles.quoteMood}>Mood: {quote.mood}</div>
                  )}

                  {quote.tags && quote.tags.length > 0 && (
                    <div style={styles.tagsWrap}>
                      {quote.tags.map((tag, index) => (
                        <span key={index} style={styles.tagChip}>#{tag}</span>
                      ))}
                    </div>
                  )}

                  {quote.ai_status === 'quota_exceeded' && (
                    <div style={styles.quotaNotice}>
                      AI categorisation limit reached. You can still tag this quote manually.
                    </div>
                  )}
                  {quote.ai_status === 'processing' && (
                    <div style={styles.processingNotice}>Categorising quote...</div>
                  )}
                  {quote.ai_status === 'failed' && (
                    <div style={styles.processingNotice}>
                      AI categorisation failed. You can still tag it manually.
                    </div>
                  )}

                  <div style={styles.quoteFooter}>
                    <span style={styles.quotePage}>
                      {quote.page_number != null ? `PAGE ${quote.page_number}` : 'PAGE NOT SET'}
                    </span>
                    <button
                      type="button"
                      style={styles.deleteTextButton}
                      onClick={() => handleDeleteQuote(quote.id)}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyQuoteText}>No quotes saved yet.</div>
          )}
        </section>

        {/* Spacer for sticky bottom bar */}
        <div style={{ height: '80px' }} />
      </div>

      {/* Sticky Bottom Bar */}
      <div style={styles.bottomBar}>
        {!showDeleteConfirm ? (
          <>
            <button
              type="button"
              style={styles.deleteOutlineButton}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Remove Book
            </button>
            <button
              type="button"
              style={styles.primaryPill}
              onClick={saveBookDetails}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              style={styles.secondaryPillSmall}
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
            <button type="button" style={styles.deletePill} onClick={handleDeleteBook}>
              Yes, remove it
            </button>
          </>
        )}
      </div>

    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: '"Manrope", "Segoe UI", system-ui, sans-serif',
  },
  // ── Sticky header ──────────────────────────────────────
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    background: COLORS.bg,
    borderBottom: `1px solid ${COLORS.border}`
  },
  backButton: {
    border: 'none',
    background: 'transparent',
    color: COLORS.text,
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    letterSpacing: '-0.01em'
  },
  avatarCircle: {
    width: '34px',
    height: '34px',
    borderRadius: '999px',
    background: COLORS.tagBg,
    border: `1px solid ${COLORS.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  // ── Scrollable content ─────────────────────────────────
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '20px 20px 0'
  },
  message: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: `1px solid ${COLORS.border}`,
    background: '#F6F2EA',
    color: COLORS.text,
    fontSize: '0.9rem'
  },
  // ── Book card ──────────────────────────────────────────
  bookCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: '20px',
    padding: '24px 20px',          // ← add padding all around
    background: COLORS.coverBg,    // ← card background
    border: `1px solid ${COLORS.border}`,  // ← subtle border
    borderRadius: '24px',          // ← rounded corners
    boxShadow: COLORS.shadow,      // ← lift it off the page
    marginBottom: '8px',           // ← breathing room before My Thoughts
  },
  bookTitle: {
    margin: '0 0 4px',
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: '-0.02em'
  },
  author: {
    margin: '0 0 2px',
    fontSize: '0.95rem',
    color: COLORS.gold,
    fontWeight: 600,
    textAlign: 'center'
  },
  year: {
    fontSize: '0.84rem',
    color: COLORS.textSoft,
    margin: '0 0 16px',
    textAlign: 'center'
  },
  coverFrame: {
    width: '140px',
    height: '200px',
    background: COLORS.coverBg,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: '16px',
    flexShrink: 0
  },
  coverImage: {
    // width: '100%',
    // height: '100%',
    // objectFit: 'cover'

    maxWidth: '100%',
    maxHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
    boxShadow: '0px 7px 6px rgba(0, 0, 0, 0.3), -3px 3px 8px rgba(0, 0, 0, 0.12)'
  },
  coverFallback: {
    fontSize: '2.2rem',
    color: COLORS.textSoft
  },
  synopsis: {
    margin: '0 0 16px',
    fontSize: '0.86rem',
    lineHeight: 1.6,
    color: COLORS.textSoft,
    fontStyle: 'italic',
    textAlign: 'left'
  },
  descWrap: {
    marginBottom: '20px',
  },
  description: {
    fontSize: '0.95rem',
    color: COLORS.text,
    lineHeight: 1.75,
    textAlign: 'justify',
    margin: '0 0 8px',
    fontStyle: 'italic',
    fontFamily: "'Newsreader', Georgia, serif",
  },
  readMoreBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.text,
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    letterSpacing: '0.01em',
  },
  bookMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    gap: '8px'
  },
  metaRow: {
    fontSize: '0.84rem',
    color: COLORS.textSoft
  },
  genreTag: {
    display: 'inline-flex',
    padding: '4px 14px',
    borderRadius: '999px',
    background: COLORS.olive,
    color: '#FFFFFF',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.06em'
  },
  progressText: {
    fontSize: '0.72rem',
    color: COLORS.textSoft,
    letterSpacing: '0.04em',
    fontWeight: 500
  },
  // ── Sections ───────────────────────────────────────────
  section: {
    marginTop: '28px',
    paddingTop: '24px',
    borderTop: `1px solid ${COLORS.border}`
  },
  sectionTitle: {
    margin: '0 0 4px',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: COLORS.text,
    letterSpacing: '-0.01em'
  },
  label: {
    marginBottom: '12px',
    fontSize: '0.82rem',
    color: COLORS.textSoft,
    textAlign: 'center'
  },
  fieldLabel: {
    marginTop: '18px',
    marginBottom: '8px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.07em',
    color: COLORS.textSoft,
    textTransform: 'uppercase'
  },
  // ── Rating ─────────────────────────────────────────────
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    marginBottom: '4px'
  },
  heartsWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  heartHitArea: {
    position: 'relative',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  heartBase: {
    position: 'absolute',
    inset: 0,
    fontSize: '32px',
    lineHeight: '32px',
    color: '#D2CEC5'
  },
  heartFill: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    fontSize: '32px',
    lineHeight: '32px',
    color: COLORS.red
  },
  ratingValue: {
    fontSize: '0.9rem',
    color: COLORS.textSoft,
    fontWeight: 500
  },
  // ── Inputs ─────────────────────────────────────────────
  pageInput: {
    width: '100%',
    borderRadius: '14px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surfaceStrong,
    color: COLORS.text,
    padding: '12px 14px',
    fontSize: '0.92rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none'
  },
  textarea: {
    width: '100%',
    minHeight: '118px',
    resize: 'vertical',
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surfaceStrong,
    color: COLORS.text,
    padding: '14px',
    fontSize: '0.92rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box'
  },
  // ── Quotes ─────────────────────────────────────────────
  quoteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px'
  },
  addQuoteBox: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '18px',
    padding: '14px',
    marginBottom: '14px'
  },
  quoteTextarea: {
    width: '100%',
    minHeight: '90px',
    resize: 'vertical',
    borderRadius: '14px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surfaceStrong,
    color: COLORS.text,
    padding: '14px',
    fontSize: '0.92rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none'
  },
  addQuoteActions: {
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  quoteList: {
    display: 'grid',
    gap: '14px'
  },
  quoteCard: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '18px',
    padding: '16px'
  },
  quoteText: {
    fontSize: '0.8rem',
    lineHeight: 1.65,
    color: COLORS.text,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: '12px'
  },
  quoteMood: {
    fontSize: '0.8rem',
    color: COLORS.olive,
    marginBottom: '8px',
    fontWeight: 600,
    textAlign: 'center'
  },
  tagsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
    justifyContent: 'center'
  },
  tagChip: {
    padding: '4px 10px',
    borderRadius: '999px',
    background: COLORS.tagBg,
    color: COLORS.olive,
    fontSize: '0.75rem',
    fontWeight: 600
  },
  quotaNotice: {
    fontSize: '0.78rem',
    color: '#A0522D',
    marginBottom: '10px',
    lineHeight: 1.4,
    textAlign: 'center'
  },
  processingNotice: {
    fontSize: '0.78rem',
    color: COLORS.textSoft,
    marginBottom: '10px',
    lineHeight: 1.4,
    textAlign: 'center'
  },
  quoteFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
    paddingTop: '10px',
    borderTop: `1px solid ${COLORS.border}`
  },
  quotePage: {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: COLORS.textSoft
  },
  deleteTextButton: {
    border: 'none',
    background: 'transparent',
    color: COLORS.textSoft,
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    cursor: 'pointer',
    padding: 0
  },
  emptyQuoteText: {
    fontSize: '0.9rem',
    color: COLORS.textSoft
  },
  // ── Sticky bottom bar ──────────────────────────────────
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    background: COLORS.bg,
    borderTop: `1px solid ${COLORS.border}`,
    zIndex: 10
  },
  primaryPill: {
    flex: 1,
    maxWidth: '200px',
    padding: '12px 18px',
    border: 'none',
    borderRadius: '999px',
    background: COLORS.olive,
    color: '#FFFFFF',
    fontSize: '0.94rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  primaryPillSmall: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '999px',
    background: COLORS.olive,
    color: '#FFFFFF',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  secondaryPill: {
    padding: '8px 16px',
    borderRadius: '999px',
    border: `1px solid ${COLORS.border}`,
    background: '#e1e0dc',
    color: COLORS.text,
    fontSize: '0.84rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  secondaryPillSmall: {
    flex: 1,
    maxWidth: '160px',
    padding: '12px 16px',
    borderRadius: '999px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.secondaryBtn,
    color: COLORS.text,
    fontSize: '0.84rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  deleteOutlineButton: {
    flex: 1,
    maxWidth: '160px',
    padding: '12px 18px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '999px',
    background: 'transparent',
    color: COLORS.textSoft,
    fontSize: '0.94rem',
    cursor: 'pointer'
  },
  deletePill: {
    flex: 1,
    maxWidth: '200px',
    padding: '12px 18px',
    border: 'none',
    borderRadius: '999px',
    background: '#A0522D',
    color: '#FFFFFF',
    fontSize: '0.84rem',
    fontWeight: 600,
    cursor: 'pointer'
  }
}

export default BookDetail