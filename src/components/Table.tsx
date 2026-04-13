import { Button, Checkbox, Input, Popconfirm, Select, TimePicker } from "antd";
import Table, { ColumnsType } from "antd/es/table";
import { createContext, useContext, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { timeToStr } from "@/utils";

export const useTableProvider = () => useContext(TableContext);

const TableContext = createContext<{
    editRecord: any | null,
    setEditRecord: (record: any) => void,
    rowKey: (row: any) => string,
    addRecord: () => void,
    cancelEdit: () => void,
}>({
    editRecord: null,
    setEditRecord: (_: any) => {},
    rowKey: () => '',
    addRecord: () => {},
    cancelEdit: () => {},
});

export const TableProvider = <T,>({ rowKey, children }: { rowKey: any, children: React.ReactNode }) => {
    const [ editRecord, setEditRecord ] = useState<T | null>()
    // const [ rowKey, setRowKey ] = useState<(row: T) => string>(() => '');

    const addRecord = () => setEditRecord({ [rowKey]: '' } as T);
    const cancelEdit = () => setEditRecord(null);

    return <TableContext.Provider value={{ 
        editRecord, 
        setEditRecord, 
        rowKey: (row) => row[rowKey],
        addRecord,
        cancelEdit,
    }}>{children}</TableContext.Provider>;
}

export const EditableTable = <T,>({ columns, dataSource }: { columns: ColumnsType<T>, dataSource: T[] }) => {
    const { editRecord, rowKey } = useTableProvider();

    // useEffect(() => {
    //     setRowKey((row) => row ? rowKey(row) : null);
    // }, [setRowKey, rowKey]);
    
    return <Table
        columns={columns}
        dataSource={editRecord && rowKey(editRecord) === '' ? [editRecord, ...dataSource] : dataSource}
        rowKey={rowKey}
        pagination={{ 
            // position: ['topRight'],
            defaultPageSize: 50,
            pageSizeOptions: ['50', '100'],
            showSizeChanger: true 
        }}
        />
}

// Convert abc_bcd to Abc Bcd
export const convertToTitleCase = (str: string) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const isEditing = (record: any, editRecord: any, rowKey: (row: any) => string) => {
    return editRecord && rowKey(editRecord) == rowKey(record);
}

export const SelectColumn = <T,>({ title, dataIndex, options, width, style, render }: { title?: string, dataIndex: string, options: { value: string, label: string }[], width?: number, style?: React.CSSProperties, render?: (value: any, record: T) => React.ReactNode }) => {
    const { editRecord, setEditRecord, rowKey } = useTableProvider();

    return {
        title: title ? title : convertToTitleCase(dataIndex), 
        dataIndex: dataIndex,
        width: width,
        render: (value: any, record: T) => {
            if (isEditing(record, editRecord, rowKey)) {
                return (
                    <Select
                        style={{ width: '100%', ...style }}
                        value={editRecord[dataIndex]}
                        onChange={(value) => setEditRecord((r: T) => ({ ...r!, [dataIndex]: value }))}
                        options={options}
                        />
                );
            }

            return render ? render(value, record) : <span>{value}</span>
        }
    }
}

export const InputColumn = <T,>({ title, dataIndex, width, style, render }: { title?: string, dataIndex: string, width?: number, style?: React.CSSProperties, render?: (value: any, record: T) => React.ReactNode }) => {
    const { editRecord, setEditRecord, rowKey } = useTableProvider();

    return {
        title: title ? title : convertToTitleCase(dataIndex), 
        dataIndex: dataIndex,
        width: width,
        render: (value: any, record: T) => {
            if (isEditing(record, editRecord, rowKey)) {
                return (
                    <Input
                        style={{ width: '100%', ...style }}
                        value={editRecord[dataIndex]}
                        onChange={(e) => setEditRecord((r: T) => ({ ...r!, [dataIndex]: e.target.value }))}
                        />
                );
            }

            return render ? render(value, record) : <span>{value}</span>
        }
    }
}

export const CheckboxColumn = <T,>({ title, dataIndex, width, style, render }: { title?: string, dataIndex: string, width?: number, style?: React.CSSProperties, render?: (value: any, record: T) => React.ReactNode }) => {
    const { editRecord, setEditRecord, rowKey } = useTableProvider();

    return {
        title: title ? title : convertToTitleCase(dataIndex), 
        dataIndex: dataIndex,
        width: width,
        render: (value: any, record: T) => {
            if (isEditing(record, editRecord, rowKey)) {
                return <Checkbox
                    style={style}
                    checked={editRecord[dataIndex]}
                    onChange={(e) => setEditRecord((r: T) => ({ ...r!, [dataIndex]: e.target.checked }))}
                    />
            }

            return render ? render(value, record) : <Checkbox checked={value} disabled />
        }
    }
}

export const TimeRangeColumn = <T,>({ title, dataIndex, render }: { title?: string, dataIndex: string, render?: (value: any, record: T) => React.ReactNode }) => {
    const { editRecord, setEditRecord, rowKey } = useTableProvider();

    return {
        title: title ? title : convertToTitleCase(dataIndex), 
        dataIndex: dataIndex,
        render: (value: any, record: T) => {
            const [startDataIndex, endDataIndex] = dataIndex.split(',');

            if (isEditing(record, editRecord, rowKey)) {
                return (
                    <TimePicker.RangePicker
                        format='HH:mm'
                        value={editRecord[startDataIndex] ? [dayjs(editRecord[startDataIndex], 'HH:mm:ss'), dayjs(editRecord[endDataIndex], 'HH:mm:ss')] : null}
                        onChange={(hours: [Dayjs | null, Dayjs | null] | null) => {
                            setEditRecord((r: T) => ({ 
                                ...r!,
                                start_time: hours && hours[0] ? timeToStr(hours[0]) : '',
                                end_time: hours && hours[1] ? timeToStr(hours[1]) : ''
                            }));
                        }}
                        />
                );
            }

            return render ? render(value, record) : <span>{(record as any)[startDataIndex]} - {(record as any)[endDataIndex]}</span>
        }

    }
}

export const CrudActions = <T,>({ onSave, onCancel, onDelete, onSaveLoading, onDeleteLoading, width }: { onSave?: (record: T) => void, onCancel?: () => void, onDelete?: (id: any) => void, onSaveLoading?: boolean, onDeleteLoading?: boolean, width?: number }) => {
    const { editRecord, setEditRecord, rowKey } = useTableProvider();

    return { 
        title: 'Actions', 
        width: width ?? 180,
        render: (_: any, record: T) => {
            if (isEditing(record, editRecord, rowKey)) {
                return (
                    <span>
                        <Button
                            type="link"
                            className='text-blue-500 mr-2 px-0'
                            onClick={() => onSave && onSave(editRecord)}
                            loading={onSaveLoading}
                            disabled={onSaveLoading}
                            >
                            Save
                        </Button>
                        <Button
                            type="link"
                            className='text-blue-500 px-0'
                            onClick={onCancel ? onCancel : () => setEditRecord(null)}
                            >
                            Cancel
                        </Button>
                    </span>
                )
            }

            return <>
                {
                    onSave && <Button
                        type="link"
                        className='text-blue-500 px-0 mr-2'
                        onClick={() => setEditRecord(record)}
                        >
                        Edit
                    </Button>
                }
                { 
                    onDelete && <Popconfirm
                        title="Confirm Delete"
                        description={'Are you sure to delete this record?'}
                        onConfirm={() => onDelete(rowKey(record))}
                        onCancel={() => {}}
                        okText="Yes"
                        cancelText="No"
                        >
                        <Button
                            type="link"
                            className='px-0'
                            danger
                            loading={onDeleteLoading}
                            >
                            Delete
                        </Button>
                    </Popconfirm>
                }
            </>
        }
    }
}
