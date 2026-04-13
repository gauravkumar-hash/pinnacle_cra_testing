import { DownloadOutlined, LeftOutlined, PlusOutlined, RightOutlined, EditOutlined, SwapOutlined, FileOutlined, DownOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";  
import { Button, Menu, Select, Dropdown, DatePicker, Layout, message, Skeleton, Table, TableColumnsType, Tooltip, Form, Input } from "antd"
import { ApiError, logisticsReadTeleconsultDeliveryRoutesApiDeliveryLogisticGet, TeleconsultDeliveryResponse, updateTeleconsultDeliveryRouteApiDeliveryLogisticUpdateDeliveryPut, updateTeleconsultDeliveryStatusRouteApiDeliveryLogisticUpdateDeliveryStatusPut, updateBulkTeleconsultDeliveryStatusRouteApiDeliveryLogisticUpdateBulkDeliveryStatusPut } from "../../services/client";
import { useState } from "react";
import dayjs, { Dayjs } from 'dayjs';
import { getErrorMsg } from "@/utils";
import { IsMigrantAreaTagMapping, PatientTypeTagMapping, TagMapping, ZoneTagMapping } from "./util";
import { useAuth } from "../../context/AuthProvider";
import { downloadAllDeliveryNotes, downloadDeliveryNote, exportDeliverySheet, exportEndDayReport } from "@/apis/delivery";
import { EditDeliveryDetailsModal, UpdateDeliveryStatusModal, BulkUpdateDeliveryModal } from './helper';
const { Header, Content } = Layout;

export function TeleconsultDeliveryScreen() {
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<TeleconsultDeliveryResponse | null>(null);
    const [searchInput, setSearchInput] = useState('');
    const [activeTypeTab, setActiveTypeTab] = useState('all');
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [form] = Form.useForm();
    const [statusForm] = Form.useForm();
    const [bulkForm] = Form.useForm();
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const { data: queryData, isLoading, error } = useQuery({
        queryKey: ['delivery-routes', selectedDate?.format('YYYY-MM-DD') ?? 'null'],
        queryFn: () => logisticsReadTeleconsultDeliveryRoutesApiDeliveryLogisticGet({
            date: selectedDate?.format('YYYY-MM-DD') ?? null
        }),
        refetchInterval: 30000, // refresh every 30 seconds
    });

    const { deliveries: data, drivers } = queryData ?? {};
    const deliveryDrivers = drivers?.map((driver: any) => ({
        value: driver.id,
        label: driver.name
    }));


    const exportDeliverySheetMutation = useMutation({
        mutationFn: async ({ date, isMigrant }: { date: string | null, isMigrant: boolean }) => {
            // const response = await exportDeliverySheetRouteApiTeleconsultDeliveryLogisticExportDeliverySheetGet({ date }) as unknown as Response;
            
            return await exportDeliverySheet(session, date, isMigrant);
        },
        onSuccess: () => {
            message.success('Delivery sheet exported successfully');
        },
        onError: (error: ApiError) => {
            message.error(getErrorMsg(error));
        }
    });

    const exportEndDayReportMutation = useMutation({
        mutationFn: async (date: string) => {
            // const response = await exportEndDayReportRouteApiTeleconsultDeliveryLogisticExportEndDayReportGet({ date }) as unknown as Response;
            return await exportEndDayReport(session, date);
        },
        onSuccess: () => {
            message.success('End day report exported successfully');
        },
        onError: (error: ApiError) => {
            message.error(getErrorMsg(error));
        }
    });

    const downloadDeliveryNoteMutation = useMutation({
        mutationFn: async ({ deliveryNoteKey, filename }: { deliveryNoteKey: string; filename: string }) => {
            return await downloadDeliveryNote(session, deliveryNoteKey, filename);
        },
        onSuccess: () => {
            message.success('Delivery note downloaded successfully');
        },
        onError: (error: ApiError) => {
            message.error(getErrorMsg(error));
        }
    });

    const downloadAllDeliveryNotesMutation = useMutation({
        mutationFn: async () => {
            return await downloadAllDeliveryNotes(session, selectedDate?.format('YYYY-MM-DD') ?? '');
        },
        onSuccess: () => {
            message.success('Delivery notes downloaded successfully');
        },
        onError: (error: ApiError) => {
            message.error(getErrorMsg(error));
        }
    });

    const updateBulkDeliveryMutation = useMutation({
        mutationFn: updateBulkTeleconsultDeliveryStatusRouteApiDeliveryLogisticUpdateBulkDeliveryStatusPut,
        onSuccess: () => {
            message.success("Bulk delivery status updated successfully");
            queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
            setSelectedRowKeys([]);
            bulkForm.resetFields();
            setIsBulkModalOpen(false);
        },
        onError: (error: ApiError) => {
            message.error(getErrorMsg(error));
        }
    });

    const handleExportDeliverySheet = (isMigrant: boolean) => {
        if (selectedDate) {
            exportDeliverySheetMutation.mutate({ date: selectedDate.format('YYYY-MM-DD'), isMigrant });
        } else {
            exportDeliverySheetMutation.mutate({ date: null, isMigrant });
        }
    };

    const handleExportEndDayReport = () => {
        if (selectedDate) {
            exportEndDayReportMutation.mutate(selectedDate.format('YYYY-MM-DD'));
        }
    };

    const handleDownloadDeliveryNote = (record: TeleconsultDeliveryResponse) => {
        if (!record.delivery_note_file_path) {
            message.warning('No delivery note available');
            return;
        }
        downloadDeliveryNoteMutation.mutate({
            deliveryNoteKey: record.delivery_note_file_path,
            filename: `${record.sgimed_patient_id}-${record.patient_name}`
        });
    };

    const handleDownloadAllDeliveryNotes = async () => {
        downloadAllDeliveryNotesMutation.mutate();
    };

    // Multi-select handlers
    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        selections: [
            Table.SELECTION_ALL,
            Table.SELECTION_INVERT,
            Table.SELECTION_NONE,
        ],
    };

    const handleBulkStatusUpdate = () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Please select at least one record');
            return;
        }
        setIsBulkModalOpen(true);
    };

    const handleBulkModalCancel = () => {
        setIsBulkModalOpen(false);
    };

    const handleBulkModalUpdate = () => {
        bulkForm.validateFields().then(values => {
            updateBulkDeliveryMutation.mutate({
                requestBody: {
                    ids: selectedRowKeys.map((key) => key.toString()),
                    status: values.status,
                    driver_id: values.driver
                }
            });
        });
    };

    const filterGroup = (key: string) => ({
        filters: [...new Set(data?.map((r: any) => r[key]))].sort().filter(r => r).map((r) => ({ text: r, value: r })),
        onFilter: (v: any, r: any) => r[key]?.includes(v),
        filterSearch: true
    })

    const stringSort = (key: string) => (a: any, b: any) => a[key]?.localeCompare(b[key]!);
    // const dateSort = (key: string) => (a: any, b: any) => dayjs(a[key]).diff(dayjs(b[key]));

    

    // const renderMultipleLines = (text: string) => (
    //     <div>
    //         {text.split('\n').map((part, index) => (
    //             <div key={index}>{part.trim()}</div>
    //         ))}
    //     </div>
    // )

    const renderMultipleLinesWithRecord = (_:any, record: TeleconsultDeliveryResponse) => {
        const patientArray = record.patient_name?.split('\n');
        const sgimedPatientIdArray = record.sgimed_patient_id?.split('\n') ?? [];
        const queueArray = record.patient_queue_number?.split('\n') ?? [];
        
        return (
            <div>
                {patientArray?.map((part, index) => (
                    <div key={index}>
                        {index > 0 && <div className="border-t border-gray-200 my-2"></div>}
                        <div className="py-1">
                            <div className="flex flex-col space-y-0.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-600 font-semibold">#{queueArray[index]?.trim()}</span>
                                    <span className="text-gray-500 text-sm">{sgimedPatientIdArray[index]?.trim()}</span>
                                </div>
                                <div className="font-medium">{part.trim()}</div>
                                <div className="text-sm text-gray-600 flex items-center gap-1">
                                    <span>📞</span>
                                    <span>{record.phone_number?.startsWith('+65 ') ? record.phone_number.trim().substring(4) : record.phone_number?.trim()}</span>
                                </div>
                                <div className="flex items-start gap-2 border-l-2 border-blue-200 pl-2 my-1">
                                    <span className="text-blue-400 mt-0.5">🕒</span>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-xs text-gray-500">Consultation Time:</span>
                                        <span className="text-[12px] text-gray-700 font-medium">
                                            {record.consultation_date
                                                ? `${dayjs(record.consultation_date).format('DD/MM/YYYY')} ${dayjs(record.consultation_date).format('hh:mm a')}`
                                                : '-'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    {PatientTypeTagMapping[record.is_migrant.toString()]}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    const renderZonePostal = (_: any, record: TeleconsultDeliveryResponse) => (
        <div className="flex flex-col">
            {
                record.is_migrant && <div className="text-xs">
                    {IsMigrantAreaTagMapping[record.is_migrant_area.toString()]}
                </div>
            }
            <div className="text-xs">
                {ZoneTagMapping[record.zone]}
            </div>
            <div className="text-xs text-gray-500">
                {record.postal}
            </div>
        </div>
    )

    const renderInformation = (_: any, record: TeleconsultDeliveryResponse) => (
        <div className="flex flex-col">
            <div className="text-xs">
                Attempts : <span className="text-gray-500">{record.delivery_attempt}</span>
            </div>
            {/* <div className="text-xs">
                Delivery Date : <span className="text-gray-500">{record.delivery_date ? dayjs(record.delivery_date).format('YYYY-MM-DD') : '-'}</span>
            </div> */}
            <div className="text-xs">
                Recipient : <span className="text-gray-500">{record.recipient_name}</span>
            </div>
            <div className="text-xs">
                Dispatch : <span className="text-gray-500">{record.dispatch_name}</span>
            </div>
            <div className="text-xs">
                {record.status === 'success' ? (
                    <>Receipt Time : <span className="text-gray-500">{record.receipt_date ? dayjs(record.receipt_date).format('hh:mm a') : '-'}</span></>
                ) : (
                    <>Updated At : <span className="text-gray-500">{record.receipt_date ? dayjs(record.receipt_date).format('DD/MM/YYYY hh:mm a') : '-'}</span></>
                )}
            </div>
        </div>
    )

    const handleEdit = (record: TeleconsultDeliveryResponse) => {
        setSelectedRecord(record);
        form.setFieldsValue({
            nric: record.patient_nric,
            queue: record.patient_queue_number,
            patientName: record.patient_name,
            address: record.address,
            postal: record.postal,
            zone: record.zone,
            packages: record.number_of_packages,
            deliveryDate: record.delivery_date ? dayjs(record.delivery_date) : null,
        });
        setIsModalOpen(true);
    };

    const updateDeliveryMutation = useMutation({
        mutationFn: updateTeleconsultDeliveryRouteApiDeliveryLogisticUpdateDeliveryPut,
        onSuccess: () => {
            message.success('Delivery details updated successfully');
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
        },
        onError: (error: ApiError) => {
            message.error(getErrorMsg(error));
        }
    });

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (!selectedRecord) return;

            // Compare zone with original
            const zone = values.zone === selectedRecord.zone ? null : values.zone;

            updateDeliveryMutation.mutate({
                requestBody: {
                    id: selectedRecord.id,
                    address: values.address,
                    number_of_package: values.packages,
                    date_of_delivery: values.deliveryDate.format('YYYY-MM-DD'),
                    postal_code: values.postal,
                    zone: zone
                }
            });
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleStatusUpdate = (record: TeleconsultDeliveryResponse) => {
        setSelectedRecord(record);
        statusForm.setFieldsValue({
            queue: record.patient_queue_number,
            nric: record.patient_nric,
            patientName: record.patient_name,
            deliveryDate: record.delivery_date ? dayjs(record.delivery_date).format('YYYY-MM-DD') : '-',
            recipientName: record.recipient_name,
            status: record.status
        });
        setIsStatusModalOpen(true);
    };

    const updateDeliveryStatusMutation = useMutation({
        mutationFn: updateTeleconsultDeliveryStatusRouteApiDeliveryLogisticUpdateDeliveryStatusPut,
        onSuccess: () => {
            message.success('Delivery status updated successfully');
            setIsStatusModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
        },
        onError: (error: ApiError) => {
            message.error(getErrorMsg(error));
        }
    });

    const handleStatusSave = async () => {
        try {
            const values = await statusForm.validateFields();
            if (!selectedRecord) return;

            updateDeliveryStatusMutation.mutate({
                requestBody: {
                    id: selectedRecord.id,
                    status: values.status,
                    recipient_name: values.recipientName == "" ? null : values.recipientName
                }   
            });
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const renderAction = (_: any, record: TeleconsultDeliveryResponse) => (
        <div className="flex flex-row gap-2">
            <Tooltip title="Edit">
                <Button 
                    type="text" 
                    icon={<EditOutlined />} 
                    onClick={() => handleEdit(record)}
                />
            </Tooltip>
            <Tooltip title="Update Status">
                <Button 
                    type="text" 
                    icon={<SwapOutlined />} 
                    onClick={() => handleStatusUpdate(record)}
                />
            </Tooltip>
           
            <Tooltip title="Download Delivery Note">
                <Button 
                    type="text" 
                    icon={<FileOutlined />} 
                    onClick={() => handleDownloadDeliveryNote(record)}
                    loading={downloadDeliveryNoteMutation.isPending}
                    disabled={!record.is_delivery_note_exists}
                />
            </Tooltip>
        </div>
    )

    const baseColumns: TableColumnsType<TeleconsultDeliveryResponse> = [
        { 
            title: 'Patient', 
            dataIndex: ['patient_name', 'is_migrant', "consultation_date", "sgimed_patient_id", "phone_number", "patient_queue_number"],
            render: renderMultipleLinesWithRecord,
            width: '25%'
        },
        {
            title: "Address",
            dataIndex: "address",
            width: '20%'
        },
        { 
            title: 'Zone', 
            dataIndex: ['postal', 'zone', "is_migrant_area"],
            render: renderZonePostal,
            sorter: stringSort('zone'),
            width: '5%'
        },
        { 
            title: 'Delivery Info', 
            dataIndex: ['number_of_packages', "delivery_date", "status"],
            render: (_, record) => (
                <div className="flex flex-col items-start">
                    <div className="flex flex-row items-center gap-1 mb-2">
                        {record.number_of_packages ? TagMapping[record.status] : TagMapping['logistic-pending']}
                    </div>
                    {(!record.number_of_packages || !record.delivery_date) ? (
                        <span className="text-xs text-red-500">
                            {'{Please Update Delivery Date and Number of Packages}'}
                        </span>
                    ) : (
                        <>
                                {record.status == "failed" && <span className="text-xs text-red-500">
                                    {'{Please Update Delivery Date}'}
                                </span>}
                            <div className="flex flex-row items-end gap-1">
                                <span className="text-2xl font-bold leading-none">{record.number_of_packages}</span>
                                <span className="text-sm text-gray-500">packages</span>
                            </div>
                            <span className="text-sm text-gray-700 mt-2">
                                Delivery Date:<br />
                                {dayjs(record.delivery_date).format('YYYY-MM-DD')}
                            </span>
                        </>
                    )}
                </div>
            ),
            ...filterGroup('status'),
            width: '15%'
        },
        // {
        //     title: "Status",
        //     dataIndex: ["status", "number_of_packages"],
        //     render: (_, record) => {
        //         if (record.number_of_packages) {
        //             return TagMapping[record.status];
        //         } else {
        //             return TagMapping['logistic-pending'];
        //         }
        //     },
            
        //     width: '5%'
        // },
        { 
            title: 'Information', 
            dataIndex: ["delivery_date", 'recipient_name', 'dispatch_name', 'receipt_date', 'number_of_attempts', "status"],
            render: renderInformation,
            width: '35%'
        },
        {
            title: 'Action',
            dataIndex: "id",
            width: '5%',
            render: renderAction
        }
    ];

    const columns = baseColumns;

    const renderContent = () => {
        if (isLoading) return <Skeleton />;
        if (error) return <div>{getErrorMsg(error as ApiError)}</div>;
        
        const filteredData = data?.filter(record => {
            // Search filter
            const searchMatch = !searchInput || (() => {
                const patientIds = record.sgimed_patient_id?.split('\n') ?? [];
                const patientNames = record.patient_name?.split('\n') ?? [];
                
                return patientIds.some(id => id.toLowerCase().includes(searchInput.toLowerCase())) ||
                       patientNames.some(name => name.toLowerCase().includes(searchInput.toLowerCase()));
            })();
            
            // Type filter (MW/Private)
            const typeMatch = activeTypeTab === 'all' || 
                (activeTypeTab === 'mw' ? record.is_migrant : !record.is_migrant);
            
            return searchMatch && typeMatch;
        });
        
        return (
            <div className="space-y-4">
                {selectedRowKeys.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <span className="text-blue-700 font-medium">
                                    {selectedRowKeys.length} record(s) selected
                                </span>
                            </div>
                            <Button 
                                type="primary"
                                icon={<SwapOutlined />}
                                onClick={handleBulkStatusUpdate}
                            >
                                Bulk Status Update
                            </Button>
                        </div>
                    </div>
                )}
                <Table
                    rowSelection={rowSelection}
                    columns={columns}
                    rowKey={(row) => row.id}
                    dataSource={filteredData}
                    pagination={{ 
                        defaultPageSize: 50,
                        pageSizeOptions: ['50', '100'],
                        showSizeChanger: true 
                    }}
                />
            </div>
        );
    }

    const deliverySheetMenu = (
      <Menu>
        <Menu.Item
          key="migrant"
          icon={<DownloadOutlined />}
          onClick={() => handleExportDeliverySheet(true)}
          disabled={exportDeliverySheetMutation.isPending}
        >
          Export Migrant Worker Sheet
        </Menu.Item>
        <Menu.Item
          key="private"
          icon={<DownloadOutlined />}
          onClick={() => handleExportDeliverySheet(false)}
          disabled={exportDeliverySheetMutation.isPending}
        >
          Export Private Patient Sheet
        </Menu.Item>
      </Menu>
    );


    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-col py-4 mt-4'>
                <div className='flex flex-row justify-between items-center'>
                    <h1 className='text-xl font-semibold'>Teleconsult Delivery Routes</h1>
                    <div className='flex flex-row gap-2 items-center'>
                        <Dropdown overlay={deliverySheetMenu} trigger={['click']}>
                            <Button
                                icon={<DownloadOutlined />} 
                                loading={exportDeliverySheetMutation.isPending}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                Delivery Sheet <DownOutlined style={{ fontSize: 12, marginLeft: 4 }} />
                            </Button>
                        </Dropdown>
                        {selectedDate && (
                            <>
                            <Button 
                                icon={<DownloadOutlined />} 
                                onClick={handleExportEndDayReport}
                                loading={exportEndDayReportMutation.isPending}
                            >
                                End Day Report
                            </Button>
                            <Button 
                                icon={<DownloadOutlined />} 
                                onClick={handleDownloadAllDeliveryNotes}
                                loading={downloadAllDeliveryNotesMutation.isPending}
                            >
                                Delivery Notes
                            </Button>
                            </>
                        )}
                        
                    </div>
                </div>
                <div className='flex flex-row justify-between items-center'>
                    <div className="flex flex-row gap-2 justify-content">
                        <Input.Search
                            placeholder="Search by Patient ID / Patient Name"
                            allowClear
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            style={{ width: 300 }}
                            />
                        <Select
                            value={activeTypeTab}
                            onChange={setActiveTypeTab}
                            style={{ width: 120 }}
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'mw', label: 'MW' },
                                { value: 'private', label: 'Private' },
                            ]}
                            />
                    </div>
                    <div>
                        <span className="mr-2 font-medium">Select Delivery Date:</span>
                        <Button type="text" icon={<LeftOutlined />} onClick={() => setSelectedDate((date) => date?.subtract(1, 'day') ?? null)}/>
                        <DatePicker
                            allowClear={true}
                            onChange={setSelectedDate}
                            value={selectedDate}
                            superNextIcon={<PlusOutlined />}
                            placeholder="Delivery Date"
                        />
                        <Button 
                            type="text" 
                            icon={<RightOutlined />} 
                            onClick={() => setSelectedDate((date) => date?.add(1, 'day') ?? null)} 
                        />
                    </div>
                </div>
            </Header>
            <Content className='flex flex-col gap-4 font-medium mt-8'>
                {renderContent()}
            </Content>
            <BulkUpdateDeliveryModal
                open={isBulkModalOpen}
                selectedCount={selectedRowKeys.length}
                onCancel={handleBulkModalCancel}
                onUpdate={handleBulkModalUpdate}
                driverOptions={deliveryDrivers ?? []}
                form={bulkForm}
            />
            <EditDeliveryDetailsModal
                open={isModalOpen}
                form={form}
                onOk={handleSave}
                onCancel={() => setIsModalOpen(false)}
            />
            <UpdateDeliveryStatusModal
                open={isStatusModalOpen}
                form={statusForm}
                onOk={handleStatusSave}
                onCancel={() => setIsStatusModalOpen(false)}
            />
        </Layout>
    );
}