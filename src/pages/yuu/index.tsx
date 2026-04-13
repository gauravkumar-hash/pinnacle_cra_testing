import { Layout, Tabs, TabsProps } from "antd"
import { useSearchParams } from "react-router-dom";
import { EnrollmentsScreen } from "./enrollments";
import { TransactionsScreen } from "./transactions";

const { Header, Content } = Layout;

export function YuuScreen() {
    const [currSearchParams, setSearchParams] = useSearchParams();

    const items: TabsProps['items'] = [
        {
            key: '1',
            label: 'Enrollments',
            children: <EnrollmentsScreen />,
        },
        {
            key: '2',
            label: 'Transactions',
            children: <TransactionsScreen />,
        }
    ];

    const onTabsChange = (key: string) => setSearchParams({ tab: key });

    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center'>
                <h1 className='text-xl font-semibold'>Yuu Integration</h1>
            </Header>
            <Content className='flex flex-col gap-4 font-medium'>
                <Tabs defaultActiveKey={currSearchParams.get('tab') ?? '1'} items={items} onChange={onTabsChange} />
            </Content>
        </Layout>
    )
}