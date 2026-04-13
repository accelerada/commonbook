import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import BookDetail from './BookDetail'
import Login from './Login'
import AddBook from './AddBook'
import { COLORS } from './colors'
import { FONTS, TYPE } from './theme'


const RATING_OPTIONS = [
  { value: 'all', label: 'All Ratings' },
  { value: '5', label: '♥♥♥♥♥' },
  { value: '4', label: '♥♥♥♥', hint: '4 & 4.5' },
  { value: '3', label: '♥♥♥', hint: '3 & 3.5' },
  { value: '2below', label: '♥♥ & below', hint: '2.5 and below' }
]

const SORT_OPTIONS = [
  { value: 'date_added_asc', label: 'Sort By' },
  { value: 'rating_asc', label: 'Rating, low to high' },
  { value: 'rating_desc', label: 'Rating, high to low' },
  { value: 'title_asc', label: 'Title, A to Z' },
  { value: 'title_desc', label: 'Title, Z to A' },
  { value: 'progress_asc', label: 'Progress, low to high' },
  { value: 'progress_desc', label: 'Progress, high to low' },
  { value: 'date_added_asc', label: 'Date added, oldest first' },
  { value: 'date_added_desc', label: 'Date added, newest first' },
  { value: 'completed_asc', label: 'Date completed, oldest first' },
  { value: 'completed_desc', label: 'Date completed, newest first' }
]

const SORT_PILL_LABELS = {
  rating_asc: 'Rating',
  rating_desc: 'Rating',
  title_asc: 'Title',
  title_desc: 'Title',
  progress_asc: 'Progress',
  progress_desc: 'Progress',
  date_added_asc: 'Date Added',
  date_added_desc: 'Date Added',
  completed_asc: 'Completed',
  completed_desc: 'Completed'
}

const STATUS_OPTIONS = ['All Status', 'Not Started', 'Reading', 'Completed']

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return width
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [isbn, setIsbn] = useState('')
  const [activeTab, setActiveTab] = useState('library')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [genreFilter, setGenreFilter] = useState('All Genres')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [sortBy, setSortBy] = useState('Sort by')
  const [openDropdown, setOpenDropdown] = useState(null)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [isSignOutHovered, setIsSignOutHovered] = useState(false)
  const [pendingBooks, setPendingBooks] = useState([])
  const dropdownRef = useRef(null)
  const accountMenuRef = useRef(null)
  const width = useWindowWidth()
  const isMobile = width < 640
  const styles = makeStyles(isMobile, width)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session?.user) fetchBooks(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      if (nextSession?.user) {
        fetchBooks(nextSession)
      } else {
        setBooks([])
        setSelectedBook(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null)
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(timer)
  }, [message])

  const fetchBooks = async (activeSession = session) => {
    if (!activeSession?.user) return
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', activeSession.user.id)
      .order('created_at', { ascending: false })
    if (error) {
      setMessage(`Error loading books: ${error.message}`)
      return
    }
    setBooks(data || [])
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setMessage(`Sign out error: ${error.message}`)
      return
    }
    setShowAccountMenu(false)
    setSelectedBook(null)
  }

  const normalizeCoverUrl = (url) => {
    if (!url) return ''
    return url.replace('http://', 'https://')
  }

  const getGenreLabel = (genre) => {
    if (!genre) return 'General'
    return genre.split(',')[0].trim()
  }

  const getReadingStatus = (book) => {
    const currentPage = typeof book.current_page === 'number' ? book.current_page : 0
    const totalPages = typeof book.total_pages === 'number' ? book.total_pages : 0
    if (!currentPage || currentPage <= 0) return 'Not Started'
    if (totalPages > 0 && currentPage >= totalPages) return 'Completed'
    return 'Reading'
  }

  const getProgressPercent = (book) => {
    const currentPage = typeof book.current_page === 'number' ? book.current_page : 0
    const totalPages = typeof book.total_pages === 'number' ? book.total_pages : 0
    if (!totalPages || totalPages <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((currentPage / totalPages) * 100)))
  }

  const matchesRatingFilter = (book) => {
    const rating = typeof book.rating === 'number' ? book.rating : null
    if (ratingFilter === 'all') return true
    if (rating == null) return false
    if (ratingFilter === '5') return rating === 5
    if (ratingFilter === '4') return rating === 4 || rating === 4.5
    if (ratingFilter === '3') return rating === 3 || rating === 3.5
    if (ratingFilter === '2below') return rating <= 2.5
    return true
  }

  const genreOptions = useMemo(() => {
    const genres = Array.from(
      new Set(books.map((book) => getGenreLabel(book.genre)).filter(Boolean))
    ).sort()
    return ['All Genres', ...genres]
  }, [books])

  const filteredAndSortedBooks = useMemo(() => {
    const filtered = books.filter((book) => {
      const matchesGenre = genreFilter === 'All Genres' || getGenreLabel(book.genre) === genreFilter
      const status = getReadingStatus(book)
      const matchesStatus = statusFilter === 'All Status' || status === statusFilter
      return matchesGenre && matchesStatus && matchesRatingFilter(book)
    })
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rating_asc': return (a.rating ?? -1) - (b.rating ?? -1)
        case 'rating_desc': return (b.rating ?? -1) - (a.rating ?? -1)
        case 'title_asc': return (a.title || '').localeCompare(b.title || '')
        case 'title_desc': return (b.title || '').localeCompare(a.title || '')
        case 'progress_asc': return getProgressPercent(a) - getProgressPercent(b)
        case 'progress_desc': return getProgressPercent(b) - getProgressPercent(a)
        case 'date_added_asc': return new Date(a.created_at || 0) - new Date(b.created_at || 0)
        case 'date_added_desc': return new Date(b.created_at || 0) - new Date(a.created_at || 0)
        case 'completed_asc': return new Date(a.completed_at || 0) - new Date(b.completed_at || 0)
        case 'completed_desc': return new Date(b.completed_at || 0) - new Date(a.completed_at || 0)
        default: return 0
      }
    })
    return sorted
  }, [books, genreFilter, statusFilter, ratingFilter, sortBy])

  const searchBook = async () => {
    if (!isbn.trim() || !session?.user) {
      setMessage('Please log in and enter an ISBN or title.')
      return
    }
    setSubmitting(true)
    setMessage('Searching...')
    const cleanInput = isbn.trim().replace(/[-\s]/g, '')
    let query
    if (/^\d{10,13}$/.test(cleanInput)) {
      query = `isbn:${cleanInput}`
    } else {
      query = `intitle:${isbn.trim()}`
    }
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&orderBy=relevance&key=${import.meta.env.VITE_GOOGLE_BOOKS_API_KEY}`
      )
      const data = await res.json()
      if (!data.items || data.items.length === 0) {
        setMessage('No book found.')
        setSubmitting(false)
        return
      }
      const results = data.items.slice(0, 5).map((item) => {
        const v = item.volumeInfo || {}
        const identifiers = v.industryIdentifiers || []
        const isbn13 = identifiers.find((id) => id.type === 'ISBN_13')?.identifier || null
        const isbn10 = identifiers.find((id) => id.type === 'ISBN_10')?.identifier || null
        return {
          title: v.title || 'Untitled',
          author: v.authors?.join(', ') || 'Unknown author',
          year_published: v.publishedDate ? parseInt(v.publishedDate.slice(0, 4), 10) : null,
          total_pages: v.pageCount || null,
          genre: v.categories?.join(', ') || 'General',
          cover_image_url: (
            v.imageLinks?.thumbnail ||
            v.imageLinks?.smallThumbnail ||
            ''
          ).replace('http://', 'https://'),
          isbn: isbn13 || isbn10 || null,
          description: v.description || '',
        }
      })
      setPendingBooks(results)
      setMessage('')
    } catch (error) {
      console.error('Search error:', error)
      setMessage('Something went wrong while searching.')
    }
    setSubmitting(false)
  }

  const confirmAddBook = async (book) => {
    if (!book || !session?.user) return
    setSubmitting(true)
    if (book.isbn) {
      const { data: existingBook } = await supabase
        .from('books')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('isbn', book.isbn)
        .maybeSingle()
      if (existingBook) {
        setMessage('This book is already in your library.')
        setSubmitting(false)
        setPendingBooks([])
        return
      }
    }
    const payload = {
      user_id: session.user.id,
      ...book,
      notes: '',
      rating: 0,
      current_page: 0
    }
    const { data: insertedBook, error } = await supabase
      .from('books')
      .insert(payload)
      .select()
      .single()
    if (error) {
      setMessage(`Error adding book: ${error.message}`)
      setSubmitting(false)
      return
    }
    setBooks((prev) => [insertedBook, ...prev])
    setIsbn('')
    setPendingBooks([])
    setMessage('Book added successfully.')
    setActiveTab('library')
    setSubmitting(false)
  }

  const handleBookUpdated = (updatedBook, deletedId) => {
    if (deletedId) {
      setBooks((prev) => prev.filter((book) => book.id !== deletedId))
      setSelectedBook(null)
      setMessage('Book removed from library.')
      return
    }
    setBooks((prev) =>
      prev.map((book) => book.id === updatedBook.id ? { ...book, ...updatedBook } : book)
    )
    setSelectedBook((prev) =>
      prev?.id === updatedBook.id ? { ...prev, ...updatedBook } : prev
    )
  }

  const renderStars = (rating) => {
    const safeRating = typeof rating === 'number' ? rating : 0
    const full = Math.floor(safeRating)
    const half = safeRating - full >= 0.5
    return (
      <div style={styles.cardStars}>
        {[0, 1, 2, 3, 4].map((index) => {
          let color = '#D0CAC1'
          if (index < full) color = COLORS.gold
          else if (index === full && half) color = COLORS.textFaint
          return <span key={index} style={{ ...styles.cardStar, color }}>★</span>
        })}
      </div>
    )
  }

  const maskedEmail = (() => {
    const email = session?.user?.email || ''
    const [name, domain] = email.split('@')
    if (!name || !domain) return email
    if (name.length <= 4) return `${name.slice(0, 2)}***@${domain}`
    return `${name.slice(0, 2)}***${name.slice(-2)}@${domain}`
  })()

  const selectedRatingLabel =
    RATING_OPTIONS.find((option) => option.value === ratingFilter)?.label || 'All Ratings'
  const selectedSortPillLabel = SORT_PILL_LABELS[sortBy] || 'Sort By'

  // ── Screens ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingCard}>Loading...</div>
      </div>
    )
  }

  if (!session) return <Login />

  if (selectedBook) {
    return (
      <BookDetail
        book={selectedBook}
        session={session}
        onBack={() => setSelectedBook(null)}
        onBookUpdated={handleBookUpdated}
      />
    )
  }

  if (activeTab === 'addbook') {
    return (
      <AddBook
        isbn={isbn}
        setIsbn={setIsbn}
        onSearch={searchBook}
        onConfirm={confirmAddBook}
        pendingBooks={pendingBooks}
        setPendingBooks={setPendingBooks}
        message={message}
        submitting={submitting}
        onBack={() => setActiveTab('library')}
      />
    )
  }

  // ── Tab content ───────────────────────────────────────
  const renderTabContent = () => {
    if (activeTab === 'home') {
      return (
        <div style={styles.placeholderView}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <p style={{ color: COLORS.textSoft, fontSize: 15 }}>Home coming soon.</p>
        </div>
      )
    }
    if (activeTab === 'quotes') {
      return (
        <div style={styles.placeholderView}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <p style={{ color: COLORS.textSoft, fontSize: 15 }}>Quotes coming soon.</p>
        </div>
      )
    }

    // ── Library ───────────────────────────────────────
    return (
      <>
        {/* Toast */}
        {message && (
          <div style={styles.toast}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#6A8F6A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', color: '#FFFFFF', flexShrink: 0 }}>✓</span>
            {message}
          </div>
        )}

        {/* ── Filters + Grid share this wrapper ── */}
        <div style={styles.alignedContent}>

          {/* Filters */}
          <div style={styles.filterWrap} ref={dropdownRef}>
            {/* Genre */}
            <div style={styles.dropdownWrap}>
              <button type="button" style={styles.filterButton}
                onClick={() => setOpenDropdown((prev) => (prev === 'genre' ? null : 'genre'))}>
                <span style={styles.filterButtonLabel}>{genreFilter}</span>
                <span style={styles.chevron}>⌄</span>
              </button>
              {openDropdown === 'genre' && (
                <div style={styles.dropdownMenu}>
                  {genreOptions.map((option) => (
                    <button key={option} type="button"
                      style={{ ...styles.dropdownItem, ...(genreFilter === option ? styles.dropdownItemActive : {}) }}
                      onClick={() => { setGenreFilter(option); setOpenDropdown(null) }}>
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status */}
            <div style={styles.dropdownWrap}>
              <button type="button" style={styles.filterButton}
                onClick={() => setOpenDropdown((prev) => (prev === 'status' ? null : 'status'))}>
                <span style={styles.filterButtonLabel}>{statusFilter}</span>
                <span style={styles.chevron}>⌄</span>
              </button>
              {openDropdown === 'status' && (
                <div style={styles.dropdownMenu}>
                  {STATUS_OPTIONS.map((option) => (
                    <button key={option} type="button"
                      style={{ ...styles.dropdownItem, ...(statusFilter === option ? styles.dropdownItemActive : {}) }}
                      onClick={() => { setStatusFilter(option); setOpenDropdown(null) }}>
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rating */}
            <div style={styles.dropdownWrap}>
              <button type="button" style={styles.filterButton}
                onClick={() => setOpenDropdown((prev) => (prev === 'rating' ? null : 'rating'))}>
                <span style={styles.filterButtonLabel}>{selectedRatingLabel}</span>
                <span style={styles.chevron}>⌄</span>
              </button>
              {openDropdown === 'rating' && (
                <div style={styles.dropdownMenu}>
                  {RATING_OPTIONS.map((option) => (
                    <button key={option.value} type="button"
                      style={{ ...styles.dropdownItem, ...(ratingFilter === option.value ? styles.dropdownItemActive : {}) }}
                      onClick={() => { setRatingFilter(option.value); setOpenDropdown(null) }}>
                      <div style={styles.ratingOptionRow}>
                        <span style={styles.ratingOptionLabel}>{option.label}</span>
                        {option.hint && <span style={styles.ratingOptionHint}>{option.hint}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort */}
            <div style={styles.dropdownWrap}>
              <button type="button" style={styles.filterButtonWide}
                onClick={() => setOpenDropdown((prev) => (prev === 'sort' ? null : 'sort'))}>
                <span style={styles.filterButtonLabel}>{selectedSortPillLabel}</span>
                <span style={styles.chevron}>⌄</span>
              </button>
              {openDropdown === 'sort' && (
                <div style={styles.dropdownMenu}>
                  {SORT_OPTIONS.map((option) => (
                    <button key={option.value} type="button"
                      style={{ ...styles.dropdownItem, ...(sortBy === option.value ? styles.dropdownItemActive : {}) }}
                      onClick={() => { setSortBy(option.value); setOpenDropdown(null) }}>
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        {filteredAndSortedBooks.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyTitle}>No books found</div>
            <p style={styles.emptyText}>Try adjusting your filters or add a new book.</p>
          </div>
        ) : (
          <div style={styles.gridWrap}>
            <div style={styles.grid}>
              {filteredAndSortedBooks.map((book) => {
                const progress = getProgressPercent(book)
                const status = getReadingStatus(book)
                const circumference = Math.PI * 70
                const strokeDash = (progress / 100) * circumference
                return (
                  <div key={book.id} style={styles.card} onClick={() => setSelectedBook(book)}>
                    <div style={styles.coverPanel}>
                      {book.cover_image_url ? (
                        <img src={normalizeCoverUrl(book.cover_image_url)}
                          alt={book.title} style={styles.cover} />
                      ) : (
                        <span style={styles.coverPlaceholder}>📖</span>
                      )}
                    </div>
                    <p style={styles.cardTitle}>{book.title}</p>
                    <p style={styles.cardAuthor}>{book.author}</p>
                    <div style={styles.progressWrap}>
                      <div style={styles.progressArcBox}>
                        <svg
                          width={isMobile ? "120" : "160"}
                          height={isMobile ? "45" : "60"}
                          viewBox="0 0 160 60"
                        >
                          <path d="M 10 70 A 70 60 0 0 1 150 60" fill="none"
                            stroke={COLORS.progressTrack} strokeWidth="2" strokeLinecap="round" />
                          <path d="M 10 70 A 70 60 0 0 1 150 60" fill="none"
                            stroke={COLORS.progressFill} strokeWidth="1" strokeLinecap="round"
                            strokeDasharray={`${strokeDash} ${circumference}`} />
                        </svg>
                        <div style={styles.progressTextOverlay}>
                          <span style={styles.progressTextLarge}>{progress}%</span>
                          <span style={styles.progressTextSmall}>{status}</span>
                        </div>
                      </div>
                    </div>
                    <div style={styles.cardFooterCentered}>
                      <span style={styles.genrePill}>{getGenreLabel(book.genre)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </>
    )
  }

  // ── Main Layout ───────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.appShell}>

        {/* ── Top Bar ── */}
        <div style={styles.topRow}>
          <div style={styles.logoRow}>
            <span style={styles.logoIcon}>📖</span>
            <span style={styles.logoText}>Commonbook</span>
          </div>
          <div style={styles.accountMenuWrap} ref={accountMenuRef}>
            <button
              type="button"
              style={styles.avatarButton}
              aria-label="Account"
              onClick={(e) => { e.stopPropagation(); setShowAccountMenu((prev) => !prev) }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
            </button>
            {showAccountMenu && (
              <div style={styles.accountDropdown}>
                <div style={styles.accountDropdownHeader}>Account</div>
                <div style={styles.accountDropdownEmail}>{maskedEmail}</div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleLogout() }}
                  onMouseEnter={() => setIsSignOutHovered(true)}
                  onMouseLeave={() => setIsSignOutHovered(false)}
                  style={{
                    ...styles.accountDropdownItem,
                    backgroundColor: isSignOutHovered ? COLORS.tagBg : 'transparent',
                    color: isSignOutHovered ? COLORS.accent : COLORS.text
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Page Heading ── */}
        <h1 style={styles.pageTitle}>Personal Collection</h1>

        {/* ── Tab Content ── */}
        {renderTabContent()}

      </div>

      {/* ── Fixed Bottom Tab Bar ── */}
      <nav style={styles.tabBar}>
        <div style={styles.tabBarInner}>
        {[
          { key: 'home',    label: 'HOME',     Icon: HomeIcon },
          { key: 'library', label: 'LIBRARY',  Icon: LibraryIcon },
          { key: 'addbook', label: 'ADD BOOK', Icon: AddBookIcon },
          { key: 'quotes',  label: 'QUOTES',   Icon: QuotesIcon },
        ].map(({ key, label, Icon }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              type="button"
              style={{
                ...styles.tabItem,
                color: isActive ? COLORS.accent : COLORS.text,
                opacity: isActive ? 1 : 0.45,
              }}
              onClick={() => setActiveTab(key)}
            >
              <Icon active={isActive} />
              <span style={{
                ...styles.tabLabel,
                color: isActive ? COLORS.accent : COLORS.text,
                fontWeight: isActive ? 700 : 500,
              }}>
                {label}
              </span>
            </button>
          )
        })}
        </div>
      </nav>
    </div>
  )
}

// ── Tab Icons ─────────────────────────────────────────────
function HomeIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24"
      fill={active ? COLORS.accent : COLORS.text}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  )
}

function LibraryIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24"
      fill={active ? COLORS.accent : COLORS.text}>
      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
    </svg>
  )
}

function AddBookIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24"
      fill={active ? COLORS.accent : COLORS.text}>
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
    </svg>
  )
}

function QuotesIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24"
      fill={active ? COLORS.accent : COLORS.text}>
      <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
    </svg>
  )
}

// ── Styles ────────────────────────────────────────────────
const makeStyles = (isMobile, width) => ({
  page: {
    minHeight: '100vh',
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: FONTS.body,
    paddingBottom: '80px', // room for fixed tab bar
  },
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: COLORS.bg
  },
  loadingCard: {
    padding: '20px 28px',
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '20px',
    color: COLORS.text
  },
  appShell: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: isMobile ? '16px 12px 24px' : '22px 24px 24px',
    boxSizing: 'border-box',
    width: '100%',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
  },
  logoIcon: { fontSize: '18px' },
  logoText: {
    fontFamily: "'Newsreader', Georgia, serif",
    fontStyle: 'italic',
    fontSize: '24px',
    fontWeight: 700,
    color: COLORS.commonbookLogo,
  },
  pageTitle: {
    margin: '0 0 20px',
    fontSize: isMobile ? '1.5rem' : '2.2rem',
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: '-0.03em',
    color: COLORS.text,
  },
  accountMenuWrap: { position: 'relative' },
  avatarButton: {
    width: '42px',
    height: '42px',
    borderRadius: '999px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surface,
    color: COLORS.textSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    cursor: 'pointer'
  },
  accountDropdown: {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    right: 0,
    minWidth: '220px',
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '18px',
    boxShadow: '0 14px 28px rgba(80, 68, 52, 0.12)',
    padding: '10px',
    zIndex: 1000
  },
  accountDropdownHeader: {
    padding: '8px 10px 2px',
    fontSize: '0.82rem',
    fontWeight: 700,
    color: COLORS.text
  },
  accountDropdownEmail: {
    padding: '0 10px 10px',
    fontSize: '0.9rem',
    color: COLORS.textSoft,
    borderBottom: `1px solid ${COLORS.border}`,
    marginBottom: '8px'
  },
  accountDropdownItem: {
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    color: COLORS.text,
    borderRadius: '12px',
    padding: '10px',
    fontSize: '0.94rem',
    cursor: 'pointer',
    transition: 'background-color 0.18s ease, color 0.18s ease',
    appearance: 'none',
    WebkitAppearance: 'none'
  },
  alignedContent: {
    width: '100%',
    margin: '0 auto',  // centres the whole block
  },
  filterWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: isMobile ? '6px' : '12px',    // ← reasonable gap between each pill
    // flexWrap: isMobile ? 'nowrap' : 'wrap',
    // overflowX: isMobile ? 'auto' : 'visible',
    width: '100%',
    // maxWidth: isMobile ? '100%' : 'calc(3 * 300px + 2 * 24px)',
    // paddingBottom: isMobile ? '4px' : '0',
    marginBottom: '20px',
    position: 'relative',
    zIndex: 30,
    overflowY: 'visible',
    overflowX: isMobile ? 'auto' : 'visible',
  },
  dropdownWrap: { position: 'relative' },
  filterButton: {
    flex: 1,
    minWidth: isMobile ? '80px' : '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.cardBg,
    color: COLORS.text,
    borderRadius: '999px',
    padding: '8px 16px',
    fontSize: isMobile ? '0.82rem' : '0.95rem',
    outline: 'none',
    cursor: 'pointer'
  },
  filterButtonWide: {
    flex: 1,
    minWidth: isMobile ? '80px' : '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.cardBg,
    color: COLORS.text,
    borderRadius: '999px',
    padding: '8px 16px',
    fontSize: isMobile ? '0.82rem' : '0.95rem',
    outline: 'none',
    cursor: 'pointer'
  },
  filterButtonLabel: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    textAlign: 'left'
  },
  chevron: { color: COLORS.textSoft, fontSize: '0.95rem', flexShrink: 0 },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    minWidth: '100%',
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '18px',
    boxShadow: '0 14px 28px rgba(80, 68, 52, 0.12)',
    padding: '8px',
    zIndex: 999,
    overflow: 'hidden'
  },
  dropdownItem: {
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    color: COLORS.text,
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '0.94rem',
    cursor: 'pointer'
  },
  dropdownItemActive: {
    background: COLORS.tagBg,
    color: COLORS.accent,
  },
  ratingOptionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  ratingOptionLabel: { letterSpacing: '0.02em' },
  ratingOptionHint: { color: COLORS.textSoft, fontSize: '0.82rem' },
  toast: {
    position: 'fixed',
    top: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '14px 20px',
    borderRadius: '16px',
    background: '#2C2A25',
    color: '#FAF7F0',
    fontSize: '0.92rem',
    fontWeight: 500,
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
    zIndex: 9999,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    letterSpacing: '0.01em',
  },
  emptyState: {
    background: COLORS.surface,
    border: `1px dashed ${COLORS.border}`,
    borderRadius: '24px',
    padding: '48px 24px',
    textAlign: 'center',
    boxShadow: COLORS.shadow
  },
  emptyTitle: { margin: '0 0 8px', fontSize: '1.3rem', color: COLORS.text },
  emptyText: { margin: 0, color: COLORS.textSoft },
  gridWrap: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  // grid: {
  //   display: 'grid',
  //   gridTemplateColumns: isMobile
  //     ? 'repeat(2, 1fr)'
  //     : width < 1024
  //       ? 'repeat(2, 1fr)'
  //       : 'repeat(3, 1fr)',
  //   gap: isMobile ? '12px' : '22px 24px',
  //   justifyContent: 'center',
  //   width: '100%',
  // },
  grid: {
    display: 'grid',
    gridTemplateColumns: isMobile
      ? 'repeat(2, 1fr)'
      : width < 768
        ? 'repeat(2, 1fr)'
        : width < 1100
          ? 'repeat(3, 1fr)'
          : 'repeat(4, 1fr)',    // ← adds a 4th column on wide screens
    gap: isMobile ? '12px' : '22px 24px',
    justifyContent: 'center',
    width: '100%',
  },
  // ── Card (unchanged) ──
  card: {
    display: 'flex',
    flexDirection: 'column',
    background: COLORS.cardBg,
    border: `2px solid ${COLORS.border}`,
    borderRadius: '24px',
    padding: '8px',
    boxShadow: COLORS.shadow,
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
  },
  coverPanel: {
    height: isMobile ? '130px' : '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: '3px',
    padding: isMobile ? '6px' : '8px'
  },
  cover: {
    maxWidth: '100%',
    maxHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
    boxShadow: '6px 6px 16px rgba(0, 0, 0, 0.3), -3px 3px 8px rgba(0, 0, 0, 0.12)'
  },
  coverPlaceholder: { fontSize: '2rem', color: COLORS.textSoft },
  cardTitle: {
    fontSize: isMobile ? '0.82rem' : '1.1rem',
    fontWeight: 500,
    color: COLORS.text,
    marginBottom: '2px',
    lineHeight: 1.3,
    textAlign: 'center'
  },
  cardAuthor: {
    fontSize: isMobile ? '0.7rem' : '0.9rem',
    fontWeight: 400,
    color: COLORS.textSoft,
    marginBottom: '6px',
    textAlign: 'center',
    flexGrow: 1
  },
  cardStars: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2px',
    marginBottom: '6px'
  },
  cardStar: { fontSize: '14px', lineHeight: 1 },
  progressWrap: { display: 'flex', justifyContent: 'center', marginBottom: '12px' },
  progressArcBox: {
    position: 'relative',
    width: isMobile ? '120px' : '160px',
    height: isMobile ? '52px' : '70px',
    display: 'flex',
    justifyContent: 'center'
  },
  progressTextOverlay: {
    position: 'absolute',
    top: '20px',
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  progressTextLarge: {
    fontSize: '1rem',
    fontWeight: 700,
    color: COLORS.text,
    lineHeight: 1.1
  },
  progressTextSmall: {
    fontSize: '0.84rem',
    color: COLORS.textSoft,
    marginTop: '6px',
    lineHeight: 1.1
  },
  cardFooterCentered: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '6px'
  },
  genrePill: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 8px',
    borderRadius: '999px',
    background: '#8C8880',
    color: COLORS.surface,
    fontSize: '0.65rem',
    textAlign: 'center',
    border: `1px solid ${COLORS.border}`,
    marginBottom: '10px'
  },
  placeholderView: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  // ── Bottom Tab Bar ──
  tabBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.naviBg,
    borderTop: `1px solid ${COLORS.border}`,
    // display: 'flex',
    // justifyContent: 'space-around',
    // alignItems: 'center',
    // padding: '8px 0 16px',
    zIndex: 200,
  },
  tabBarInner: {
    maxWidth: '1280px',       // matches appShell
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '8px 0 16px',
    width: '100%',
    boxSizing: 'border-box',
  },
  tabItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 12px',
    minWidth: '60px',
    fontFamily: FONTS.body,
  },
  tabLabel: {
    fontSize: '11px',
    letterSpacing: '0.08em',
  },
})

export default App