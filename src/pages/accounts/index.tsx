import { App, Button, Checkbox, Layout, Popconfirm, Skeleton, Table, TableColumnsType } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { AccountResp, ApiError, deleteAccountsApiAdminAccountsDeletePost, fetchAccountsApiAdminAccountsGet, resetPasswordApiAdminAccountsAccountIdResetPasswordGet, toggleAccountNotificationsApiAdminAccountsToggleNotificationsPost } from '../../services/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMsg } from '../../utils';
import { RoleTag } from '../../components/RoleTag';
const { Header, Content } = Layout;

export function AccountsScreen() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    
    const queryClient = useQueryClient();
    const { isPending, isError, data, error } = useQuery({
        queryKey: ['accounts'],
        queryFn: fetchAccountsApiAdminAccountsGet,
    })

    const deleteMutation = useMutation({
        mutationFn: deleteAccountsApiAdminAccountsDeletePost,
        onSuccess: () => {
            message.success('Account(s) deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    const resetPasswordMutation = useMutation({
        mutationFn: resetPasswordApiAdminAccountsAccountIdResetPasswordGet,
        onSuccess: () => {
            message.success('Password reset email sent successfully');
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    const toggleNotificationsMutation = useMutation({
        mutationFn: toggleAccountNotificationsApiAdminAccountsToggleNotificationsPost,
        onSuccess: (_, req) => {
            message.success('Notifications toggled successfully');
            queryClient.setQueryData(['accounts'], (oldData: AccountResp[]) => {
                oldData.map((row) => {
                    if (row.id === req.requestBody.account_id) {
                        row.enable_notifications = req.requestBody.enable_notifications;
                    }
                    return row;
                });
            })
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    if (isPending) return <Skeleton className='m-4' />;
    if (isError) return <div>{error.message}</div>;

    const doctorsColumns: TableColumnsType<AccountResp> = [
        
        {
            title: 'Name',
            dataIndex: 'name',
        },
        {
            title: 'Email',
            dataIndex: 'email',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            render: (value) => <RoleTag role={value} />,
        },
        {
            title: 'Branch',
            dataIndex: 'branch_name',
            render: (value, record) => value ? <Link to={`/branches/${record.branch_id}`}>{value}</Link> : <></>,
        },
        {
            title: 'Notifications',
            dataIndex: 'enable_notifications',
            render: (v, r) => <Checkbox
                checked={v}
                disabled={toggleNotificationsMutation.isPending && toggleNotificationsMutation.variables.requestBody.account_id == r.id}
                onChange={() => toggleNotificationsMutation.mutate({ requestBody: { account_id: r.id, enable_notifications: !v }})}
                />,
        },
        {
            title: 'Action',
            dataIndex: '',
            key: 'x',
            render: (row) => {
                return <div>
                    <Popconfirm
                        title="Delete the user"
                        description="Are you sure to delete this user?"
                        onConfirm={() => deleteMutation.mutate({ requestBody: { ids: [row.id] }})}
                        onCancel={() => {}}
                        okText="Yes"
                        cancelText="No"
                        >
                        <Button
                            type="link"
                            danger
                            loading={deleteMutation.isPending && deleteMutation.variables?.requestBody.ids.includes(row.id)}
                            >
                            Delete
                        </Button>
                    </Popconfirm>
                    <Button
                        type="link"
                        onClick={() => resetPasswordMutation.mutate({ accountId: row.id })}
                        loading={resetPasswordMutation.isPending && resetPasswordMutation.variables?.accountId == row.id}
                        >
                        Reset Password
                    </Button>
                </div>
            }
        },
    ];


    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>Accounts</h1>
                <div className='flex flex-row gap-2'>
                    {/* <Button danger icon={<DeleteOutlined />} disabled>Delete</Button> */}
                    <Button type='primary' icon={<PlusOutlined />} onClick={() => { navigate('create') }}>Add</Button>
                </div>
            </Header>
            <Content className='flex flex-col gap-4 font-medium'>
                <Table
                    rowSelection={{ type: 'checkbox' }}
                    columns={doctorsColumns}
                    dataSource={data}
                    rowKey={(row) => row.id}
                    />
            </Content>
        </Layout>
    )
}
