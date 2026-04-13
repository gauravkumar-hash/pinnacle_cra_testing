import { useState, useCallback, useRef, useEffect } from 'react'
import { QueryClient } from '@tanstack/react-query'

export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  exponentialBackoff?: boolean
  onRetry?: (attemptNumber: number) => void
  onMaxRetriesReached?: () => void
}

export interface RetryState {
  isRetrying: boolean
  retryCount: number
  canRetry: boolean
  error: Error | null
}

export function useRetry(options: RetryOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
    onMaxRetriesReached
  } = options

  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    canRetry: true,
    error: null
  })

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setRetryState({
      isRetrying: false,
      retryCount: 0,
      canRetry: true,
      error: null
    })
  }, [])

  const retry = useCallback(async <T>(
    fn: () => Promise<T>,
    customOptions?: Partial<RetryOptions>
  ): Promise<T> => {
    const finalOptions = { ...options, ...customOptions }
    let currentRetryCount = 0

    const attempt = async (): Promise<T> => {
      try {
        setRetryState(prev => ({
          ...prev,
          isRetrying: currentRetryCount > 0,
          retryCount: currentRetryCount,
          canRetry: currentRetryCount < (finalOptions.maxRetries || maxRetries),
          error: null
        }))

        const result = await fn()
        
        // Success - reset state
        setRetryState({
          isRetrying: false,
          retryCount: currentRetryCount,
          canRetry: true,
          error: null
        })
        
        return result
      } catch (error) {
        currentRetryCount++
        const canRetryMore = currentRetryCount < (finalOptions.maxRetries || maxRetries)

        setRetryState({
          isRetrying: false,
          retryCount: currentRetryCount,
          canRetry: canRetryMore,
          error: error as Error
        })

        if (!canRetryMore) {
          finalOptions.onMaxRetriesReached?.() || onMaxRetriesReached?.()
          throw error
        }

        // Calculate delay
        const delay = exponentialBackoff 
          ? (finalOptions.retryDelay || retryDelay) * Math.pow(2, currentRetryCount - 1)
          : (finalOptions.retryDelay || retryDelay)

        finalOptions.onRetry?.(currentRetryCount) || onRetry?.(currentRetryCount)

        // Wait before retrying
        await new Promise(resolve => {
          timeoutRef.current = setTimeout(resolve, delay)
        })

        // Recursive retry
        return attempt()
      }
    }

    return attempt()
  }, [maxRetries, retryDelay, exponentialBackoff, onRetry, onMaxRetriesReached])

  const retryWithCallback = useCallback(async (fn: () => Promise<void>) => {
    if (!retryState.canRetry) return

    try {
      await retry(fn)
    } catch (error) {
      console.error('Retry failed after max attempts:', error)
    }
  }, [retry, retryState.canRetry])

  return {
    retry,
    retryWithCallback,
    reset,
    ...retryState
  }
}

// Hook for automatic retry with query invalidation
export function useQueryRetry(
  queryKey: unknown[],
  queryClient: QueryClient,
  options: RetryOptions = {}
) {
  const { retry, ...retryState } = useRetry(options)

  const retryQuery = useCallback(async () => {
    await retry(async () => {
      await queryClient.invalidateQueries({ queryKey })
      return Promise.resolve()
    })
  }, [retry, queryClient, queryKey])

  return {
    retryQuery,
    ...retryState
  }
}

// Hook for mutation retry
export function useMutationRetry<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: RetryOptions = {}
) {
  const { retry, ...retryState } = useRetry(options)

  const retryMutation = useCallback(async (variables: TVariables) => {
    return retry(() => mutationFn(variables))
  }, [retry, mutationFn])

  return {
    retryMutation,
    ...retryState
  }
}

export default useRetry