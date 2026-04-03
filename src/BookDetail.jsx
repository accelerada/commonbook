import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const COLORS = {
  bg: '#F5F2EB',
  surface: '#FCFAF6',
  surfaceStrong: '#FFFFFF',
  border: '#DED7CB',
  olive: '#7D836D',
  tagBg: '#E6E2D7',
  coverBg: '#E7E1D6',
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

    // Run AI categorization in background
    const { data: aiResult, error: aiError } = await supabase.functions.invoke('categorize-quote', {
        body: { quoteId: data.id }
    })

    if (aiError) {
        console.error('AI categorization error:', aiError)
        return
    }

    console.log('AI categorization result:', aiResult)

    // Refresh quotes so tags / mood / ai_status appear
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

    setTimeout(() => {
        onBack()
    }, 100)
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

    if (onBookUpdated) {
      onBookUpdated(data)
    }
  }

  if (!book) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <button onClick={onBack} style={styles.secondaryPill}>
            ← Back
          </button>
          <div style={{ marginTop: '24px', color: COLORS.text }}>No book selected.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <button onClick={onBack} style={styles.secondaryPill}>
            ← Back
          </button>
          <h1 style={styles.headerTitle}>Book Details</h1>
          <div style={{ width: 88 }} />
        </div>

        {/* Message */}
        {message && <div style={styles.message}>{message}</div>}

        {/* Book Card */}
        <div style={styles.bookCard}>
          <h2 style={styles.bookTitle}>{book.title}</h2>
          <div style={styles.author}>{book.author || 'Unknown author'}</div>
          <div style={styles.year}>{book.year_published || ''}</div>

          <div style={styles.coverAndSynopsis}>
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
            <p style={styles.synopsis}>{synopsis}</p>
          </div>

          <div style={styles.bookMeta}>
            <div style={styles.metaRow}>
              {book.total_pages ? `${book.total_pages} pages` : ''}
            </div>
            <div style={styles.genreTag}>{getGenreLabel(book.genre)}</div>
            <div style={styles.progressText}>
              {progressPercent}% · {currentPage} of {book.total_pages || '—'} pages
            </div>
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progressPercent}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* My Thoughts */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>My Thoughts</h3>

          <div style={styles.label}>How much do I love this book</div>

          <div style={styles.ratingRow}>
            <div
              style={styles.heartsWrap}
              onMouseLeave={() => setHoverRating(null)}
            >
              {[1, 2, 3, 4, 5].map((heartCount) => {
                const fill = getheartFill(heartCount, displayRating)
                return (
                  <div
                    key={heartCount}
                    style={styles.heartHitArea}
                    onMouseMove={(event) => handleHeartMove(heartCount, event)}
                    onClick={(event) => handleHeartClick(heartCount, event)}
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

          <div style={{ ...styles.label, marginTop: '18px' }}>Current Reading Progress (Page Number)</div>

          <input
            type="number"
            min="0"
            max={book.total_pages || undefined}
            value={currentPageInput}
            onChange={(e) => setCurrentPageInput(e.target.value)}
            style={styles.pageInput}
            placeholder="Enter current page"
          />

          <div style={{ ...styles.label, marginTop: '18px' }}>Notes & Thoughts</div>

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
                <button
                  type="button"
                  style={styles.primaryPillSmall}
                  onClick={handleAddQuote}
                >
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
                  <div style={styles.quoteBar} />
                  <div style={styles.quoteContent}>
                    <div style={styles.quoteText}>"{quote.text}"</div>

                        {quote.mood && (
                            <div style={styles.quoteMood}>
                            Mood: {quote.mood}
                            </div>
                        )}

                        {quote.tags && quote.tags.length > 0 && (
                            <div style={styles.tagsWrap}>
                            {quote.tags.map((tag, index) => (
                                <span key={index} style={styles.tagChip}>
                                #{tag}
                                </span>
                            ))}
                            </div>
                        )}

                        {quote.ai_status === 'quota_exceeded' && (
                            <div style={styles.quotaNotice}>
                            AI categorisation limit reached. You can still tag this quote manually or upgrade.
                            </div>
                        )}

                        {quote.ai_status === 'processing' && (
                            <div style={styles.processingNotice}>
                            Categorising quote...
                            </div>
                        )}

                        {quote.ai_status === 'failed' && (
                            <div style={styles.processingNotice}>
                            AI categorisation failed. You can still tag it manually.
                            </div>
                        )}


                    <div style={styles.quoteFooter}>
                      <span style={styles.quotePage}>
                        {quote.page_number != null ? `Page ${quote.page_number}` : 'Page not set'}
                      </span>
                      <button
                        type="button"
                        style={styles.deleteTextButton}
                        onClick={() => handleDeleteQuote(quote.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyQuoteText}>No quotes saved yet.</div>
          )}
        </section>

        {/* Save / Delete */}
        <div style={styles.saveWrap}>
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
            <div style={styles.confirmBox}>
              <p style={styles.confirmText}>Remove this book from your library?</p>
              <div style={styles.confirmActions}>
                <button
                  type="button"
                  style={styles.secondaryPillSmall}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={styles.deletePill}
                  onClick={handleDeleteBook}
                >
                  Yes, remove it
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
  },
  container: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '18px 24px 40px'
  },
  header: {
    display: 'grid',
    gridTemplateColumns: '88px 1fr 88px',
    alignItems: 'center',
    marginBottom: '16px'
  },
  headerTitle: {
    margin: 0,
    textAlign: 'center',
    fontSize: '1.1rem',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: COLORS.text
  },
  message: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '14px',
    border: `1px solid ${COLORS.border}`,
    background: '#F6F2EA',
    color: COLORS.text,
    fontSize: '0.95rem'
  },
  bookCard: {
    background: '#e1e0dc',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '22px',
    boxShadow: COLORS.shadow,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  bookTitle: {
    margin: '0',
    fontSize: '1.1rem',
    lineHeight: 1.2,
    color: COLORS.text,
    textAlign: 'center'
  },
  author: {
    margin: '0',
    fontSize: '0.92rem',
    lineHeight: 1.2,
    color: COLORS.textSoft,
    textAlign: 'center'
  },
  year: {
    fontSize: '0.84rem',
    color: COLORS.textSoft,
    margin: '0 0 8px',
    lineHeight: 1.2,
    textAlign: 'center'
  },
  coverAndSynopsis: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    gap: '40px',
    margin: '16px 0',
    alignItems: 'start',
    width: '100%'
  },
  coverFrame: {
    background: COLORS.coverBg,
    borderRadius: '14px',
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center'
  },
  coverFallback: {
    fontSize: '2.2rem',
    color: COLORS.textSoft
  },
  synopsis: {
    margin: '0',
    fontSize: '0.86rem',
    lineHeight: 1.5,
    color: COLORS.textSoft,
    textAlign: 'left'
  },
  bookMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%'
  },
  metaRow: {
    marginBottom: '8px',
    fontSize: '0.84rem',
    color: COLORS.textSoft
  },
  genreTag: {
    display: 'inline-flex',
    alignSelf: 'center',
    padding: '4px 12px',
    borderRadius: '999px',
    background: COLORS.olive,
    color: '#FFFFFF',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginBottom: '12px'
  },
  progressText: {
    marginBottom: '8px',
    fontSize: '0.75rem',
    color: COLORS.textSoft,
    textAlign: 'center'
  },
  progressTrack: {
    width: '100%',
    height: '7px',
    background: '#D2CCC1',
    borderRadius: '999px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: COLORS.gold,
    borderRadius: '999px'
  },
  section: {
    marginTop: '24px'
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '1.05rem',
    color: COLORS.text
  },
  label: {
    marginBottom: '8px',
    fontSize: '0.82rem',
    color: COLORS.textSoft,
    textAlign: 'center'
  },
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    flexWrap: 'wrap'
  },
  heartsWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  heartHitArea: {
    position: 'relative',
    width: '30px',
    height: '30px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  heartBase: {
    position: 'absolute',
    inset: 0,
    fontSize: '30px',
    lineHeight: '30px',
    color: '#D2CEC5'
  },
  heartFill: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    fontSize: '30px',
    lineHeight: '30px',
    color: COLORS.red
  },
  ratingValue: {
    fontSize: '0.9rem',
    color: COLORS.textSoft
  },
  textarea: {
    width: '100%',
    minHeight: '118px',
    resize: 'vertical',
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surfaceStrong,
    color: COLORS.text,
    padding: '16px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box'
  },
  pageInput: {
    width: '100%',
    marginTop: '10px',
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
  quoteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px'
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
    padding: '14px',
    display: 'flex',
    gap: '12px'
  },
  quoteBar: {
    width: '3px',
    borderRadius: '999px',
    background: COLORS.gold,
    flexShrink: 0
  },
  quoteContent: {
    flex: 1
  },
  quoteText: {
    fontSize: '0.92rem',
    lineHeight: 1.6,
    color: COLORS.text,
    marginBottom: '12px'
  },
  quoteMood: {
    fontSize: '0.8rem',
    color: COLORS.olive,
    marginBottom: '8px',
    fontWeight: 600
  },
  tagsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px'
  },
  tagChip: {
    padding: '5px 10px',
    borderRadius: '999px',
    background: COLORS.tagBg,
    color: COLORS.olive,
    fontSize: '0.75rem',
    fontWeight: 600
  },
  quotaNotice: {
    fontSize: '0.8rem',
    color: '#A0522D',
    marginBottom: '10px',
    lineHeight: 1.4
  },
  processingNotice: {
    fontSize: '0.8rem',
    color: COLORS.textSoft,
    marginBottom: '10px',
    lineHeight: 1.4
  },
  quoteFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  quotePage: {
    fontSize: '0.78rem',
    color: COLORS.textSoft
  },
  deleteTextButton: {
    border: 'none',
    background: 'transparent',
    color: COLORS.textSoft,
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: 0
  },
  emptyQuoteText: {
    fontSize: '0.9rem',
    color: COLORS.textSoft
  },
  saveWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginTop: '26px',
    flexWrap: 'wrap'
  },
  primaryPill: {
    padding: '8px 18px',
    minWidth: '152px',
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
    minWidth: '104px',
    border: 'none',
    borderRadius: '999px',
    background: COLORS.olive,
    color: '#FFFFFF',
    fontSize: '0.84rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  secondaryPill: {
    padding: '8px 16px',
    minWidth: '100px',
    borderRadius: '999px',
    border: `1px solid ${COLORS.border}`,
    background: '#e1e0dc',
    color: COLORS.text,
    fontSize: '0.84rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  secondaryPillSmall: {
    padding: '8px 16px',
    borderRadius: '999px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.secondaryBtn,
    color: COLORS.text,
    fontSize: '0.84rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  deleteOutlineButton: {
    padding: '8px 18px',
    minWidth: '120px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '999px',
    background: 'transparent',
    color: COLORS.textSoft,
    fontSize: '0.94rem',
    cursor: 'pointer'
  },
  deletePill: {
    padding: '8px 18px',
    minWidth: '120px',
    border: 'none',
    borderRadius: '999px',
    background: '#A0522D',
    color: '#FFFFFF',
    fontSize: '0.84rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  confirmBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderRadius: '18px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surface
  },
  confirmText: {
    margin: 0,
    fontSize: '0.9rem',
    color: COLORS.text
  },
  confirmActions: {
    display: 'flex',
    gap: '10px'
  }
}

export default BookDetail
