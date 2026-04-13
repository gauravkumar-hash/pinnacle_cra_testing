import { Layout, Tabs, TabsProps } from "antd"
import { useSearchParams } from "react-router-dom";
import { SupportScreen } from "./support";

const { Header, Content } = Layout;

export function ContentScreen() {
    const [currSearchParams, setSearchParams] = useSearchParams();

    const items: TabsProps['items'] = [
        {
          key: '1',
          label: 'Teleconsult',
          children: <SupportScreen />,
        },
        {
          key: '2',
          label: 'Support',
          children: <SupportScreen />,
        },
    ];

    const onTabsChange = (key: string) => setSearchParams({ tab: key });

    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>Content</h1>
            </Header>
            <Content className='flex flex-col gap-4 font-medium'>
                <Tabs defaultActiveKey={currSearchParams.get('tab') ?? '1'} items={items} onChange={onTabsChange} />
            </Content>
        </Layout>
    )
}