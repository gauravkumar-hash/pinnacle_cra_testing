import { forwardRef, useImperativeHandle } from 'react';
import { Form, Select } from 'antd';
import type { DeliveryZone } from '@/services/client/types.gen';
import { ZoneInfoCard, expandSectorRanges } from './zone-utils';

interface ZoneFormProps {
    initialZone?: DeliveryZone;
    initialSectors?: string[];
    noServiceSectors?: string[];
    migrantAreaSectors?: string[];
    onFinish: (values: { sector: string[], zone?: string }) => void;
    loading?: boolean;
    showZoneSelect?: boolean;
}

export interface ZoneFormRef {
    submit: () => void;
}

export const ZoneForm = forwardRef<ZoneFormRef, ZoneFormProps>(({ initialZone, initialSectors = [], noServiceSectors = [], migrantAreaSectors = [], onFinish, showZoneSelect = true }, ref) => {
    const [form] = Form.useForm();

    useImperativeHandle(ref, () => ({
        submit: () => {
            form.submit();
        }
    }));

    // Generate sector range options based on the expanded sector codes
    const sectorRanges = expandSectorRanges(initialSectors);

    const sectorOptions = sectorRanges.map((sector_code: string) => ({
        label: sector_code,
        value: sector_code
    }));

    return (
        <div className='flex flex-col gap-4 font-medium' style={{ width: 600 }}>
            {initialSectors.length > 0 && (
                <ZoneInfoCard initialZone={initialZone} initialSectors={initialSectors} noServiceSectors={noServiceSectors} migrantAreaSectors={migrantAreaSectors} />
            )}

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                    sector: [],
                    zone: initialZone
                }}
            >
                <Form.Item
                    label="Sector"
                    name="sector"
                    rules={[{ required: true, message: 'Please select at least one sector!' }]}
                >
                    <Select
                        mode="multiple"
                        placeholder="Select sector"
                        options={sectorOptions}
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                {showZoneSelect && (
                    <Form.Item
                        label="Zone"
                        name="zone"
                        rules={[{ required: true, message: 'Please select a zone!' }]}
                    >
                        <Select placeholder="Select a zone">
                            <Select.Option value="north">North</Select.Option>
                            <Select.Option value="south">South</Select.Option>
                            <Select.Option value="east">East</Select.Option>
                            <Select.Option value="west">West</Select.Option>
                            <Select.Option value="central">Central</Select.Option>
                        </Select>
                    </Form.Item>
                )}
            </Form>
        </div>
    );
}); 
