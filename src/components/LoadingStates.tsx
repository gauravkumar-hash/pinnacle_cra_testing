import { Spin, Skeleton, Card, Alert, Typography, Button, Space } from 'antd'
import { ReloadOutlined, LoadingOutlined } from '@ant-design/icons'
import { ReactNode } from 'react'

const { Text } = Typography

// Full page loading component
export function PageLoading({ message = "Loading...", size = "large" }: { message?: string; size?: "small" | "default" | "large" }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Spin size={size} indicator={<LoadingOutlined style={{ fontSize: size === 'small' ? 24 : size === 'large' ? 48 : 32 }} spin />} />
        <Text type="secondary" className="block">{message}</Text>
      </div>
    </div>
  )
}

// Card loading skeleton
export function CardSkeleton({ rows = 4, avatar = false }: { rows?: number; avatar?: boolean }) {
  return (
    <Card>
      <Skeleton avatar={avatar} paragraph={{ rows }} loading />
    </Card>
  )
}

// Table loading skeleton
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Table header skeleton */}
      <div className="flex space-x-4 p-4 bg-gray-50 rounded">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton.Button key={i} active size="small" className="h-6" />
        ))}
      </div>
      
      {/* Table rows skeleton */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 p-4 border-b">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="flex-1">
              <Skeleton.Input active size="small" className="w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// Form loading skeleton
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton.Input active size="small" className="w-32" />
          <Skeleton.Input active size="default" className="w-full" />
        </div>
      ))}
      <div className="flex justify-end space-x-2 pt-4">
        <Skeleton.Button active size="default" />
        <Skeleton.Button active size="default" />
      </div>
    </div>
  )
}

// Inline loading component
export function InlineLoading({ message = "Loading...", size = "small" }: { message?: string; size?: "small" | "default" | "large" }) {
  return (
    <div className="flex items-center justify-center p-4">
      <Space>
        <Spin size={size} />
        <Text type="secondary">{message}</Text>
      </Space>
    </div>
  )
}

// Loading state wrapper
interface LoadingWrapperProps {
  loading: boolean
  children: ReactNode
  skeleton?: ReactNode
  overlay?: boolean
  message?: string
}

export function LoadingWrapper({ loading, children, skeleton, overlay = false, message }: LoadingWrapperProps) {
  if (loading && !overlay) {
    return skeleton || <InlineLoading message={message} />
  }

  return (
    <Spin spinning={loading} tip={message}>
      {children}
    </Spin>
  )
}

// Query loading states component
interface QueryLoadingStatesProps {
  isLoading: boolean
  isError: boolean
  error?: Error | { message: string }
  isEmpty?: boolean
  onRetry?: () => void
  loadingSkeleton?: ReactNode
  emptyState?: ReactNode
  errorTitle?: string
  errorDescription?: string
  children: ReactNode
}

export function QueryLoadingStates({
  isLoading,
  isError,
  error,
  isEmpty = false,
  onRetry,
  loadingSkeleton,
  emptyState,
  errorTitle = "Failed to load data",
  errorDescription,
  children
}: QueryLoadingStatesProps) {
  if (isLoading) {
    return loadingSkeleton || <PageLoading message="Loading data..." />
  }

  if (isError) {
    return (
      <Alert
        message={errorTitle}
        description={errorDescription || error?.message || "An error occurred while loading data"}
        type="error"
        showIcon
        action={
          onRetry ? (
            <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
        className="my-4"
      />
    )
  }

  if (isEmpty) {
    return emptyState || (
      <div className="text-center py-8">
        <Text type="secondary">No data available</Text>
      </div>
    )
  }

  return <>{children}</>
}

// Calendar loading state
export function CalendarSkeleton() {
  return (
    <Card>
      <div className="space-y-4">
        {/* Calendar header */}
        <div className="flex justify-between items-center p-4 border-b">
          <Skeleton.Input active size="default" className="w-40" />
          <div className="flex space-x-2">
            <Skeleton.Button active size="small" />
            <Skeleton.Button active size="small" />
            <Skeleton.Button active size="small" />
          </div>
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2 p-4">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 border rounded p-2">
              <Skeleton.Input active size="small" className="w-6 mb-2" />
              {(i % 3 === 0 || i % 5 === 0) && (
                <div className="space-y-1">
                  <Skeleton.Input active size="small" className="w-full h-3" />
                  <Skeleton.Input active size="small" className="w-3/4 h-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// Service loading skeleton
export function ServiceSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton rows={2} />
      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton.Input active size="default" className="w-40" />
            <Skeleton.Button active />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border rounded p-4">
                <Skeleton.Input active size="default" className="w-3/4 mb-2" />
                <Skeleton paragraph={{ rows: 2, width: ['100%', '60%'] }} />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

// Statistics loading skeleton
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} size="small">
          <div className="text-center space-y-2">
            <Skeleton.Input active size="small" className="w-16" />
            <Skeleton.Input active size="large" className="w-12 mx-auto" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export default {
  PageLoading,
  CardSkeleton,
  TableSkeleton,
  FormSkeleton,
  InlineLoading,
  LoadingWrapper,
  QueryLoadingStates,
  CalendarSkeleton,
  ServiceSkeleton,
  StatsSkeleton
}