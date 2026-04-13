import { DownloadOutlined, FilePdfOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, DatePicker, Layout, message, Skeleton, Table, TableColumnsType, Space, Tooltip, Input, Popconfirm } from "antd"
import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import dayjs, { Dayjs } from 'dayjs';
import { dateSort } from "@/utils/table";
import { getHealthReportsApiAdminHealthReportsListPost, HealthReportResponse, regenerateHealthReportByNricApiAdminHealthReportsNricRegeneratePost } from "@/services/client";
import supabase from "@/services/supabase";

const { Header, Content } = Layout;
const { RangePicker } = DatePicker;

type FilterContextType = {
    dateRange: [Dayjs, Dayjs];
    setDateRange: (range: [Dayjs, Dayjs]) => void;
    nrics: string;
    setNrics: (nrics: string) => void;
    startDate: string;
    endDate: string;
};

const FilterContext = createContext<FilterContextType>({
    dateRange: [dayjs(), dayjs()],
    setDateRange: () => {},
    nrics: '',
    setNrics: () => {},
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
});

const FilterProvider = ({ children }: { children: ReactNode }) => {
    const [ dateRange, setDateRange ] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()]);
    const [ nrics, setNrics ] = useState<string>('');
    const startDate = dateRange[0].format('YYYY-MM-DD');
    const endDate = dateRange[1].format('YYYY-MM-DD');
    return (
        <FilterContext.Provider value={{ dateRange, setDateRange, nrics, setNrics, startDate, endDate }}>
            {children}
        </FilterContext.Provider>
    );
}

const useFilterProvider = (): FilterContextType => {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilterProvider must be used within a FilterProvider');
    }
    return context;
};

export default function HealthReportsScreen() {
    return (
        <FilterProvider>
            <HealthReportsLayout />
        </FilterProvider>
    )
}

const HealthReportsLayout = () => {
    const { startDate, endDate, nrics } = useFilterProvider();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Reset to page 1 whenever search filters change
    useEffect(() => {
        setPage(1);
    }, [startDate, endDate, nrics]);

    const qry = useQuery({
        queryKey: ['health_reports', startDate, endDate, nrics, page, pageSize],
        queryFn: ({ queryKey }) => {
            const requestBody: any = {
                start_date: queryKey[1] as string,
                end_date: queryKey[2] as string
            };
            const nricsParam = queryKey[3] as string;
            if (nricsParam && nricsParam.trim()) {
                requestBody.nrics = nricsParam;
            }
            return getHealthReportsApiAdminHealthReportsListPost({
                requestBody,
                page: queryKey[4] as number,
                limit: queryKey[5] as number
            });
        },
    })


    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-col gap-4 pb-6 mb-6'>
                <div className='flex flex-row justify-between items-center'>
                    <h1 className='text-xl font-semibold'>Health Reports</h1>
                    <ExportButtons />
                </div>
            </Header>
            <Content className='flex flex-col gap-4 font-medium'>
                <FilterSelector />
                {qry.isPending ? (
                    <Skeleton active />
                ) : qry.isError ? (
                    <div>{qry.error?.message}</div>
                ) : qry.isSuccess && qry.data ? (
                    <ContentData
                        data={qry.data.data}
                        total={qry.data.total}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={(newPage, newPageSize) => {
                            setPage(newPage);
                            if (newPageSize) setPageSize(newPageSize);
                        }}
                    />
                ) : null}
            </Content>
        </Layout>
    )
}

const FilterSelector = () => {
    const { dateRange, setDateRange, nrics, setNrics } = useFilterProvider();
    return (
        <div>
            <RangePicker
                allowClear={false}
                onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                        setDateRange([dates[0], dates[1]]);
                    }
                }}
                value={dateRange}
                format='DD-MM-YYYY'
            />
            <Input
                placeholder="Enter NRICs (e.g., S1234567A,S7654321B)"
                value={nrics}
                onChange={(e) => setNrics(e.target.value)}
                className="ml-2 w-[400px]"
            />
        </div>
    )
}

const ExportButtons = () => {
    const { startDate, endDate, nrics } = useFilterProvider();

    const csvExportMutation = useMutation({
        mutationFn: async ({ startDate, endDate, nrics }: { startDate: string; endDate: string; nrics?: string }) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }

            let url = `${import.meta.env.VITE_ADMIN_API_URL}/api/admin/health_reports/export/csv?start_date=${startDate}&end_date=${endDate}`;
            if (nrics && nrics.trim()) {
                url += `&nrics=${encodeURIComponent(nrics)}`;
            }
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            return { blob, startDate, endDate };
        },
        onSuccess: ({ blob, startDate, endDate }) => {
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `health_reports_${startDate}_${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            message.success('CSV exported successfully');
        },
        onError: (error) => {
            message.error('Failed to export CSV');
            console.error(error);
        }
    });

    const handleCsvExport = () => {
        csvExportMutation.mutate({
            startDate,
            endDate,
            nrics: nrics.trim() || undefined
        });
    };

    return (
        <Space>
            <Button
                icon={<DownloadOutlined />}
                onClick={handleCsvExport}
                loading={csvExportMutation.isPending}
            >
                Export CSV
            </Button>
        </Space>
    )
}

const ContentData = ({
    data,
    total,
    page,
    pageSize,
    onPageChange
}: {
    data: HealthReportResponse[],
    total: number,
    page: number,
    pageSize: number,
    onPageChange: (page: number, pageSize?: number) => void
}) => {
    const queryClient = useQueryClient();
    const { startDate, endDate, nrics } = useFilterProvider();

    const regenerateMutation = useMutation({
        mutationFn: regenerateHealthReportByNricApiAdminHealthReportsNricRegeneratePost,
        onSuccess: (response) => {
            message.success(response.message || `Regenerated ${response.reports_regenerated} report(s)`);
            queryClient.invalidateQueries({ queryKey: ['health_reports', startDate, endDate, nrics] });
        },
        onError: (error) => {
            message.error('Failed to regenerate health report');
            console.error(error);
        }
    });

    const pdfExportMutation = useMutation({
        mutationFn: async ({ sgimedHl7Id, patientNric }: { sgimedHl7Id: string; patientNric: string }) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Not authenticated');
            }
            
            const url = `${import.meta.env.VITE_ADMIN_API_URL}/api/admin/health_reports/export/pdf/${sgimedHl7Id}`;
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            return { blob, sgimedHl7Id, patientNric };
        },
        onSuccess: ({ blob, sgimedHl7Id, patientNric }) => {
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `health_report_${patientNric}_${sgimedHl7Id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            message.success('PDF exported successfully');
        },
        onError: (error) => {
            message.error('Failed to export PDF');
            console.error(error);
        }
    });

    const handlePdfExport = (record: HealthReportResponse) => {
        pdfExportMutation.mutate({
            sgimedHl7Id: record.sgimed_hl7_id,
            patientNric: record.patient_nric || 'unknown'
        });
    };
    
    const columns: TableColumnsType<HealthReportResponse> = [
        { 
            title: 'Report ID', 
            dataIndex: 'sgimed_report_id',
            width: 150,
        },
        { 
            title: 'Patient NRIC', 
            dataIndex: 'patient_nric',
            width: 120,
        },
        { 
            title: 'Patient Name', 
            dataIndex: 'patient_name',
            width: 200,
        },
        { 
            title: 'Report Date', 
            dataIndex: 'sgimed_report_file_date', 
            width: 180,
            sorter: dateSort('sgimed_report_file_date'), 
            render: (_, r) => <span>{dayjs(r.sgimed_report_file_date).format('DD/MM/YYYY HH:mm')}</span> 
        },
        { 
            title: 'Disclaimer', 
            dataIndex: 'disclaimer_accepted_at',
            width: 100,
            render: (value) => value ? 'Accepted' : 'Pending',
            filters: [
                { text: 'Accepted', value: true },
                { text: 'Pending', value: false }
            ],
            onFilter: (value, record) => {
                if (value === true) return !!record.disclaimer_accepted_at;
                return !record.disclaimer_accepted_at;
            }
        },
        { 
            title: 'Created', 
            dataIndex: 'created_at', 
            width: 180,
            sorter: dateSort('created_at'), 
            render: (_, r) => <span>{dayjs(r.created_at).format('DD/MM/YYYY HH:mm')}</span> 
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 180,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Popconfirm
                        title="Regenerate Health Report"
                        description={`Regenerate report for ${record.patient_nric}? This will fetch latest measurements and refresh the report.`}
                        onConfirm={() => regenerateMutation.mutate({ nric: record.patient_nric! })}
                        okText="Regenerate"
                        cancelText="Cancel"
                        disabled={!record.patient_nric}
                    >
                        <Tooltip title={record.patient_nric ? "Regenerate Report" : "NRIC required"}>
                            <Button
                                type="link"
                                size='small'
                                icon={<ReloadOutlined />}
                                loading={regenerateMutation.isPending && regenerateMutation.variables?.nric === record.patient_nric}
                                disabled={!record.patient_nric}
                            >
                                Regenerate
                            </Button>
                        </Tooltip>
                    </Popconfirm>
                    <Tooltip title="Export PDF">
                        <Button
                            type="link"
                            size='small'
                            icon={<FilePdfOutlined />}
                            loading={pdfExportMutation.isPending && pdfExportMutation.variables?.sgimedHl7Id === record.sgimed_hl7_id}
                            onClick={() => handlePdfExport(record)}
                        >
                            PDF
                        </Button>
                    </Tooltip>
                </Space>
            )
        }
    ]

    return <Table
        columns={columns}
        dataSource={data}
        rowKey={(row) => row.sgimed_hl7_id}
        pagination={{ 
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: onPageChange,
            pageSizeOptions: ['50', '100'],
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} reports`
        }}
        scroll={{ x: 1200 }}
    />
}