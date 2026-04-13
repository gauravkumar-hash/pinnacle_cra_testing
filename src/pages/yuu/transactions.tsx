import { Button, Checkbox, DatePicker, Select, Table, TableColumnsType, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import dayjs, { Dayjs } from 'dayjs';
import { stringSort, dateSort } from "@/utils/table";
import { getYuuTransactionsApiAdminYuuTransactionsGet, YuuTransactionResp } from "@/services/client";
import { useDownload } from "@/hooks/useDownload";

const { RangePicker } = DatePicker;

export function TransactionsScreen() {
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>([dayjs().subtract(7, 'days'), dayjs()]);
    const [status, setStatus] = useState<string>('all');
    const [showRefundsOnly, setShowRefundsOnly] = useState(false);
    const [page, setPage] = useState(1);

    const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || null;
    const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || null;

    const qry = useQuery({
        queryKey: ['yuu-transactions', startDate, endDate, status, showRefundsOnly, page],
        queryFn: () => getYuuTransactionsApiAdminYuuTransactionsGet({ 
            startDate, 
            endDate,
            status, 
            showRefundsOnly, 
            page 
        })
    });

    const csvExportMutation = useDownload(
        ({ year, month }: { year: number; month: number }) => `/api/admin/yuu/transactions/export-refunds?year=${year}&month=${month}`,
        'yuu-refunds.csv'
    )

    const transactionsCsvExportMutation = useDownload(
        () => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (status !== 'all') params.append('status', status);
            if (showRefundsOnly) params.append('show_refunds_only', 'true');
            return `/api/admin/yuu/transactions/export-csv?${params.toString()}`;
        },
        'yuu-transactions.csv'
    )

    const columns: TableColumnsType<YuuTransactionResp> = [
        { 
            title: 'Transaction ID', 
            dataIndex: 'transaction_id',
            width: '20%'
        },
        { 
            title: 'Patient Name', 
            dataIndex: 'patient_name',
            sorter: stringSort('patient_name'),
            width: '20%'
        },
        { 
            title: 'Tomo ID', 
            dataIndex: 'tomo_id',
            width: '12%'
        },
        { 
            title: 'Amount', 
            render: (_, record) => `$${record.amount.toFixed(2)}`,
            width: '10%'
        },
        { 
            title: 'Status', 
            dataIndex: 'success', 
            render: (success) => 
                <Tag color={success ? 'green' : 'red'}>
                    {success ? 'Success' : 'Failed'}
                </Tag>,
            width: '10%'
        },
        { 
            title: 'Refund', 
            dataIndex: 'refund_details', 
            render: (refund) => {
                if (!refund) return '-';
                
                return (
                    <div>
                        <Tag color="blue">Refunded</Tag>
                        <div>${refund.refund_amount.toFixed(2)}</div>
                        <small>{dayjs(refund.refunded_at).format('YYYY-MM-DD HH:mm')}</small>
                    </div>
                );
            },
            width: '15%'
        },
        { 
            title: 'Created', 
            dataIndex: 'created_at', 
            render: (date) => dayjs(date + 'Z').format('YYYY-MM-DD HH:mm'),
            sorter: dateSort('created_at'),
            width: '13%'
        }
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Yuu Transactions</h2>
            </div>
            
            <div className="flex items-center gap-4">
                {/* Date range picker */}
                <RangePicker 
                    value={dateRange} 
                    onChange={setDateRange}
                    format="YYYY-MM-DD"
                    placeholder={['Start Date', 'End Date']}
                />
                
                {/* Status filter */}
                <Select value={status} onChange={setStatus} style={{ width: 120 }}>
                    <Select.Option value="all">All Status</Select.Option>
                    <Select.Option value="success">Success</Select.Option>
                    <Select.Option value="failed">Failed</Select.Option>
                </Select>
                
                {/* Refunds toggle */}
                <Checkbox 
                    checked={showRefundsOnly} 
                    onChange={(e) => setShowRefundsOnly(e.target.checked)}
                >
                    Show Refunds Only
                </Checkbox>
                
                <div className="grow" />

                <Button
                    onClick={() => transactionsCsvExportMutation.mutate({})}
                    loading={transactionsCsvExportMutation.isPending}
                >
                    Export Transactions CSV
                </Button>

                <Button
                    type="primary"
                    onClick={() => csvExportMutation.mutate({ year: dayjs().year(), month: dayjs().month() + 1 })}
                    loading={csvExportMutation.isPending}
                >
                    Export Refunds CSV
                </Button>
            </div>
            
            <Table 
                columns={columns} 
                dataSource={qry.data?.data}
                rowKey="id"
                pagination={{
                    current: qry.data?.pager.p,
                    total: qry.data?.pager.rows,
                    pageSize: qry.data?.pager.n,
                    onChange: setPage,
                    showSizeChanger: false,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} transactions`
                }}
                loading={qry.isLoading}
                scroll={{ x: 800 }}
            />
        </div>
    );
}