import { useState, useRef, useCallback, useMemo } from "react";
import { Button, Modal, UploadFile, App, Table } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";
import * as XLSX from "xlsx";
import constants from "./mw/constants";
import FileUploadButton from "./mw/FileUploadButton";
import SelectOptionsTable from "./mw/SelectOptionsTable";
import { useAuth } from "../context/AuthProvider";
import { fetchMigrantWorkerOptions, uploadMigrantWorkers } from "../apis/migrant_worker";
import { ColumnsType } from "antd/es/table";

const { confirm } = Modal;

interface DbDataType {
    key: string;
    header: string;
    value: string;
}

type NumRowsType = {
    file_upload: number;
    fetched: number;
}

const InfoTable = ({ numRows }: { numRows: NumRowsType }) => {
    const dbData: DbDataType[] = [
        // { key: '1', header: 'Last update in system DB', value: '02/07/2024, 4:30 PM' },
        { key: '2', header: 'Total records in system DB', value: numRows.fetched.toLocaleString() },
        { key: '3', header: 'Total records in imported file', value: numRows.file_upload.toLocaleString() },
    ];
    
    const dbColumns: ColumnsType = [
        { title: '', dataIndex: 'header', key: 'header', width: '50%', rowScope: 'row' },
        { title: '', dataIndex: 'value', key: 'value', width: '50%' },
    ];
    
    return <Table columns={dbColumns} dataSource={dbData} pagination={false} bordered showHeader={false} className="mb-4" />;
}

export default function MigrantWorkerFileUpload() {
    const { message } = App.useApp();
    const { session } = useAuth();
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [numRows, setNumRows] = useState<NumRowsType>();
    const [options, setOptions] = useState(constants.defaultOptions);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const parsedDataRef = useRef<object>([]);

    const tableData = useMemo(() => {
        return Object.entries(options).map((val) => ({
            key: val[0],
            select_options: val[0],
            number_of_rows_affected: val[1].length,
        }));
    }, [options]);

    const handleSetFileList = (files: UploadFile[]) => {
        resetState();
        handleContinue(files);
    };

    const resetState = useCallback(() => {
        parsedDataRef.current = [];
        setNumRows(undefined);

        setOptions(constants.defaultOptions);
        setSelectedRowKeys([]);

        setLoading(false);
        setFileList([]);
    }, []);

    const handleContinue = (fileList: UploadFile[]) => {
        setFileList(fileList);
        if (fileList.length) {
            setLoading(true);

            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBufferLike);
                    const workbook = XLSX.read(data, {
                        type: "array",
                        raw: false,
                        dateNF: "dd/MM/yyyy",
                    });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    const excel_data: string[][] = XLSX.utils.sheet_to_json(worksheet, {
                        header: 1,
                        raw: false,
                    });

                    if (!constants.match_migrant_worker_excel_headers(excel_data[0])) {
                        message.error("Excel headers do not match required format!");
                        resetState();
                        return;
                    }

                    handleParsedExcelData(excel_data);
                } catch (error) {
                    message.error("An error occurred while processing the file.");
                    console.error("Error:", error);
                    resetState();
                }
            };

            setTimeout(() => {
                fileReader.readAsArrayBuffer(fileList[0].originFileObj as Blob);
            }, 500);
        }
    };

    const handleParsedExcelData = (excel_data: string[][]) => {
        const dataWithoutHeader = excel_data.slice(1);
        let errorMessage = "";
        const temp: {[key: string]: any} = {};
        dataWithoutHeader.forEach((item) => {
            const tempData: {[key: string]: any} = {};
            const nric = item[5];
            Object.keys(constants.migrant_worker_keys).forEach((key, index) => {
                tempData[key] = item[index];
            });

            if (temp.hasOwnProperty(nric)) {
                errorMessage = `NRIC ${nric} has more than one row in the uploaded file.`;
                return;
            }

            temp[nric] = tempData;
        });

        if (errorMessage) {
            message.error(errorMessage, 5);
            console.error(errorMessage);
            resetState();
            return;
        }
        parsedDataRef.current = temp;

        fetchOptions(excel_data.length - 1);
    };

    const fetchOptions = async (excel_data_rows: any) => {
        const preparedData = Object.entries(parsedDataRef.current).map(
            ([, value]) => value
        );

        try {
            const response = await fetchMigrantWorkerOptions(message, session!, preparedData);
            const {
                INSERT,
                UPDATE,
                DELETE,
                total_num_rows: systemNumRows,
            } = response;

            setOptions({
                INSERT,
                UPDATE,
                DELETE,
            });

            setNumRows({
                file_upload: excel_data_rows,
                fetched: systemNumRows,
            });

            message.success("Loaded!");
        } finally {
            // catch in ../api/api.js
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        setLoading(true);

        const preparedData = Object.entries(options).reduce((acc: any, [key, value]) => {
            if (key === "DELETE") {
                acc[key] = selectedRowKeys.includes(key) ? value : [];
            } else {
                acc[key] = selectedRowKeys.includes(key)
                    ? value.map((item) => parsedDataRef.current[item])
                    : [];
            }

            return acc;
        }, {});

        const response = await uploadMigrantWorkers(message, session!, preparedData);
        if (response.success) {
            message.success("Uploaded Successfully.");
            resetState();
        }            
    
        setLoading(false);
    };

    const handleShowConfirm = () => {
        confirm({
            title: "Confirm Upload",
            icon: <ExclamationCircleFilled />,
            content: "Confirm upload for these items?",
            async onOk() {
                await handleUpload();
            },
            onCancel() { },
        });
    };

    return (
        <div>
            {numRows && <InfoTable numRows={numRows} />}
            <FileUploadButton
                fileList={fileList}
                setFileList={handleSetFileList}
                loading={loading}
                />

            {fileList.length > 0 && (
                <div>
                    <div className="flex flex-col gap-y-2.5 mt-4">
                        <SelectOptionsTable
                            {...{
                                tableData,
                                options,
                                // parsedDataRef,
                                selectedRowKeys,
                                setSelectedRowKeys,
                            }}
                        />
                    </div>

                    <Button
                        type="primary"
                        className="flex mt-2.5"
                        onClick={handleShowConfirm}
                        disabled={loading || !selectedRowKeys || selectedRowKeys.length === 0}
                        loading={loading}
                        >
                        Update System DB
                    </Button>
                </div>
            )}
        </div>
    );
}