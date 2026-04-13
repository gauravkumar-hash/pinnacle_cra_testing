import { Layout, Tabs, TabsProps } from "antd"
import { useSearchParams } from "react-router-dom";
import { StAndrewsScreen } from "./st_andrew";
import { PatientDataSyncScreen } from "./patient_sync";
import { PatientOTPScreen } from "./patient_otp";

const { Header, Content } = Layout;

export function PatientsScreen() {
    const [currSearchParams, setSearchParams] = useSearchParams();

    const items: TabsProps['items'] = [
        {
            key: '1',
            label: 'Saint Andrews',
            children: <StAndrewsScreen />,
        },
        {
            key: '2',
            label: 'Patient Data Sync',
            children: <PatientDataSyncScreen />,
        },
        {
            key: '3',
            label: 'Patient OTP',
            children: <PatientOTPScreen />,
        }
    ];

    const onTabsChange = (key: string) => setSearchParams({ tab: key });

    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>Patients DB</h1>
                {/* <div className='flex flex-row gap-2'>
                    <Button type='primary' icon={<PlusOutlined />} onClick={() => navigate('create')}>Create</Button>
                </div> */}
            </Header>
            <Content className='flex flex-col gap-4 font-medium'>
                <Tabs defaultActiveKey={currSearchParams.get('tab') ?? '1'} items={items} onChange={onTabsChange} />
            </Content>
        </Layout>
    )
}