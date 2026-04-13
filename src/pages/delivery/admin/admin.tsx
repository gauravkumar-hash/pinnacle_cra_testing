import { Alert, Button, Layout, Table, TableColumnsType } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { getPinnacleZonesRouteApiDeliveryPinnacleZoneGet } from "@/services/client/services.gen";
import { GetPinnacleZonesResponse, ZoneResponse } from '@/services/client/types.gen';
const { Header, Content } = Layout;

export function ZoneScreen() {
    const navigate = useNavigate();
    const {data: zoneData } = useQuery<GetPinnacleZonesResponse>({
        queryKey: ["zones"],
        queryFn: getPinnacleZonesRouteApiDeliveryPinnacleZoneGet,
    });

    const zoneColumns: TableColumnsType<ZoneResponse> = [
        {
            title: 'Zone', 
            dataIndex: 'zone',
            key: 'zone',
            width: "30%",
        },
        {
            title: 'Sector Code',
            dataIndex: ['sector_code_range', "no_service_code_list", "migrant_area_code_list"],
            key: 'sector_code_range',
            render: (_, record: ZoneResponse) => (
                <div className="flex flex-col gap-1">
                    {record.sector_code_range.map((code) => (
                        <div key={code}>
                            {code}
                        </div>
                    ))}
                    {record.migrant_area_code_list.length > 0 && (
                        <Alert 
                            description={"Zone F - Migrant Worker Sector Code\n : " + record.migrant_area_code_list.join(', ')}
                            type="warning" 
                            style={{ fontSize: 12, padding: 8 }}
                        />
                    )}
                    {record.no_service_code_list.length > 0 && (
                        <Alert 
                            description={"Sector with no delivery service\n : " + record.no_service_code_list.join(', ')}
                            type="error" 
                            style={{ fontSize: 12, padding: 8 }}
                        />
                    )}
                </div>
            ),
            width: "40%",
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <div className='flex flex-row gap-2'>
                    {/* <Button type='link' onClick={() => navigate(`/zone/configure`, { state: { zone: record } })}>Configure</Button> */}
                    <Button type='link' onClick={() => navigate(`/zone/configure`, { state: { zone: record } })}>Edit</Button>
                    {/* <Button type='link' danger onClick={() => navigate(`/zone/delete`, { state: { zone: record } })}>Delete</Button> */}
                </div>
            ),
            width: "30%",
        }
    ];

    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>Pinnacle Zone Management</h1>
                <div className='flex flex-row gap-2'>
                    {/* <Button type='primary' icon={<PlusOutlined />} onClick={() => { navigate('create') }}>Add</Button> */}
                </div>
            </Header>
            <Content className='flex flex-col gap-4 font-medium'>
                {zoneData?.missing_sector_codes && zoneData.missing_sector_codes.length > 0 && <Alert message={zoneData.missing_sector_codes.map((code) => <span key={code}>{code} : Need to be configured<br/></span>)} type="error" />}
                <Table
                    columns={zoneColumns}
                    dataSource={zoneData?.sector_code_ranges_by_zone}
                    rowKey={(row) => row.zone}
                />
            </Content>
        </Layout>
    )
}
