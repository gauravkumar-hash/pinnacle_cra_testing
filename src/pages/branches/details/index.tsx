import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Breadcrumb, Layout, Skeleton, Switch, Tabs, TabsProps, Tag } from "antd"
import { Link, Navigate, useParams } from "react-router-dom"
import { InformationTab } from "./information";
import { getBranchApiAdminBranchesBranchIdGet, toggleBlockOffApiAdminBlockoffsToggleBlockoffPost } from "@/services/client";

const { Header, Content } = Layout;

export function BranchDetailsScreen() {
    const { branchId } = useParams();
    const queryClient = useQueryClient();
    const { message } = App.useApp();

    if (!branchId) return <Navigate to='/404' />

    const { isPending, isError, data, error } = useQuery({
        queryKey: ['branches', branchId],
        queryFn: () => getBranchApiAdminBranchesBranchIdGet({ branchId })
    })

    const toggleMutation = useMutation({
        mutationFn: toggleBlockOffApiAdminBlockoffsToggleBlockoffPost,
        // Optimistic Updates
        onMutate: ({ requestBody: { enable } }) => {
            const newData = { ...data, data: { ...data?.data, is_open: enable }};
            const prevData = queryClient.getQueryData(['branches', branchId])
            queryClient.setQueryData(['branches', branchId], newData);
            return { prevData, newData }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches', branchId] });
            message.success('Branch status toggled successfully');
        },
        onError: (error: Error, _, context) => {
            queryClient.setQueryData(
                ['branches', branchId],
                context?.prevData,
            )
            message.error(`Failed to toggle branch status: ${error.message}`);
        },
    });
    
    if (isPending) return <Skeleton className='m-4' />;
    if (isError) return <div>{error.message}</div>;

    const items: TabsProps['items'] = [
        {
          key: '1',
          label: 'Information',
          children: <InformationTab branchId={branchId} />,
        }
        // {
        //   key: '3',
        //   label: 'Admins',
        //   children: <AdminsTab branchId={branchId}/>,
        // },
    ];

    const onChange = (key: string) => {
        console.log(key);
    };

    const onToggle = (checked: boolean) => {
        if (!data.data.is_toggleable) {
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

    const isOpen = data.data.is_open;
    return (
        <Layout className='p-4'>
            <Breadcrumb
                items={[
                    { title: <Link to={'/branches'}>Branches</Link> },
                    { title: data?.data.name }
                ]}
            />
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <div className='flex flex-row gap-5 items-center'>
                    <h1 className='text-xl font-semibold'>{data?.data.name}</h1>
                    <Switch 
                        checked={isOpen}
                        disabled={!data.data.is_toggleable} 
                        onChange={onToggle}
                        loading={toggleMutation.isPending}
                    />
                    <Tag color={isOpen ? 'green' : 'default'}>{isOpen ? 'Open' : 'Closed'}</Tag>
                </div>
            </Header>
            <Content className='flex flex-col gap-4 font-medium' style={{ width: 'auto' }}>
                <Tabs defaultActiveKey="1" items={items} onChange={onChange} />
            </Content>
        </Layout>
    )
}