import { DeliveryStatus, DeliveryZone } from "@/services/client"
import { Tag } from "antd"
import React from "react"

export const TagMapping: { [key in DeliveryStatus | 'logistic-pending']: React.ReactNode } = {
    pending: <Tag color='processing'>Delivery Pending</Tag>,
    cancelled: <Tag color='default'>Cancelled</Tag>,
    failed: <Tag color='red'>Failed</Tag>,
    success: <Tag color='green'>Success</Tag>,
    retry: <Tag color='orange'>Retry</Tag>,
    'no_delivery_service': <Tag color='gray'>No Delivery<br/>Service</Tag>,
    'logistic-pending': <Tag color='warning'>Logistic Pending</Tag>,
}

export const ZoneTagMapping: { [key in DeliveryZone]: React.ReactNode } = {
    north: <Tag color='lime'>{`North`}</Tag>,
    south: <Tag color='gold'>{`South`}</Tag>,
    east: <Tag color='cyan'>{`East`}</Tag>,
    west: <Tag color='blue'>{`West`}</Tag>,
    central: <Tag color='geekblue'>{`Central`}</Tag>,
    unknown: <Tag color='purple'>{`Unknown`}</Tag>,
}

export const IsMigrantAreaTagMapping: { [key: string]: React.ReactNode } = {
    true: <Tag color='green'>Zone F</Tag>,
    false: <Tag color='red'>Outside<br/>Zone F</Tag>,
}

export const PatientTypeTagMapping: { [key: string]: React.ReactNode } = {
    "true": <Tag color='default'>Migrant</Tag>,
    "false": <Tag style={{ backgroundColor: '#e6f7ff', color: '#1890ff', borderColor: '#91d5ff' }}>Private</Tag>,
}

export interface PatientInfo {
    sgimedPatientId: string;
    name: string;
    address: string;
}
