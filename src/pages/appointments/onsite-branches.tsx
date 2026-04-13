import { useState } from "react"
import { Table, Button, Space, message, Typography, Modal, Form, Input, DatePicker, Select, Tag, Upload, Breadcrumb, Image } from "antd"
import { ColumnsType } from "antd/es/table"
import { PlusOutlined, DeleteOutlined, CalendarOutlined, EditOutlined, InboxOutlined, ClockCircleOutlined } from "@ant-design/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import { ErrorBoundary } from "../../components/ErrorBoundary"
import { QueryStateHandler } from "../../components/QueryStateHandler"
import { TableSkeleton } from "../../components/LoadingStates"
import { ErrorAlert } from "../../components/ErrorHandling"
import { useErrorHandler } from "../../hooks/useErrorHandler"
import {
  getOnsiteBranchesApiAdminAppointmentsV1OnsiteBranchesGet,
  createOnsiteBranchApiAdminAppointmentsV1OnsiteBranchPost,
  updateOnsiteBranchApiAdminAppointmentsV1OnsiteBranchesOnsiteIdPut,
  deleteOnsiteBranchApiAdminAppointmentsV1OnsiteBranchesOnsiteIdDelete,
  getCorporateCodesApiAdminAppointmentsV1CorporateCodesGet
} from "../../services/client"
import type {
  OnsiteBranchDetails,
  CorporateCodeDetails
} from "../../services/client"
import { apiUrl } from "@/apis"
import { useAuth } from "@/context/AuthProvider"

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select
const { Dragger } = Upload

export default function OnsiteBranches() {
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<OnsiteBranchDetails | null>(null)
  const [filters] = useState<{
    branchId?: string
    corporateCodeId?: string
  }>({})
  const { session } = useAuth()
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Error handler for mutations
  const { handleError: handleMutationError } = useErrorHandler({
    showNotification: true,
    retryable: false
  })

  // Fetch onsite branches
  const onsiteBranchesQuery = useQuery({
    queryKey: ['onsite-branches', filters],
    queryFn: () => getOnsiteBranchesApiAdminAppointmentsV1OnsiteBranchesGet(filters),
    retry: 3
  })

  // Fetch corporate codes for filters and form
  const corporateCodesQuery = useQuery({
    queryKey: ['corporate-codes'],
    queryFn: () => getCorporateCodesApiAdminAppointmentsV1CorporateCodesGet()
  })

  // Create onsite branch mutation
  const createMutation = useMutation({
    mutationFn: createOnsiteBranchApiAdminAppointmentsV1OnsiteBranchPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onsite-branches'] })
      message.success('Onsite branch created successfully')
      setCreateModalVisible(false)
      form.resetFields()
    },
    onError: (error: any) => {
      handleMutationError(error, 'onsite branch creation')
    }
  })

  // Update onsite branch mutation
  const updateMutation = useMutation({
    mutationFn: updateOnsiteBranchApiAdminAppointmentsV1OnsiteBranchesOnsiteIdPut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onsite-branches'] })
      message.success('Onsite branch updated successfully')
      setEditModalVisible(false)
      setEditingRecord(null)
      editForm.resetFields()
    },
    onError: (error: any) => {
      handleMutationError(error, 'onsite branch update')
    }
  })

  // Delete onsite branch mutation
  const deleteMutation = useMutation({
    mutationFn: (data: { onsiteId: number }) => 
      deleteOnsiteBranchApiAdminAppointmentsV1OnsiteBranchesOnsiteIdDelete(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onsite-branches'] })
      message.success('Onsite branch deleted successfully')
    },
    onError: (error: any) => {
      handleMutationError(error, 'onsite branch deletion')
    }
  })

  const handleCreateSave = async (values: any) => {
    const formData = new FormData()
    
    // Branch data
    formData.append('branch_name', values.branch_name)
    formData.append('address', values.address)
    if (values.phone) formData.append('phone', values.phone)
    if (values.whatsapp) formData.append('whatsapp', values.whatsapp)
    if (values.email) formData.append('email', values.email)
    if (values.url) formData.append('url', values.url)
    formData.append('category', values.category)
    
    // Image upload - only append if a new file was uploaded
    if (values.image?.file?.originFileObj) {
      formData.append('image', values.image.file.originFileObj)
    } else if (values.image?.fileList?.length > 0) {
      // Check if there's a new file in the fileList
      const newFile = values.image.fileList.find((file: any) => file.originFileObj)
      if (newFile?.originFileObj) {
        formData.append('image', newFile.originFileObj)
      }
    }
    
    // Onsite branch data
    formData.append('corporate_code_id', values.corporate_code_id)
    if (values.header) formData.append('header', values.header)
    formData.append('start_date', values.date_range[0].toISOString())
    formData.append('end_date', values.date_range[1].toISOString())

    try {
      const response = await fetch(`${apiUrl}/appointments/v1/onsite-branch`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['onsite-branches'] })
        message.success('Onsite branch created successfully')
        setCreateModalVisible(false)
        form.resetFields()
      } else {
        const error = await response.json()
        message.error(error.message || 'Failed to create onsite branch')
      }
    } catch (error) {
      message.error('Failed to create onsite branch')
    }
  }

  const handleDelete = (record: OnsiteBranchDetails) => {
    Modal.confirm({
      title: 'Delete Onsite Branch',
      content: `Are you sure you want to delete onsite branch "${record.branch_name}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteMutation.mutate({ onsiteId: Number(record.id) })
      }
    })
  }

  const handleEditBranch = (record: OnsiteBranchDetails) => {
    setEditingRecord(record)
    
    // Prepare initial values
    const initialValues = {
      // Branch data
      branch_name: record.branch_name,
      address: (record as any).address || '',
      phone: (record as any).phone || '',
      whatsapp: (record as any).whatsapp || '',
      email: (record as any).email || '',
      url: (record as any).url || '',
      category: (record as any).category || 'Central',
      
      // Onsite branch data
      corporate_code_id: record.corporate_code_id,
      header: record.header,
      date_range: [dayjs(record.start_date), dayjs(record.end_date)]
    }
    
    // Add existing image if present
    if ((record as any).image_url) {
      (initialValues as any).image = {
        fileList: [{
          uid: '-1',
          name: 'Current Image',
          status: 'done',
          url: (record as any).image_url,
          thumbUrl: (record as any).image_url
        }]
      }
    }
    
    editForm.setFieldsValue(initialValues)
    setEditModalVisible(true)
  }

  const handleEditOperatingHours = (record: OnsiteBranchDetails) => {
    navigate(`/appointments/onsite-branches/${record.id}`)
  }

  const handleEditSave = async (values: any) => {
    if (!editingRecord) return

    const formData = new FormData()
    
    // Branch data
    formData.append('branch_name', values.branch_name)
    formData.append('address', values.address)
    if (values.phone) formData.append('phone', values.phone)
    if (values.whatsapp) formData.append('whatsapp', values.whatsapp)
    if (values.email) formData.append('email', values.email)
    if (values.url) formData.append('url', values.url)
    formData.append('category', values.category)
    
    // Image upload - only append if a new file was uploaded
    if (values.image?.file?.originFileObj) {
      formData.append('image', values.image.file.originFileObj)
    } else if (values.image?.fileList?.length > 0) {
      // Check if there's a new file in the fileList
      const newFile = values.image.fileList.find((file: any) => file.originFileObj)
      if (newFile?.originFileObj) {
        formData.append('image', newFile.originFileObj)
      }
    }
    
    // Onsite branch data
    formData.append('corporate_code_id', values.corporate_code_id)
    if (values.header) formData.append('header', values.header)
    formData.append('start_date', values.date_range[0].toISOString())
    formData.append('end_date', values.date_range[1].toISOString())

    try {
      const response = await fetch(`${apiUrl}/appointments/v1/onsite-branches/${editingRecord.id}`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['onsite-branches'] })
        message.success('Onsite branch updated successfully')
        setEditModalVisible(false)
        setEditingRecord(null)
        editForm.resetFields()
      } else {
        const error = await response.json()
        message.error(error.message || 'Failed to update onsite branch')
      }
    } catch (error) {
      message.error('Failed to update onsite branch')
    }
  }

  const corporateCodes: CorporateCodeDetails[] = corporateCodesQuery.data || []

  const columns: ColumnsType<OnsiteBranchDetails> = [
    {
      title: 'Branch',
      dataIndex: 'branch_name',
      width: 200,
      render: (name: string, record) => (
        <div className="flex items-center gap-3">
          {(record as any).image_url && (
            <Image 
              src={(record as any).image_url} 
              alt={name}
              width={40}
              height={40}
              className="rounded object-cover"
            />
          )}
          <div>
            <div className="font-medium">{name}</div>
            <Tag color="orange">{record.corporate_code}</Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Header',
      dataIndex: 'header',
      width: 150,
      ellipsis: true,
      render: (header: string) => header || <Text type="secondary">No header</Text>
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 200,
      render: (_, record) => {
        const now = dayjs()
        const start = dayjs(record.start_date)
        const end = dayjs(record.end_date)
        
        

      
        return (
          <div>
            <div className="text-sm">
              <CalendarOutlined className="mr-1" />
              {dayjs(record.start_date).format('DD MMM YYYY')} - {dayjs(record.end_date).format('DD MMM YYYY')}
            </div>
            <div className="text-xs text-gray-500">
              {now.isBefore(start) && <Tag color="blue">Upcoming</Tag>}
              {now.isAfter(end) && <Tag color="default">Ended</Tag>}
              {now.isBefore(end) && now.isAfter(start) && <Tag color="green">Active</Tag>}
            </div>
          </div>
        )
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditBranch(record)}
            title="Edit Onsite Branch"
          />
          <Button
            type="text"
            icon={<ClockCircleOutlined />}
            onClick={() => handleEditOperatingHours(record)}
            title="Edit Operating Hours"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDelete(record)}
            title="Delete Onsite Branch"
            loading={deleteMutation.isPending}
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
            title: 'Onsite Branches'
          }
        ]} />
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <Title level={2} className="mb-2">
              Onsite Branches
            </Title>
            <Text type="secondary">
              Manage temporary onsite healthcare service locations
            </Text>
          </div>
          <Button
            type="primary"
            onClick={() => {
              form.resetFields()
              setCreateModalVisible(true)
            }}
            icon={<PlusOutlined />}
          >
            Create Onsite Branch
          </Button>
        </div>

        {/* Error alerts for mutations */}
        {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
          <ErrorAlert
            error={(createMutation.error || updateMutation.error || deleteMutation.error) as any}
            onDismiss={() => {
              createMutation.reset()
              updateMutation.reset()
              deleteMutation.reset()
            }}
            className="mb-4"
          />
        )}

        <QueryStateHandler
          query={onsiteBranchesQuery as any}
          onRetry={() => onsiteBranchesQuery.refetch()}
          loadingSkeleton={<TableSkeleton rows={10} />}
          isEmpty={(data: OnsiteBranchDetails[]) => !data || data.length === 0}
          emptyTitle="No onsite branches found"
          emptyDescription="Create your first onsite branch to manage temporary service locations."
        >
          {(data: OnsiteBranchDetails[]) => (
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              loading={createMutation.isPending || updateMutation.isPending}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
              }}
            />
          )}
        </QueryStateHandler>

        {/* Create Modal */}
        <Modal
          title="Create Onsite Branch"
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false)
            form.resetFields()
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            onFinish={handleCreateSave}
            layout="vertical"
          >
            {/* Branch Information */}
            <div className="border-b pb-4 mb-4">
              <h3 className="text-lg font-medium mb-4">Branch Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="branch_name"
                  label="Branch Name"
                  rules={[{ required: true, message: 'Please enter branch name' }]}
                >
                  <Input placeholder="e.g., Downtown Medical Center" />
                </Form.Item>

                <Form.Item
                  name="category"
                  label="Category"
                  rules={[{ required: true, message: 'Please select a category' }]}
                  initialValue="Central"
                >
                  <Select placeholder="Select category">
                    <Option value="North">North</Option>
                    <Option value="South">South</Option>
                    <Option value="East">East</Option>
                    <Option value="West">West</Option>
                    <Option value="Central">Central</Option>
                  </Select>
                </Form.Item>
              </div>

              <Form.Item
                name="address"
                label="Address"
                rules={[{ required: true, message: 'Please enter branch address' }]}
              >
                <Input.TextArea 
                  rows={2} 
                  placeholder="e.g., 123 Main Street, Singapore 123456"
                />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="phone"
                  label="Phone (Optional)"
                >
                  <Input placeholder="e.g., +65 6123 4567" />
                </Form.Item>

                <Form.Item
                  name="whatsapp"
                  label="WhatsApp (Optional)"
                >
                  <Input placeholder="e.g., +65 9123 4567" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="email"
                  label="Email (Optional)"
                  rules={[
                    { type: 'email', message: 'Please enter a valid email address' }
                  ]}
                >
                  <Input placeholder="e.g., branch@clinic.com" />
                </Form.Item>

                <Form.Item
                  name="url"
                  label="Google Maps URL (Optional)"
                  rules={[
                    { type: 'url', message: 'Please enter a valid URL' }
                  ]}
                >
                  <Input placeholder="e.g., https://maps.app.goo.gl/..." />
                </Form.Item>
              </div>

              <Form.Item
                name="image"
                label="Branch Image (Optional)"
                help="Upload an image for the branch. Supports JPG, PNG, and other image formats."
              >
                <Dragger
                  name="image"
                  listType="picture"
                  maxCount={1}
                  accept="image/*"
                  beforeUpload={() => false}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag image to this area to upload</p>
                  <p className="ant-upload-hint">Support for a single image upload. JPG, PNG, and other image formats are supported.</p>
                </Dragger>
              </Form.Item>
            </div>

            {/* Onsite Branch Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Onsite Branch Details</h3>
              
              <Form.Item
                name="corporate_code_id"
                label="Corporate Code"
                rules={[{ required: true, message: 'Please select a corporate code' }]}
              >
                <Select
                  placeholder="Select a corporate code"
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  loading={corporateCodesQuery.isLoading}
                >
                  {corporateCodes.map((code: CorporateCodeDetails) => (
                    <Option key={code.id} value={code.id}>
                      {code.code} - {code.organization}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="header"
                label="Header (Optional)"
              >
                <Input placeholder="Display title for the onsite branch" />
              </Form.Item>

              <Form.Item
                name="date_range"
                label="Service Period"
                rules={[{ required: true, message: 'Please select start and end dates' }]}
              >
                <RangePicker
                  style={{ width: '100%' }}
                  placeholder={['Start Date', 'End Date']}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </div>

            <Form.Item className="mb-0">
              <Space className="w-full justify-end">
                <Button
                  onClick={() => {
                    setCreateModalVisible(false)
                    form.resetFields()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending}
                >
                  Create
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          title="Edit Onsite Branch"
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false)
            setEditingRecord(null)
            editForm.resetFields()
          }}
          footer={null}
          width={600}
        >
          <Form
            form={editForm}
            onFinish={handleEditSave}
            layout="vertical"
          >
            {/* Branch Information */}
            <div className="border-b pb-4 mb-4">
              <h3 className="text-lg font-medium mb-4">Branch Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="branch_name"
                  label="Branch Name"
                  rules={[{ required: true, message: 'Please enter branch name' }]}
                >
                  <Input placeholder="e.g., Downtown Medical Center" />
                </Form.Item>

                <Form.Item
                  name="category"
                  label="Category"
                  rules={[{ required: true, message: 'Please select a category' }]}
                >
                  <Select placeholder="Select category">
                    <Option value="North">North</Option>
                    <Option value="South">South</Option>
                    <Option value="East">East</Option>
                    <Option value="West">West</Option>
                    <Option value="Central">Central</Option>
                  </Select>
                </Form.Item>
              </div>

              <Form.Item
                name="address"
                label="Address"
                rules={[{ required: true, message: 'Please enter branch address' }]}
              >
                <Input.TextArea 
                  rows={2} 
                  placeholder="e.g., 123 Main Street, Singapore 123456"
                />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="phone"
                  label="Phone (Optional)"
                >
                  <Input placeholder="e.g., +65 6123 4567" />
                </Form.Item>

                <Form.Item
                  name="whatsapp"
                  label="WhatsApp (Optional)"
                >
                  <Input placeholder="e.g., +65 9123 4567" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="email"
                  label="Email (Optional)"
                  rules={[
                    { type: 'email', message: 'Please enter a valid email address' }
                  ]}
                >
                  <Input placeholder="e.g., branch@clinic.com" />
                </Form.Item>

                <Form.Item
                  name="url"
                  label="Google Maps URL (Optional)"
                  rules={[
                    { type: 'url', message: 'Please enter a valid URL' }
                  ]}
                >
                  <Input placeholder="e.g., https://maps.app.goo.gl/..." />
                </Form.Item>
              </div>

              <Form.Item
                name="image"
                label="Branch Image (Optional)"
                help="Upload an image for the branch. Supports JPG, PNG, and other image formats."
              >
                <Dragger
                  name="image"
                  listType="picture"
                  maxCount={1}
                  accept="image/*"
                  beforeUpload={() => false}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag image to this area to upload</p>
                  <p className="ant-upload-hint">Support for a single image upload. JPG, PNG, and other image formats are supported.</p>
                </Dragger>
              </Form.Item>
            </div>

            {/* Onsite Branch Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Onsite Branch Details</h3>
              
              <Form.Item
                name="corporate_code_id"
                label="Corporate Code"
                rules={[{ required: true, message: 'Please select a corporate code' }]}
              >
                <Select
                  placeholder="Select a corporate code"
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  loading={corporateCodesQuery.isLoading}
                >
                  {corporateCodes.map((code: CorporateCodeDetails) => (
                    <Option key={code.id} value={code.id}>
                      {code.code} - {code.organization}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="header"
                label="Header (Optional)"
              >
                <Input placeholder="Display title for the onsite branch" />
              </Form.Item>

              <Form.Item
                name="date_range"
                label="Service Period"
                rules={[{ required: true, message: 'Please select start and end dates' }]}
              >
                <RangePicker
                  style={{ width: '100%' }}
                  placeholder={['Start Date', 'End Date']}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </div>

            <Form.Item className="mb-0">
              <Space className="w-full justify-end">
                <Button
                  onClick={() => {
                    setEditModalVisible(false)
                    setEditingRecord(null)
                    editForm.resetFields()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateMutation.isPending}
                >
                  Update
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

      </div>
    </ErrorBoundary>
  )
}