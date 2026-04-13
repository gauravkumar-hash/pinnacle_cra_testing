import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message, TableColumnsType, Tag, Space, Modal, Form, Input, Checkbox, InputNumber, Button } from "antd"
import { 
    ApiError,
    CorporateCodeV2Row, 
    InventoryItemInfo,
    deleteCorporateCodesV2ApiAdminCorporateCodesV2IdDelete, 
    getCorporateCodesV2ApiAdminCorporateCodesV2Get, 
    searchInventoryApiAdminCorporateCodesV2InventorySearchGet, 
    upsertCorporateCodesV2ApiAdminCorporateCodesV2Post
} from "../../services/client";
import { getErrorMsg } from "@/utils";
import { AddButton, ContentView } from "@/components/Content";
import { useState } from "react";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { DebounceSelect } from "@/components/DebounceSelect";

export function CorporateRatesScreen() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<CorporateCodeV2Row | null>(null);
    const [form] = Form.useForm();

    const qry = useQuery({
        queryKey: ['corporate_rates_v2'],
        queryFn: getCorporateCodesV2ApiAdminCorporateCodesV2Get,
    })

    const queryClient = useQueryClient();
    
    const upsertMutation = useMutation({
        mutationFn: upsertCorporateCodesV2ApiAdminCorporateCodesV2Post,
        onSuccess: (_) => {
            message.success('Corporate rate created/updated successfully');
            queryClient.invalidateQueries({ queryKey: ['corporate_rates_v2'] });
            setIsModalOpen(false);
            form.resetFields();
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    const deleteMutation = useMutation({
        mutationFn: deleteCorporateCodesV2ApiAdminCorporateCodesV2IdDelete,
        onSuccess: (_) => {
            message.success('Corporate rate deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['corporate_rates_v2'] });
        },
        onError: (error: ApiError) => {
            console.log(error);
            message.error(getErrorMsg(error))
        }
    })

    const handleAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record: CorporateCodeV2Row) => {
        setEditingRecord(record);
        form.setFieldsValue({
            ...record,
            allow_user_input: record.allow_user_input ?? true,
            inventory_items: record.inventory_items?.map(item => ({
                label: `${item.code} - ${item.name} ${item.price ? `($${item.price.toFixed(2)})` : ''}`,
                value: item.id
            }))
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: 'Delete Corporate Rate',
            content: 'Are you sure you want to delete this corporate rate?',
            onOk: () => deleteMutation.mutate({ id: parseInt(id) })
        });
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            
            // Map the selected items to InventoryItemInfo objects
            const inventoryItems = values.inventory_items?.map((item: any) => ({
                id: item.value,
                code: '',  // These will be populated by the backend
                name: '',  // These will be populated by the backend
                price: null
            })) || [];
            
            const payload: any = {
                ...values,
                id: editingRecord?.id,
                inventory_items: inventoryItems,  // Send as inventory_items, not sgimed_consultation_inventory_ids
                allow_user_input: values.allow_user_input ?? true // Default to true if not specified
            };
            
            upsertMutation.mutate({ requestBody: payload });
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const fetchInventoryOptions = async (search: string): Promise<Array<{ label: string; value: string }>> => {
        if (!search || search.trim().length < 2) {
            return [];
        }
        
        try {
            const response = await searchInventoryApiAdminCorporateCodesV2InventorySearchGet({ 
                search: search.trim() 
            });
            
            return response.map((item) => ({
                label: `${item.code} - ${item.name} ${item.price ? `($${item.price.toFixed(2)})` : ''}`,
                value: item.id
            }));
        } catch (error) {
            console.error('Error fetching inventory:', error);
            message.error('Failed to search inventory items');
            return [];
        }
    };

    const columns: TableColumnsType<CorporateCodeV2Row> = [
        {
            title: 'Code',
            dataIndex: 'code',
            width: 150,
        },
        {
            title: 'Consultation Items',
            dataIndex: 'inventory_items',
            width: 400,
            render: (items: InventoryItemInfo[]) => {
                if (!items || items.length === 0) return '-';
                return (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {items.map((item) => (
                            <Tag key={item.id} color="blue">
                                {item.code} - {item.name} {item.price ? `($${item.price.toFixed(2)})` : ''}
                            </Tag>
                        ))}
                    </Space>
                );
            }
        },
        {
            title: 'Total Price',
            key: 'total_price',
            width: 120,
            render: (_, record) => {
                const total = (record.inventory_items || []).reduce((sum, item) => sum + (item.price || 0), 0);
                return `$${total.toFixed(2)}`;
            }
        },
        {
            title: 'Remarks',
            dataIndex: 'remarks',
            width: 200,
        },
        {
            title: 'Skip Prepayment',
            dataIndex: 'skip_prepayment',
            width: 150,
            render: (value) => value ? 'Yes' : 'No'
        },
        {
            title: 'Hide Invoice',
            dataIndex: 'hide_invoice',
            width: 150,
            render: (value) => value ? 'Yes' : 'No'
        },
        {
            title: 'Allow User Input',
            dataIndex: 'allow_user_input',
            width: 150,
            render: (value) => value ? 'Yes' : 'No'
        },
        {
            title: 'Priority',
            dataIndex: 'priority_index',
            width: 100,
            render: (value) => value || 100,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record.id!)}
                    />
                </Space>
            )
        }
    ];

    return (
        <>
            <ContentView
                title="Corporate Rates"
                actions={<AddButton onClick={handleAdd} />}
                qry={qry}
            >
                {qry.data && (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={col.key || (col as any).dataIndex}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        style={{ width: col.width }}
                                    >
                                        {typeof col.title === 'function' ? col.title({}) : col.title}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {qry.data.map((record, index) => (
                                <tr key={record.id || index}>
                                    {columns.map((col) => (
                                        <td
                                            key={col.key || (col as any).dataIndex}
                                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                        >
                                            {col.render
                                                ? col.render(record[(col as any).dataIndex as keyof CorporateCodeV2Row], record, index) as React.ReactNode
                                                : record[(col as any).dataIndex as keyof CorporateCodeV2Row] as React.ReactNode}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </ContentView>

            <Modal
                title={editingRecord ? "Edit Corporate Rate" : "Add Corporate Rate"}
                open={isModalOpen}
                onOk={handleSubmit}
                onCancel={() => setIsModalOpen(false)}
                confirmLoading={upsertMutation.isPending}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        skip_prepayment: false,
                        hide_invoice: false,
                        allow_user_input: true,
                        priority_index: 100
                    }}
                >
                    <Form.Item
                        label="Code"
                        name="code"
                        rules={[{ required: true, message: 'Please enter a code' }]}
                    >
                        <Input placeholder="Enter corporate code" />
                    </Form.Item>

                    <Form.Item
                        label="Consultation Items (Select Consultation Fee first before other items such as Surcharge Fees)"
                        name="inventory_items"
                        rules={[{ required: true, message: 'Please select at least one consultation item' }]}
                        help="Type at least 2 characters to search"
                    >
                        <DebounceSelect
                            mode="multiple"
                            placeholder="Search and select consultation items..."
                            fetchOptions={fetchInventoryOptions}
                            debounceTimeout={500}
                            style={{ width: '100%' }}
                            allowClear
                            showSearch
                        />
                    </Form.Item>

                    <Form.Item
                        label="Remarks"
                        name="remarks"
                    >
                        <Input.TextArea placeholder="Enter remarks" rows={3} />
                    </Form.Item>

                    <Form.Item
                        name="skip_prepayment"
                        valuePropName="checked"
                    >
                        <Checkbox>Skip Prepayment</Checkbox>
                    </Form.Item>

                    <Form.Item
                        name="hide_invoice"
                        valuePropName="checked"
                    >
                        <Checkbox>Hide Invoice</Checkbox>
                    </Form.Item>

                    <Form.Item
                        name="allow_user_input"
                        valuePropName="checked"
                    >
                        <Checkbox>Allow User Input</Checkbox>
                    </Form.Item>

                    <Form.Item
                        label="Priority Index"
                        name="priority_index"
                        rules={[{ required: true, message: 'Please enter priority index' }]}
                        help="Corporate rate with lower number will be applied over other corporate rates"
                    >
                        <InputNumber min={0} placeholder="Enter priority (lower number = higher priority)" style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}