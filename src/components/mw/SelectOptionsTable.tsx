import { useEffect } from "react";
import { Table } from "antd";
import { Key } from "antd/es/table/interface";

export default function SelectOptionsTable({
    tableData,
    options,
    // parsedDataRef,
    selectedRowKeys,
    setSelectedRowKeys,
}: {
    tableData: any;
    options: any;
    // parsedDataRef: any;
    selectedRowKeys: string[];
    setSelectedRowKeys: (keys: string[]) => void;
}) {
    useEffect(() => {
        // set default row keys when 2nd column shows more than 0
        const defaultSelectedRowKeys = Object.entries(options)
            .map(([key, value]) => ((value as []).length > 0 ? key : null))
            .filter((item) => item !== null) as string[];

        setSelectedRowKeys(defaultSelectedRowKeys);
    }, []);

    const columns = [
        {
            title: <p className="font-bold">Select Option</p>,
            dataIndex: "select_options",
            width: 200,
            className: "text-md font-medium",
        },
        {
            title: <p className="font-bold">No. of Rows Affected</p>,
            dataIndex: "number_of_rows_affected",
            className: "text-md font-medium",
        },
    ];

    const rowSelection = {
        selectedRowKeys: selectedRowKeys,
        onChange: (selRowKeys: Key[]) => {
            setSelectedRowKeys(selRowKeys as string[]);
        },
        getCheckboxProps: (record: { [key: string]: any }) => ({
            hidden: true,
            disabled: record.number_of_rows_affected === 0,
            select_options: record.select_options,
        }),
    };

    return (
        <Table
            bordered
            //   size="small"
            //   tableLayout="auto"
            //   scroll={{ x: "max-content" }}
            rowSelection={{
                type: "checkbox",
                ...rowSelection,
            }}
            columns={columns}
            // expandable={{
            //   rowExpandable: (record) => {
            //     if (record.number_of_rows_affected === 0) return false;
            //     return true;
            //   },
            //   expandedRowRender: (record) => {
            //     return (
            //       <List
            //         itemLayout="horizontal"
            //         dataSource={options[record.select_options]}
            //         renderItem={(item) => {
            //           const content = (
            //             <div>
            //               {Object.entries(constants.migrant_worker_keys).map(
            //                 (arr) => {
            //                   const key = arr[0];
            //                   const val = arr[1];
            //                   return (
            //                     <div key={key}>
            //                       <Divider className="m-1 p-0" />
            //                       <p>
            //                         <span className="font-semibold">{val}</span>
            //                         {": "}
            //                         {parsedDataRef.current[item][key]}
            //                       </p>
            //                     </div>
            //                   );
            //                 }
            //               )}
            //             </div>
            //           );
            //           return (
            //             <List.Item key={parsedDataRef.current[item].nric}>
            //               <List.Item.Meta
            //                 title={
            //                   <Popover
            //                     title={
            //                       <span className="font-bold">File Upload Data</span>
            //                     }
            //                     placement="left"
            //                     content={content}
            //                     trigger="hover"
            //                   >
            //                     <p className="font-medium text-blue-500 cursor-pointer hover:underline inline-block">
            //                       {item}
            //                     </p>
            //                   </Popover>
            //                 }
            //                 description={parsedDataRef.current[item].employee_name}
            //               />
            //             </List.Item>
            //           );
            //         }}
            //       />
            //     );
            //   },
            // }}
            dataSource={tableData}
            pagination={false}
        />
    );
}