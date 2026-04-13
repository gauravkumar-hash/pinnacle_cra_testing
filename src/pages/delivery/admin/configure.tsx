import { Breadcrumb, Button, Layout, message, Select, Form } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMsg } from '@/utils';
import { ApiError } from '@/services/client';
import { editPinnacleZoneRouteApiDeliveryPinnacleZoneEditPut } from '@/services/client/services.gen';
import type { DeliveryZone, ZoneResponse } from '@/services/client/types.gen';
import { expandSectorRanges, ZoneInfoCard } from './zone-utils';

const { Header, Content } = Layout;

export function ConfigurePinnacleZone() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { zone } = useLocation().state as { zone: ZoneResponse };
    const [form] = Form.useForm();

    const editMutation = useMutation({
        mutationFn: editPinnacleZoneRouteApiDeliveryPinnacleZoneEditPut,
        onSuccess: () => {
            message.success('Zone edited successfully');
            queryClient.invalidateQueries({ queryKey: ['zones'] });
            navigate('/zone');
        },
        onError: (error: ApiError) => {
            message.error(getErrorMsg(error));
        }
    });

    const handleSubmit = (values: { sector: string[], sector_no_delivery_service: string[], migrant_area_code_list: string[] }) => {
        editMutation.mutate({
            requestBody: {
                sector_code_list: values.sector,
                sector_code_without_service: values.sector_no_delivery_service,
                migrant_area_code_list: values.migrant_area_code_list,
                zone: zone.zone as DeliveryZone
            }
        });
    };

    const sectorOptions = expandSectorRanges(zone.sector_code_range).map((sector) => ({
        label: sector,
        value: sector
    }));

    return (
        <Layout className='p-4'>
            <Breadcrumb
                items={[
                    { title: <Link to={'/zone'}>Zone</Link> },
                    { title: 'Configure Zone' }
                ]}
            />
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>Configure Pinnacle Zone</h1>
                <div className='flex flex-row gap-2'>
                    <Button onClick={() => { navigate(-1) }}>Cancel</Button>
                    <Button type='primary' onClick={() => form.submit()}>Save</Button>
                </div>
            </Header>
            <Content className='flex flex-col gap-4 font-medium' style={{ width: 600 }}>
                <ZoneInfoCard initialZone={zone.zone} initialSectors={zone.sector_code_range} noServiceSectors={zone.no_service_code_list} migrantAreaSectors={zone.migrant_area_code_list}/>    
                
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    disabled={editMutation.isPending}
                    initialValues={{
                        sector: expandSectorRanges(zone.sector_code_range),
                        sector_no_delivery_service: expandSectorRanges(zone.no_service_code_list),
                        migrant_area_code_list: expandSectorRanges(zone.migrant_area_code_list)
                    }}
                >
                    <Form.Item
                    label="Sectors belonging to this zone"
                    name="sector"
                    rules={[{ required: true, message: 'Please select at least one sector!' }]}
                >
                    <Select
                        mode="tags"
                        placeholder="Select sector"
                        options={sectorOptions}
                        
                        style={{ width: '100%' }}
                    />
                </Form.Item>
                <Form.Item
                    label="Sectors with no delivery service"
                    name="sector_no_delivery_service"
                >
                    <Select
                        mode="tags"
                        placeholder="Select sector"
                        options={sectorOptions}
                        
                        style={{ width: '100%' }}
                    />
                </Form.Item>
                <Form.Item
                    label="Zone F - Migrant Area Sector Code"
                    name="migrant_area_code_list"
                >
                    <Select
                        mode="tags"
                        placeholder="Select sector"
                        options={sectorOptions}
                        
                        style={{ width: '100%' }}
                    />
                </Form.Item>
                </Form>
            </Content>
        </Layout>
    );
}
