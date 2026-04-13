import { ContentView } from "@/components/Content";
import { Button, Form, Space } from "antd";
import { DatePicker } from 'antd';
import { Dayjs } from "dayjs";
import { useDownload } from "@/hooks/useDownload";
import { useState } from "react";
const { RangePicker } = DatePicker;

type FormFields = {
    dateRange: [Dayjs, Dayjs]
}

type ReportType = 'reconciliation' | 'teleconsultation' | 'yuu-transactions';

export default function ReconciliationScreen() {
    const [exportingReport, setExportingReport] = useState<ReportType | null>(null);
    const [form] = Form.useForm<FormFields>();

    const reconciliationDownload = useDownload(
        (params: { start_date: string; end_date: string }) =>
            `/api/admin/reports/reconciliation?start_date=${params.start_date}&end_date=${params.end_date}`,
        'reconciliation_report.csv'
    );

    const teleconsultationDownload = useDownload(
        (params: { start_date: string; end_date: string }) =>
            `/api/admin/teleconsult/report?start_date=${params.start_date}&end_date=${params.end_date}`,
        'teleconsultation_report.csv'
    );

    const yuuTransactionsDownload = useDownload(
        (params: { start_date: string; end_date: string }) =>
            `/api/admin/yuu/transactions/export-csv?start_date=${params.start_date}&end_date=${params.end_date}`,
        'yuu_transactions_report.csv'
    );

    const handleDownload = (reportType: ReportType) => {
        form.validateFields().then((values) => {
            setExportingReport(reportType);
            const params = {
                start_date: values.dateRange[0].format('YYYY-MM-DD'),
                end_date: values.dateRange[1].format('YYYY-MM-DD'),
            };

            const mutationMap = {
                'reconciliation': reconciliationDownload,
                'teleconsultation': teleconsultationDownload,
                'yuu-transactions': yuuTransactionsDownload
            };

            mutationMap[reportType].mutate(params, {
                onSettled: () => {
                    setExportingReport(null);
                }
            });
        });
    };

    return <ContentView
        title="Reports"
        >
        <Form
            form={form}
            name="basic"
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 16 }}
            style={{ maxWidth: 600 }}
            autoComplete="off"
            >
            <Form.Item<FormFields>
                label="Date Range"
                name="dateRange"
                rules={[{ required: true, message: 'Date Range is required' }]}
                >
                <RangePicker />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                        type="primary"
                        loading={exportingReport === 'reconciliation'}
                        disabled={exportingReport !== null && exportingReport !== 'reconciliation'}
                        onClick={() => handleDownload('reconciliation')}
                        block
                    >
                        Download Reconciliation Report
                    </Button>
                    <Button
                        type="primary"
                        loading={exportingReport === 'teleconsultation'}
                        disabled={exportingReport !== null && exportingReport !== 'teleconsultation'}
                        onClick={() => handleDownload('teleconsultation')}
                        block
                    >
                        Download Teleconsultation Report
                    </Button>
                    <Button
                        type="primary"
                        loading={exportingReport === 'yuu-transactions'}
                        disabled={exportingReport !== null && exportingReport !== 'yuu-transactions'}
                        onClick={() => handleDownload('yuu-transactions')}
                        block
                    >
                        Download Yuu Transactions Report
                    </Button>
                </Space>
            </Form.Item>
        </Form>
    </ContentView>
}
