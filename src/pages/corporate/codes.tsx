import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message, TableColumnsType } from "antd"
import { ApiError, CorporateCodeResp, CorporateCodeRow, deleteCorporateCodesApiAdminCorporateCodesIdDelete, getCorporateCodesApiAdminCorporateCodesGet, InventoryItemInfo, searchInventoryApiAdminCorporateCodesV2InventorySearchGet, upsertCorporateCodesApiAdminCorporateCodesPost } from "../../services/client";
import { getErrorMsg } from "@/utils";
import { AddButton, ContentView } from "@/components/Content";
import { CheckboxColumn, CrudActions, EditableTable, InputColumn, SelectColumn, TableProvider, useTableProvider } from "@/components/Table";
import { DebounceSelect } from "@/components/DebounceSelect";

export function CorporateCodesScreen() {
    const qry = useQuery({
        queryKey: ['corporate_codes'],
        queryFn: getCorporateCodesApiAdminCorporateCodesGet,
    })

    return (
        <TableProvider<CorporateCodeRow> rowKey='id'>
            <ContentView
                title="Corporate Codes"
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
        mutationFn: upsertCorporateCodesApiAdminCorporateCodesPost,
        onSuccess: (_) => {
            message.success('Corporate code created/updated successfully');
            queryClient.invalidateQueries({ queryKey: ['corporate_codes'] });
            cancelEdit();
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    const deleteMutation = useMutation({
        mutationFn: deleteCorporateCodesApiAdminCorporateCodesIdDelete,
        onSuccess: (_) => {
            message.success('Corporate code deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['corporate_codes'] });
        },
        onError: (error: ApiError) => {
            console.log(error);
            message.error(getErrorMsg(error))
        }
    })

    
    const onSave = async (requestBody: CorporateCodeRow) => { 
        upsertMutation.mutate({ requestBody });
    };

    const onDelete = (id: any) => {
        deleteMutation.mutate({ id });
    }

    return { onSave, onDelete }
}

const InventorySearchColumn = ({ dataIndex, title, placeholder }: { dataIndex: string, title: string, placeholder: string }) => {
    const fetchInventoryOptions = async (search: string): Promise<Array<{ label: string; value: string }>> => {
        if (search.length < 2) return [];
        try {
            const response = await searchInventoryApiAdminCorporateCodesV2InventorySearchGet({ search });
            return response.map((item: InventoryItemInfo) => ({
                label: `${item.code} - ${item.name}`,
                value: item.id
            }));
        } catch (error) {
            console.error('Error fetching inventory:', error);
            return [];
        }
    };

    return {
        title,
        dataIndex,
        width: 250,
        editable: true,
        render: (value: string) => {
            if (!value) return '-';
            return value;
        },
        editComponent: (value: string, onChange: (value: string) => void) => (
            <DebounceSelect
                value={value ? { label: value, value } : undefined}
                placeholder={placeholder}
                fetchOptions={fetchInventoryOptions}
                onChange={(selected: any) => onChange(selected?.value || '')}
                style={{ width: '100%' }}
            />
        )
    };
};

const ContentData = ({ data }: { data: CorporateCodeResp }) => {
    const { onSave, onDelete } = useEditHook();

    const columns: TableColumnsType<CorporateCodeRow> = [
        InputColumn({ 
            dataIndex: 'code',
        }),
        SelectColumn({
            width: 150,
            dataIndex: 'amount',
            options: data.supported_rates.map((rate) => ({ value: `${rate}`, label: `$${rate.toFixed(2)}` })),
            render: (_, record) => `S$${record.amount.toFixed(2)}`
        }),
        InputColumn({
            dataIndex: 'remarks',
        }),
        CheckboxColumn({
            width: 150,
            dataIndex: 'skip_prepayment',
        }),
        CheckboxColumn({
            width: 150,
            dataIndex: 'hide_invoice',
        }),
        InventorySearchColumn({
            dataIndex: 'sgimed_consultation_item_code',
            title: 'Consultation Item',
            placeholder: 'Search consultation item...'
        }),
        InventorySearchColumn({
            dataIndex: 'sgimed_surcharge_item_code', 
            title: 'Surcharge Item',
            placeholder: 'Search surcharge item...'
        }),
        InputColumn({
            dataIndex: 'priority_index',
            title: 'Priority',
            width: 100
        }),
        CrudActions({
            onSave: onSave,
            onDelete: (id) => onDelete(id),
            // onSaveLoading: upsertMutation.isPending,
            // onDeleteLoading: deleteMutation.isPending && deleteMutation.variables?.requestBody.ids.includes(record.id),
        })
    ]

    return (
        <EditableTable
            columns={columns}
            dataSource={data.codes}
            />
    )
}
