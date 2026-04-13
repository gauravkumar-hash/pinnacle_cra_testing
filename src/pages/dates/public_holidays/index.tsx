import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Layout, message, Modal, Skeleton, Table } from "antd";
import { ApiError, deletePublicHolidayApiAdminPublicHolidaysPublicHolidayIdDelete, getPublicHolidaysApiAdminPublicHolidaysGet } from "@/services/client";
import { getErrorMsg } from "@/utils";
import { ExclamationCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
const { Content } = Layout;

export default function PublicHolidaysScreen() {
    const navigate = useNavigate();

    const queryClient = useQueryClient();
    const { isPending, isError, data, error } = useQuery({
        queryKey: ['public_holidays'],
        queryFn: getPublicHolidaysApiAdminPublicHolidaysGet,
    })

    const deleteMutation = useMutation({
        mutationFn: deletePublicHolidayApiAdminPublicHolidaysPublicHolidayIdDelete,
        onSuccess: () => {
            message.success('Public Holiday(s) deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['public_holidays'] })
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    if (isPending) return <Skeleton />;
    if (isError) return <div>{error.message}</div>;

    const onDelete = (id: string) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this record?',
            icon: <ExclamationCircleOutlined />,
            content: 'This action cannot be undone.',
            onOk() {
                deleteMutation.mutate({ publicHolidayId: id });
            },
            onCancel() {},
        });
    }

    const columns = [
        {
            title: 'Date',
            dataIndex: 'date',
        },
        {
            title: 'Reason',
            dataIndex: 'remarks',
        },
        {
            title: 'Action',
            render: (row: any) => (
                <div>
                    <Button
                        type='link'
                        onClick={() => navigate(`public_holidays/${row.id}`, { state: { record: row } }) }
                        >
                        Edit
                    </Button>
                    <Button
                        type='link'
                        danger
                        onClick={() => onDelete(row.id)}
                        loading={deleteMutation.isPending && deleteMutation.variables?.publicHolidayId === row.id}
                        >
                        Delete
                    </Button>
                </div>
            )
        }
    ]

    return (
        <>
            <div className='flex flex-row gap-3 mb-3'>
                {/* <Button icon={<DeleteOutlined />} onClick={() => updateServices()} disabled={true}>Delete</Button> */}
                <Button icon={<PlusOutlined />} onClick={() => navigate('public_holidays/create')}>Add</Button>
            </div>
            <Content className='flex flex-col gap-4 font-medium'>
                <Table
                    rowSelection={{ type: 'checkbox' }}
                    columns={columns}
                    dataSource={data}
                    rowKey={(row) => row.id}
                    />
            </Content>
        </>
    )
}
