import { useState, useEffect, lazy, Suspense } from 'react'
import { Loader } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import './App.css'

// ---------------------------------------------------------------------------
// Lazy load halaman & komponen + log di Console untuk pembuktian
// ---------------------------------------------------------------------------
const lazyWithLog = (name, importFn) =>
  lazy(() => {
    console.info(
      `%c[LazyLoad] Memuat chunk: ${name}`,
      'background: #ebf5fb; color: #2980b9; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
    )
    return importFn()
  })

const Catalog = lazyWithLog('Catalog', () => import('./pages/Catalog.jsx'))
const FavoritesPage = lazyWithLog('FavoritesPage', () => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazyWithLog('ProfilePage', () => import('./pages/ProfilePage.jsx'))
const CreateGunPage = lazyWithLog('CreateGunPage', () => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazyWithLog('EditGunPage', () => import('./pages/EditGunPage.jsx'))
const About = lazyWithLog('About', () => import('./pages/About.jsx'))
const Contact = lazyWithLog('Contact', () => import('./pages/Contact.jsx'))
const GunDetail = lazyWithLog('GunDetail', () => import('./components/gun/GunDetail.jsx'))

function LoadingFallback() {
  return (
    <div className="state-box">
      <Loader size={28} className="spin" />
      <p>Memuat halaman…</p>
    </div>
  )
}

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit' | 'detail'
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Query caching: TanStack React Query Client
  const queryClient = useQueryClient()
  const refreshGuns = () => queryClient.invalidateQueries({ queryKey: ['guns'] })

  // Sharelink (sisi penerima): buka detail produk dari link ?gun=<id> via Query Cache
  useEffect(() => {
    const sharedId = new URLSearchParams(window.location.search).get('gun')
    if (!sharedId) return

    queryClient
      .fetchQuery({
        queryKey: ['gun', String(sharedId)],
        queryFn: async () => {
          const res = await gunService.getGunById(sharedId)
          if (!res.success) throw new Error(res.message || 'Product not found.')
          return res.data
        },
      })
      .then((data) => {
        if (data) {
          setSelectedGun(data)
          setMode('detail')
        }
      })
      .catch(() => {})
      .finally(() => {
        window.history.replaceState({}, '', window.location.pathname)
      })
  }, [queryClient])

  // Unified navigation handler
  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
  }

  return (
    <div className="shell">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        <Suspense fallback={<LoadingFallback />}>
          {mode === 'create' && (
            <CreateGunPage
              onBack={handleBackToList}
              onSuccess={() => {
                refreshGuns()
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'edit' && (
            <EditGunPage
              gun={editingGun}
              gunId={editingGun?.id}
              onBack={handleBackToList}
              onSuccess={() => {
                refreshGuns()
                queryClient.invalidateQueries({ queryKey: ['gun', String(editingGun?.id)] })
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'detail' && selectedGun && (
            <GunDetail
              gun={selectedGun}
              onBack={handleBackToList}
              onEdit={(g) => handleNavigate('Edit', g)}
              onDelete={(g) => setDeleteTarget(g)}
            />
          )}

          {mode === 'list' && (
            <>
              {tab === 'Catalog' && (
                <Catalog
                  onNavigate={(destination, payload) => handleNavigate(destination, payload)}
                />
              )}
              {tab === 'Favorites' && (
                <FavoritesPage
                  onSelectGun={(g) => handleNavigate('Detail', g)}
                  onNavigateCatalog={() => setTab('Catalog')}
                />
              )}
              {tab === 'Profile' && (
                <ProfilePage onReplaySplash={() => setShowSplash(true)} />
              )}
              {tab === 'About' && <About />}
              {tab === 'Contact' && <Contact />}
            </>
          )}
        </Suspense>
      </main>

      {/* Global Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Hardware Record"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            setDeleting(true)
            await gunService.deleteGun(deleteTarget.id)
            refreshGuns()
            queryClient.removeQueries({ queryKey: ['gun', String(deleteTarget.id)] })
            setDeleteTarget(null)
            handleBackToList()
            setTab('Catalog')
          } catch (err) {
            alert(err.message || 'Failed to delete record.')
          } finally {
            setDeleting(false)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
