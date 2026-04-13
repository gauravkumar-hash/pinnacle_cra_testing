import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { message, Modal, Form, Input, Checkbox, Button, Table, Space, Tag, DatePicker, Typography, Card, Breadcrumb } from "antd"
import { DeleteOutlined, EditOutlined, PlusOutlined, DownloadOutlined, FileTextOutlined } from "@ant-design/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ErrorBoundary } from "../../components/ErrorBoundary"
import { ErrorAlert } from "../../components/ErrorHandling"
import { CorporateSurveyEditor } from "../../components/CorporateSurveyEditor"
import { useErrorHandler } from "../../hooks/useErrorHandler"
import { useDownload } from "../../hooks/useDownload"
import dayjs from "dayjs"
import {
  getCorporateCodesApiAdminAppointmentsV1CorporateCodesGet,
  createCorporateCodeApiAdminAppointmentsV1CorporateCodesPost,
  updateCorporateCodeApiAdminAppointmentsV1CorporateCodesCodeIdPut,
  deleteCorporateCodeApiAdminAppointmentsV1CorporateCodesCodeIdDelete
} from "../../services/client"
import type {
  CorporateCodeDetails,
  CorporateCodeCreate,
  CorporateCodeUpdate
} from "../../services/client"

const { Title } = Typography
const { RangePicker } = DatePicker

// Using types from generated API client
type AppointmentCorporateCode = CorporateCodeDetails


export default function AppointmentCorporateCodes() {
  const navigate = useNavigate()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AppointmentCorporateCode | null>(null)
  const [exportingCodeId, setExportingCodeId] = useState<string | null>(null)
  const [surveyEditorOpen, setSurveyEditorOpen] = useState(false)
  const [surveyEditorRecord, setSurveyEditorRecord] = useState<AppointmentCorporateCode | null>(null)

  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  
  // CSV Export hook
  const exportSurveyMutation = useDownload(
    (params: { codeId: string }) => `/api/admin/appointments/v1/corporate-codes/${params.codeId}/export-survey-csv`,
    'corporate_survey_export.csv'
  )

  // Error handler for mutations
  const { handleError: handleMutationError } = useErrorHandler({
    showNotification: true,
    retryable: false
  })

  // Fetch corporate codes
  const { data: corporateCodesData, isLoading: corporateCodesLoading, error: corporateCodesError } = useQuery({
    queryKey: ['corporate-codes'],
    queryFn: () => getCorporateCodesApiAdminAppointmentsV1CorporateCodesGet()
  })

  const corporateCodes = corporateCodesData || []
  const loading = corporateCodesLoading

  // Corporate Code Mutations
  const createCorporateCodeMutation = useMutation({
    mutationFn: createCorporateCodeApiAdminAppointmentsV1CorporateCodesPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-codes'] })
      message.success('Corporate code created successfully')
      setModalVisible(false)
      setEditingRecord(null)
      form.resetFields()
    },
    onError: (error: any) => {
      handleMutationError(error, 'corporate code creation')
    }
  })

  const updateCorporateCodeMutation = useMutation({
    mutationFn: updateCorporateCodeApiAdminAppointmentsV1CorporateCodesCodeIdPut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-codes'] })
      message.success('Corporate code updated successfully')
      setModalVisible(false)
      setEditingRecord(null)
      form.resetFields()
    },
    onError: (error: any) => {
      handleMutationError(error, 'corporate code update')
    }
  })

  const deleteCorporateCodeMutation = useMutation({
    mutationFn: deleteCorporateCodeApiAdminAppointmentsV1CorporateCodesCodeIdDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate-codes'] })
      message.success('Corporate code deleted successfully')
    },
    onError: (error: any) => {
      handleMutationError(error, 'corporate code deletion')
    }
  })


  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: AppointmentCorporateCode) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      validity_period: record.valid_from && record.valid_to ? [
        dayjs(record.valid_from),
        dayjs(record.valid_to)
      ] : null,
      patient_survey: record.patient_survey || {},
      only_primary_user: record.only_primary_user || false,
      service_group_ids: record.service_groups?.map(sg => (sg as any).id) || [],
      onsite_branches: record.onsite_branches?.map(branch => ({
        ...branch,
        date_range: [dayjs((branch as any).start_date), dayjs((branch as any).end_date)]
      })) || []
    })
    setModalVisible(true)
  }

  const handleDelete = (codeId: string) => {
    Modal.confirm({
      title: 'Delete Corporate Code',
      content: 'Are you sure you want to delete this corporate code? This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteCorporateCodeMutation.mutate({ codeId })
      }
    })
  }

  const handleExportSurvey = (codeId: string) => {
    setExportingCodeId(codeId)
    exportSurveyMutation.mutate(
      { codeId },
      {
        onSettled: () => {
          setExportingCodeId(null)
        }
      }
    )
  }

  const handleEditSurvey = (record: AppointmentCorporateCode) => {
    setSurveyEditorRecord(record)
    setSurveyEditorOpen(true)
  }

  const handleSaveSurvey = (surveyData: Record<string, any>) => {
    if (!surveyEditorRecord) return

    updateCorporateCodeMutation.mutate({
      codeId: surveyEditorRecord.id,
      requestBody: {
        corporate_survey: surveyData
      } as CorporateCodeUpdate
    }, {
      onSuccess: () => {
        message.success('Corporate survey updated successfully')
        setSurveyEditorOpen(false)
        setSurveyEditorRecord(null)
      }
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // Only send fields that are editable in the form
      // Note: corporate_survey is not included as there's no UI to edit it
      const requestBody = {
        code: values.code,
        organization: values.organization,
        patient_survey: values.patient_survey,
        only_primary_user: values.only_primary_user || false,
        valid_from: values.validity_period?.[0]?.toISOString(),
        valid_to: values.validity_period?.[1]?.toISOString(),
        is_active: values.is_active ?? true,
        service_group_ids: values.service_group_ids || [],
        onsite_branches: values.onsite_branches?.map((branch: any) => ({
          branch_id: branch.branch_id,
          header: branch.header,
          start_date: branch.date_range?.[0]?.toISOString(),
          end_date: branch.date_range?.[1]?.toISOString()
        })) || []
      }

      if (editingRecord) {
        updateCorporateCodeMutation.mutate({
          codeId: editingRecord.id,
          requestBody: requestBody as CorporateCodeUpdate
        })
      } else {
        createCorporateCodeMutation.mutate({
          requestBody: requestBody as CorporateCodeCreate
        })
      }
    } catch (error) {
      message.error('Validation failed. Please check all required fields.')
    }
  }

  const columns = [
    {
      title: 'Organization',
      dataIndex: 'code',
      width: 150,
      render: (code: string, record: AppointmentCorporateCode) => (
        <>
          {record.organization}
          <Tag color="blue" className="font-mono">{code}</Tag>
        </>
      )
    },
    {
      title: 'Validity Period',
      key: 'validity',
      width: 200,
      render: (_: unknown, record: AppointmentCorporateCode) => {
        if (!record.valid_from || !record.valid_to) {
          return <Tag color="default">No expiry</Tag>
        }
        
        const now = dayjs()
        const validFrom = dayjs(record.valid_from)
        const validTo = dayjs(record.valid_to)
        
        let status = { color: 'default', text: 'No expiry' }
        
        if (now.isBefore(validFrom)) {
          status = { color: 'blue', text: 'Upcoming' }
        } else if (now.isAfter(validTo)) {
          status = { color: 'red', text: 'Expired' }
        } else if (now.isAfter(validFrom) && now.isBefore(validTo)) {
          status = { color: 'green', text: 'Active' }
        }
        
        return (
          <div>
            <div className="text-sm">
              {validFrom.format('DD MMM YYYY')} - {validTo.format('DD MMM YYYY')}
            </div>
            <Tag color={status.color}>
              {status.text}
            </Tag>
          </div>
        )
      }
    },
    {
      title: 'Service Groups',
      key: 'service_groups',
      width: 250,
      render: (_: any, record: AppointmentCorporateCode) => {
        const groupNames = record.service_groups?.map(sg => (sg as any).name) || []
        
        return (
          <Space direction="vertical" size="small">
            {groupNames.map((name, index) => (
              <Tag key={index} color="purple">{name}</Tag>
            ))}
            {groupNames.length === 0 && <span className="text-gray-400">No services</span>}
          </Space>
        )
      }
    },
    {
      title: 'Onsite Branches',
      key: 'onsite_branches',
      width: 200,
      render: (_: any, record: AppointmentCorporateCode) => {
        const onsiteBranches = record.onsite_branches || []
        return (
          <Space direction="vertical" size="small">
            {onsiteBranches.length > 0 ? (
              onsiteBranches.map((branch, index) => {
                return (
                  <Tag key={index} color="orange">
                    {branch.branch_name}
                  </Tag>
                )
              })
            ) : (
              <Tag color="default">Default Clinics</Tag>
            )}
          </Space>
        )
      }
    },
    {
      title: 'Patient Survey',
      key: 'patient_survey',
      width: 250,
      render: (_: any, record: AppointmentCorporateCode) => {
        const patientOptions = (record.patient_survey?.patient as string[]) || []
        
        return (
          <Space direction="vertical" size="small">
            {patientOptions.length > 0 ? (
              patientOptions.map((option: string, index: number) => (
                <Tag key={index} color="cyan" className="text-xs">
                  {option.length > 30 ? `${option.substring(0, 30)}...` : option}
                </Tag>
              ))
            ) : (
              <Tag color="default">No survey</Tag>
            )}
          </Space>
        )
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_: any, record: AppointmentCorporateCode) => (
        <Space>
          <Tag color={record.is_active ? 'green' : 'red'}>
            {record.is_active ? 'Active' : 'Inactive'}
          </Tag>
          {record.only_primary_user && (
            <Tag color="purple">Primary Only</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: AppointmentCorporateCode) => (
        <Space>
          <Button
            type="text"
            icon={<FileTextOutlined />}
            onClick={() => handleEditSurvey(record)}
            title="Edit Corporate Survey"
          />
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => handleExportSurvey(record.id)}
            loading={exportingCodeId === record.id}
            title="Export Survey Results"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Edit Corporate Code"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            title="Delete Corporate Code"
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
            title: 'Corporate Codes'
          }
        ]} />
        
        <div className="flex justify-between items-center mb-6">
          <Title level={2}>Appointment Corporate Codes</Title>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add Corporate Code
            </Button>
          </Space>
        </div>

        {/* Error alerts for mutations */}
        {(createCorporateCodeMutation.isError || updateCorporateCodeMutation.isError || deleteCorporateCodeMutation.isError) && (
          <ErrorAlert
            error={(createCorporateCodeMutation.error || updateCorporateCodeMutation.error || deleteCorporateCodeMutation.error) as any}
            onDismiss={() => {
              createCorporateCodeMutation.reset()
              updateCorporateCodeMutation.reset()
              deleteCorporateCodeMutation.reset()
            }}
            className="mb-4"
          />
        )}

        {corporateCodesError ? (
          <ErrorAlert
            error={corporateCodesError as any}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['corporate-codes'] })}
            className="mb-4"
          />
        ) : loading ? (
          <Card>
            <div className="text-center p-8">Loading corporate codes...</div>
          </Card>
        ) : corporateCodes.length === 0 ? (
          <Card>
            <div className="text-center p-8">
              <div className="text-lg font-medium mb-2">No corporate codes configured</div>
              <div className="text-gray-500 mb-4">Corporate codes allow organizations to book appointments with special terms.</div>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Add Corporate Code
              </Button>
            </div>
          </Card>
        ) : (
          <Table
            columns={columns}
            dataSource={corporateCodes}
            rowKey="id"
            loading={loading || createCorporateCodeMutation.isPending || updateCorporateCodeMutation.isPending || deleteCorporateCodeMutation.isPending}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
            }}
          />
        )}

      {/* Corporate Code Modal */}
      <Modal
        title={editingRecord ? "Edit Corporate Code" : "Add Corporate Code"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingRecord(null)
        }}
        confirmLoading={createCorporateCodeMutation.isPending || updateCorporateCodeMutation.isPending}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_active: true,
            only_primary_user: false,
            patient_survey: { patient: [] }
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Corporate Code"
              name="code"
              rules={[
                { required: true, message: 'Please enter corporate code' },
                { pattern: /^[A-Z0-9_]+$/, message: 'Code must contain only uppercase letters, numbers, and underscores' }
              ]}
            >
              <Input placeholder="e.g., ACME2024" className="font-mono" />
            </Form.Item>

            <Form.Item
              label="Organization"
              name="organization"
              rules={[{ required: true, message: 'Please enter organization name' }]}
            >
              <Input placeholder="e.g., ACME Corporation" />
            </Form.Item>
          </div>

          <Form.Item
            label="Validity Period"
            name="validity_period"
            help="Leave empty for no expiry date"
          >
            <RangePicker 
              format="DD MMM YYYY"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="Patient Survey Questions"
            help="Define survey questions for patients using this corporate code"
          >
            <Form.List name={["patient_survey", "patient"]}>
              {(fields, { add, remove }) => (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Patient Options</span>
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                      Add Option
                    </Button>
                  </div>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="flex gap-2 mb-2">
                      <Form.Item
                        {...restField}
                        name={name}
                        className="flex-1 mb-0"
                        rules={[{ required: true, message: 'Please enter survey option' }]}
                      >
                        <Input placeholder="e.g., I am a [Organization] employee" />
                      </Form.Item>
                      <Button 
                        type="text" 
                        danger 
                        onClick={() => remove(name)}
                        icon={<DeleteOutlined />}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <div className="text-gray-500 text-sm mb-2">
                      No patient survey options defined. Click "Add Option" to create options.
                    </div>
                  )}
                </>
              )}
            </Form.List>
          </Form.Item>

          <Space direction="vertical" className="w-full">
            <Form.Item
              name="is_active"
              valuePropName="checked"
              className="mb-2"
            >
              <Checkbox>Active</Checkbox>
            </Form.Item>

            <Form.Item
              name="only_primary_user"
              valuePropName="checked"
              className="mb-0"
            >
              <Checkbox>Only Primary User (Restrict bookings to primary user only)</Checkbox>
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* Corporate Survey Editor Dialog */}
      <CorporateSurveyEditor
        open={surveyEditorOpen}
        onClose={() => {
          setSurveyEditorOpen(false)
          setSurveyEditorRecord(null)
        }}
        value={surveyEditorRecord?.corporate_survey || {}}
        onSave={handleSaveSurvey}
        title={`Edit Corporate Survey - ${surveyEditorRecord?.code || ''}`}
      />
      </div>
    </ErrorBoundary>
  )
}