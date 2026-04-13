import { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, Button, Result, Typography } from 'antd'
import { ReloadOutlined, BugOutlined } from '@ant-design/icons'

const { Paragraph, Text } = Typography

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      hasError: true,
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Result
            status="error"
            icon={<BugOutlined />}
            title="Something went wrong"
            subTitle="An unexpected error occurred while rendering this page."
            extra={[
              <Button key="retry" type="primary" icon={<ReloadOutlined />} onClick={this.handleReset}>
                Try Again
              </Button>,
              <Button key="report" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            ]}
          >
            <div className="text-left max-w-md">
              <Alert
                message="Error Details"
                description={
                  <div className="space-y-2">
                    <Paragraph className="mb-2">
                      <Text strong>Error:</Text> {this.state.error?.message}
                    </Paragraph>
                    <details className="text-xs">
                      <summary className="cursor-pointer">Stack trace</summary>
                      <pre className="mt-2 text-xs overflow-auto bg-gray-50 p-2 rounded">
                        {this.state.error?.stack}
                      </pre>
                    </details>
                  </div>
                }
                type="error"
                showIcon
                className="mt-4"
              />
            </div>
          </Result>
        </div>
      )
    }

    return this.props.children
  }
}

// Simple error boundary for smaller components
interface SimpleErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export function SimpleErrorBoundary({ children, fallback }: SimpleErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <Alert
            message="Component Error"
            description="This component failed to load. Please try refreshing the page."
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            }
          />
        )
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary