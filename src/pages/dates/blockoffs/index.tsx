import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, BlockOffResp, BranchSelectOption, deleteBlockoffApiAdminBlockoffsBlockoffIdDelete, getBlockoffsApiAdminBlockoffsGet } from "../../../services/client";
import { App, Button, Layout, Modal, Skeleton, Table, TableColumnsType } from "antd"
import { getErrorMsg } from "../../../utils";
import { ExclamationCircleOutlined, PlusOutlined } from "@ant-design/icons";

import { useNavigate } from "react-router-dom";

const { Content } = Layout;

export default function BlockoffsScreen() {
    const navigate = useNavigate();
    const { message } = App.useApp();

    const queryClient = useQueryClient();
    const { isPending, isError, data, error } = useQuery({
        queryKey: ['blockoffs'],
        queryFn: getBlockoffsApiAdminBlockoffsGet,
    })

    const deleteMutation = useMutation({
        mutationFn: deleteBlockoffApiAdminBlockoffsBlockoffIdDelete,
        onSuccess: () => {
            message.success('Blockoff(s) deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['blockoffs'] })
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
                deleteMutation.mutate({ blockoffId: id });
            },
            onCancel() {},
        });
    }

    const columns: TableColumnsType<BlockOffResp> = [
        {
            title: 'Date',
            dataIndex: 'date',
        },
        {
            title: 'Start Time & End Time',
            dataIndex: 'start_time',
            width: '40%',
            render: (_, record) => <span>{record.start_time} - {record.end_time}</span>
        },
        {
            title: 'Branches',
            dataIndex: 'branches',
            render: (branches) => <div>{branches.map((b: BranchSelectOption) => b.label).join(', ')}</div>
        },
        {
            title: 'Reason',
            dataIndex: 'remarks',
        },
        // {
        //     title: 'Enabled',
        //     dataIndex: 'enabled',
        //     render: (enabled) => enabled ? 'True' : 'False'
        // },
        {
            title: 'Action',
            render: (row: any) => (
                <div>
                    <Button
                        type='link'
                        onClick={() => navigate(`blockoffs/${row.id}`, { state: { blockoff: row } }) }
                        >
                        Edit
                    </Button>
                    <Button
                        type='link'
                        danger
                        onClick={() => onDelete(row.id)}
                        loading={deleteMutation.isPending && deleteMutation.variables?.blockoffId === row.id}
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
                <Button icon={<PlusOutlined />} onClick={() => navigate('blockoffs/create')}>Add</Button>
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