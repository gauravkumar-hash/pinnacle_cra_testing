import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, message, TableColumnsType } from "antd"
import { ApiError, deleteDynamicRatesApiAdminRatesIdDelete, DynamicPricingRow, DynamicRateResp, getDynamicRatesApiAdminRatesGet, upsertDynamicRatesApiAdminRatesPost } from "../../services/client";
import { getErrorMsg } from "@/utils";
import { AddButton, ContentView } from "@/components/Content";
import { CrudActions, EditableTable, SelectColumn, TableProvider, TimeRangeColumn, useTableProvider } from "@/components/Table";

export function RatesScreen() {
    const qry = useQuery({
        queryKey: ['rates'],
        queryFn: getDynamicRatesApiAdminRatesGet,
    })

    return (
        <TableProvider<DynamicPricingRow> rowKey='id'>
            <ContentView
                title="Dynamic Rates"
                actions={<Actions />}
                qry={qry}
            >
                <ContentData data={qry.data!} />
            </ContentView>
        </TableProvider>
    )
}

const Actions = () => {
    const { addRecord } = useTableProvider();
    return <AddButton onClick={addRecord} />
}

const useEditHook = () => {
    const { cancelEdit } = useTableProvider();

    const queryClient = useQueryClient();
    const upsertMutation = useMutation({
        mutationFn: upsertDynamicRatesApiAdminRatesPost,
        onSuccess: (_) => {
            message.success('Dynamic rate created/updated successfully');
            queryClient.invalidateQueries({ queryKey: ['rates'] });
            cancelEdit();
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    const deleteMutation = useMutation({
        mutationFn: deleteDynamicRatesApiAdminRatesIdDelete,
        onSuccess: (_) => {
            message.success('Dynamic rate deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['rates'] });
        },
        onError: (error: ApiError) => {
            console.log(error);
            message.error(getErrorMsg(error))
        }
    })

    
    const onSave = async (record: DynamicPricingRow) => { 
        upsertMutation.mutate({
            requestBody: { 
                id: record.id,
                date: record.date, 
                start_time: record.start_time, 
                end_time: record.end_time, 
                amount: record.amount 
            }
        });
    };

    const onDelete = (id: any) => {
        deleteMutation.mutate({ id });
    }

    return { onSave, onDelete }
}

const ContentData = ({ data }: { data: DynamicRateResp }) => {
    const { onSave, onDelete } = useEditHook();

    const columns: TableColumnsType<DynamicPricingRow> = [
        SelectColumn({ 
            width: 150,
            dataIndex: 'date', 
            options: data.supported_days.map((date) => ({ value: date, label: date })) ?? [],
        }),
        TimeRangeColumn({
            title: 'Start / End Time',
            dataIndex: 'start_time,end_time',
        }),
        SelectColumn({
            width: 150,
            dataIndex: 'amount',
            options: data.supported_rates.map((rate) => ({ value: `${rate}`, label: `$${rate.toFixed(2)}` })),
            render: (_, record) => `S$${record.amount.toFixed(2)}`
        }),
        CrudActions({
            onSave: onSave,
            onDelete: (id) => onDelete(id),
            // onSaveLoading: upsertMutation.isPending,
            // onDeleteLoading: deleteMutation.isPending && deleteMutation.variables?.requestBody.ids.includes(record.id),
        })
    ]

    return (
        <>
            {data.errors.length > 0 && <Alert message={data.errors.map((error) => <span key={error}>{error}<br/></span>)} type="error" />}
            <EditableTable
                columns={columns}
                dataSource={data.rates}
                />
        </>
    )
}
