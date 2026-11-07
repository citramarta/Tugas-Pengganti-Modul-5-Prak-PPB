import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import reviewService from '../services/reviewService'

// ---------------------------------------------------------------------------
// useReviews — fetch reviews for a specific product with TanStack Query caching.
// ---------------------------------------------------------------------------
export function useReviews(gunId) {
  const isServerId = Boolean(gunId) && !String(gunId).startsWith('local-')

  const query = useQuery({
    queryKey: ['reviews', String(gunId)],
    queryFn: async () => {
      console.info(
        `%c[QueryCache] Ambil reviews produk #${gunId} dari SERVER`,
        'background: #f4ecf7; color: #8e44ad; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      )
      const response = await reviewService.getReviews(gunId)
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch reviews.')
      }
      return response.data || []
    },
    enabled: isServerId,
  })

  return {
    reviews: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review with automatic cache invalidation.
// ---------------------------------------------------------------------------
export function useCreateReview() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ gunId, reviewData }) => {
      const response = await reviewService.createReview(gunId, reviewData)
      if (!response.success) {
        throw new Error(response.message || 'Failed to submit review.')
      }
      return response.data
    },
    onSuccess: (_, variables) => {
      console.info(
        `%c[QueryCache] Invalidate cache ["reviews", "${variables.gunId}"] & ["guns"]`,
        'color: #c0392b; font-weight: bold;',
      )
      // Invalidate review list so fresh reviews appear immediately
      queryClient.invalidateQueries({ queryKey: ['reviews', String(variables.gunId)] })
      // Invalidate gun detail and catalog list so ratings update
      queryClient.invalidateQueries({ queryKey: ['gun', String(variables.gunId)] })
      queryClient.invalidateQueries({ queryKey: ['guns'] })
    },
  })

  const createReview = async (gunId, reviewData) => {
    try {
      return await mutation.mutateAsync({ gunId, reviewData })
    } catch {
      return null
    }
  }

  return {
    createReview,
    loading: mutation.isPending,
    error: mutation.error ? mutation.error.message : null,
    success: mutation.isSuccess,
  }
}
