import React, { useState } from 'react';
import { 
  Input, 
  Button, 
  Card, 
  Typography, 
  message, 
  Space, 
  Tabs, 
  Upload, 
  Radio, 
  Divider, 
  Tag, 
  Table, 
  Empty, 
  Alert, 
  ConfigProvider 
} from 'antd';
import { 
  DownloadOutlined, 

  InboxOutlined, 
  HistoryOutlined, 
  ThunderboltOutlined, 
  EyeOutlined,
  ClearOutlined, 
  ReloadOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { TextArea } = Input;
const {  Text } = Typography;
const { Dragger } = Upload;

const HealthReportExport: React.FC = () => {
  const [nricInput, setNricInput] = useState<string>('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [exportMode, setExportMode] = useState<'latest' | 'history'>('latest');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const [tablePagination, setTablePagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const API_URL = import.meta.env.VITE_ADMIN_API_URL;

  const handleClear = () => {
    setNricInput('');
    setFileList([]);
    setPreviewData([]);
    setTablePagination({ current: 1, pageSize: 10 });
    message.info("All fields cleared");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return dateStr.split('T')[0]; 
  };

  const columns = [
    { 
      title: 'Patient Name', 
      dataIndex: 'name', 
      key: 'name', 
      fixed: 'left' as const, 
      width: 170,
      render: (text: string) => <Text strong>{text || 'N/A'}</Text>
    },
    { title: 'NRIC', dataIndex: 'nric', key: 'nric', width: 130 },
    { 
      title: 'Date', 
      dataIndex: 'measurement_date', 
      key: 'date', 
      width: 110,
      render: (date: string) => formatDate(date)
    },
    { 
      title: 'Physical Metrics',
      children: [
        { title: 'Height', dataIndex: 'height', key: 'height', width: 90, render: (v: any) => v ? `${v} cm` : '-' },
        { title: 'Weight', dataIndex: 'weight', key: 'weight', width: 90, render: (v: any) => v ? `${v} kg` : '-' },
        { title: 'BMI', dataIndex: 'bmi', key: 'bmi', width: 80, render: (v: any) => v ? parseFloat(v).toFixed(1) : '-' },
        { title: 'BSA', dataIndex: 'bsa', key: 'bsa', width: 80, render: (v: any) => v ? parseFloat(v).toFixed(2) : '-' },
        { title: 'Waist', dataIndex: 'waist', key: 'waist', width: 90, render: (v: any) => v ? `${v} cm` : '-' },
      ]
    },
    { 
      title: 'Vitals & Labs',
      children: [
        { 
          title: 'BP (S/D)', 
          key: 'bp', 
          width: 110,
          render: (record: any) => {
            const s = record.systolic_bp || record.systolic;
            const d = record.diastolic_bp || record.diastolic;
            if (!s && !d) return '-';
            return <Tag color={parseInt(s) > 140 ? 'volcano' : 'blue'}>{s}/{d}</Tag>;
          } 
        },
        { title: 'HR', dataIndex: 'heart_rate', key: 'hr', width: 90, render: (v: any) => v ? `${v} bpm` : '-' },
        { title: 'Temp', dataIndex: 'temperature', key: 'temp', width: 80, render: (v: any) => v ? `${v}°C` : '-' },
        { title: 'SpO2', dataIndex: 'spo2', key: 'spo2', width: 80, render: (v: any) => v ? `${v}%` : '-' },
        { title: 'HBA1C', dataIndex: 'hba1c', key: 'hba1c', width: 90, render: (v: any) => v ? `${v}%` : '-' },
      ]
    },
    { 
      title: 'Vision',
      children: [
        { title: 'VA Left', dataIndex: 'va_left', key: 'val', width: 100 },
        { title: 'VA Right', dataIndex: 'va_right', key: 'var', width: 100 },
      ]
    },
    { 
      title: 'Lifestyle',
      children: [
        { 
          title: 'Smoking', 
          dataIndex: 'smoking', 
          key: 'smoking', 
          width: 110,
          render: (v: any) => {
            if (v === '1' || v === 1) return <Tag color="red">Smoker</Tag>;
            if (v === '3' || v === 3) return <Tag color="green">Non-Smoker</Tag>;
            return v || '-';
          }
        },
      ]
    },
  ];

  const handleAction = async (actionType: 'download' | 'preview') => {
    const formData = new FormData();
    if (nricInput.trim()) formData.append('nric_text', nricInput);
    if (fileList.length > 0 && fileList[0].originFileObj) {
      formData.append('file', fileList[0].originFileObj);
    }
    formData.append('latest_only', (exportMode === 'latest').toString());

    if (!nricInput.trim() && fileList.length === 0) {
      return message.error("Please provide NRICs first.");
    }

    setIsLoading(true);
    try {
      if (actionType === 'preview') {
        const res = await fetch(`${API_URL}/admin/health-report/preview`, { 
            method: 'POST', 
            body: formData 
        });
        
        if (!res.ok) throw new Error("Server error during preview fetch.");
        
        const result = await res.json();
        console.log("Preview Data Received:", result); // Debugging Log

        setPreviewData(result.data || []);
        setTablePagination({ ...tablePagination, current: 1 });
        
        if (result.missing?.length > 0) {
            message.warning(`${result.missing.length} NRICs not found.`);
        } else {
            message.success(`Found ${result.data?.length || 0} records.`);
        }
      } else {
        const endpoint = exportMode === 'latest' ? 'export-latest' : 'export-history';
        const res = await fetch(`${API_URL}/admin/health-report/${endpoint}`, { 
            method: 'POST', 
            body: formData 
        });
        
        if (!res.ok) throw new Error("Download failed");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Health_Report_${exportMode}_${new Date().getTime()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        message.success("Download started.");
      }
    } catch (err: any) {
      message.error(err.message || "An unexpected error occurred.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ token: { borderRadius: 6 } }}>
      <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1450px', margin: '0 auto' }}>
          
          <Card 
            title={<Space> Data Search & Filter</Space>} 
            extra={<Button icon={<ClearOutlined />} onClick={handleClear} type="text" danger>Clear All</Button>}
            style={{ borderRadius: '8px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '40px' }}>
              <div style={{ borderRight: '1px solid #f0f0f0', paddingRight: '20px' }}>
                <Text strong style={{ fontSize: '15px' }}>Step 1: Report Scope</Text>
                <Radio.Group 
                  value={exportMode} 
                  onChange={(e) => setExportMode(e.target.value)} 
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}
                >
                  <Radio value="latest"><Space><ThunderboltOutlined style={{color: '#faad14'}}/> Latest Snapshot</Space></Radio>
                  <Radio value="history"><Space><HistoryOutlined style={{color: '#1890ff'}}/> Full Visit History</Space></Radio>
                </Radio.Group>
                <Alert style={{ marginTop: '24px' }} message={exportMode === 'latest' ? "Showing only the most recent entry." : "Showing all clinical visits."} type="info" showIcon />
              </div>

              <div>
                <Text strong style={{ fontSize: '15px' }}>Step 2: Identification</Text>
                <Tabs items={[
                  { key: '1', label: 'Manual NRIC Entry', children: <TextArea rows={5} value={nricInput} onChange={e => setNricInput(e.target.value)} placeholder="Enter NRICs (one per line or comma-separated)..." /> },
                  { key: '2', label: 'Bulk File Upload', children: <Dragger multiple={false} fileList={fileList} beforeUpload={() => false} onChange={info => setFileList(info.fileList)}><p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1890ff' }} /></p><p className="ant-upload-text">Click or drag NRIC Excel/CSV list here</p></Dragger> }
                ]} />
                <Space style={{ marginTop: '24px', width: '100%', justifyContent: 'flex-end' }}>
                  <Button icon={<ReloadOutlined />} onClick={handleClear}>Reset</Button>
                  <Button type="primary" size="large" icon={<EyeOutlined />} loading={isLoading} onClick={() => handleAction('preview')}>
                    Preview in Table
                  </Button>
                  <Button size="large" icon={<DownloadOutlined />} loading={isLoading} onClick={() => handleAction('download')} style={{ backgroundColor: '#52c41a', color: 'white', border: 'none' }}>
                    Download Excel
                  </Button>
                </Space>
              </div>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              * Ensure Excel files are not password protected. Supported formats: .xlsx, .csv
            </Text>
          </Card>

          <Card title={<Space><EyeOutlined /> Records Preview {previewData.length > 0 && <Tag color="blue">{previewData.length}</Tag>}</Space>} style={{ borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {previewData.length > 0 ? (
              <Table 
                dataSource={previewData} 
                columns={columns} 
                rowKey={(record, index) => `${record.nric}-${index}`} 
                scroll={{ x: 1600, y: 600 }} // Increased x-scroll for lab columns
                pagination={{ 
                    ...tablePagination,
                    showSizeChanger: true, 
                    position: ['bottomCenter'],
                    total: previewData.length,
                    showTotal: (total) => `Total ${total} entries found`
                }}
                onChange={(p) => setTablePagination({ current: p.current || 1, pageSize: p.pageSize || 10 })}
                bordered
                size="middle"
              />
            ) : (
              <Empty description="No data to display. Provide NRICs and click Preview." />
            )}
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default HealthReportExport;
