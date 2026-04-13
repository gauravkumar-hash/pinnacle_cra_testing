import { useState, useMemo, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Input, Select, Button, Space, message, Typography, Tag, DatePicker, Drawer, Card, Descriptions, List, Pagination, Dropdown } from "antd"
import { SearchOutlined, AppstoreOutlined, SettingOutlined, TeamOutlined, ShopOutlined, EyeOutlined, MoreOutlined } from "@ant-design/icons"
import dayjs, { Dayjs } from "dayjs"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getAppointmentsApiAdminAppointmentsV1AppointmentsGet,
  getAppointmentFiltersApiAdminAppointmentsV1AppointmentsFiltersGet,
  updateAppointmentStatusApiAdminAppointmentsV1AppointmentIdStatusPut,
  AppointmentListItem,
  AppointmentStatus,
  AppointmentFiltersResponse,
  ApiError,
  Page_AppointmentListItem_
} from "../../services/client"
import { ErrorBoundary } from "../../components/ErrorBoundary"
import { QueryStateHandler } from "../../components/QueryStateHandler"
import { TableSkeleton } from "../../components/LoadingStates"
import { ErrorAlert } from "../../components/ErrorHandling"
import { useErrorHandler } from "../../hooks/useErrorHandler"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  PaginationState,
} from "@tanstack/react-table"
import { useDownload } from "@/hooks/useDownload"

const { Title } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

interface AppointmentDetails extends AppointmentListItem {
  payment_breakdown: {
    subtotal: number
    gst: number
    total: number
    corporate_discount?: number
  }
  guests?: Array<{
    name: string
    mobile: string
    sgimed_appointment_id?: string
  }>
  survey?: Record<string, unknown>
  invoice_ids: string[]
  payment_ids: string[]
  created_at: string
}

interface QueryParams {
  page: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
  search?: string
  status?: AppointmentStatus
  branchId?: string
  serviceGroupId?: string
  dateFrom?: string
  dateTo?: string
}

interface StatusUpdateData {
  appointmentId: string
  requestBody: {
    status: AppointmentStatus
    reason?: string
    notes?: string
  }
}

const statusColors: Record<AppointmentStatus, string> = {
  'Prepayment': 'blue',
  'Payment in progress': 'orange',
  'Confirmed': 'green',
  'Cancelled': 'red',
  'Missed': 'volcano',
  'Completed': 'purple'
}

const statusLabels: Record<AppointmentStatus, string> = {
  'Prepayment': 'Prepayment',
  'Payment in progress': 'Payment Started',
  'Confirmed': 'Confirmed',
  'Cancelled': 'Cancelled',
  'Missed': 'Missed',
  'Completed': 'Completed'
}

const columnHelper = createColumnHelper<AppointmentListItem>()

export default function AppointmentManage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus>()
  const [branchFilter, setBranchFilter] = useState<string>()
  const [serviceGroupFilter, setServiceGroupFilter] = useState<string>()
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetails | null>(null)
  const [detailsVisible, setDetailsVisible] = useState(false)

  // TanStack Table states
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20, // Will be updated from API response
  })

  // Error handler for mutations
  const { handleError: handleMutationError } = useErrorHandler({
    showNotification: true,
    retryable: false
  })

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText)
      setPagination(prev => ({ ...prev, pageIndex: 0 })) // Reset to first page when search changes
    }, 500)

    return () => clearTimeout(timer)
  }, [searchText])

  // Build query parameters for API call
  const queryParams = useMemo<QueryParams>(() => {
    const params: QueryParams = {
      page: pagination.pageIndex + 1, // API uses 1-based pagination
      sortBy: sorting.length > 0 ? sorting[0].id : 'start_datetime',
      sortOrder: sorting.length > 0 && sorting[0].desc ? 'desc' : 'asc'
    }

    if (debouncedSearchText) params.search = debouncedSearchText
    if (statusFilter) params.status = statusFilter
    if (branchFilter) params.branchId = branchFilter
    if (serviceGroupFilter) params.serviceGroupId = serviceGroupFilter
    if (dateRange) {
      params.dateFrom = dateRange[0].startOf('day').toISOString()
      params.dateTo = dateRange[1].endOf('day').toISOString()
    }

    return params
  }, [debouncedSearchText, statusFilter, branchFilter, serviceGroupFilter, dateRange, pagination.pageIndex, sorting])

  // Query for appointments
  const appointmentsQuery = useQuery<Page_AppointmentListItem_, ApiError>({
    queryKey: ['admin-appointments', queryParams],
    queryFn: () => getAppointmentsApiAdminAppointmentsV1AppointmentsGet(queryParams),
    placeholderData: (previousData) => previousData
  })

  // Update page size from API response
  useEffect(() => {
    if (appointmentsQuery.data?.pager?.n && appointmentsQuery.data.pager.n !== pagination.pageSize) {
      setPagination(prev => ({ ...prev, pageSize: appointmentsQuery.data.pager.n }))
    }
  }, [appointmentsQuery.data?.pager?.n])

  // Query for appointment filters
  const filtersQuery = useQuery<AppointmentFiltersResponse, ApiError>({
    queryKey: ['admin-appointment-filters'],
    queryFn: () => getAppointmentFiltersApiAdminAppointmentsV1AppointmentsFiltersGet(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Extract filter options from API response
  const branches = useMemo(() => {
    if (!filtersQuery.data?.branches) return []
    return filtersQuery.data.branches.map(branch => ({
      id: branch.value,
      name: branch.label
    }))
  }, [filtersQuery.data])

  const serviceGroups = useMemo(() => {
    if (!filtersQuery.data?.service_groups) return []
    return filtersQuery.data.service_groups.map(sg => ({
      id: sg.value,
      name: sg.label
    }))
  }, [filtersQuery.data])

  // Corporate codes available for future use if needed
  // const corporateCodes = useMemo(() => {
  //   if (!filtersQuery.data?.corporate_codes) return []
  //   return filtersQuery.data.corporate_codes.map(cc => ({
  //     id: cc.value,
  //     name: cc.label
  //   }))
  // }, [filtersQuery.data])

  // Mutation for updating appointment status
  const updateStatusMutation = useMutation({
    mutationFn: (data: StatusUpdateData) => updateAppointmentStatusApiAdminAppointmentsV1AppointmentIdStatusPut(data),
    onSuccess: () => {
      message.success('Appointment status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] })
    },
    onError: (error: ApiError) => {
      handleMutationError(error, 'appointment status update')
    }
  })

  // Handle viewing appointment details
  const handleViewDetails = useCallback((appointment: AppointmentListItem) => {
    // Convert to AppointmentDetails format
    const details: AppointmentDetails = {
      ...appointment,
      payment_breakdown: {
        subtotal: appointment.total_amount * 0.93,
        gst: appointment.total_amount * 0.07,
        total: appointment.total_amount,
        corporate_discount: appointment.corporate_code ? appointment.total_amount * 0.1 : undefined
      },
      guests: [],
      survey: {},
      invoice_ids: [],
      payment_ids: [],
      created_at: appointment.created_at
    }
    setSelectedAppointment(details)
    setDetailsVisible(true)
  }, [])

  // Handle status update
  const handleStatusUpdate = useCallback((appointmentId: string, newStatus: AppointmentStatus) => {
    updateStatusMutation.mutate({
      appointmentId,
      requestBody: {
        status: newStatus
      }
    })
  }, [updateStatusMutation])

  // Define columns using TanStack Table
  const columns = useMemo(
    () => [
      columnHelper.accessor('patient_name', {
        id: 'patient',
        header: 'Patient',
        cell: ({ row }) => (
          <div className="truncate">
            <div className="font-medium truncate">{row.original.patient_name}</div>
            <div className="text-gray-500 text-sm truncate">{row.original.patient_mobile}</div>
            {row.original.is_guest && <Tag color="blue">Guest</Tag>}
            {row.original.group_id && <Tag color="purple">Family</Tag>}
          </div>
        ),
        size: 20, // percentage
      }),
      columnHelper.accessor('services', {
        header: 'Services',
        cell: ({ getValue }) => {
          const services = getValue()
          return (
            <div className="truncate">
              {services.map((service, index) => (
                <Tag key={index} className="mb-1">{service}</Tag>
              ))}
            </div>
          )
        },
        size: 20, // percentage
      }),
      columnHelper.accessor('branch_name', {
        header: 'Branch',
        cell: ({ getValue }) => (
          <div className="truncate">{getValue()}</div>
        ),
        size: 10, // percentage
      }),
      columnHelper.accessor('start_datetime', {
        id: 'start_datetime',
        header: 'Appointment Date & Time',
        cell: ({ row }) => (
          <div className="truncate">
            <div>{dayjs(row.original.start_datetime).format('DD MMM YYYY')}</div>
            <div className="text-gray-500 text-xs">{dayjs(row.original.start_datetime).format('HH:mm')} ({row.original.duration}min)</div>
          </div>
        ),
        size: 12, // percentage
      }),
      columnHelper.accessor('created_at', {
        header: 'Created At',
        cell: ({ getValue }) => {
          const created_at = getValue()
          return (
            <div className="truncate">
              <div>{dayjs(created_at).format('DD MMM YYYY')}</div>
              <div className="text-gray-500 text-xs">{dayjs(created_at).format('HH:mm')}</div>
            </div>
          )
        },
        size: 10, // percentage
      }),
      columnHelper.accessor('total_amount', {
        header: 'Amount',
        cell: ({ getValue }) => (
          <div className="truncate">${getValue().toFixed(2)}</div>
        ),
        size: 8, // percentage
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as AppointmentStatus
          return (
            <Tag color={statusColors[status]} className="truncate">
              {statusLabels[status]}
            </Tag>
          )
        },
        size: 10, // percentage
      }),
      columnHelper.accessor('corporate_code', {
        header: 'Corp Code',
        cell: ({ row }) => {
          const code = row.original.corporate_code
          if (code) {
            return (
              <div>
                <Tag color="orange">{code}</Tag>
                {row.original.patient_survey}
              </div>
            )
          }
          return '-'
        },
        size: 10, // percentage
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const appointment = row.original
          const menuItems = [
            {
              key: 'view',
              label: 'View Details',
              icon: <EyeOutlined />,
              onClick: () => handleViewDetails(appointment)
            },
            {
              key: 'divider1',
              type: 'divider' as const
            },
            {
              key: 'status',
              label: 'Update Status',
              children: Object.entries(statusLabels)
                .filter(([status]) => status !== appointment.status)
                .map(([status, label]) => ({
                  key: status,
                  label,
                  onClick: () => handleStatusUpdate(appointment.id, status as AppointmentStatus)
                }))
            }
          ]

          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                menu={{ items: menuItems }}
                trigger={['click']}
              >
                <Button type="text" icon={<MoreOutlined />} size="small" />
              </Dropdown>
            </div>
          )
        },
        size: 5, // percentage
      }),
    ],
    [handleViewDetails, handleStatusUpdate, statusLabels]
  )

  // Initialize TanStack Table
  const table = useReactTable({
    data: appointmentsQuery.data?.data ?? [],
    columns,
    pageCount: appointmentsQuery.data?.pager ? Math.ceil(appointmentsQuery.data.pager.rows / (appointmentsQuery.data.pager.n || pagination.pageSize)) : -1,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  })

  const appointmentsDownload = useDownload(
      (params: { search?: string; status?: string, branch_id?: string, date_from?: string, date_to?: string, service_group_id?: string, corporate_code?: string }) => {
        const cleanData = Object.entries(params)
          .filter(([_, value]) => value !== undefined)
          .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
          }, {} as Record<string, string>);
        return `/api/admin/appointments/v1/export?${new URLSearchParams(cleanData).toString()}`
      },
      'appointments.csv'
  );

  return (
    <ErrorBoundary>
      <div className="p-6" style={{ width: 'calc(100% - 250px)' }}>
        {/* Navigation Buttons */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card
            hoverable
            className="cursor-pointer text-center"
            onClick={() => navigate('/appointments/corporate-codes')}
          >
            <TeamOutlined className="text-2xl text-purple-500 mb-2" />
            <div className="font-medium">Corporate Codes</div>
            <div className="text-gray-500 text-sm">Manage corporate discounts</div>
          </Card>

          <Card
            hoverable
            className="cursor-pointer text-center"
            onClick={() => navigate('/appointments/onsite-branches')}
          >
            <ShopOutlined className="text-2xl text-orange-500 mb-2" />
            <div className="font-medium">Onsite Branches</div>
            <div className="text-gray-500 text-sm">Configure onsite locations</div>
          </Card>

          <Card
            hoverable
            className="cursor-pointer text-center"
            onClick={() => navigate('/branches')}
          >
            <SettingOutlined className="text-2xl text-green-500 mb-2" />
            <div className="font-medium">Branches</div>
            <div className="text-gray-500 text-sm">Configure clinic branches</div>
          </Card>

          <Card
            hoverable
            className="cursor-pointer text-center"
            onClick={() => navigate('/appointments/services')}
          >
            <AppstoreOutlined className="text-2xl text-blue-500 mb-2" />
            <div className="font-medium">Service Groups</div>
            <div className="text-gray-500 text-sm">Manage appointment services</div>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <Title level={2} className="w-80">Appointments</Title>
          {/* Filters */}
          <Space wrap className="w-full">
            <Input
              placeholder="Search by patient name, mobile, service, or corporate code"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />

            <Select
              placeholder="Filter by status"
              allowClear
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value)
                setPagination(prev => ({ ...prev, pageIndex: 0 }))
              }}
              style={{ width: 150 }}
              loading={filtersQuery.isLoading}
            >
              {filtersQuery.data?.statuses?.map(status => (
                <Option key={status.value} value={status.value as AppointmentStatus}>{status.label}</Option>
              )) || Object.entries(statusLabels).map(([value, label]) => (
                <Option key={value} value={value as AppointmentStatus}>{label}</Option>
              ))}
            </Select>

            <Select
              placeholder="Filter by branch"
              allowClear
              value={branchFilter}
              onChange={(value) => {
                setBranchFilter(value)
                setPagination(prev => ({ ...prev, pageIndex: 0 }))
              }}
              style={{ width: 150 }}
              loading={filtersQuery.isLoading}
            >
              {branches.map(branch => (
                <Option key={branch.id} value={branch.id}>{branch.name}</Option>
              ))}
            </Select>

            <Select
              placeholder="Filter by service group"
              allowClear
              value={serviceGroupFilter}
              onChange={(value) => {
                setServiceGroupFilter(value)
                setPagination(prev => ({ ...prev, pageIndex: 0 }))
              }}
              style={{ width: 200 }}
              loading={filtersQuery.isLoading}
            >
              {serviceGroups.map(group => (
                <Option key={group.id} value={group.id}>{group.name}</Option>
              ))}
            </Select>

            <RangePicker
              placeholder={['Start date', 'End date']}
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates as [Dayjs, Dayjs] | null)
                setPagination(prev => ({ ...prev, pageIndex: 0 }))
              }}
            />

            <Button onClick={() => {
              setSearchText('')
              setStatusFilter(undefined)
              setBranchFilter(undefined)
              setServiceGroupFilter(undefined)
              setDateRange(null)
              setPagination({ pageIndex: 0, pageSize: 50 })
            }}>
              Clear Filters
            </Button>
            <Button
              onClick={() => {
                appointmentsDownload.mutate({
                  search: searchText,
                  status: statusFilter,
                  branch_id: branchFilter,
                  date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
                  date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
                  service_group_id: serviceGroupFilter
                })
              }}
              loading={appointmentsDownload.isPending}
            >
              Export CSV
            </Button>
          </Space>
        </div>

        {/* Enhanced error handling with mutation state */}
        {updateStatusMutation.isError && updateStatusMutation.error && (
          <ErrorAlert
            error={updateStatusMutation.error}
            onDismiss={() => updateStatusMutation.reset()}
            className="mb-4"
          />
        )}

        <QueryStateHandler
          query={appointmentsQuery}
          onRetry={() => appointmentsQuery.refetch()}
          loadingSkeleton={<TableSkeleton rows={pagination.pageSize} />}
          isEmpty={(data: Page_AppointmentListItem_) => !data?.data || data.data.length === 0}
          emptyTitle="No appointments found"
          emptyDescription="No appointments match your current filters. Try adjusting your search criteria."
        >
          {(data: Page_AppointmentListItem_) => (
            <div className="w-full bg-white rounded-lg shadow">
              {/* TanStack Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-max divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th
                            key={header.id}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                            onClick={header.column.getToggleSortingHandler()}
                            style={{ minWidth: `${header.column.getSize()}%` }}
                          >
                            <div className="flex items-center space-x-1">
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                              {header.column.getIsSorted() && (
                                <span>
                                  {header.column.getIsSorted() === 'desc' ? ' ↓' : ' ↑'}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {appointmentsQuery.isFetching || updateStatusMutation.isPending ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-4">
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map(row => (
                        <tr
                          key={row.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleViewDetails(row.original)}
                        >
                          {row.getVisibleCells().map(cell => (
                            <td
                              key={cell.id}
                              className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
                  {Math.min(
                    (pagination.pageIndex + 1) * pagination.pageSize,
                    data.pager.rows
                  )}{' '}
                  of {data.pager.rows} results
                </div>
                <Pagination
                  current={pagination.pageIndex + 1}
                  pageSize={pagination.pageSize}
                  total={data.pager.rows}
                  onChange={(page) => {
                    setPagination(prev => ({ ...prev, pageIndex: page - 1 }))
                  }}
                  showSizeChanger={false}
                  size="small"
                />
              </div>
            </div>
          )}
        </QueryStateHandler>

      {/* Appointment details drawer */}
      <Drawer
        title="Appointment Details"
        placement="right"
        width={600}
        open={detailsVisible}
        onClose={() => setDetailsVisible(false)}
      >
        {selectedAppointment && (
          <div className="space-y-6">
            <Card title="Patient Information" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Name">{selectedAppointment.patient_name}</Descriptions.Item>
                <Descriptions.Item label="Mobile">{selectedAppointment.patient_mobile}</Descriptions.Item>
                <Descriptions.Item label="Type">
                  {selectedAppointment.is_guest ? 'Guest' : 'Registered Patient'}
                </Descriptions.Item>
                {selectedAppointment.sgimed_appointment_id && (
                  <Descriptions.Item label="SGiMed ID">{selectedAppointment.sgimed_appointment_id}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card title="Appointment Details" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Appointment Date & Time">
                  {dayjs(selectedAppointment.start_datetime).format('DD MMM YYYY, HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Duration">{selectedAppointment.duration} minutes</Descriptions.Item>
                <Descriptions.Item label="Branch">{selectedAppointment.branch_name}</Descriptions.Item>
                <Descriptions.Item label="Created At">
                  {dayjs(selectedAppointment.created_at).format('DD MMM YYYY, HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={statusColors[selectedAppointment.status]}>
                    {statusLabels[selectedAppointment.status]}
                  </Tag>
                </Descriptions.Item>
                {selectedAppointment.corporate_code && (
                  <Descriptions.Item label="Corporate Code">
                    <Tag color="orange">{selectedAppointment.corporate_code}</Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card title="Services" size="small">
              <List
                size="small"
                dataSource={selectedAppointment.services}
                renderItem={(service) => <List.Item>{service}</List.Item>}
              />
            </Card>

            {selectedAppointment.guests && selectedAppointment.guests.length > 0 && (
              <Card title="Family/Guest Members" size="small">
                <List
                  size="small"
                  dataSource={selectedAppointment.guests}
                  renderItem={(guest) => (
                    <List.Item>
                      <div>
                        <div className="font-medium">{guest.name}</div>
                        <div className="text-gray-500 text-sm">{guest.mobile}</div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <Card title="Payment Information" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Subtotal">
                  ${selectedAppointment.payment_breakdown.subtotal.toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="GST">
                  ${selectedAppointment.payment_breakdown.gst.toFixed(2)}
                </Descriptions.Item>
                {selectedAppointment.payment_breakdown.corporate_discount && (
                  <Descriptions.Item label="Corporate Discount">
                    -${selectedAppointment.payment_breakdown.corporate_discount.toFixed(2)}
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Total">
                  <strong>${selectedAppointment.payment_breakdown.total.toFixed(2)}</strong>
                </Descriptions.Item>
              </Descriptions>

              {selectedAppointment.invoice_ids && selectedAppointment.invoice_ids.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Invoice IDs:</div>
                  <Space wrap>
                    {selectedAppointment.invoice_ids.map(id => (
                      <Tag key={id}>{id}</Tag>
                    ))}
                  </Space>
                </div>
              )}
            </Card>
          </div>
        )}
      </Drawer>
      </div>
    </ErrorBoundary>
  )
}
