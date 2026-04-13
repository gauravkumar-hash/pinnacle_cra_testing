import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DatePicker, Layout, message, Popconfirm, Skeleton, Table, TableColumnsType } from "antd"
import { ApiError, DocumentAdminResp, getHiddenDocumentsApiAdminPatientsHiddenPost, unhideDocumentApiAdminPatientsHiddenUpdatePost } from "../../services/client";
import { createContext, ReactNode, useContext, useState } from "react";
import dayjs, { Dayjs } from 'dayjs';
import { getErrorMsg } from "@/utils";
import { convertToTitleCase, dateSort } from "@/utils/table";
const { Header, Content } = Layout;

type FilterContextType = {
    date: Dayjs;
    setDate: (date: Dayjs) => void;
    selectedDate: string;
};
const FilterContext = createContext<FilterContextType>({
    date: dayjs(),
    setDate: () => {},
    selectedDate: dayjs().format('YYYY-MM-DD')
});

const FilterProvider = ({ children }: { children: ReactNode }) => {
    const [ date, setDate ] = useState<Dayjs>(dayjs());
    const selectedDate = date.format('YYYY-MM-DD');
    return (
        <FilterContext.Provider value={{ date, setDate, selectedDate }}>
            {children}
        </FilterContext.Provider>
    );
}

const useFilterProvider = (): FilterContextType => {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default function HiddenDocumentsScreen() {
    return (
        <FilterProvider>
            <HiddenDocumentsLayout />
        </FilterProvider>
    )
}

const HiddenDocumentsLayout = () => {
    const { selectedDate } = useFilterProvider();

    const qry = useQuery({
        queryKey: ['documents', 'hidden', selectedDate ],
        queryFn: ({ queryKey }) => getHiddenDocumentsApiAdminPatientsHiddenPost({ requestBody: { doc_date: queryKey[2] } }),
    })

    return (
        <Layout className='p-4'>
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
            <h1 className='text-xl font-semibold'>Hidden Documents</h1>
                <DateSelector />
            </Header>
            <Content className='flex flex-col gap-4 font-medium'>
                {qry.isPending && <Skeleton active />}
                {qry.isError && <div>{qry.error?.message}</div>}
                {qry.isSuccess && <ContentData data={qry.data} />}
            </Content>
        </Layout>
            
    )
}

const DateSelector = () => {
    const { date, setDate } = useFilterProvider();
    return (
        <div className='flex flex-row gap-2'>
            <Button type="text" icon={<LeftOutlined />} onClick={() => setDate(date.subtract(1, 'day'))}/>
            <DatePicker
                allowClear={false}
                onChange={setDate}
                maxDate={dayjs()}
                value={date}
                superNextIcon={<PlusOutlined />}
                format='DD-MM-YYYY'
                />
            <Button type="text" icon={<RightOutlined />} onClick={() => setDate(date.add(1, 'day'))} disabled={!date.isBefore(dayjs(), 'day')}/>
        </div>
    )
}

const filterGroup = (data: DocumentAdminResp[], key: string) => ({
    filters: [...new Set(data?.map((r: any) => r[key]))].sort().filter(r => r).map((r) => ({ text: convertToTitleCase(r), value: r })),
    onFilter: (v: any, r: any) => r[key]?.includes(v),
    filterSearch: true
})

const ContentData = ({ data }: { data: DocumentAdminResp[] }) => {    
    const columns: TableColumnsType<DocumentAdminResp> = [
        { title: 'NRIC / FIN', dataIndex: 'patient_nric' },
        { title: 'Name', dataIndex: 'patient_name' },
        { title: 'Branch', dataIndex: 'branch_name', ...filterGroup(data, 'branch_name') },
        { title: 'Doc Type', dataIndex: 'document_type', ...filterGroup(data, 'document_type')  },
        // { title: 'Name', dataIndex: 'name' },
        // { title: 'Date', dataIndex: 'document_date', sorter: dateSort('document_date') },
        { title: 'Last Updated', dataIndex: 'last_updated', sorter: dateSort('last_updated'), render: (_, r) => <span>{dayjs(r.last_updated).format('DD/MM/YYYY HH:mm')}</span> },
        
        // { title: 'Code', dataIndex: 'corporate_code', ...filterGroup('corporate_code') },
        // { title: 'Show Inv', dataIndex: 'hide_invoice', render: (_, r) => <Checkbox disabled={onToggleHideInvoice.isPending && r.id == onToggleHideInvoice.variables.requestBody.id} checked={!_} onChange={() => onToggleHideInvoice.mutate({ requestBody: { id: r.id, hide_invoice: !_ }})} /> },
        // { title: 'Status', dataIndex: 'status', ...filterGroup('status'), render: (_: TeleconsultStatus) => TagMapping[_] },
        { 
            title: '', 
            render: (_, r) => <RowAction id={r.id} />
        }
    ]

    
    return <Table
        // rowSelection={{ type: 'checkbox' }}
        columns={columns}
        dataSource={data?.sort(dateSort('document_date')).reverse()}
        rowKey={(row) => row.id}
        pagination={{ 
            // position: ['topRight'],
            defaultPageSize: 50,
            pageSizeOptions: ['50', '100'],
            showSizeChanger: true 
        }}
        />
}

const RowAction = ({ id }: { id: string }) => {
    const { selectedDate } = useFilterProvider();

    const queryClient = useQueryClient();
    const unhideDocMutation = useMutation({
        mutationFn: unhideDocumentApiAdminPatientsHiddenUpdatePost,
        onSuccess: (_) => {
            message.success('Updated document status successfully');
            queryClient.invalidateQueries({ queryKey: ['documents', 'hidden', selectedDate] });
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    return (
        <Popconfirm
            title="Unhide Document"
            description="Are you sure to unhide this document?"
            onConfirm={() => unhideDocMutation.mutate({ requestBody: { id } })}
            onCancel={() => {}}
            okText="Yes"
            cancelText="No"
            >
            <Button
                type="link"
                size='small' 
                loading={unhideDocMutation.isPending && unhideDocMutation.variables.requestBody.id == id}
                disabled={unhideDocMutation.isPending}
                >
                Unhide Document
            </Button>
        </Popconfirm>
    )
}