import React, { useEffect, useState } from "react";
import { Button, Layout, Radio, Card, message, Alert } from "antd"
import { ArrowLeftOutlined } from '@ant-design/icons';
const { Content } = Layout;
import './styles.css'
import { SignComponent } from "./sign";
import { useLocation, useNavigate } from "react-router-dom";
import { DeliveryCard } from "./delivery-card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TeleconsultDeliveryResponse } from "../../../services/client";
import { getErrorMsg } from "@/utils";
import { useAuth } from "../../../context/AuthProvider";
import { updateDeliveryStatus } from "@/apis/delivery";

export function SignDeliveryScreen() {
    const [deliveryStatus, setDeliveryStatus] = useState("success");
    const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
    const { state } = useLocation();
    const delivery: TeleconsultDeliveryResponse = state?.delivery;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { session } = useAuth();

    const updateDeliveryStatusMutation = useMutation({
        mutationFn: async (data: { id: string; success: boolean; recipient_name?: string, file?: File | null }) => {
            const formData = new FormData();
            const requestJson = {
                id: data.id,
                success: data.success,
                recipient_name: data.recipient_name
            };
            formData.append('request_json', JSON.stringify(requestJson));
            if (data.file && data.success) {
                formData.append('file', data.file);
            }

            return await updateDeliveryStatus(session, formData);
        },
        onSuccess: () => {
            message.success('Delivery status updated successfully');
            queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
            const params = new URLSearchParams(window.location.search);
            const type = params.get('type');
            const location = params.get('location');
            navigate(`/delivery${type ? `?type=${type}` : ''}${location ? `${type ? '&' : '?'}location=${location}` : ''}`);
        },
        onError: (error: any) => {
            message.error(getErrorMsg(error));
        }
    });

    useEffect(() => {
        if (!delivery) {
            const params = new URLSearchParams(window.location.search);
            const type = params.get('type');
            const location = params.get('location');
            navigate(`/delivery${type ? `?type=${type}` : ''}${location ? `${type ? '&' : '?'}location=${location}` : ''}`);
        }
    }, [delivery]);

    const options = [
        {
            value: "success",
            label: (
                <div className="flex items-center font-semibold text-green-700">
                    <span style={{ fontSize: 18, marginRight: 8 }}>✔️</span> Successful Delivery
                </div>
            ),
            border: "border-green-600",
            bg: "bg-green-50",
        },
        {
            value: "failed",
            label: (
                <div className="flex items-center font-semibold text-red-700">
                    <span style={{ fontSize: 18, marginRight: 8 }}>❌</span> Failed Delivery
                </div>
            ),
            border: "border-red-600",
            bg: "bg-red-50",
        },
    ];

    // Reset details view if status changes
    React.useEffect(() => {
        setShowDeliveryDetails(false);
    }, [deliveryStatus]);

    const handleStatusSubmit = (recipient_name: string | undefined, file: File | null) => {
        if (!delivery?.id) return;
        
        if (deliveryStatus === "success") {
            updateDeliveryStatusMutation.mutate({
                id: delivery.id,
                success: true,
                recipient_name: recipient_name,
                file: file
            });
        } else {
            updateDeliveryStatusMutation.mutate({
                id: delivery.id,
                success: false,
            });
        }
    };

    const handleSuccessStatusButtonClick = () => {
        if (delivery.is_migrant) {
            handleStatusSubmit(undefined, null);
        } else {
            setShowDeliveryDetails(true);
        }
    }

    return (
        <Layout className="p-0 bg-gray-100">
            {/* <Header style={{ padding: 16 }} className="bg-gray-100 justify-between items-center">
                <h1 className="text-xl font-bold">Welcome Driver</h1>
                <h3 className='text-sm text-gray-500 mt-2'>Delivery Jobs Update Page</h3>
            </Header> */}
            <Content className="mt-2 bg-gray-100">
                <div className="flex justify-center w-full mt-2" style={{ width: "400px", marginLeft: "auto", marginRight: "auto" }}>
                    <Card className="w-full max-w-screen-md" bodyStyle={{ padding: 16, width: "100%" }}>
                        {!showDeliveryDetails ? (
                            <>
                                <h2 className="text-lg font-semibold mb-2">Delivery Details</h2>
                                <DeliveryCard delivery={delivery} navigation={false} />
                                <div className="mt-6"></div>
                                <Alert message={delivery.is_migrant ? "This delivery does not require a signature." : "This delivery requires a signature."} type={delivery.is_migrant ? "info" : "warning"} />
                                <div className="mt-6"></div>
                                <h2 className="text-lg font-semibold mb-2">Select Delivery Status</h2>
                                {options.map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={`w-full cursor-pointer block`}
                                        style={{ width: "100%" }}
                                    >
                                        <div
                                            className={`mt-2 flex items-center w-full p-4 rounded border transition-colors ${
                                                deliveryStatus === opt.value
                                                    ? `${opt.border} ${opt.bg}`
                                                    : "border-gray-300 bg-white"
                                            }`}
                                            style={{ width: "100%", height: "50px", borderRadius: "12px" }}
                                        >
                                            <Radio
                                                value={opt.value}
                                                checked={deliveryStatus === opt.value}
                                                onChange={() => setDeliveryStatus(opt.value)}
                                                style={{ marginRight: 16 }}
                                            />
                                            {opt.label}
                                        </div>
                                    </label>
                                ))}
                                {deliveryStatus === "success" && (
                                    <Button
                                        type="primary"
                                        size="large"
                                        className="w-full mt-8"
                                        onClick={handleSuccessStatusButtonClick}
                                    >
                                        {delivery.is_migrant ? "Submit Successful Delivery" : "Continue to Delivery Details"}
                                    </Button>
                                )}
                                {deliveryStatus === "failed" && (
                                    <Button
                                        type="primary"
                                        danger
                                        size="large"
                                        className="w-full mt-8"
                                        onClick={() => handleStatusSubmit(undefined, null)}
                                        loading={updateDeliveryStatusMutation.isPending}
                                    >
                                        Submit Failed Delivery
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center mb-6">
                                    <Button
                                        type="text"
                                        icon={<ArrowLeftOutlined style={{ fontSize: 20 }} />}
                                        onClick={() => setShowDeliveryDetails(false)}
                                        style={{ marginRight: 8 }}
                                    />
                                    <span className="text-xl font-bold">Successful Delivery Details</span>
                                </div>
                                <SignComponent delivery={delivery} handleSubmit={handleStatusSubmit}/>
                            </>
                        )}
                    </Card>
                </div>
            </Content>
        </Layout>
    );
}
