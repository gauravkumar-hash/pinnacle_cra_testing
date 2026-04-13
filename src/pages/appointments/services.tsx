import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Table, Button, Space, message, Typography, Card, Modal, Form, Input, InputNumber, Select, Tag, Alert, Breadcrumb } from "antd"
import { ColumnsType } from "antd/es/table"
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ErrorBoundary } from "../../components/ErrorBoundary"
import { TableSkeleton } from "../../components/LoadingStates"
import { ErrorAlert } from "../../components/ErrorHandling"
import { useErrorHandler } from "../../hooks/useErrorHandler"
import { DebounceSelect } from "../../components/DebounceSelect"
import {
  getServiceGroupsApiAdminAppointmentsV1ServiceGroupsGet,
  createServiceGroupApiAdminAppointmentsV1ServiceGroupsPost,
  updateServiceGroupApiAdminAppointmentsV1ServiceGroupsGroupIdPut,
  deleteServiceGroupApiAdminAppointmentsV1ServiceGroupsGroupIdDelete,
  getServicesApiAdminAppointmentsV1ServicesGet,
  createServiceApiAdminAppointmentsV1ServicesPost,
  updateServiceApiAdminAppointmentsV1ServicesServiceIdPut,
  deleteServiceApiAdminAppointmentsV1ServicesServiceIdDelete,
  getBranchesApiAdminAppointmentsV1BranchesGet,
  searchInventoryApiAdminAppointmentsV1InventorySearchGet,
  getCorporateCodesApiAdminAppointmentsV1CorporateCodesGet
} from "../../services/client"
import type {
  ServiceGroupDetails,
  ServiceGroupCreate,
  ServiceGroupUpdate,
  ServiceDetails,
  ServiceCreate,
  ServiceUpdate,
  AppointmentServiceGroupType,
  BranchItem,
  CorporateCodeDetails
} from "../../services/client"

const { Title } = Typography
const { Option } = Select
const { TextArea } = Input

// Using types from generated API client
type AppointmentServiceGroup = ServiceGroupDetails & {
  services: ServiceDetails[]
}


const serviceTypeLabels = {
  'no_detail': 'No Detail Required',
  'single': 'Single Selection',
  'multiple': 'Multiple Selection'
}

// Fetch inventory options for search
const fetchInventoryOptions = async (search: string): Promise<Array<{ label: string; value: string }>> => {
  if (!search || search.trim().length < 2) {
    return []
  }
  
  try {
    const response = await searchInventoryApiAdminAppointmentsV1InventorySearchGet({ 
      search: search.trim() 
    })
    
    return response.inventories
  } catch (error) {
    console.error('Error fetching inventory options:', error)
    return []
  }
}

export default function AppointmentServices() {
  const [groupModalVisible, setGroupModalVisible] = useState(false)
  const [serviceModalVisible, setServiceModalVisible] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ServiceGroupDetails | null>(null)
  const [editingService, setEditingService] = useState<ServiceDetails | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [corporateCodeFilter, setCorporateCodeFilter] = useState<string | undefined>(undefined)
  
  // State for form validation errors
  const [groupFormErrors, setGroupFormErrors] = useState<string[]>([])

  const [groupForm] = Form.useForm()
  const [serviceForm] = Form.useForm()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Error handlers for different operations
  const { handleError: handleMutationError } = useErrorHandler({
    showNotification: true,
    retryable: false
  })

  // Fetch service groups
  const { data: serviceGroupsData, isLoading: serviceGroupsLoading, error: serviceGroupsError } = useQuery({
    queryKey: ['service-groups'],
    queryFn: () => getServiceGroupsApiAdminAppointmentsV1ServiceGroupsGet()
  })

  // Fetch branches (including hidden ones)
  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ['appointment-branches'],
    queryFn: () => getBranchesApiAdminAppointmentsV1BranchesGet()
  })

  // Fetch corporate codes
  const { data: corporateCodesData, isLoading: corporateCodesLoading } = useQuery({
    queryKey: ['corporate-codes'],
    queryFn: () => getCorporateCodesApiAdminAppointmentsV1CorporateCodesGet()
  })

  // Fetch services for all groups
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      if (!serviceGroupsData) return []
      const allServices = await Promise.all(
        serviceGroupsData.map(group => 
          getServicesApiAdminAppointmentsV1ServicesGet({ groupId: group.id })
        )
      )
      return allServices.flat()
    },
    enabled: !!serviceGroupsData
  })

  // Combine service groups with their services and apply filters
  const serviceGroups: AppointmentServiceGroup[] = (serviceGroupsData || [])
    .filter(group => {
      if (corporateCodeFilter && group.corporate_code_id !== corporateCodeFilter) {
        return false
      }
      return true
    })
    .map(group => ({
      ...group,
      services: (servicesData || []).filter(service => service.group_id === group.id)
    }))

  const branches = branchesData?.branches || []
  const corporateCodes: CorporateCodeDetails[] = corporateCodesData || []
  const loading = serviceGroupsLoading || branchesLoading || servicesLoading || corporateCodesLoading

  // Service Group Mutations
  const createServiceGroupMutation = useMutation({
    mutationFn: (data: any) => createServiceGroupApiAdminAppointmentsV1ServiceGroupsPost(data),
    onSuccess: async (response, variables) => {
      // Create a default service for new service groups
      try {
        const defaultServiceData = {
          name: `${variables.requestBody.name} - Default Service`,
          prepayment_price: 0,
          display_price: 0,
          index: 0,
          min_booking_ahead_days: 2,
          group_id: response.id
        }
        
        await createServiceApiAdminAppointmentsV1ServicesPost({
          requestBody: defaultServiceData as ServiceCreate
        })
        
        message.success('Service group and default service created successfully. Please edit default service created.')
      } catch (error) {
        console.error('Failed to create default service:', error)
        message.warning('Service group created but failed to create default service')
      }
      
      queryClient.invalidateQueries({ queryKey: ['service-groups'] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setGroupModalVisible(false)
      setEditingGroup(null)
      groupForm.resetFields()
    },
    onError: (error: any) => {
      console.error('Service group creation error:', error)
      // Show error in modal instead of background
      if (error?.response?.data?.detail) {
        setGroupFormErrors([error.response.data.detail])
      } else if (error?.response?.data?.message) {
        setGroupFormErrors([error.response.data.message])
      } else {
        setGroupFormErrors(['Failed to create service group. Please check your input and try again.'])
      }
    }
  })

  const updateServiceGroupMutation = useMutation({
    mutationFn: (data: any) => updateServiceGroupApiAdminAppointmentsV1ServiceGroupsGroupIdPut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-groups'] })
      message.success('Service group updated successfully')
      setGroupModalVisible(false)
      setEditingGroup(null)
      groupForm.resetFields()
      setGroupFormErrors([])
    },
    onError: (error: any) => {
      console.error('Service group update error:', error)
      // Show error in modal instead of background
      if (error?.response?.data?.detail) {
        setGroupFormErrors([error.response.data.detail])
      } else if (error?.response?.data?.message) {
        setGroupFormErrors([error.response.data.message])
      } else {
        setGroupFormErrors(['Failed to update service group. Please check your input and try again.'])
      }
    }
  })

  const deleteServiceGroupMutation = useMutation({
    mutationFn: (data: any) => deleteServiceGroupApiAdminAppointmentsV1ServiceGroupsGroupIdDelete(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-groups'] })
      queryClient.invalidateQueries({ queryKey: ['services'] })
      message.success('Service group deleted successfully')
    },
    onError: (error: any) => {
      console.error('Service group deletion error:', error)
      // Show detailed error message if available
      if (error?.response?.data?.detail) {
        message.error(`Failed to delete service group: ${error.response.data.detail}`)
      } else {
        handleMutationError(error, 'service group deletion')
      }
    }
  })

  // Service Mutations
  const createServiceMutation = useMutation({
    mutationFn: (data: any) => createServiceApiAdminAppointmentsV1ServicesPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      message.success('Service created successfully')
      setServiceModalVisible(false)
      setEditingService(null)
      setSelectedGroupId(null)
      serviceForm.resetFields()
    },
    onError: (error: any) => {
      handleMutationError(error, 'service creation')
    }
  })

  const updateServiceMutation = useMutation({
    mutationFn: (data: any) => updateServiceApiAdminAppointmentsV1ServicesServiceIdPut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      message.success('Service updated successfully')
      setServiceModalVisible(false)
      setEditingService(null)
      setSelectedGroupId(null)
      serviceForm.resetFields()
    },
    onError: (error: any) => {
      handleMutationError(error, 'service update')
    }
  })

  const deleteServiceMutation = useMutation({
    mutationFn: (data: any) => deleteServiceApiAdminAppointmentsV1ServicesServiceIdDelete(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      message.success('Service deleted successfully')
    },
    onError: (error: any) => {
      handleMutationError(error, 'service deletion')
    }
  })


  const handleGroupSave = async (values: Record<string, unknown>) => {
    const groupData = {
      name: values.name as string,
      title: values.title as string || undefined,
      description: values.description as string || undefined,
      index: values.index as number,
      duration: values.duration as number,
      type: values.type as AppointmentServiceGroupType,
      restricted_branches: (values.restricted_branches as string[]) || undefined,
      // Explicitly set to undefined if empty string or null to remove corporate code
      corporate_code_id: (values.corporate_code_id as string) || undefined
    }
    
    if (editingGroup) {
      // Update existing group
      updateServiceGroupMutation.mutate({
        groupId: editingGroup.id,
        requestBody: groupData as ServiceGroupUpdate
      })
    } else {
      // Create new group with required default service
      createServiceGroupMutation.mutate({
        requestBody: groupData as ServiceGroupCreate
      })
    }
  }

  const handleServiceSave = async (values: Record<string, unknown>) => {
    const serviceData = {
      name: values.name as string,
      prepayment_price: values.prepayment_price as number || undefined,
      display_price: values.display_price as number || undefined,
      index: values.index as number,
      min_booking_ahead_days: values.min_booking_ahead_days as number || undefined,
      sgimed_inventory_id: values.sgimed_inventory_id as string || undefined,
      restricted_branches: (values.restricted_branches as string[]) || undefined,
      tests: (values.tests as Array<{ name: string; exclusion: string }>) || undefined,
      group_id: selectedGroupId || editingService?.group_id || ''
    }
    
    if (editingService) {
      // Update existing service
      updateServiceMutation.mutate({
        serviceId: editingService.id,
        requestBody: serviceData as ServiceUpdate
      })
    } else {
      // Create new service
      createServiceMutation.mutate({
        requestBody: serviceData as ServiceCreate
      })
    }
  }

  const handleDeleteGroup = (groupId: string) => {
    Modal.confirm({
      title: 'Delete Service Group',
      content: 'Are you sure you want to delete this service group? All associated services will also be deleted.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteServiceGroupMutation.mutate({ groupId })
      }
    })
  }



  const groupColumns: ColumnsType<AppointmentServiceGroup> = [
    {
      title: 'Name',
      dataIndex: 'name',
      width: 100,
      render: (name: string, record) => (
        <>
          {name}
          {record.title && <div className="text-gray-500 text-sm">{record.title}</div>}
          <div>
          {record.corporate_code_id && <Tag color="orange">{corporateCodes.find(code => code.id === record.corporate_code_id)?.code ?? 'Unknown'}</Tag>}
          </div>
        </>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 150,
      render: (type: string) => (
        <Tag color="blue">{serviceTypeLabels[type as keyof typeof serviceTypeLabels]}</Tag>
      )
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      width: 100,
      render: (duration: number) => `${duration} min`
    },
    {
      title: 'Services',
      key: 'services_count',
      width: 100,
      render: (_, record) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/appointments/services/${record.id}`)}
        >
          <Tag color="green">{record.services.length} services</Tag>
        </Button>
      )
    },
    {
      title: 'Order',
      dataIndex: 'index',
      width: 80,
      // sorter: (a, b) => a.index - b.index
    },
    {
      title: 'Restrictions',
      key: 'restrictions',
      width: 100,
      render: (_, record) => (
        (record.restricted_branches && record.restricted_branches.length > 0) ? (
          <Tag color="orange">{record.restricted_branches.length} branches</Tag>
        ) : (
          <Tag color="default">All branches</Tag>
        )
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/appointments/services/${record.id}`)}
            title="View Services"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingGroup(record)
              groupForm.setFieldsValue(record)
              setGroupModalVisible(true)
            }}
            title="Edit Group"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            loading={deleteServiceGroupMutation.isPending}
            onClick={() => handleDeleteGroup(record.id)}
            title="Delete Group"
          />
        </Space>
      )
    }
  ]

  return (
    <ErrorBoundary>
      <div className="p-6 w-full">
        <Breadcrumb className="mb-4" items={[
          {
            title: 'Appointments',
            onClick: () => navigate('/appointments')
          },
          {
            title: 'Service Groups'
          }
        ]} />
        
        <div className="flex justify-between items-center mb-6">
          <Title level={2}>Service Groups</Title>
          <Space>
            <Select
                placeholder="All corporate codes"
                allowClear
                value={corporateCodeFilter}
                onChange={(value) => setCorporateCodeFilter(value)}
                className="w-72"
                loading={corporateCodesLoading}
              >
                {corporateCodes.map((code: CorporateCodeDetails) => (
                  <Option key={code.id} value={code.id}>
                    {code.code} - {code.organization}
                  </Option>
                ))}
              </Select>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingGroup(null)
                groupForm.resetFields()
                setGroupModalVisible(true)
              }}
            >
              Add Service Group
            </Button>
          </Space>
        </div>

        {/* Error alerts for mutations */}
        {(createServiceGroupMutation.isError || updateServiceGroupMutation.isError || deleteServiceGroupMutation.isError) && (
          <ErrorAlert
            error={(createServiceGroupMutation.error || updateServiceGroupMutation.error || deleteServiceGroupMutation.error) as any}
            onDismiss={() => {
              createServiceGroupMutation.reset()
              updateServiceGroupMutation.reset()
              deleteServiceGroupMutation.reset()
            }}
            className="mb-4"
          />
        )}

        {(createServiceMutation.isError || updateServiceMutation.isError || deleteServiceMutation.isError) && (
          <ErrorAlert
            error={(createServiceMutation.error || updateServiceMutation.error || deleteServiceMutation.error) as any}
            onDismiss={() => {
              createServiceMutation.reset()
              updateServiceMutation.reset()
              deleteServiceMutation.reset()
            }}
            className="mb-4"
          />
        )}

        {serviceGroupsError ? (
          <ErrorAlert
            error={serviceGroupsError as any}
            onRetry={() => {
              queryClient.invalidateQueries({ queryKey: ['service-groups'] })
              queryClient.invalidateQueries({ queryKey: ['services'] })
              queryClient.invalidateQueries({ queryKey: ['branches'] })
            }}
            className="mb-4"
          />
        ) : loading ? (
          <TableSkeleton rows={10} />
        ) : serviceGroups.length === 0 ? (
          <Card>
            <div className="text-center p-8">
              <div className="text-lg font-medium mb-2">No service groups configured</div>
            </div>
          </Card>
        ) : (
            <Table
              columns={groupColumns}
              dataSource={serviceGroups}
              rowKey="id"
              loading={loading || createServiceGroupMutation.isPending || updateServiceGroupMutation.isPending || deleteServiceGroupMutation.isPending}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
              }}
            />
        )}

      {/* Service Group Modal */}
      <Modal
        title={editingGroup ? "Edit Service Group" : "Add Service Group"}
        open={groupModalVisible}
        onCancel={() => {
          setGroupModalVisible(false)
          setEditingGroup(null)
          groupForm.resetFields()
          setGroupFormErrors([])
        }}
        footer={null}
        width={600}
      >
        {groupFormErrors.length > 0 && (
          <Alert
            message="Validation Error"
            description={
              <ul className="mb-0 pl-4">
                {groupFormErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            className="mb-4"
            closable
            onClose={() => setGroupFormErrors([])}
          />
        )}
        <Form
          form={groupForm}
          onFinish={handleGroupSave}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Group Name"
            rules={[{ required: true, message: 'Please enter group name' }]}
          >
            <Input placeholder="e.g., Health Screening" />
          </Form.Item>

          <Form.Item
            name="title"
            label="Title"
            help="Optional display title for the service group"
          >
            <Input placeholder="e.g., Annual Health Check-up" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea placeholder="Brief description of the service group" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Service Type"
            rules={[{ required: true, message: 'Please select service type' }]}
          >
            <Select placeholder="Select service type">
              <Option value="no_detail">No Detail Required</Option>
              <Option value="single">Single Selection</Option>
              <Option value="multiple">Multiple Selection</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="duration"
            label="Duration (minutes)"
            rules={[{ required: true, message: 'Please enter duration' }]}
          >
            <InputNumber min={1} placeholder="30" />
          </Form.Item>

          <Form.Item
            name="index"
            label="Display Order"
            rules={[{ required: true, message: 'Please enter display order' }]}
          >
            <InputNumber min={1} placeholder="1" />
          </Form.Item>


          <Form.Item
            name="restricted_branches"
            label="Branch Restrictions"
          >
            <Select
              mode="multiple"
              placeholder="Select branches (leave empty for all branches)"
              options={branches.map((branch: BranchItem) => ({
                label: `${branch.name}${branch.hidden ? ' (Hidden)' : ''}`,
                value: branch.id
              }))}
            />
          </Form.Item>

          <Form.Item
            name="corporate_code_id"
            label="Corporate Code (Optional)"
          >
            <Select
              placeholder="Select a corporate code"
              allowClear
              showSearch
              filterOption={(input, option) =>
                String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              loading={corporateCodesLoading}
            >
              {corporateCodes.map((code: CorporateCodeDetails) => (
                <Option key={code.id} value={code.id}>
                  {code.code} - {code.organization}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button 
                onClick={() => {
                  setGroupModalVisible(false)
                  setEditingGroup(null)
                  groupForm.resetFields()
                }}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={createServiceGroupMutation.isPending || updateServiceGroupMutation.isPending}
              >
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Service Modal */}
      <Modal
        title={editingService ? "Edit Service" : "Add Service"}
        open={serviceModalVisible}
        onCancel={() => {
          setServiceModalVisible(false)
          setEditingService(null)
          setSelectedGroupId(null)
          serviceForm.resetFields()
        }}
        footer={null}
        width={700}
      >
        <Form
          form={serviceForm}
          onFinish={handleServiceSave}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Service Name"
            rules={[{ required: true, message: 'Please enter service name' }]}
          >
            <Input placeholder="e.g., Basic Health Screening" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="prepayment_price"
              label="Prepayment Price"
              help="Payment to be made on the app before booking"
            >
              <InputNumber
                min={0}
                step={0.01}
                placeholder="100.00"
                style={{ width: '100%' }}
                addonBefore="$"
              />
            </Form.Item>

            <Form.Item
              name="display_price"
              label="Display Price"
              help="Payment to be made at clinic after appointment"
            >
              <InputNumber
                min={0}
                step={0.01}
                placeholder="120.00"
                style={{ width: '100%' }}
                addonBefore="$"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="index"
              label="Display Order"
              rules={[{ required: true, message: 'Please enter display order' }]}
            >
              <InputNumber min={1} placeholder="1" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="min_booking_ahead_days"
              label="Min Booking Ahead (days)"
              rules={[{ required: true, message: 'Please enter minimum booking days' }]}
            >
              <InputNumber min={0} placeholder="2" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item
            name="sgimed_inventory_id"
            label="SGiMed Inventory ID"
            help="Type at least 2 characters to search for consultation items"
          >
            <DebounceSelect
              placeholder="Search and select consultation items..."
              fetchOptions={fetchInventoryOptions}
              debounceTimeout={500}
              style={{ width: '100%' }}
              allowClear
              showSearch
            />
          </Form.Item>

          <Form.Item
            name="restricted_branches"
            label="Branch Restrictions"
          >
            <Select
              mode="multiple"
              placeholder="Select branches (leave empty for all branches)"
              options={branches.map((branch: BranchItem) => ({
                label: `${branch.name}${branch.hidden ? ' (Hidden)' : ''}`,
                value: branch.id
              }))}
            />
          </Form.Item>

          <Form.List name="tests">
            {(fields, { add, remove }) => (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Test Requirements</span>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                    Add Test
                  </Button>
                </div>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="grid grid-cols-5 gap-2 mb-2">
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      className="col-span-2"
                    >
                      <Input placeholder="Test name" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'exclusion']}
                      className="col-span-2"
                    >
                      <Input placeholder="Exclusion/Note" />
                    </Form.Item>
                    <Button type="text" danger onClick={() => remove(name)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </>
            )}
          </Form.List>

          <Form.Item className="mb-0 mt-6">
            <Space className="w-full justify-end">
              <Button 
                onClick={() => {
                  setServiceModalVisible(false)
                  setEditingService(null)
                  setSelectedGroupId(null)
                  serviceForm.resetFields()
                }}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={createServiceMutation.isPending || updateServiceMutation.isPending}
              >
                {editingService ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </ErrorBoundary>
  )
}