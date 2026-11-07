import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import gunService from '../services/gunService'

const EMPTY = []

export function useGuns(params = {}) {
  const query = useQuery({
    queryKey: ['guns', params],
    queryFn: async () => {
      console.info(
        '%c[QueryCache] Ambil katalog produk dari SERVER (Supabase)',
        'background: #eafaf1; color: #27ae60; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      )
      const response = await gunService.getGuns(params)
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch products.')
      }
      return response
    },
  })

  return {
    guns: query.data?.data ?? EMPTY,
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
    pagination: query.data?.pagination ?? null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}

export function useGunById(id) {
  const isServerId = Boolean(id) && !String(id).startsWith('local-')

  const query = useQuery({
    queryKey: ['gun', String(id)],
    queryFn: async () => {
      console.info(
        `%c[QueryCache] Ambil detail produk #${id} dari SERVER`,
        'background: #eafaf1; color: #27ae60; font-weight: bold; padding: 2px 6px; border-radius: 3px;',
      )
      const response = await gunService.getGunById(id)
      if (!response.success) {
        throw new Error(response.message || 'Product not found.')
      }
      return response.data
    },
    enabled: isServerId,
  })

  return {
    gun: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}

export function useCreateGun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => gunService.createGun(data),
    onSuccess: () => {
      console.info(
        '%c[QueryCache] Invalidate cache ["guns"] setelah CREATE',
        'color: #c0392b; font-weight: bold;',
      )
      queryClient.invalidateQueries({ queryKey: ['guns'] })
    },
  })
}

export function useUpdateGun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => gunService.updateGun(id, data),
    onSuccess: (_, { id }) => {
      console.info(
        `%c[QueryCache] Invalidate cache ["guns"] dan ["gun", "${id}"] setelah UPDATE`,
        'color: #c0392b; font-weight: bold;',
      )
      queryClient.invalidateQueries({ queryKey: ['guns'] })
      queryClient.invalidateQueries({ queryKey: ['gun', String(id)] })
    },
  })
}

export function useDeleteGun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => gunService.deleteGun(id),
    onSuccess: (_, id) => {
      console.info(
        `%c[QueryCache] Invalidate cache ["guns"] dan remove ["gun", "${id}"] setelah DELETE`,
        'color: #c0392b; font-weight: bold;',
      )
      queryClient.invalidateQueries({ queryKey: ['guns'] })
      queryClient.removeQueries({ queryKey: ['gun', String(id)] })
    },
  })
}
