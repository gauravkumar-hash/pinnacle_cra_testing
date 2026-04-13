import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button, Space, message, Typography, Card, Modal, Form, Input, InputNumber, Select, Tag, Table, Alert, Breadcrumb } from "antd"
import { ColumnsType } from "antd/es/table"
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ErrorBoundary } from "../../components/ErrorBoundary"
import { QueryStateHandler } from "../../components/QueryStateHandler"
import { ErrorAlert } from "../../components/ErrorHandling"
import { useErrorHandler } from "../../hooks/useErrorHandler"
import { DebounceSelect } from "../../components/DebounceSelect"
import {
  getServiceGroupApiAdminAppointmentsV1ServiceGroupsGroupIdGet,
  getServicesApiAdminAppointmentsV1ServicesGet,
  createServiceApiAdminAppointmentsV1ServicesPost,
  updateServiceApiAdminAppointmentsV1ServicesServiceIdPut,
  deleteServiceApiAdminAppointmentsV1ServicesServiceIdDelete,
  getBranchesApiAdminAppointmentsV1BranchesGet,
  searchInventoryApiAdminAppointmentsV1InventorySearchGet
} from "../../services/client"
import type {
  ServiceDetails,
  ServiceCreate,
  ServiceUpdate,
  BranchItem
} from "../../services/client"

const { Title, Text } = Typography

// Fetch inventory options for search
const fetchInventoryOptions = async (search: string): Promise<Array<{ label: string; value: string }>> => {
  if (!search || search.trim().length < 2) {
    console.log('Search term too short:', search)
    return []
  }

  try {
    const response = await searchInventoryApiAdminAppointmentsV1InventorySearchGet({ 
      search: search.trim() 
    })
    
    console.log('Inventory search response:', response)
    
    if (!response || !response.inventories || !Array.isArray(response.inventories)) {
      console.warn('Invalid response format:', response)
      return []
    }

    return response.inventories
  } catch (error) {
    console.error('Error fetching inventory options:', error)
    message.error('Failed to search inventory items')
    return []
  }
}

export default function ServiceDetails() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [serviceModalVisible, setServiceModalVisible] = useState(false)
  const [editingService, setEditingService] = useState<ServiceDetails | null>(null)
  
  const [serviceForm] = Form.useForm()
  const queryClient = useQueryClient()

  // Error handler for mutations
  const { handleError: handleMutationError } = useErrorHandler({
    showNotification: true,
    retryable: false
  })

  // State for form validation errors
  const [formErrors, setFormErrors] = useState<string[]>([])

  // Fetch service group details
  const serviceGroupQuery = useQuery({
    queryKey: ['service-group', groupId],
    queryFn: () => getServiceGroupApiAdminAppointmentsV1ServiceGroupsGroupIdGet({
      groupId: groupId!
    }),
    enabled: !!groupId
  })

  // Fetch services for this group
  const servicesQuery = useQuery({
    queryKey: ['services', groupId],
    queryFn: () => getServicesApiAdminAppointmentsV1ServicesGet({
      groupId: groupId!
    }),
    enabled: !!groupId
  })

  // Fetch branches (including hidden ones)
  const branchesQuery = useQuery({
    queryKey: ['appointment-branches'],
    queryFn: () => getBranchesApiAdminAppointmentsV1BranchesGet()
  })

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: (data: any) => createServiceApiAdminAppointmentsV1ServicesPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', groupId] })
      message.success('Service created successfully')
      setServiceModalVisible(false)
      setEditingService(null)
      serviceForm.resetFields()
      setFormErrors([])
    },
    onError: (error: any) => {
      // Show error in modal instead of background
      if (error?.response?.data?.detail) {
        setFormErrors([error.response.data.detail])
      } else {
        setFormErrors(['Failed to create service'])
      }
    }
  })

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: (data: any) => updateServiceApiAdminAppointmentsV1ServicesServiceIdPut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', groupId] })
      message.success('Service updated successfully')
      setServiceModalVisible(false)
      setEditingService(null)
      serviceForm.resetFields()
      setFormErrors([])
    },
    onError: (error: any) => {
      // Show error in modal instead of background
      if (error?.response?.data?.detail) {
        setFormErrors([error.response.data.detail])
      } else {
        setFormErrors(['Failed to update service'])
      }
    }
  })

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: (data: any) => deleteServiceApiAdminAppointmentsV1ServicesServiceIdDelete(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', groupId] })
      message.success('Service deleted successfully')
    },
    onError: (error: any) => {
      handleMutationError(error, 'service deletion')
    }
  })

  const handleServiceSave = async (values: any) => {
    const serviceData = {
      name: values.name,
      prepayment_price: values.prepayment_price,
      display_price: values.display_price,
      index: values.index,
      min_booking_ahead_days: values.min_booking_ahead_days || undefined,
      sgimed_inventory: values.sgimed_inventory || undefined,
      restricted_branches: values.restricted_branches || undefined,
      tests: values.tests?.map(({ name, exclusion }: { name: string, exclusion: string }) => ({ name, exclusion: exclusion ?? '' })) || [],
      group_id: groupId!
    }

    if (editingService) {
      updateServiceMutation.mutate({
        serviceId: editingService.id,
        requestBody: serviceData as ServiceUpdate
      })
    } else {
      createServiceMutation.mutate({
        requestBody: serviceData as ServiceCreate
      })
    }
  }

  const handleEditService = (service: ServiceDetails) => {
    setEditingService(service)
    serviceForm.setFieldsValue(service)
    setServiceModalVisible(true)
  }

  const handleDeleteService = (serviceId: string) => {
    // Check if this is the last service in the group
    if (services.length <= 1) {
      Modal.error({
        title: 'Cannot Delete Service',
        content: 'Each service group must have at least one service. You cannot delete the last remaining service.',
        okText: 'OK'
      })
      return
    }

    Modal.confirm({
      title: 'Delete Service',
      content: 'Are you sure you want to delete this service?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteServiceMutation.mutate({ serviceId })
      }
    })
  }

  const serviceGroup = serviceGroupQuery.data
  const services = servicesQuery.data || []
  const branches = branchesQuery.data?.branches || []
  const loading = serviceGroupQuery.isLoading || servicesQuery.isLoading || branchesQuery.isLoading

  // Table columns for services
  const serviceColumns: ColumnsType<ServiceDetails> = [
    {
      title: 'Order',
      dataIndex: 'index',
      width: 10
    },
    {
      title: 'Service Name',
      dataIndex: 'name',
      width: 200
    },
    {
      title: 'SGiMed Inventory / Prices',
      key: 'prices',
      width: 300,
      render: (_, service) => (
        <Space direction="vertical" size="small">
          {(service.prepayment_price ?? 0) > 0 && (
            <>
              {service.sgimed_inventory?.label}
              <Tag color="green">Prepayment: ${service.prepayment_price}, Display: ${service.display_price}</Tag>
            </>
          )}
          {(service.prepayment_price ?? 0) === 0 && (service.display_price ?? 0) > 0 && (
            <Tag color="blue">Display: ${service.display_price}</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Min Booking Days',
      dataIndex: 'min_booking_ahead_days',
      width: 90,
      render: (days) => `${days} days`
    },
    {
      title: 'Branch Restrictions',
      key: 'restrictions',
      width: 100,
      render: (_, service) => 
        service.restricted_branches && service.restricted_branches.length > 0 ? (
          <Tag color="orange">{service.restricted_branches.length} branches</Tag>
        ) : (
          <Tag color="default">All branches</Tag>
        )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, service) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditService(service)}
            title="Edit Service"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            loading={deleteServiceMutation.isPending}
            onClick={() => handleDeleteService(service.id)}
            title="Delete Service"
          />
        </Space>
      )
    }
  ]

  if (!groupId) {
    return (
      <div className="p-6 w-full">
        <Alert
          message="Invalid Service Group"
          description="No service group ID provided."
          type="error"
          showIcon
        />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="p-6 w-full">
        <Breadcrumb className="mb-4" items={[
          {
            title: 'Appointments',
            href: '#',
            onClick: () => navigate('/appointments')
          },
          {
            title: 'Service Groups',
            href: '#',
            onClick: () => navigate('/appointments/services')
          },
          {
            title: serviceGroup?.name || 'Loading...'
          }
        ]} />
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <Title level={2} className="mb-0">
              {serviceGroup?.name || 'Loading...'}
            </Title>
            {serviceGroup && (
              <Text type="secondary">{serviceGroup.description}</Text>
            )}
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingService(null)
              serviceForm.resetFields()
              setServiceModalVisible(true)
            }}
            disabled={!serviceGroup}
          >
            Add Service
          </Button>
        </div>

        {/* Error alerts for mutations */}
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

        <QueryStateHandler
          query={servicesQuery as any}
          onRetry={() => servicesQuery.refetch()}
          loadingSkeleton={<Card loading />}
          isEmpty={(data: ServiceDetails[]) => !data || data.length === 0}
          emptyTitle="No services found"
          emptyDescription="Create your first service for this service group."
        >
          {(data: ServiceDetails[]) => (
            <Table
              columns={serviceColumns}
              dataSource={data}
              rowKey="id"
              loading={loading || createServiceMutation.isPending || updateServiceMutation.isPending}
              pagination={{
                showSizeChanger: true,
                pageSize: 50,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
              }}
            />
          )}
        </QueryStateHandler>

        {/* Service Modal */}
        <Modal
          title={editingService ? "Edit Service" : "Add Service"}
          open={serviceModalVisible}
          onCancel={() => {
            setServiceModalVisible(false)
            setEditingService(null)
            serviceForm.resetFields()
            setFormErrors([])
          }}
          footer={null}
          width={700}
        >
          {formErrors.length > 0 && (
            <Alert
              message="Validation Errors"
              description={
                <ul className="mb-0 pl-4">
                  {formErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              }
              type="error"
              showIcon
              className="mb-4"
              closable
              onClose={() => setFormErrors([])}
            />
          )}
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
                <InputNumber min={0} placeholder="1" style={{ width: '100%' }} />
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
              name="sgimed_inventory"
              label="SGiMed Inventory ID"
              rules={[
                {
                  validator: (_, value) => {
                    // Only validate if prepayment_price is set
                    const prepaymentPrice = serviceForm.getFieldValue('prepayment_price')
                    if (prepaymentPrice && prepaymentPrice > 0 && !value) {
                      return Promise.reject(new Error('SGiMed Inventory is required when prepayment price is set'))
                    }
                    return Promise.resolve()
                  }
                }
              ]}
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
                        rules={[{ required: true, message: 'Test name is required' }]}
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