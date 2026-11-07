import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import favoriteService from '../services/favoriteService'
import { getUserIdentifier } from '../services/userService'

// ---------------------------------------------------------------------------
// localStorage fallback — used when the backend is unavailable so that
// favourites are still fully functional offline.
// ---------------------------------------------------------------------------

const LOCAL_KEY = 'bore_barrel_favorites'

const readLocalFavs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeLocalFavs = (ids) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids))
  } catch {
    /* quota exceeded — silently fail */
  }
}

// ---------------------------------------------------------------------------
// useFavorites — list all favourited product IDs with TanStack Query caching.
//
// First attempts the server; on failure falls back to localStorage.
// ---------------------------------------------------------------------------

export function useFavorites() {
  const userIdentifier = getUserIdentifier()

  const query = useQuery({
    queryKey: ['favorites', userIdentifier],
    queryFn: async () => {
      console.info(
        `%c[QueryCache] Ambil daftar favorites dari SERVER (${userIdentifier})`,
        'background: #fef9e7; color: #d35400; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      )
      try {
        const response = await favoriteService.getFavorites(userIdentifier)
        if (response.success) {
          return { data: response.data || [], isLocal: false }
        }
        throw new Error(response.message || 'Server error')
      } catch {
        // Fallback to localStorage
        return { data: readLocalFavs(), isLocal: true }
      }
    },
  })

  return {
    favorites: query.data?.data ?? [],
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
    isLocal: query.data?.isLocal ?? false,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}

// ---------------------------------------------------------------------------
// useToggleFavorite — toggle a product in/out of favourites with cache invalidation.
// ---------------------------------------------------------------------------

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const userIdentifier = getUserIdentifier()

  const mutation = useMutation({
    mutationFn: async (gunId) => {
      try {
        const response = await favoriteService.toggleFavorite({
          recipe_id: gunId,
          user_identifier: userIdentifier,
        })
        if (response.success) {
          return response.data
        }
        throw new Error(response.message)
      } catch {
        // Fallback: toggle in localStorage
        const current = readLocalFavs()
        const idx = current.findIndex((id) => String(id) === String(gunId))
        let isFavorited

        if (idx === -1) {
          current.push(gunId)
          isFavorited = true
        } else {
          current.splice(idx, 1)
          isFavorited = false
        }
        writeLocalFavs(current)
        return { is_favorited: isFavorited }
      }
    },
    onSuccess: () => {
      console.info(
        `%c[QueryCache] Invalidate cache ["favorites", "${userIdentifier}"]`,
        'color: #c0392b; font-weight: bold;',
      )
      queryClient.invalidateQueries({ queryKey: ['favorites', userIdentifier] })
    },
  })

  return {
    toggleFavorite: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error ? mutation.error.message : null,
  }
}

// ---------------------------------------------------------------------------
// useIsFavorited — convenience wrapper for a single product.
// ---------------------------------------------------------------------------

export function useIsFavorited(gunId) {
  const { favorites, loading: fetchLoading } = useFavorites()
  const { toggleFavorite: toggle, loading: toggleLoading } = useToggleFavorite()

  // Check both server-format (objects with .id) and local-format (plain ids)
  const isFavorited = favorites.some((fav) => {
    const favId =
      typeof fav === 'object' && fav !== null
        ? fav.id ?? fav.product_id ?? fav.recipe_id
        : fav
    return String(favId) === String(gunId)
  })

  const toggleFavorite = async () => {
    return await toggle(gunId)
  }

  return {
    isFavorited,
    loading: fetchLoading || toggleLoading,
    toggleFavorite,
  }
}

export { getUserIdentifier }
