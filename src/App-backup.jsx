import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import BookDetail from './BookDetail'

const COLORS = {
  bg: '#faf7f0ff',              // very light warm cream page background
  surface: '#f1eee9',         // near-white warm cream
  surfaceStrong: '#FFFFFF',
  cardBg: '#e8e9e0ff',          // cards are near-white cream, not grey
  coverBg: '#EEE9E0',
  border: '#E4DED5',          // very subtle warm border
  olive: '#80836f',           // warm grey-brown, not green
  oliveSoft: '#B0ACA6',
  text: '#2C2A25',
  textSoft: '#9C9890',
  gold: '#C8C0B4',            // warm greige for arch base
  secondaryBtn: '#EAE6E0',
  tagBg: '#E4E0D8',
  shadow: '0 8px 20px rgba(60, 50, 40, 0.06)'
}

const RATING_OPTIONS = [
  { value: 'all', label: 'All Ratings' },
  { value: '5', label: '★★★★★' },
  { value: '4', label: '★★★★☆', hint: '4 & 4.5' },
  { value: '3', label: '★★★☆☆', hint: '3 & 3.5' },
  { value: '2below', label: '★★☆☆☆ & below', hint: '2.5 and below' }
]

const SORT_OPTIONS = [
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

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)

  const [isbn, setIsbn] = useState('')
  const [view, setView] = useState('library')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [genreFilter, setGenreFilter] = useState('All Genres')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date_added_desc')

  const [openDropdown, setOpenDropdown] = useState(null)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [isSignOutHovered, setIsSignOutHovered] = useState(false)

  const [pendingBooks, setPendingBooks] = useState([])

  const dropdownRef = useRef(null)
  const accountMenuRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session?.user) fetchBooks(session)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
      console.error('Fetch error:', error)
      setMessage(`Error loading books: ${error.message}`)
      return
    }

    setBooks(data || [])
  }

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) alert('Login error: ' + error.message)
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
      const matchesGenre =
        genreFilter === 'All Genres' || getGenreLabel(book.genre) === genreFilter

      const status = getReadingStatus(book)
      const matchesStatus =
        statusFilter === 'All Status' || status === statusFilter

      return matchesGenre && matchesStatus && matchesRatingFilter(book)
    })

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rating_asc':
          return (a.rating ?? -1) - (b.rating ?? -1)
        case 'rating_desc':
          return (b.rating ?? -1) - (a.rating ?? -1)
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '')
        case 'title_desc':
          return (b.title || '').localeCompare(a.title || '')
        case 'progress_asc':
          return getProgressPercent(a) - getProgressPercent(b)
        case 'progress_desc':
          return getProgressPercent(b) - getProgressPercent(a)
        case 'date_added_asc':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0)
        case 'date_added_desc':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
        case 'completed_asc':
          return new Date(a.completed_at || 0) - new Date(b.completed_at || 0)
        case 'completed_desc':
          return new Date(b.completed_at || 0) - new Date(a.completed_at || 0)
        default:
          return 0
      }
    })

    return sorted
  }, [books, genreFilter, statusFilter, ratingFilter, sortBy])

//   const addBook = async () => {
//     if (!isbn.trim() || !session?.user) {
//       setMessage('Please log in and enter an ISBN or title.')
//       return
//     }

//     setSubmitting(true)
//     setMessage('Searching...')

//     const cleanInput = isbn.trim().replace(/[-\s]/g, '')
//     const query = /^\d{10,13}$/.test(cleanInput) ? `isbn:${cleanInput}` : isbn.trim()

//     try {
//       const res = await fetch(
//         `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`
//       )
//       const data = await res.json()

//       if (!data.items || data.items.length === 0) {
//         setMessage('No book found.')
//         setSubmitting(false)
//         return
//       }

//       const volumeInfo = data.items[0].volumeInfo || {}
//       const identifiers = volumeInfo.industryIdentifiers || []

//       const isbn13 =
//         identifiers.find((id) => id.type === 'ISBN_13')?.identifier || null
//       const isbn10 =
//         identifiers.find((id) => id.type === 'ISBN_10')?.identifier || null
//       const finalIsbn = isbn13 || isbn10 || cleanInput || null

//       if (finalIsbn) {
//         const { data: existingBook } = await supabase
//           .from('books')
//           .select('id')
//           .eq('user_id', session.user.id)
//           .eq('isbn', finalIsbn)
//           .maybeSingle()

//         if (existingBook) {
//           setMessage('This book is already in your library.')
//           setSubmitting(false)
//           return
//         }
//       }

//       const payload = {
//         user_id: session.user.id,
//         title: volumeInfo.title || 'Untitled',
//         author: volumeInfo.authors?.join(', ') || 'Unknown author',
//         year_published: volumeInfo.publishedDate
//           ? parseInt(volumeInfo.publishedDate.slice(0, 4), 10)
//           : null,
//         total_pages: volumeInfo.pageCount || null,
//         genre: volumeInfo.categories?.join(', ') || 'General',
//         cover_image_url:
//           volumeInfo.imageLinks?.thumbnail ||
//           volumeInfo.imageLinks?.smallThumbnail ||
//           '',
//         isbn: finalIsbn,
//         description: volumeInfo.description || '',
//         notes: '',
//         rating: 0,
//         current_page: 0
//       }

//       const { data: insertedBook, error } = await supabase
//         .from('books')
//         .insert(payload)
//         .select()
//         .single()

//       if (error) {
//         console.error('Insert error:', error)
//         setMessage(`Error adding book: ${error.message}`)
//         setSubmitting(false)
//         return
//       }

//       setBooks((prev) => [insertedBook, ...prev])
//       setIsbn('')
//       setMessage('Book added successfully.')
//       setView('library')
//     } catch (error) {
//       console.error('Add book error:', error)
//       setMessage('Something went wrong while adding the book.')
//     }

//     setSubmitting(false)
//   }

    const searchBook = async () => {
    if (!isbn.trim() || !session?.user) {
        setMessage('Please log in and enter an ISBN or title.')
        return
    }

    setSubmitting(true)
    setMessage('Searching...')

    const cleanInput = isbn.trim().replace(/[-\s]/g, '')
    const query = /^\d{10,13}$/.test(cleanInput) ? `isbn:${cleanInput}` : isbn.trim()

    try {
        const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&orderBy=relevance`
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
  setView('library')
  setSubmitting(false)

  setTimeout(() => {
  setView('library')
}, 500)

}


  const handleBookUpdated = (updatedBook, deletedId) => {
    if (deletedId) {
        setBooks((prev) => prev.filter((book) => book.id !== deletedId))
        setSelectedBook(null)
        setMessage('Book removed from library.')
        return
    }
    setBooks((prev) =>
        prev.map((book) =>
        book.id === updatedBook.id ? { ...book, ...updatedBook } : book
        )
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
          else if (index === full && half) color = COLORS.oliveSoft

          return (
            <span key={index} style={{ ...styles.cardStar, color }}>
              ★
            </span>
          )
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

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingCard}>Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={styles.page}>
        <div style={styles.authWrap}>
          <div style={styles.authCard}>
            <h1 style={styles.authTitle}>My Reading Room</h1>
            <button onClick={handleLogin} style={styles.primaryButton}>
              Get started with Google
            </button>
          </div>
        </div>
      </div>
    )
  }

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

  return (
    <div style={styles.page}>
      <div style={styles.appShell}>
        <div style={styles.topRow}>
          <div>
            <h1 style={styles.pageTitle}>My Reading Room</h1>
          </div>

          <div style={styles.userActions}>
            <div style={styles.accountMenuWrap} ref={accountMenuRef}>
              <button
                type="button"
                style={styles.avatarButton}
                aria-label="Account"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAccountMenu((prev) => !prev)
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLogout()
                    }}
                    onMouseEnter={() => setIsSignOutHovered(true)}
                    onMouseLeave={() => setIsSignOutHovered(false)}
                    style={{
                      ...styles.accountDropdownItem,
                      backgroundColor: isSignOutHovered ? COLORS.tagBg : 'transparent',
                      color: isSignOutHovered ? COLORS.olive : COLORS.text
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.toolbar} ref={dropdownRef}>
          <div style={styles.tabsWrap}>
            <button
              type="button"
              onClick={() => setView('library')}
              style={view === 'library' ? styles.tabActive : styles.tab}
            >
              Library ({books.length})
            </button>

            <button
              type="button"
              onClick={() => setView('add')}
              style={view === 'add' ? styles.tabActive : styles.tab}
            >
              Add Book
            </button>
          </div>

          {view === 'library' && (
            <div style={styles.filterWrap}>
              <div style={styles.dropdownWrap}>
                <button
                  type="button"
                  style={styles.filterButton}
                  onClick={() =>
                    setOpenDropdown((prev) => (prev === 'genre' ? null : 'genre'))
                  }
                >
                  <span style={styles.filterButtonLabel}>{genreFilter}</span>
                  <span style={styles.chevron}>⌄</span>
                </button>

                {openDropdown === 'genre' && (
                  <div style={styles.dropdownMenu}>
                    {genreOptions.map((option) => {
                      const selected = genreFilter === option
                      return (
                        <button
                          key={option}
                          type="button"
                          style={{
                            ...styles.dropdownItem,
                            ...(selected ? styles.dropdownItemActive : {})
                          }}
                          onClick={() => {
                            setGenreFilter(option)
                            setOpenDropdown(null)
                          }}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={styles.dropdownWrap}>
                <button
                  type="button"
                  style={styles.filterButton}
                  onClick={() =>
                    setOpenDropdown((prev) => (prev === 'status' ? null : 'status'))
                  }
                >
                  <span style={styles.filterButtonLabel}>{statusFilter}</span>
                  <span style={styles.chevron}>⌄</span>
                </button>

                {openDropdown === 'status' && (
                  <div style={styles.dropdownMenu}>
                    {STATUS_OPTIONS.map((option) => {
                      const selected = statusFilter === option
                      return (
                        <button
                          key={option}
                          type="button"
                          style={{
                            ...styles.dropdownItem,
                            ...(selected ? styles.dropdownItemActive : {})
                          }}
                          onClick={() => {
                            setStatusFilter(option)
                            setOpenDropdown(null)
                          }}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={styles.dropdownWrap}>
                <button
                  type="button"
                  style={styles.filterButton}
                  onClick={() =>
                    setOpenDropdown((prev) => (prev === 'rating' ? null : 'rating'))
                  }
                >
                  <span style={styles.filterButtonLabel}>{selectedRatingLabel}</span>
                  <span style={styles.chevron}>⌄</span>
                </button>

                {openDropdown === 'rating' && (
                  <div style={styles.dropdownMenu}>
                    {RATING_OPTIONS.map((option) => {
                      const selected = ratingFilter === option.value

                      return (
                        <button
                          key={option.value}
                          type="button"
                          style={{
                            ...styles.dropdownItem,
                            ...(selected ? styles.dropdownItemActive : {})
                          }}
                          onClick={() => {
                            setRatingFilter(option.value)
                            setOpenDropdown(null)
                          }}
                        >
                          <div style={styles.ratingOptionRow}>
                            <span style={styles.ratingOptionLabel}>{option.label}</span>
                            {option.hint && (
                              <span style={styles.ratingOptionHint}>{option.hint}</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={styles.dropdownWrap}>
                <button
                  type="button"
                  style={styles.filterButtonWide}
                  onClick={() =>
                    setOpenDropdown((prev) => (prev === 'sort' ? null : 'sort'))
                  }
                >
                  <span style={styles.filterButtonLabel}>{selectedSortPillLabel}</span>
                  <span style={styles.chevron}>⌄</span>
                </button>

                {openDropdown === 'sort' && (
                  <div style={styles.dropdownMenu}>
                    {SORT_OPTIONS.map((option) => {
                      const selected = sortBy === option.value

                      return (
                        <button
                          key={option.value}
                          type="button"
                          style={{
                            ...styles.dropdownItem,
                            ...(selected ? styles.dropdownItemActive : {})
                          }}
                          onClick={() => {
                            setSortBy(option.value)
                            setOpenDropdown(null)
                          }}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {message && <div style={styles.toast}>{message}</div>}

        {view === 'add' ? (
          <div style={styles.addBookCard}>
            <h2 style={styles.sectionHeading}>Add a Book</h2>
            <p style={styles.sectionSubtext}>
              Search by ISBN or title and add it to your reading room.
            </p>

            <div style={styles.addBookForm}>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchBook()}
                placeholder="Enter ISBN or book title"
                style={styles.input}
              />
              <button onClick={searchBook} style={styles.primaryButton} disabled={submitting}>
                {submitting ? 'Searching...' : 'Search'}
              </button>
            </div>

            {pendingBooks.length > 0 && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.9rem', color: COLORS.textSoft }}>
                  {pendingBooks.length} results found — pick the right one:
                </div>
                {pendingBooks.map((book, index) => (
                  <div key={index} style={styles.pendingBookCard}>
                    <div style={styles.pendingBookInner}>
                      {book.cover_image_url ? (
                        <img src={book.cover_image_url} alt={book.title} style={styles.pendingCover} />
                      ) : (
                        <div style={styles.coverPlaceholder}>📚</div>
                      )}
                      <div style={styles.pendingBookMeta}>
                        <div style={styles.pendingTitle}>{book.title}</div>
                        <div style={styles.pendingAuthor}>{book.author}</div>
                        {book.year_published && (
                          <div style={styles.pendingYear}>{book.year_published}</div>
                        )}
                        {book.description && (
                          <p style={styles.pendingDesc}>
                            {book.description.slice(0, 200)}
                            {book.description.length > 200 ? '...' : ''}
                          </p>
                        )}
                        <button
                          onClick={() => confirmAddBook(book)}
                          style={{ ...styles.primaryButton, marginTop: '10px', alignSelf: 'flex-start' }}
                          disabled={submitting}
                        >
                          {submitting ? 'Adding...' : 'Add to Library'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : filteredAndSortedBooks.length === 0 ? (
          <div style={styles.emptyState}>
            <img src="/no-books.png" alt="No books yet" style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>No books match your filters</h3>
            <p style={styles.emptyText}>Try changing a filter or add a new book to your library.</p>
          </div>
        ) : (
          <div style={styles.gridWrap}>
            <div style={styles.grid}>
              {filteredAndSortedBooks.map((book) => {
                const progress = getProgressPercent(book)
                const arcLength = Math.PI * 80
                const arcOffset = arcLength - (progress / 100) * arcLength

                return (
                  <div key={book.id} onClick={() => setSelectedBook(book)} style={styles.card}>
                    <div style={styles.coverPanel}>
                      {book.cover_image_url ? (
                        <img
                          src={normalizeCoverUrl(book.cover_image_url)}
                          alt={book.title}
                          style={styles.cover}
                        />
                      ) : (
                        <div style={styles.coverPlaceholder}>📚</div>
                      )}
                    </div>

                    <div style={styles.cardTitle}>{book.title}</div>
                    <div style={styles.cardAuthor}>{book.author}</div>

                    <div style={styles.progressWrap}>
                      <div style={styles.progressArcBox}>
                        <svg width="160" height="70" viewBox="0 0 160 75">
                          <path d="M 5 60 A 80 80 0 0 1 155 60" fill="none" stroke="#d1c2a3ff" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M 5 60 A 80 80 0 0 1 155 60" fill="none" stroke={COLORS.olive} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={arcOffset} />
                          <circle cx="5" cy="60" r="2.5" fill="#DED7CB" />
                          <circle cx="155" cy="60" r="2.5" fill={COLORS.olive} />
                        </svg>
                        <div style={styles.progressTextOverlay}>
                          <div style={styles.progressTextLarge}>{progress}%</div>
                          <div style={styles.progressTextSmall}>{book.total_pages || '—'} pages</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
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
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
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
  authWrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px'
  },
  authCard: {
    width: '100%',
    maxWidth: '460px',
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '28px',
    padding: '40px 32px',
    textAlign: 'center',
    boxShadow: COLORS.shadow
  },
  authTitle: {
    margin: '0 0 10px',
    fontSize: '2.2rem',
    lineHeight: 1.1,
    letterSpacing: '-0.03em'
  },
  authSubtitle: {
    margin: '0 0 28px',
    color: COLORS.textSoft,
    fontSize: '1rem',
    lineHeight: 1.6
  },
  appShell: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '22px 24px 40px'
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  pageTitle: {
    margin: '0 0 4px',
    fontSize: '2.2rem',
    lineHeight: 1.05,
    letterSpacing: '-0.03em'
  },
  pageSubtitle: {
    margin: 0,
    color: COLORS.textSoft,
    fontSize: '1rem'
  },
  userActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  accountMenuWrap: {
    position: 'relative'
  },
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
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '14px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 20
  },
  tabsWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: COLORS.cardBg,
    borderRadius: '999px',
  },
  tab: {
    border: 'none',
    background: 'transparent',
    color: COLORS.text,
    borderRadius: '999px',
    padding: '8px 16px',
    fontSize: '0.95rem',
    fontWeight: 100,
    cursor: 'pointer'
  },
  tabActive: {
    border: 'none',
    background: COLORS.olive,
    color: '#FFFFFF',
    borderRadius: '999px',
    padding: '8px 16px',
    fontSize: '0.95rem',
    fontWeight: 100,
    cursor: 'pointer'
  },
  filterWrap: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 30
  },
  dropdownWrap: {
    position: 'relative'
  },
  filterButton: {
    width: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.cardBg,
    color: COLORS.text,
    borderRadius: '999px',
    padding: '8px 16px',
    fontSize: '0.95rem',
    outline: 'none',
    cursor: 'pointer'
  },
  filterButtonWide: {
    width: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.cardBg,
    color: COLORS.text,
    borderRadius: '999px',
    padding: '8px 16px',
    fontSize: '0.95rem',
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
  chevron: {
    color: COLORS.textSoft,
    fontSize: '0.95rem',
    flexShrink: 0
  },
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
    color: COLORS.olive,
    // fontWeight: 600
  },
  ratingOptionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  ratingOptionLabel: {
    letterSpacing: '0.02em'
  },
  ratingOptionHint: {
    color: COLORS.textSoft,
    fontSize: '0.82rem'
  },
  toast: {
    position: 'fixed',
    top: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    borderRadius: '999px',
    background: COLORS.olive,
    color: '#FFFFFF',
    fontSize: '0.9rem',
    fontWeight: 500,
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    zIndex: 9999,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  addBookCard: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '24px',
    padding: '28px',
    boxShadow: COLORS.shadow
  },
  pendingBookCard: {
    marginTop: '20px',
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '20px',
    padding: '16px',
  },
  pendingBookInner: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    gap: '16px',
    alignItems: 'start',
    marginBottom: '16px',
  },
  pendingCover: {
    width: '100%',
    borderRadius: '8px',
    boxShadow: '4px 4px 12px rgba(0,0,0,0.15)',
  },
  pendingBookMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  pendingTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: COLORS.text,
  },
  pendingAuthor: {
    fontSize: '0.88rem',
    color: COLORS.textSoft,
  },
  pendingYear: {
    fontSize: '0.82rem',
    color: COLORS.textSoft,
  },
  pendingDesc: {
    margin: '8px 0 0',
    fontSize: '0.84rem',
    lineHeight: 1.6,
    color: COLORS.textSoft,
  },
  pendingActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
    secondaryButton: {
    border: `1px solid ${COLORS.border}`,
    background: COLORS.secondaryBtn,
    color: COLORS.text,
    borderRadius: '999px',
    padding: '10px 18px',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  sectionHeading: {
    margin: '0 0 8px',
    fontSize: '1.55rem'
  },
  sectionSubtext: {
    margin: '0 0 20px',
    color: COLORS.textSoft,
    lineHeight: 1.6
  },
  addBookForm: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  input: {
    flex: '1 1 320px',
    minWidth: '280px',
    borderRadius: '18px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surfaceStrong,
    color: COLORS.text,
    padding: '14px 16px',
    fontSize: '0.98rem',
    outline: 'none'
  },
  primaryButton: {
    border: 'none',
    background: COLORS.olive,
    color: '#FFFFFF',
    borderRadius: '999px',
    padding: '12px 18px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  emptyState: {
    background: COLORS.surface,
    border: `1px dashed ${COLORS.border}`,
    borderRadius: '24px',
    padding: '48px 24px',
    textAlign: 'center',
    boxShadow: COLORS.shadow
  },
  emptyIcon: {
    width: '72px',
    height: '72px',
    objectFit: 'contain',
    marginBottom: '12px',
    opacity: 0.9
  },
  emptyTitle: {
    margin: '0 0 8px',
    fontSize: '1.3rem',
    color: COLORS.text
  },
  emptyText: {
    margin: 0,
    color: COLORS.textSoft
  },
  gridWrap: {
    display: 'flex',
    justifyContent: 'center'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 300px)',
    gap: '22px 24px',
    justifyContent: 'center'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    background: COLORS.cardBg,
    border: `2px solid #a9aaa4ff`,
    borderRadius: '24px',
    padding: '8px',
    boxShadow: COLORS.shadow,
    cursor: 'pointer'
  },
  coverPanel: {
    // background: COLORS.coverBg,
    // borderRadius: '16px',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: '3px',
    padding: '8px'
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
  coverPlaceholder: {
    fontSize: '2rem',
    color: COLORS.textSoft
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: 500,
    color: COLORS.text,
    marginBottom: '2px',
    lineHeight: 1.3,
    textAlign: 'center'
  },
  cardAuthor: {
    fontSize: '1rem',
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
  cardStar: {
    fontSize: '14px',
    lineHeight: 1
  },
  progressWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '12px'
  },
  progressArcBox: {
    position: 'relative',
    width: '160px',
    height: '70px',
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
    // fontWeight: 50,
    textAlign: 'center',
    border: `1px solid ${COLORS.border}`,
    marginBottom: '10px'
  }
}

export default App
