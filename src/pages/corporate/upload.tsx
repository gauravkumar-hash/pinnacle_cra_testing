import { message, Button, GetProp, UploadProps, Upload, Table, Space, Popconfirm } from "antd";
import { UploadFile } from "antd/lib/upload/interface";
import { getCorporateUserCountsApiAdminCorporateUsersGet, uploadCorporateUsersApiAdminCorporateUsersUploadPost, deleteCorporateUsersApiAdminCorporateUsersCodeDelete, downloadCorporateUsersApiAdminCorporateUsersCodeDownloadGet } from "@/services/client/services.gen";
import { ContentView } from "@/components/Content";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/client";
import { getErrorMsg } from "@/utils";
import { UploadOutlined, DownloadOutlined, DeleteOutlined } from "@ant-design/icons";

export type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

export default function CorporateUsersUpload() {
    // React Query Hooks
    const queryClient = useQueryClient();

    const qry = useQuery({
        queryKey: ['corporate_user_counts'],
        queryFn: getCorporateUserCountsApiAdminCorporateUsersGet,
    })

    const deleteMutation = useMutation({
        mutationFn: deleteCorporateUsersApiAdminCorporateUsersCodeDelete,
        onSuccess: () => {
            message.success('Corporate users deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['corporate_user_counts'] });
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error), 0)
    });

    const handleDelete = (code: string) => {
        deleteMutation.mutate({ code });
    };

    const uploadMutation = useMutation({
        mutationFn: uploadCorporateUsersApiAdminCorporateUsersUploadPost,
        onSuccess: (response) => {
            message.success(`Successfully processed ${response.successful_records} records`);
            if (response.failed_records && response.failed_records.length > 0) {
                // Create error message for failed records
                const errorMessages = response.failed_records.map(record => {
                    const { row, error } = record;
                    return `Row data: ${JSON.stringify(row)}
Error: ${error}`;
                }).join('\n\n');
                
                message.error(`${response.error_message}\n\n${errorMessages}`, 10);
            }
            queryClient.invalidateQueries({ queryKey: ['corporate_user_counts'] });
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error), 0)
    });

    const downloadMutation = useMutation({
        mutationFn: downloadCorporateUsersApiAdminCorporateUsersCodeDownloadGet,
        onSuccess: (response: any) => {
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'corporate_users.csv');  
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error), 0)
    });

    const handleDownload = (code: string) => {
        downloadMutation.mutate({ code });
    };

    // Functions
    const handleUpload = async (file: UploadFile) => {
        const supported = [
            'text/csv',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]
        if (!supported.includes(file.type ?? '')) {
            message.error(`${file.name} is not a CSV file`);
            return;
        }

        uploadMutation.mutate({
            formData: {
                file: file as FileType
            }
        })
    };

    const handleDownloadTemplate = () => {
        // Create CSV content with header and example rows
        const headers = ['ic_type', 'nric', 'code'];
        const examples = [
            ['PINK IC', 'S1234567A', 'CORP001'],
            ['BLUE IC/ENTRY PERMIT', 'T1234567B', 'CORP002'],
            ['FIN NUMBER', 'G1234567C', 'CORP003'],
            ['PASSPORT', 'A12345678', 'CORP004']
        ];
        
        // Create CSV content with headers and all example rows
        const csvContent = [
            headers.join(','),
            ...examples.map(row => row.join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'corporate_users_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <ContentView
            title="Corporate Users"
            actions={
                <Space>
                    <Button 
                        icon={<DownloadOutlined />} 
                        onClick={handleDownloadTemplate}
                    >
                        Download Template
                    </Button>
                    <Upload beforeUpload={handleUpload} fileList={[]}>
                        <Button type='primary' icon={<UploadOutlined />} loading={uploadMutation.isPending}>Import CSV</Button>
                    </Upload>
                </Space>
            }
            >
            <div style={{ marginBottom: 16 }}>
                <p>Upload a CSV file containing corporate user information.</p>
                <ul>
                    <li>File must be in CSV format</li>
                    <li>The system will remove all codes present within the CSV file before adding the new records</li>
                </ul>
            </div>
            <Table 
                dataSource={qry.data?.counts ?? []}
                loading={qry.isLoading}
                rowKey="code"
                columns={[
                    {
                        title: 'Code',
                        dataIndex: 'code',
                        key: 'code',
                    },
                    {
                        title: 'User Count',
                        dataIndex: 'count',
                        key: 'count',
                    },
                    {
                        title: 'Action',
                        key: 'action',
                        width: 220,
                        fixed: 'right',
                        // align: 'right' as const,
                        render: (_, record) => (
                            <Space>
                                <Button
                                    icon={<DownloadOutlined />}
                                    loading={downloadMutation.isPending && downloadMutation.variables?.code === record.code}
                                    onClick={() => handleDownload(record.code)}
                                >
                                    Download
                                </Button>
                                <Popconfirm
                                    title="Delete corporate users"
                                    description={`Are you sure you want to delete all users with code ${record.code}?`}
                                    onConfirm={() => handleDelete(record.code)}
                                    okText="Yes"
                                    cancelText="No"
                                >
                                    <Button 
                                        danger 
                                        icon={<DeleteOutlined />}
                                        loading={deleteMutation.isPending && deleteMutation.variables?.code === record.code}
                                    >
                                        Delete
                                    </Button>
                                </Popconfirm>
                            </Space>
                        ),
                    }
                ]}
            />
        </ContentView>
    );
}
