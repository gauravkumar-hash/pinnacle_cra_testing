import { PlusOutlined } from "@ant-design/icons";
import { Button, Layout, Skeleton } from "antd"
const { Header, Content } = Layout;

export const ContentView = ({ title, actions, qry, children }: { title: string, actions?: React.ReactNode, qry?: any, children: React.ReactNode }) => {
    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>{title}</h1>
                <div className='flex flex-row gap-2'>
                    {actions}
                </div>
            </Header>
            <Content className='flex flex-col gap-4 font-medium'>
                {!qry && children}
                {qry && qry.isPending && <Skeleton active />}
                {qry && qry.isError && <div>{qry.error?.message}</div>}
                {qry && qry.isSuccess && children}
            </Content>
        </Layout>
    )
}

export const AddButton = ({ onClick }: { onClick: () => void }) => {
    return <Button type='primary' icon={<PlusOutlined />} onClick={onClick}>Add</Button>
}