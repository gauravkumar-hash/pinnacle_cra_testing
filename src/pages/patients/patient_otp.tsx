import { getAuthOtpsApiAdminPatientsOtpsGet, RedisLoginState } from "@/services/client";
import { useQuery } from "@tanstack/react-query";
import { Layout, Skeleton, Table } from "antd";
import dayjs from 'dayjs';

const { Content } = Layout;

export function PatientOTPScreen() {
    const { isPending, isError, data, error } = useQuery({
        queryKey: ['patients_otp'],
        queryFn: getAuthOtpsApiAdminPatientsOtpsGet,
    });
    
    if (isPending) return <Skeleton />;
    if (isError) return <div>{error.message}</div>;

    return (
        <Content className='flex flex-col gap-4 font-medium'>
            <Table
                rowKey={(r: RedisLoginState) => r.otp_expires_at}
                columns={[
                        { title: 'NRIC / FIN', dataIndex: '', render: (_, r) => `${r.id_type}: ${r.id_number}` },
                        { title: 'Mobile', dataIndex: '', render: (_, r) => `${r.mobile_code}${r.mobile_number}` },
                        { title: 'OTP', dataIndex: 'otp_code' },
                        { title: 'Sent at', dataIndex: 'otp_sent_at', render: (_) => dayjs(_ * 1000).format('YYYY-MM-DD HH:mm:ss') },
                        { title: 'Expires at', dataIndex: 'otp_expires_at', render: (_) => dayjs(_ * 1000).format('YYYY-MM-DD HH:mm:ss') }
                    ]}
                dataSource={data.filter((d) => d.state == 'verify_otp')}
                />
        </Content>
);   
}