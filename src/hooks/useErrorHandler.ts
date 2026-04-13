import { useState, useCallback, useEffect } from 'react'
import { message } from 'antd'
import { ApiError } from '../services/client'
import { getUserFriendlyErrorMessage, getErrorType, ErrorType } from '../components/ErrorHandling'
import { getErrorMsg } from '../utils'
import { FormInstance } from 'antd'

interface ValidationErrorDetail {
  loc: string[];
  msg: string;
  type?: string;
}

interface ValidationErrorBody {
  detail?: ValidationErrorDetail[];
}
export interface ErrorHandlerOptions {
  showNotification?: boolean
  notificationDuration?: number
  retryable?: boolean
  onError?: (error: ApiError) => void
  onRetry?: () => void
  logError?: boolean
}

export interface ErrorState {
  error: ApiError | null
  isError: boolean
  errorType: ErrorType | null
  canRetry: boolean
  retryCount: number
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    showNotification = true,
    notificationDuration = 5,
    retryable = true,
    onError,
    onRetry,
    logError = true
  } = options

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorType: null,
    canRetry: false,
    retryCount: 0
  })

  const handleError = useCallback((error: ApiError, context?: string) => {
    const errorType = getErrorType(error)
    const userMessage = getUserFriendlyErrorMessage(error)
    const technicalMessage = getErrorMsg(error)

    // Log error if enabled
    if (logError) {
      console.error(`Error ${context ? `in ${context}` : ''}:`, {
        error,
        type: errorType,
        userMessage,
        technicalMessage,
        timestamp: new Date().toISOString()
      })
    }

    // Update error state
    setErrorState(prev => ({
      error,
      isError: true,
      errorType,
      canRetry: retryable && errorType !== ErrorType.AUTHORIZATION,
      retryCount: prev.retryCount
    }))

    // Show notification if enabled
    if (showNotification) {
      const messageConfig = {
        content: userMessage,
        duration: notificationDuration,
        key: 'error-handler'
      }

      switch (errorType) {
        case ErrorType.AUTHORIZATION:
          message.warning(messageConfig)
          break
        case ErrorType.VALIDATION:
          message.info(messageConfig)
          break
        case ErrorType.NETWORK:
        case ErrorType.TIMEOUT:
          message.error({
            ...messageConfig,
            content: `${userMessage} - Please check your connection.`
          })
          break
        default:
          message.error(messageConfig)
      }
    }

    // Call custom error handler
    onError?.(error)
  }, [showNotification, notificationDuration, retryable, onError, logError])

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorType: null,
      canRetry: false,
      retryCount: 0
    })
  }, [])

  const retry = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }))
    onRetry?.()
  }, [onRetry])

  // Auto-clear error notifications
  useEffect(() => {
    if (!errorState.isError) {
      message.destroy('error-handler')
    }
  }, [errorState.isError])

  return {
    ...errorState,
    handleError,
    clearError,
    retry
  }
}

// Specialized hook for form errors
export function useFormErrorHandler(options: ErrorHandlerOptions = {}) {
  const { handleError, ...errorState } = useErrorHandler({
    ...options,
    showNotification: false // Handle form errors differently
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [generalErrors, setGeneralErrors] = useState<string[]>([])

  const handleFormError = useCallback((error: ApiError, form?: FormInstance) => {
    handleError(error, 'form submission')

    if (error.status === 422 && error.body && typeof error.body === 'object') {
      const errorBody = error.body as ValidationErrorBody
      if (errorBody.detail && Array.isArray(errorBody.detail)) {
        const newFieldErrors: Record<string, string[]> = {}
        const newGeneralErrors: string[] = []

        errorBody.detail.forEach((detail: ValidationErrorDetail) => {
          if (detail.loc && detail.loc.length > 1) {
            const fieldName = detail.loc[detail.loc.length - 1]
            if (!newFieldErrors[fieldName]) {
              newFieldErrors[fieldName] = []
            }
            newFieldErrors[fieldName].push(detail.msg)
          } else {
            newGeneralErrors.push(detail.msg)
          }
        })

        setFieldErrors(newFieldErrors)
        setGeneralErrors(newGeneralErrors)

        // Set form fields errors if form instance is provided
        if (form && Object.keys(newFieldErrors).length > 0) {
          const formErrors = Object.entries(newFieldErrors).map(([field, errors]) => ({
            name: field,
            errors
          }))
          form.setFields(formErrors)
        }
      }
    } else {
      setGeneralErrors([getUserFriendlyErrorMessage(error)])
    }
  }, [handleError])

  const clearFormErrors = useCallback(() => {
    setFieldErrors({})
    setGeneralErrors([])
  }, [])

  return {
    ...errorState,
    fieldErrors,
    generalErrors,
    handleFormError,
    clearFormErrors,
    hasFieldErrors: Object.keys(fieldErrors).length > 0,
    hasGeneralErrors: generalErrors.length > 0
  }
}

// Hook for API request error handling with retry
export function useApiErrorHandler(options: ErrorHandlerOptions = {}) {
  const { handleError, clearError, ...errorState } = useErrorHandler(options)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleApiError = useCallback(async (
    error: ApiError,
    retryFn?: () => Promise<unknown>,
    context?: string
  ) => {
    handleError(error, context)

    // Auto-retry for network errors
    if (retryFn && getErrorType(error) === ErrorType.NETWORK && errorState.retryCount < 2) {
      setIsRetrying(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000 * (errorState.retryCount + 1)))
        await retryFn()
        clearError()
      } catch (retryError) {
        handleError(retryError as ApiError, `${context} retry`)
      } finally {
        setIsRetrying(false)
      }
    }
  }, [handleError, clearError, errorState.retryCount])

  const manualRetry = useCallback(async (retryFn: () => Promise<unknown>) => {
    if (!errorState.canRetry) return

    setIsRetrying(true)
    try {
      await retryFn()
      clearError()
    } catch (error) {
      handleError(error as ApiError, 'manual retry')
    } finally {
      setIsRetrying(false)
    }
  }, [handleError, clearError, errorState.canRetry])

  return {
    ...errorState,
    isRetrying,
    handleApiError,
    manualRetry,
    clearError
  }
}

export default useErrorHandler