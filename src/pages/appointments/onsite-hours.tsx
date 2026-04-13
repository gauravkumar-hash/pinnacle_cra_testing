import { useState } from "react"
import { Table, Select, Button, Space, message, Spin, Typography, Card, Alert, Tooltip, Tag } from "antd"
import { ColumnsType } from "antd/es/table"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ReloadOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons"
import { ErrorBoundary } from "../../components/ErrorBoundary"
import { QueryStateHandler } from "../../components/QueryStateHandler"
import { PageLoading } from "../../components/LoadingStates"
import { ErrorAlert } from "../../components/ErrorHandling"
import { useErrorHandler } from "../../hooks/useErrorHandler"
import { 
  getBranchesApiAdminBranchesGet,
  getBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdGet,
  updateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPut,
  BranchListDetails,
  BranchOperatingHoursResponse,
  DayOfWeek
} from "../../services/client"
import TimeSelection from "../../components/TimeSelection"

const { Title, Text } = Typography

// Days mapping for conversion between API and UI
const DAYS_MAP: { [key: string]: DayOfWeek } = {
  Monday: "Monday",
  Tuesday: "Tuesday", 
  Wednesday: "Wednesday",
  Thursday: "Thursday",
  Friday: "Friday",
  Saturday: "Saturday",
  Sunday: "Sunday",
  PH: "Public Holiday"
}

const REVERSE_DAYS_MAP: { [key in DayOfWeek]: string } = {
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday", 
  Thursday: "Thursday",
  Friday: "Friday",
  Saturday: "Saturday",
  Sunday: "Sunday",
  "Public Holiday": "PH"
}

interface TimeInterval {
  id: string
  start: number // minutes from midnight
  end: number // minutes from midnight
}

interface OperatingHours {
  [key: string]: TimeInterval[]
}

// Helper functions for time conversion
const timeStringToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

const minutesToTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Convert API response to UI format
const convertApiToUiFormat = (apiResponse: BranchOperatingHoursResponse): OperatingHours => {
  const result: OperatingHours = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
    PH: []
  }

  // Convert from API format to UI format
  Object.entries(apiResponse.operating_hours).forEach(([day, hours]) => {
    const uiDay = REVERSE_DAYS_MAP[day as DayOfWeek] || day
    
    if (result[uiDay]) {
      result[uiDay] = hours.map((hour: any, index: number) => ({
        id: `${uiDay}-${index}`,
        start: timeStringToMinutes(hour.start_time),
        end: timeStringToMinutes(hour.end_time)
      }))
    }
  })

  return result
}

// Convert UI format to API format
const convertUiToApiFormat = (uiHours: OperatingHours): { [key: string]: any } => {
  const result: { [key: string]: any } = {}
  
  Object.entries(uiHours).forEach(([day, intervals]) => {
    const apiDay = DAYS_MAP[day]
    if (apiDay && intervals.length > 0) {
      result[apiDay] = intervals.map(interval => ({
        start_time: minutesToTimeString(interval.start),
        end_time: minutesToTimeString(interval.end)
      }))
    }
  })
  
  return result
}

export default function OnsiteHours() {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Error handler for mutations
  const { handleError: handleMutationError } = useErrorHandler({
    showNotification: true,
    retryable: false
  })
  
  // Fetch branches
  const { 
    data: branches, 
    isPending: branchesLoading, 
    isError: branchesError,
    error: branchesErrorDetail,
    refetch: refetchBranches
  } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranchesApiAdminBranchesGet,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // Fetch operating hours for selected branch
  const { 
    data: operatingHoursData, 
    isPending: operatingHoursLoading, 
    isError: operatingHoursError,
    error: operatingHoursErrorDetail,
    refetch: refetchOperatingHours
  } = useQuery({
    queryKey: ['operating-hours', selectedBranchId],
    queryFn: () => getBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdGet({
      branchId: selectedBranchId!
    }),
    enabled: !!selectedBranchId,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // Update operating hours mutation
  const updateOperatingHoursMutation = useMutation({
    mutationFn: ({ branchId, hours }: { branchId: string, hours: OperatingHours }) => 
      updateBranchOperatingHoursApiAdminAppointmentsV1OperatingHoursBranchIdPut({
        branchId,
        requestBody: convertUiToApiFormat(hours)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operating-hours', selectedBranchId] })
      message.success("Operating hours saved successfully")
    },
    onError: (error: any) => {
      handleMutationError(error, 'operating hours update')
    }
  })

  const handleSave = async (hours: OperatingHours) => {
    if (!selectedBranchId) {
      message.error("No branch selected")
      return
    }
    
    updateOperatingHoursMutation.mutate({ branchId: selectedBranchId, hours })
  }

  // Helper function to get operating hours summary
  const getOperatingHoursSummary = (branchId: string) => {
    if (branchId === selectedBranchId && operatingHoursData) {
      const hours = operatingHoursData.operating_hours
      const daysWithHours = Object.keys(hours).length
      return daysWithHours > 0 ? `${daysWithHours} days configured` : 'No hours set'
    }
    return 'Not loaded'
  }

  const columns: ColumnsType<BranchListDetails> = [
    {
      title: "Branch ID",
      dataIndex: "id",
      key: "id",
      width: 120,
      render: (id: string) => (
        <Tag color="blue">{id}</Tag>
      ),
    },
    {
      title: "Branch Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "is_open",
      key: "is_open",
      width: 100,
      render: (isOpen: boolean) => (
        <Tag 
          icon={isOpen ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={isOpen ? 'success' : 'default'}
        >
          {isOpen ? 'Open' : 'Closed'}
        </Tag>
      ),
    },
    {
      title: "Operating Hours",
      key: "operating_hours",
      width: 150,
      render: (_, record) => (
        <Tooltip title="Click 'Configure Hours' to view details">
          <Text type="secondary" className="text-xs">
            <ClockCircleOutlined className="mr-1" />
            {getOperatingHoursSummary(record.id)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type={selectedBranchId === record.id ? "primary" : "default"}
            onClick={() => setSelectedBranchId(record.id)}
            icon={<ClockCircleOutlined />}
            size="small"
          >
            {selectedBranchId === record.id ? "Selected" : "Configure Hours"}
          </Button>
        </Space>
      ),
    },
  ]

  const selectedBranch = branches?.find((b) => b.id === selectedBranchId)



  return (
    <ErrorBoundary>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Title level={2} className="mb-2">Appointment Onsite Hours</Title>
            <Text type="secondary">
              Configure operating hours for each branch to manage appointment availability
            </Text>
          </div>
          <Space>
            <Tooltip title="Refresh branches list">
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => refetchBranches()}
                loading={branchesLoading}
                size="small"
              >
                Refresh
              </Button>
            </Tooltip>
          </Space>
        </div>

        {/* Error alert for mutation */}
        {updateOperatingHoursMutation.isError && updateOperatingHoursMutation.error && (
          <ErrorAlert
            error={updateOperatingHoursMutation.error}
            onDismiss={() => updateOperatingHoursMutation.reset()}
            className="mb-4"
          />
        )}

        <QueryStateHandler
          query={{
            data: branches,
            isLoading: branchesLoading,
            isError: branchesError,
            error: branchesError ? branchesErrorDetail : null,
            refetch: refetchBranches
          } as any}
          loadingSkeleton={<PageLoading message="Loading branches..." />}
          isEmpty={(data) => !data || (Array.isArray(data) && data.length === 0)}
          emptyTitle="No branches found"
          emptyDescription="No branches are available to configure operating hours."
        >
          {(branches: BranchListDetails[]) => (
            <>
      
      <Card className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="mb-0">Select Branch</Title>
          {selectedBranchId && (
            <Space>
              <Text type="secondary">
                Configuring: <strong>{selectedBranch?.name}</strong>
              </Text>
              <Button 
                size="small"
                type="link"
                onClick={() => setSelectedBranchId(null)}
              >
                Clear Selection
              </Button>
            </Space>
          )}
        </div>
        
        <Space className="mb-4 w-full" direction="vertical" size="large">
          <Select
            placeholder="Select a branch to configure operating hours"
            className="w-full max-w-md"
            onChange={(value) => setSelectedBranchId(value)}
            value={selectedBranchId}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={branches?.map((branch: BranchListDetails) => ({
              value: branch.id,
              label: `${branch.name} (${branch.id})`
            }))}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={branches}
          rowKey="id"
          pagination={false}
          className="mb-6"
        />
            </Card>

            {selectedBranchId && (
              <div className="mt-8">
                <QueryStateHandler
                  query={{
                    data: operatingHoursData,
                    isLoading: operatingHoursLoading,
                    isError: operatingHoursError,
                    error: operatingHoursError ? operatingHoursErrorDetail : null,
                    refetch: refetchOperatingHours
                  } as any}
                  loadingSkeleton={
                    <Card>
                      <div className="flex items-center justify-center py-8">
                        <Space direction="vertical" align="center">
                          <Spin size="large" />
                          <Text type="secondary">Loading operating hours...</Text>
                        </Space>
                      </div>
                    </Card>
                  }
                  isEmpty={(data) => !data}
                  emptyState={
                    <Card>
                      <Alert
                        message="No operating hours configured"
                        description="No operating hours found for this branch. You can configure them using the time selection interface below."
                        type="info"
                        showIcon
                        action={
                          <Button 
                            type="primary" 
                            size="small"
                            onClick={() => {
                              // Initialize with default hours for the branch
                              const defaultHours: OperatingHours = {
                                Monday: [{ id: 'mon-1', start: 540, end: 1020 }], // 9 AM - 5 PM
                                Tuesday: [{ id: 'tue-1', start: 540, end: 1020 }],
                                Wednesday: [{ id: 'wed-1', start: 540, end: 1020 }],
                                Thursday: [{ id: 'thu-1', start: 540, end: 1020 }],
                                Friday: [{ id: 'fri-1', start: 540, end: 1020 }],
                                Saturday: [{ id: 'sat-1', start: 540, end: 720 }], // 9 AM - 12 PM
                                Sunday: [],
                                PH: []
                              }
                              handleSave(defaultHours)
                            }}
                          >
                            Set Default Hours
                          </Button>
                        }
                      />
                      <div className="mt-4">
                        <TimeSelection
                          branchName={selectedBranch?.name}
                          initialHours={{
                            Monday: [],
                            Tuesday: [],
                            Wednesday: [],
                            Thursday: [],
                            Friday: [],
                            Saturday: [],
                            Sunday: [],
                            PH: []
                          }}
                          onSave={handleSave}
                          loading={updateOperatingHoursMutation.isPending}
                        />
                      </div>
                    </Card>
                  }
                >
                  {(data: BranchOperatingHoursResponse) => {
                    const convertedOperatingHours = convertApiToUiFormat(data)
                    return (
                      <Spin spinning={updateOperatingHoursMutation.isPending}>
                        <div className="space-y-4">
                          {updateOperatingHoursMutation.isPending && (
                            <Alert
                              message="Saving operating hours..."
                              description="Please wait while we update the operating hours"
                              type="info"
                              showIcon
                            />
                          )}
                          <TimeSelection
                            branchName={selectedBranch?.name}
                            initialHours={convertedOperatingHours}
                            onSave={handleSave}
                            loading={updateOperatingHoursMutation.isPending}
                          />
                        </div>
                      </Spin>
                    )
                  }}
                </QueryStateHandler>
              </div>
            )}
            </>
          )}
        </QueryStateHandler>
      </div>
    </ErrorBoundary>
  )
}