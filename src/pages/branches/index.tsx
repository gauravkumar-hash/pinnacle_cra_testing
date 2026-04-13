import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Layout, Skeleton, Space, Switch, Table, TableColumnsType, Tag, Modal, Form, Input, Select, Upload, Image, Alert } from "antd"
import { Link, useNavigate } from "react-router-dom";
import { BranchListDetails, getBranchesApiAdminBranchesGet, toggleBlockOffApiAdminBlockoffsToggleBlockoffPost } from "../../services/client";
import { CalendarOutlined, ClockCircleOutlined, EditOutlined, PlusOutlined, InboxOutlined } from "@ant-design/icons";
import { apiUrl } from "@/apis"
import { useAuth } from "@/context/AuthProvider"
const { Header, Content } = Layout;
const { Option } = Select;
const { Dragger } = Upload;


export function BranchesScreen() {
    const navigate = useNavigate()
    const [createModalVisible, setCreateModalVisible] = useState(false)
    const [form] = Form.useForm()
    const { session } = useAuth()
    
    const { data, isPending, isError, error } = useQuery({
        queryKey: ['branches'],
        queryFn: getBranchesApiAdminBranchesGet 
    })

    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const toggleMutation = useMutation({
        mutationFn: toggleBlockOffApiAdminBlockoffsToggleBlockoffPost,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            message.success('Branch status toggled successfully');
        },
        onError: (error: Error) => {
            message.error(`Failed to toggle branch status: ${error.message}`);
        },
    });

    // Create branch mutation
    const createBranchMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await fetch(`${apiUrl}/branches`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to create branch')
            }
            
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] })
            message.success('Branch created successfully')
            setCreateModalVisible(false)
            form.resetFields()
        },
        onError: (error: Error) => {
            message.error(error.message || 'Failed to create branch')
        }
    });

    if (isPending) return <Skeleton className='m-4' />;
    if (isError) return <div>{error.message}</div>;


    const onToggle = (checked: boolean, branchId: string) => {
        if (!data.find(b => b.id === branchId)?.is_toggleable) {
            message.warning('Toggle is not allowed for this branch');
            return;
        }
    
        toggleMutation.mutate({
            requestBody: {
                branch_id: branchId,
                enable: checked,
            },
        });
    };

    const columns: TableColumnsType<BranchListDetails> = [
        {
            title: 'Branch',
            dataIndex: 'name',
            width: 200,
            render: (name: string, record) => (
                <div className="flex items-center gap-3">
                    {record.image_url && (
                        <Image
                            src={record.image_url}
                            alt={name}
                            width={40}
                            height={40}
                            className="rounded object-cover"
                            style={{ objectFit: 'cover' }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                            }}
                            preview={{
                                mask: false,
                                src: record.image_url
                            }}
                        />
                    )}
                    <div>
                        <Link to={`${record.id}`} className="font-medium">{name}</Link>
                        {record.address && (
                            <div className="text-xs text-gray-500 truncate max-w-40">{record.address}</div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'id',
            render: (_, { is_open }) => {
                return (
                    <Tag color={is_open ? 'green' : 'default'}>
                        {is_open ? 'Open' : 'Closed'}
                    </Tag>
                );
            },
        },
        {
            title: 'Open / Close',
            dataIndex: 'id',
            render: (id, { is_open, is_toggleable }) => {
                return <Switch 
                    checked={is_open}
                    disabled={!is_toggleable} 
                    onChange={(checked) => onToggle(checked, id)}
                    loading={toggleMutation.isPending && toggleMutation.variables.requestBody.branch_id === id}
                    />;
            },
        },
        {
            title: 'Actions',
            dataIndex: 'name',
            width: 150,
            render: (_, record) => (
                // <Link className='text-blue-500' to={`${record.id}`}>Edit</Link>
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => navigate(`/branches/${record.id}`)}
                        title="Edit Onsite Branch"
                    />
                    <Button
                        type="text"
                        icon={<ClockCircleOutlined />}
                        onClick={() => navigate(`/branches/${record.id}/operating-hours`)}
                        title="Edit Operating Hours"
                    />
                    <Button
                        type="text"
                        icon={<CalendarOutlined />}
                        onClick={() => navigate(`/branches/${record.id}/appointment-hours`)}
                        title="Edit Appointment Hours"
                    />
                </Space>
            ),
        },
    ]

    const handleCreateSave = async (values: any) => {
        const formData = new FormData()
        
        // Branch data
        formData.append('name', values.branch_name)
        formData.append('address', values.address)
        if (values.phone) formData.append('phone', values.phone)
        if (values.whatsapp) formData.append('whatsapp', values.whatsapp)
        if (values.email) formData.append('email', values.email)
        if (values.url) formData.append('url', values.url)
        formData.append('category', values.category)
        
        // Image upload - only append if a new file was uploaded
        if (values.image && values.image.file && values.image.file.originFileObj) {
            formData.append('image', values.image.file.originFileObj)
        } else if (values.image && values.image.fileList && values.image.fileList.length > 0) {
            // Check if there's a new file in the fileList
            const newFile = values.image.fileList.find((file: any) => file.originFileObj)
            if (newFile && newFile.originFileObj) {
                formData.append('image', newFile.originFileObj)
            }
        }
        
        createBranchMutation.mutate(formData)
    }

    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>Branches</h1>
                <div className='flex flex-row gap-2'>
                    <Button 
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            form.resetFields()
                            setCreateModalVisible(true)
                        }}
                    >
                        Create Branch
                    </Button>
                </div>
            </Header>
            <Content className='flex flex-col gap-4 font-medium'>
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey={(row) => row.id}
                    loading={createBranchMutation.isPending}
                    />
            </Content>

            {/* Create Branch Modal */}
            <Modal
                title="Create Branch"
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

                    <Alert
                        message="Post-Creation Configuration Required"
                        description={
                            <div>
                                <p className="mb-2">After creating the branch, you will need to configure:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    <li><strong>sgimed_branch_id:</strong> Link to SGiMed system for appointment integration</li>
                                    <li><strong>branch_services:</strong> Associate services that this branch offers</li>
                                    <li><strong>TELECONSULT_BRANCH_ROUTING:</strong> Set up teleconsultation routing configuration</li>
                                </ul>
                                <p className="mt-2 text-sm text-gray-600">These configurations should be completed by a system administrator.</p>
                            </div>
                        }
                        type="info"
                        showIcon
                        className="mb-4"
                    />

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
                                loading={createBranchMutation.isPending}
                            >
                                Create
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Layout>
    )
}

export function AddBranch() {
    return (
        <div>
            Add Branch
        </div>
    )
}
