
import { Layout, Table } from "antd"
const { Content } = Layout;

const data: any[]  = [];
const columns = [
    {
        title: 'Key',
        dataIndex: 'key',
    },
    {
        title: 'Title',
        dataIndex: 'title',
    },
    {
        title: 'Content',
        dataIndex: 'content',
    },
    // {
    //     title: 'Action',
    //     render: (row: any) => (
    //         <div>
    //             <Button
    //                 type='link'
    //                 onClick={() => navigate(`public_holidays/${row.id}`, { state: { record: row } }) }
    //                 >
    //                 Edit
    //             </Button>
    //             <Button
    //                 type='link'
    //                 danger
    //                 onClick={() => onDelete(row.id)}
    //                 loading={deleteMutation.isPending && deleteMutation.variables?.publicHolidayId === row.id}
    //                 >
    //                 Delete
    //             </Button>
    //         </div>
    //     )
    // }
]

export function SupportScreen() {
    return (
        <Content className='flex flex-col gap-4 font-medium'>
            <Table
                rowSelection={{ type: 'checkbox' }}
                columns={columns}
                dataSource={data}
                rowKey={(row) => row.id}
                />
        </Content>
    )
}