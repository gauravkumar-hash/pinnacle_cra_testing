import { Card } from "antd";
import { TeleconsultDeliveryResponse } from "@/services/client/types.gen";
import { useNavigate } from "react-router-dom";
import { TagMapping } from "../util";
import React from "react";
import dayjs from "dayjs";

interface DeliveryCardProps {
    delivery: TeleconsultDeliveryResponse;
    navigation?: boolean;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, navigation = false }) => {
    const navigate = useNavigate();
    const handleClick = () => {
        if (navigation) {
            const params = new URLSearchParams(window.location.search);
            const type = params.get('type');
            const location = params.get('location');
            navigate(`./sign${type ? `?type=${type}` : ''}${location ? `&location=${location}` : ''}`, { state: { delivery } });
        }
    };
    
    const patientName = delivery.patient_name?.replace(/\n/g, ', ') || '';
    const patientQueueNumber = delivery.patient_queue_number?.replace(/\n/g, ', DO - ') || '';
    const sgimedPatientId = delivery.sgimed_patient_id?.replace(/\n/g, ', ') || '';

    return (
        <div
            key={delivery.id}
            onClick={navigation ? handleClick : undefined}
            className={`cursor-pointer hover:opacity-80 transition-opacity${!navigation ? ' pointer-events-none ' : ''}`}
        >
            <Card size="small" className="flex flex-col justify-between h-full border-gray-300 border-2">
                {/* Top row: queue number and status tag */}
                <div className="flex flex-row justify-between items-start w-full">
                    <span className="text-blue-600 font-semibold">DO - {patientQueueNumber?.trim()}</span>
                    <div className="ml-auto">{TagMapping[delivery.status]}</div>
                </div>
                {/* Main content block */}
                <div className="w-full mt-1">
                    <div className="font-medium">{patientName?.trim()}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-1 my-1">
                        <span className="bg-purple-100 text-purple-600 rounded px-1.5 py-0.5 text-xs font-semibold mr-1">ID</span>
                        <span>{sgimedPatientId?.trim()}</span>
                    </div>
                    {/* DELIVERY DATE BOX */}
                    <div className="flex flex-row gap-2 w-full flex-nowrap">
                        <div className="w-1/2 bg-orange-50 border-l-4 border-orange-400 rounded-md px-2 py-1.5 my-2 flex items-center gap-1.5">
                            <span className="text-sm">📦</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-orange-500">Delivery</span>
                                <span className="text-xs text-gray-800 font-bold whitespace-nowrap">
                                    {delivery.delivery_date ? dayjs(delivery.delivery_date).format('DD/MM/YYYY') : ''}
                                </span>
                            </div>
                        </div>
                        {/* CONSULTATION END BOX */}
                        <div className="w-1/2 bg-blue-50 border-l-4 border-blue-400 rounded-md px-2 py-1.5 my-2 flex items-center gap-1.5">
                            <span className="text-sm text-blue-500">🕒</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-blue-500">Consult Time</span>
                                <span className="text-xs text-gray-800 font-bold whitespace-nowrap">
                                    {delivery.consultation_date ? dayjs(delivery.consultation_date).format('DD/MM/YYYY hh:mm a') : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* PHONE NUMBER */}
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                        <span>📞</span>
                        <span>{delivery.phone_number?.includes('+65 ') ? delivery.phone_number?.substring(4) : delivery.phone_number?.trim()}</span>
                    </div>
                    {/* ADDRESS */}
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                        <span>📍</span>
                        <span>{delivery.address?.trim()}</span>
                    </div>
                </div>
            </Card>
        </div>
    );
};