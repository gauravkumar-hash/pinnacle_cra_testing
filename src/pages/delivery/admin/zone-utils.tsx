import React from 'react';
import { Alert, Card, Typography } from 'antd';
import type { DeliveryZone } from '@/services/client/types.gen';

interface ZoneInfoCardProps {
    initialZone?: DeliveryZone;
    initialSectors: string[];
    noServiceSectors: string[];
    migrantAreaSectors: string[];
}

// Helper function to expand sector code ranges
export function expandSectorRanges(ranges: string[], excludedValues?: string[]): string[] {
    const rangeList = ranges.flatMap(
        (r) => {
            if (!r.includes('-')) {
                return [r];
            }
            const [start, end] = r.split('-').map(num => parseInt(num.trim()));
            const result = [];
            for (let i = start; i <= end; i++) {
                result.push(i.toString().padStart(2, '0'));
            }
            return result;
        }
    );

    const excludedValueArray = excludedValues?.flatMap(
        (r) => {
            if (!r.includes('-')) {
                return [r];
            }
            const [start, end] = r.split('-').map(num => parseInt(num.trim()));
            const result = [];
            for (let i = start; i <= end; i++) {
                result.push(i.toString().padStart(2, '0'));
            }
            return result;
        }
    );

    return excludedValueArray ? rangeList.filter(value => !excludedValueArray.includes(value)) : rangeList;
}

export const ZoneInfoCard: React.FC<ZoneInfoCardProps> = ({ initialZone, initialSectors, noServiceSectors, migrantAreaSectors }) => {
    return (
        <Card title="Zone Information" className='mb-4'>
            <div className='flex flex-col gap-2'>
                {initialZone && (
                    <div>
                        <Typography.Text strong>Current Zone:</Typography.Text> {initialZone}
                    </div>
                )}
                <div>
                    <Typography.Text strong>Sector Ranges:</Typography.Text>
                    <div className='mt-2'>
                        {initialSectors.map((range: string, index: number) => (
                            <div key={index} className='text-gray-600'>{range}</div>
                        ))}
                    </div>
                </div>
                {migrantAreaSectors.length > 0 && (
                    <div>
                        <Alert 
                            description={"Zone F - Migrant Area Sector Code\n : " + migrantAreaSectors.join(', ')}
                            type="warning" 
                            style={{ fontSize: 12, padding: 8 }}
                        />
                    </div>
                )}
                {noServiceSectors.length > 0 && (
                    <div>
                        <Alert 
                            description={"Sector with no delivery service\n : " + noServiceSectors.join(', ')}
                            type="error" 
                            style={{ fontSize: 12, padding: 8 }}
                        />
                    </div>
                )}
            </div>
        </Card>
    );
};
