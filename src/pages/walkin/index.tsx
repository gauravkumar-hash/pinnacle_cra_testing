import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DatePicker, Layout, Skeleton, Table, TableColumnsType, Tag } from "antd"
import { Link } from "react-router-dom";
import { getWalkinsApiAdminWalkinGet, WalkinAdminResp, WalkinQueueStatus } from "../../services/client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import dayjs, { Dayjs } from 'dayjs';
const { Header, Content } = Layout;

const API_URL = import.meta.env.VITE_ADMIN_API_URL
const SGIMED_URL = import.meta.env.VITE_SGIMED_URL;

export function WalkinScreen() {
    const { session } = useAuth();
    const wsRef = useRef<WebSocket>();
    const connTimeRef = useRef<number>(Date.now());
    const [ disconnected, setDisconnected ] = useState(0);
    const queryClient = useQueryClient();

    const [ date, setDate ] = useState<Dayjs>(dayjs());
    const dateStr = date.format('YYYY-MM-DD');
    const qry = useQuery({
        queryKey: ['walkins', dateStr],
        queryFn: ({ queryKey }) => getWalkinsApiAdminWalkinGet({ date: queryKey[queryKey.length - 1] }),
    })

    const connect = () => {
        connTimeRef.current = Date.now();
        const wsUrl = `${API_URL.replace('https', 'wss')}/api/admin/walkin/ws?id=${session?.user.id}&date=${dateStr}`

        console.log(`Connecting: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
            console.log('connected');
            if (disconnected > 0) {
                queryClient.invalidateQueries({ queryKey: ['walkins'] })
            }
        }
        ws.onmessage = (event) => {
            console.log("Event:", event.data);
            // Ignore empty messages. This is a keep-alive message
            if (event.data == '{}') return;
            const data = JSON.parse(event.data)

            queryClient.setQueryData(['walkins', date.format('YYYY-MM-DD')], (oldData: WalkinAdminResp[]) => {
                const exists = oldData.map(entity => entity.id).includes(data.id);
                if (exists) {
                    return oldData.map(entity => entity.id === data.id ? data : entity)
                } else {
                    return [...oldData, data]
                }
            })
        }

        ws.onclose = (e) => {
            console.log('WS: closed.', e.reason);
            setDisconnected((cnt) => cnt + 1);
        }
        
        ws.onerror = (err) => {
            console.error('WS: error.', err);
            ws.close();
        };
    }

    // This connects, and disconnects when unmounted
    useEffect(() => {
        connect();
        return () => {
            console.log("Disconnecting from Use Effect")
            wsRef.current?.close();
        }
    }, [date])

    // This only called the reconnect if the component is still mounted
    useEffect(() => {
        if (disconnected) {
            const waitTime = (Date.now() - connTimeRef.current) > 3000 ? 0 : 3000;
            console.log(`Socket is closed. Reconnect will be attempted in ${waitTime / 1000} seconds.`);
            setTimeout(connect, waitTime);
        }
    }, [disconnected])

    const TagMapping: { [key in WalkinQueueStatus]: React.ReactNode } = {
        Pending: <Tag color='processing'>Pending</Tag>,
        Cancelled: <Tag>Cancelled</Tag>,
        Rejected: <Tag color='error'>Rejected</Tag>,
        'Checked In': <Tag color='success'>Checked In</Tag>,
        // 'Consult End': <Tag color='warning'>Consult End</Tag>,
        // Outstanding: <Tag color='error'>Outstanding</Tag>,
        // 'Dispense Medication': <Tag>Dispense Medication</Tag>,
        'Checked Out': <Tag>Checked Out</Tag>,
        // Would not show but needed for Typescript
        Missed: <Tag color='error'>Missed</Tag>,
        'Consult Start': <Tag color='success'>Consult Start</Tag>,
    }

    const filterGroup = (key: string) => ({
        filters: [...new Set(qry.data?.map((r: any) => r[key]))].sort().filter(r => r).map((r) => ({ text: r, value: r })),
        onFilter: (v: any, r: any) => r[key]?.includes(v),
        filterSearch: true
    })

    const stringSort = (key: string) => (a: any, b: any) => a[key]?.localeCompare(b[key]!);
    const dateSort = (key: string) => (a: any, b: any) => dayjs(a[key]).diff(dayjs(b[key]));

    const link = (r: WalkinAdminResp) => `${SGIMED_URL}/patient/${r.sgimed_patient_id}`;
    const columns: TableColumnsType<WalkinAdminResp> = [
        { title: 'Queue No.', dataIndex: 'queue_number', sorter: stringSort('queue_number') },
        { title: 'Date & Time', dataIndex: 'created_at', sorter: dateSort('created_at'), render: (_: string) => dayjs(`${_}Z`).format('hh:mm a') },
        { title: 'Name', dataIndex: 'patient_name', ...filterGroup('patient_name'), render: (_, r) => <Link to={link(r)} target="_blank" rel="noopener noreferrer">{_}</Link> },
        { title: 'NRIC / FIN', dataIndex: 'patient_nric', ...filterGroup('patient_nric') },
        { title: 'Branch', dataIndex: 'branch_name', ...filterGroup('branch_name') },
        { title: 'Status', dataIndex: 'status', ...filterGroup('status'), render: (_: WalkinQueueStatus) => TagMapping[_] },
        // { 
        //     title: '', 
        //     render: (_, r) => <>
        //         <Link to={link(r)} target="_blank" rel="noopener noreferrer">View</Link>
        //         <Button type="link" size='small' 
        //             onClick={() => onUpdateInvoice.mutate({ id: r.sgimed_visit_id })}
        //             loading={onUpdateInvoice.isPending && onUpdateInvoice.variables.id == r.sgimed_visit_id}
        //             disabled={onUpdateInvoice.isPending}
        //             >
        //             Update Invoice
        //         </Button>
        //     </>
        // }
    ]

    const renderContent = () => {
        if (qry.isPending) return <Skeleton />;
        if (qry.isError) return <div>{qry.error?.message}</div>;
        
        return <Table
            // rowSelection={{ type: 'checkbox' }}
            columns={columns}
            dataSource={qry.data?.sort(dateSort('created_at')).reverse()}
            rowKey={(row) => row.id}
            pagination={{ 
                // position: ['topRight'],
                defaultPageSize: 50,
                pageSizeOptions: ['50', '100'],
                showSizeChanger: true 
            }}
            />
    }

    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>Walkin Queue Requests</h1>
                <div className='flex flex-row gap-2'>
                    <Button type="text" icon={<LeftOutlined />} onClick={() => setDate((date) => date.subtract(1, 'day'))}/>
                    <DatePicker
                        allowClear={false}
                        onChange={setDate}
                        maxDate={dayjs()}
                        value={date}
                        superNextIcon={<PlusOutlined />}
                        />
                    <Button type="text" icon={<RightOutlined />} onClick={() => setDate((date) => date.add(1, 'day'))} disabled={dateStr == dayjs().format('YYYY-MM-DD')}/>
                </div>
            </Header>
            <Content className='flex flex-col gap-4 font-medium'>
                { renderContent() }
            </Content>
        </Layout>
    )
}