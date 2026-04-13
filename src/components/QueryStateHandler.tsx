import { ReactNode } from 'react'
import { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { ApiError } from '../services/client'
import { ErrorAlert, ErrorPage } from './ErrorHandling'
import { PageLoading, InlineLoading } from './LoadingStates'
import { Empty, Button } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'

// Props for query state handler
interface QueryStateHandlerProps<TData = unknown> {
  query: UseQueryResult<TData, ApiError>
  onRetry?: () => void
  loadingSkeleton?: ReactNode
  errorComponent?: 'alert' | 'page' | 'inline' | ReactNode
  emptyState?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  onEmptyAction?: () => void
  emptyActionText?: string
  isEmpty?: (data: TData) => boolean
  children: (data: TData) => ReactNode
  showErrorDetails?: boolean
  inline?: boolean
}

export function QueryStateHandler<TData = unknown>({
  query,
  onRetry,
  loadingSkeleton,
  errorComponent = 'alert',
  emptyState,
  emptyTitle = "No data found",
  emptyDescription = "There is no data to display.",
  onEmptyAction,
  emptyActionText = "Add New",
  isEmpty,
  children,
  showErrorDetails = true,
  inline = false
}: QueryStateHandlerProps<TData>) {
  const { data, isLoading, isError, error, refetch } = query

  // Handle loading state
  if (isLoading) {
    if (loadingSkeleton) {
      return <>{loadingSkeleton}</>
    }
    return inline ? <InlineLoading /> : <PageLoading />
  }

  // Handle error state
  if (isError && error) {
    const retryHandler = onRetry || (() => refetch())

    if (typeof errorComponent === 'string') {
      switch (errorComponent) {
        case 'page':
          return (
            <ErrorPage
              error={error}
              onRetry={retryHandler}
              showDetails={showErrorDetails}
            />
          )
        case 'inline':
          return (
            <div className="p-4">
              <ErrorAlert
                error={error}
                onRetry={retryHandler}
                showDetails={showErrorDetails}
              />
            </div>
          )
        default:
          return (
            <ErrorAlert
              error={error}
              onRetry={retryHandler}
              showDetails={showErrorDetails}
              className="my-4"
            />
          )
      }
    } else {
      return <>{errorComponent}</>
    }
  }

  // Check if data is empty
  const dataIsEmpty = isEmpty ? isEmpty(data!) : !data || (Array.isArray(data) && data.length === 0)

  if (dataIsEmpty) {
    if (emptyState) {
      return <>{emptyState}</>
    }

    return (
      <div className="text-center py-8">
        <Empty
          description={
            <div className="space-y-2">
              <div className="text-lg font-medium">{emptyTitle}</div>
              <div className="text-gray-500">{emptyDescription}</div>
            </div>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          {onEmptyAction && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onEmptyAction}>
              {emptyActionText}
            </Button>
          )}
        </Empty>
      </div>
    )
  }

  // Render children with data
  return <>{children(data!)}</>
}

// Props for mutation state handler
interface MutationStateHandlerProps<TData = unknown, TVariables = unknown, TContext = unknown> {
  mutation: UseMutationResult<TData, ApiError, TVariables, TContext>
  onSuccess?: (data: TData) => void
  onError?: (error: ApiError) => void
  showErrorAlert?: boolean
  children: (mutate: UseMutationResult<TData, ApiError, TVariables, TContext>['mutate'], state: {
    isLoading: boolean
    isError: boolean
    isSuccess: boolean
    error: ApiError | null
  }) => ReactNode
}

export function MutationStateHandler({
  mutation,
  onSuccess,
  onError,
  showErrorAlert = true,
  children
}: MutationStateHandlerProps) {
  const { mutate, isPending, isError, isSuccess, error, data } = mutation

  // Handle success
  if (isSuccess && data && onSuccess) {
    onSuccess(data)
  }

  // Handle error
  if (isError && error && onError) {
    onError(error)
  }

  return (
    <div className="space-y-4">
      {showErrorAlert && isError && error && (
        <ErrorAlert
          error={error}
          onDismiss={() => mutation.reset()}
        />
      )}
      {children(mutate, {
        isLoading: isPending,
        isError,
        isSuccess,
        error
      })}
    </div>
  )
}

// Combined handler for queries with mutations
interface CombinedStateHandlerProps<TQueryData = unknown, TMutationData = unknown, TMutationVariables = unknown, TMutationContext = unknown> {
  query: UseQueryResult<TQueryData, ApiError>
  mutation?: UseMutationResult<TMutationData, ApiError, TMutationVariables, TMutationContext>
  onRetry?: () => void
  onMutationSuccess?: (data: TMutationData) => void
  onMutationError?: (error: ApiError) => void
  loadingSkeleton?: ReactNode
  errorComponent?: 'alert' | 'page' | 'inline' | ReactNode
  emptyState?: ReactNode
  isEmpty?: (data: TQueryData) => boolean
  children: (data: TQueryData, mutate?: UseMutationResult<TMutationData, ApiError, TMutationVariables, TMutationContext>['mutate'], mutationState?: {
    isLoading: boolean
    isError: boolean
    isSuccess: boolean
    error: ApiError | null
  }) => ReactNode
  showErrorDetails?: boolean
}

export function CombinedStateHandler<TQueryData = unknown, TMutationData = unknown, TMutationVariables = unknown, TMutationContext = unknown>({
  query,
  mutation,
  onRetry,
  onMutationSuccess,
  onMutationError,
  loadingSkeleton,
  errorComponent = 'alert',
  emptyState,
  isEmpty,
  children,
  showErrorDetails = false
}: CombinedStateHandlerProps<TQueryData, TMutationData, TMutationVariables, TMutationContext>) {
  return (
    <QueryStateHandler
      query={query}
      onRetry={onRetry}
      loadingSkeleton={loadingSkeleton}
      errorComponent={errorComponent}
      emptyState={emptyState}
      isEmpty={isEmpty}
      showErrorDetails={showErrorDetails}
    >
      {(data) => {
        if (mutation) {
          return (
            <MutationStateHandler
              mutation={mutation as UseMutationResult<unknown, ApiError, unknown, unknown>}
              onSuccess={onMutationSuccess as ((data: unknown) => void) | undefined}
              onError={onMutationError}
            >
              {(mutate, mutationState) => children(data, mutate as UseMutationResult<TMutationData, ApiError, TMutationVariables, TMutationContext>['mutate'], mutationState)}
            </MutationStateHandler>
          )
        }
        return children(data)
      }}
    </QueryStateHandler>
  )
}

// Simple wrapper for common table patterns
interface TableStateHandlerProps<TData = unknown> {
  query: UseQueryResult<TData[], ApiError>
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  onAdd?: () => void
  addButtonText?: string
  children: (data: TData[]) => ReactNode
}

export function TableStateHandler<TData = unknown>({
  query,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription = "Get started by creating your first record.",
  onAdd,
  addButtonText = "Add New",
  children
}: TableStateHandlerProps<TData>) {
  return (
    <QueryStateHandler
      query={query}
      onRetry={onRetry}
      isEmpty={(data) => !data || (Array.isArray(data) && data.length === 0)}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      onEmptyAction={onAdd}
      emptyActionText={addButtonText}
    >
      {(data) => children(data)}
    </QueryStateHandler>
  )
}

// Retry button component
interface RetryButtonProps {
  onRetry: () => void
  loading?: boolean
  text?: string
  size?: 'small' | 'middle' | 'large'
  type?: 'default' | 'primary' | 'dashed' | 'text' | 'link'
}

export function RetryButton({
  onRetry,
  loading = false,
  text = "Retry",
  size = "small",
  type = "default"
}: RetryButtonProps) {
  return (
    <Button
      size={size}
      type={type}
      icon={<ReloadOutlined />}
      onClick={onRetry}
      loading={loading}
    >
      {text}
    </Button>
  )
}

export default {
  QueryStateHandler,
  MutationStateHandler,
  CombinedStateHandler,
  TableStateHandler,
  RetryButton
}