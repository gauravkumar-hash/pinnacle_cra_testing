import { Alert, Button, Result, Typography, Card, Tag, Divider } from 'antd'
import { ReloadOutlined, ExclamationCircleOutlined, DisconnectOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { ApiError } from '../services/client'
import { getErrorMsg } from '../utils'
import { ReactNode } from 'react'

const { Text, Paragraph } = Typography

// Error types enum
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

// Determine error type from ApiError
export function getErrorType(error: ApiError): ErrorType {
  if (!error.status) return ErrorType.NETWORK
  
  switch (error.status) {
    case 400:
    case 422:
      return ErrorType.VALIDATION
    case 401:
    case 403:
      return ErrorType.AUTHORIZATION
    case 404:
      return ErrorType.NOT_FOUND
    case 408:
      return ErrorType.TIMEOUT
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER
    default:
      return ErrorType.UNKNOWN
  }
}

// Get user-friendly error message
export function getUserFriendlyErrorMessage(error: ApiError): string {
  const errorType = getErrorType(error)
  
  switch (errorType) {
    case ErrorType.NETWORK:
      return "Unable to connect to the server. Please check your internet connection."
    case ErrorType.VALIDATION:
      return "Please check your input and try again."
    case ErrorType.AUTHORIZATION:
      return "You don't have permission to perform this action."
    case ErrorType.NOT_FOUND:
      return "The requested resource was not found."
    case ErrorType.TIMEOUT:
      return "The request took too long. Please try again."
    case ErrorType.SERVER:
      return "Server error occurred. Please try again later."
    default:
      return getErrorMsg(error)
  }
}

// Get error icon
export function getErrorIcon(error: ApiError) {
  const errorType = getErrorType(error)
  
  switch (errorType) {
    case ErrorType.NETWORK:
      return <DisconnectOutlined />
    case ErrorType.TIMEOUT:
      return <ClockCircleOutlined />
    case ErrorType.AUTHORIZATION:
      return <WarningOutlined />
    default:
      return <ExclamationCircleOutlined />
  }
}

// Get error severity
export function getErrorSeverity(error: ApiError): 'error' | 'warning' | 'info' {
  const errorType = getErrorType(error)
  
  switch (errorType) {
    case ErrorType.AUTHORIZATION:
    case ErrorType.NOT_FOUND:
      return 'warning'
    case ErrorType.VALIDATION:
      return 'info'
    default:
      return 'error'
  }
}

// Basic error alert component
interface ErrorAlertProps {
  error: ApiError
  onRetry?: () => void
  onDismiss?: () => void
  showDetails?: boolean
  className?: string
  retryText?: string
  retryLoading?: boolean
}

export function ErrorAlert({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className,
  retryText = "Retry",
  retryLoading = false
}: ErrorAlertProps) {
  const errorType = getErrorType(error)
  const severity = getErrorSeverity(error)
  const userMessage = getUserFriendlyErrorMessage(error)
  const technicalMessage = getErrorMsg(error)

  return (
    <Alert
      message={
        <div className="flex items-center gap-2">
          {getErrorIcon(error)}
          <span>Error Loading Data</span>
          <Tag color={severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}>
            {errorType.toUpperCase()}
          </Tag>
        </div>
      }
      description={
        <div className="space-y-2">
          <Text>{userMessage}</Text>
          {showDetails && technicalMessage !== userMessage && (
            <>
              <Divider className="my-2" />
              <details>
                <summary className="cursor-pointer text-xs text-gray-600">
                  Technical details
                </summary>
                <Text code className="text-xs block mt-1 p-2 bg-gray-50 rounded">
                  {technicalMessage}
                </Text>
              </details>
            </>
          )}
        </div>
      }
      type={severity}
      showIcon
      closable={!!onDismiss}
      onClose={onDismiss}
      action={
        onRetry ? (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={onRetry}
            loading={retryLoading}
          >
            {retryText}
          </Button>
        ) : undefined
      }
      className={className}
    />
  )
}

// Full page error component
interface ErrorPageProps {
  error: ApiError
  onRetry?: () => void
  title?: string
  showDetails?: boolean
  retryLoading?: boolean
}

export function ErrorPage({
  error,
  onRetry,
  title = "Something went wrong",
  showDetails = false,
  retryLoading = false
}: ErrorPageProps) {
  const userMessage = getUserFriendlyErrorMessage(error)
  const technicalMessage = getErrorMsg(error)

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Result
        status="error"
        icon={getErrorIcon(error)}
        title={title}
        subTitle={userMessage}
        extra={[
          onRetry && (
            <Button
              key="retry"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={onRetry}
              loading={retryLoading}
            >
              Try Again
            </Button>
          ),
          <Button key="refresh" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        ].filter(Boolean)}
      >
        {showDetails && (
          <div className="text-left max-w-md">
            <Alert
              message="Error Details"
              description={
                <Paragraph className="text-sm">
                  <Text strong>Technical Details:</Text><br />
                  {technicalMessage}
                </Paragraph>
              }
              type="warning"
              showIcon
              className="mt-4"
            />
          </div>
        )}
      </Result>
    </div>
  )
}

// Inline error component
interface InlineErrorProps {
  error: ApiError
  onRetry?: () => void
  compact?: boolean
  retryLoading?: boolean
}

export function InlineError({
  error,
  onRetry,
  compact = false,
  retryLoading = false
}: InlineErrorProps) {
  const userMessage = getUserFriendlyErrorMessage(error)

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-red-600 p-2">
        {getErrorIcon(error)}
        <Text type="danger" className="text-sm">{userMessage}</Text>
        {onRetry && (
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={onRetry}
            loading={retryLoading}
            className="p-0 h-auto"
          >
            Retry
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getErrorIcon(error)}
          <Text type="danger">{userMessage}</Text>
        </div>
        {onRetry && (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={onRetry}
            loading={retryLoading}
          >
            Retry
          </Button>
        )}
      </div>
    </Card>
  )
}

// Retry wrapper component
interface RetryWrapperProps {
  onRetry: () => void
  error?: ApiError
  children: ReactNode
  maxRetries?: number
  retryDelay?: number
  showErrorDetails?: boolean
}

export function RetryWrapper({
  onRetry,
  error,
  children,
  showErrorDetails = false
}: RetryWrapperProps) {
  if (error) {
    return (
      <ErrorAlert
        error={error}
        onRetry={onRetry}
        showDetails={showErrorDetails}
        className="my-4"
      />
    )
  }

  return <>{children}</>
}

// Network status component
interface NetworkStatusProps {
  isOnline: boolean
  onRetryConnection?: () => void
}

export function NetworkStatus({ isOnline, onRetryConnection }: NetworkStatusProps) {
  if (isOnline) return null

  return (
    <Alert
      message="Connection Lost"
      description="You appear to be offline. Some features may not work properly."
      type="warning"
      showIcon
      banner
      action={
        onRetryConnection ? (
          <Button size="small" onClick={onRetryConnection}>
            Retry Connection
          </Button>
        ) : undefined
      }
    />
  )
}

// Form error summary component
interface FormErrorSummaryProps {
  errors: string[]
  onDismiss?: () => void
  title?: string
}

export function FormErrorSummary({
  errors,
  onDismiss,
  title = "Please fix the following errors:"
}: FormErrorSummaryProps) {
  if (errors.length === 0) return null

  return (
    <Alert
      message={title}
      description={
        <ul className="mb-0 pl-4">
          {errors.map((error, index) => (
            <li key={index} className="text-sm">{error}</li>
          ))}
        </ul>
      }
      type="error"
      showIcon
      closable={!!onDismiss}
      onClose={onDismiss}
      className="mb-4"
    />
  )
}

export default {
  ErrorAlert,
  ErrorPage,
  InlineError,
  RetryWrapper,
  NetworkStatus,
  FormErrorSummary,
  getErrorType,
  getUserFriendlyErrorMessage,
  getErrorIcon,
  getErrorSeverity
}