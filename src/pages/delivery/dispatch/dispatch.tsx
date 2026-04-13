import { useQuery } from "@tanstack/react-query";  
import { Layout, Skeleton, Input, Row, Col, Select, Tabs } from "antd"
import { TeleconsultDeliveryResponse, dispatchReadTeleconsultDeliveryRoutesApiDeliveryDispatchGet } from "../../../services/client";
import { useState } from "react";
import { DeliveryCard } from "./delivery-card";
const { Content } = Layout;

export function DispatchDeliveryScreen() {
    const { data: dispatchData, isLoading } = useQuery({
        queryKey: ['dispatch-delivery'],
        queryFn: () => dispatchReadTeleconsultDeliveryRoutesApiDeliveryDispatchGet(),
        refetchInterval: 30000, // refresh every 30 seconds
    });

    // Tab and filter logic
    const ZONES = [
        { key: 'central', label: 'Central' },
        { key: 'north', label: 'North' },
        { key: 'east', label: 'East' },
        { key: 'south', label: 'South' },
        { key: 'west', label: 'West' },
    ];
    const params = new URLSearchParams(window.location.search);
    const [activeTab, setActiveTab] = useState(() => {
        const location = params.get('location') || 'central';
        const url = new URL(window.location.href);
        url.searchParams.set('location', location);
        window.history.replaceState({}, '', url.toString());
        return location;
    });
    const [activeTypeTab, setActiveTypeTab] = useState(() => {
        const type = params.get('type') || 'mw';
        const url = new URL(window.location.href);
        url.searchParams.set('type', type);
        window.history.replaceState({}, '', url.toString());
        return type;
    });
    const [searchValue, setSearchValue] = useState('');


    const handleTabChange = (setter: typeof setActiveTab | typeof setActiveTypeTab, value: string) => {
        setter(value);
        
        const url = new URL(window.location.href);
        
        if (setter === setActiveTab) {
            url.searchParams.set('location', value);
        } else if (setter === setActiveTypeTab) {
            url.searchParams.set('type', value);
        }
        
        setter(value)
        window.history.replaceState({}, '', url.toString());
    };

    const filteredData = dispatchData?.filter((d: TeleconsultDeliveryResponse) => {
        const zoneMatch = activeTab === 'all' || d.zone === activeTab;
        const typeMatch = activeTypeTab === 'mw' ? d.is_migrant : !d.is_migrant;
        const searchMatch = !searchValue || 
        (
            (d.sgimed_patient_id && d.sgimed_patient_id.toLowerCase().includes(searchValue.toLowerCase())) 
            || (d.patient_name && d.patient_name.toLowerCase().includes(searchValue.toLowerCase()))
        );
        return zoneMatch && typeMatch && searchMatch;
    });

    return (
        <Layout className='p-0 bg-white'>
            {/* <Header style={{ padding: 16 }} className='bg-white justify-between items-center'>
                <h1 className='text-xl font-bold'>Welcome Driver</h1>
                <h3 className='text-sm text-gray-500 mt-2'>Delivery Jobs Page</h3>
            </Header> */}
            <Content className="mt-2">
                <style>{`
                  .ant-tabs-tabpane {
                    padding: 10 !important;
                  }
                `}</style>
                <Tabs
                    className="bg-white"
                    activeKey={activeTab}
                    onChange={(value) => handleTabChange(setActiveTab, value)}
                    centered
                    items={ZONES.map(zone => ({
                        key: zone.key,
                        label: zone.label,
                        children: null // We'll render content below
                    }))}
                />
                <div style={{ width: '100%', marginTop: '0px', marginBottom: '16px' }}>
                    <Row align="middle">
                        <Col flex="auto" className="ml-3 mr-2">
                            <Input
                                placeholder="Search by Patient Name / Patient ID..."
                                value={searchValue}
                                onChange={e => setSearchValue(e.target.value)}
                                allowClear
                            />
                        </Col>
                        <Col style={{ marginRight: '12px' }}>
                            <Select
                                value={activeTypeTab}
                                onChange={(value) => handleTabChange(setActiveTypeTab, value)}
                                style={{ width: 120 }}
                                options={[
                                    { value: 'mw', label: 'MW' },
                                    { value: 'private', label: 'Private' },
                                ]}
                            />
                        </Col>
                    </Row>
                </div>
                <div className="flex flex-col gap-4 mx-3">
                    {isLoading ? (
                        <Skeleton active />
                    ) : (
                        filteredData?.length
                            ? filteredData.map((delivery) => <DeliveryCard delivery={delivery} navigation={true} />)
                            : <div className="text-center text-gray-400">No deliveries</div>
                    )}
                </div>
            </Content>
        </Layout>
    );
}
