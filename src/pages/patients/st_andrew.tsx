import { App, Button, Descriptions, DescriptionsProps, GetProp, Layout, Skeleton, Table, Upload, UploadFile, UploadProps } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, getMetadataApiAdminStAndrewMetadataGet, updateRecordsApiAdminStAndrewUpdateGet, uploadTableApiAdminStAndrewUploadPost } from '@/services/client';
import { getErrorMsg } from '@/utils';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Content } = Layout;

export function StAndrewsScreen() {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const { isPending, isError, data, error } = useQuery({
        queryKey: ['standrew'],
        queryFn: getMetadataApiAdminStAndrewMetadataGet
    });

    const uploadMutation = useMutation({
        mutationFn: uploadTableApiAdminStAndrewUploadPost,
        onSuccess: () => {
            message.success('File uploaded successfully');
            queryClient.invalidateQueries({ queryKey: ['standrew'] })
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error), 0)
    });
    const updateMutation = useMutation({
        mutationFn: updateRecordsApiAdminStAndrewUpdateGet,
        onSuccess: () => {
            message.success('Records updated successfully');
            queryClient.invalidateQueries({ queryKey: ['standrew'] })
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    });


    if (isPending) return <Skeleton />;
    if (isError) return <div>{error.message}</div>;

    type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];
    const onBeforeUpload = (file: UploadFile) => {
        const supported = [
            'text/csv',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            // 'application/vnd.ms-excel',
        ]
        if (!supported.includes(file.type ?? '')) {
            message.error(`${file.name} is not a Excel/CSV file`);
            return;
        }
        uploadMutation.mutate({
            formData: {
                file: file as FileType
            }
        })
        return false;
    }

    const items: DescriptionsProps['items'] = [
        {
          key: '1',
          label: 'Last update in system DB',
          children: dayjs(`${data.last_updated}Z`).format('DD/MM/YYYY, hh:mm a'),
        },
        {
          key: '2',
          label: 'Total records in system DB',
          children: data.total_records,
        },
        {
          key: '3',
          label: 'Total records in imported file',
          children: data.imported_records ?? '-',
        },
    ]

    return (
            <Content className='flex flex-col gap-4 font-medium max-w-lg'>
                <Descriptions bordered items={items} column={1} />
                <Upload beforeUpload={onBeforeUpload} fileList={[]}>
                    <Button type='primary' icon={<UploadOutlined />} loading={uploadMutation.isPending}>Import</Button>
                </Upload>
                {
                    data.imported_records && <>
                        <Table
                            columns={[
                                    { title: 'Change Type',dataIndex: 'option'},
                                    { title: 'No. of Rows Affected', dataIndex: 'rows'},
                                ]}
                            dataSource={[
                                    { key: 1, option: 'Insert', rows: data.insert_diff?.length },
                                    { key: 2, option: 'Update', rows: data.update_diff?.length },
                                    { key: 3, option: 'Delete', rows: data.delete_diff?.length },
                                ]}
                            pagination={false}
                            />
                        <div>
                            <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>Update System DB</Button> 
                        </div>
                    </>
                }
            </Content>
    );
}
