// import React from "react";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { App, Button, Modal, Select, Skeleton, Table, TimePicker } from "antd"
// import { Link } from "react-router-dom"
// import { useState } from "react";
// import { DeleteOutlined, ExclamationCircleOutlined, PlusOutlined } from "@ant-design/icons";
// import dayjs, { Dayjs } from "dayjs";
// import { ApiError, BranchOperatingHourCreate, createClinicOperatingHourApiAdminBranchesBranchIdOperatingHoursPost, DayOfWeek, deleteOperatingHourApiAdminBranchesBranchIdOperatingHoursOperatingIdDelete, getOperatingHoursApiAdminBranchesBranchIdOperatingHoursGet, updateOperatingHourApiAdminBranchesBranchIdOperatingHoursOperatingIdPut } from "../../services/client";
// import { getErrorMsg, timeToStr } from "../../utils";

// interface Admin {
//     id: string;
//     name: string;
//     email: string;
// }

// const AdminsTab = ({ branchId }: TabProps) => {

//     // Mock data
//     const mockAdmins: Admin[] = [
//         { id: 1, name: 'Alice Doe', email: 'alicedoe@pinnacle.com' },
//         { id: 2, name: 'Jane Doe', email: 'janedoe@pinnacle.com' },
//         { id: 3, name: 'Mark Doe', email: 'markdoe@pinnacle.com' },
//         { id: 4, name: 'Sample Doe', email: 'sampeldoe@pinnacle.com' },
//     ];

//     const { message } = App.useApp();
//     const [newRows, setNewRows] = useState<Admin[]>([]);
//     const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

//     // const queryClient = useQueryClient();

//     // ========== TODO: Replace query Admin List function ==========

//     // const { isPending, isError, data, error } = useQuery({
//     //     queryKey: ['branches', branchId, 'operating_hours'],
//     //     queryFn: () => getBranchOperatingHours({ branchId })
//     // });
//     // const mutateProps = {
//     //     onSuccess: () => {
//     //         queryClient.invalidateQueries({ queryKey: ['branches', branchId, 'operating_hours'] });
//     //         message.success('Operation successful');
//     //     },
//     //     onError: (error: Error) => {
//     //         message.error(error.message);
//     //     }
//     // };

//     // const createMutation = useMutation({ mutationFn: createClinicOperatingHourApiAdminBranchesBranchIdOperatingHoursPost, ...mutateProps });
//     // const updateMutation = useMutation({ mutationFn: updateOperatingHourApiAdminBranchesBranchIdOperatingHoursOperatingIdPut, ...mutateProps });
//     // const deleteMutation = useMutation({ mutationFn: deleteOperatingHourApiAdminBranchesBranchIdOperatingHoursOperatingIdDelete, ...mutateProps });

//     // if (isPending) return <Skeleton className='m-4' />;
//     // if (isError) return <div>{error.message}</div>;

//     const handleAdd = () => {
//         const newId = `new-${newRows.length}`;
//         const newRow: Admin = {
//           id: newId,
//           name: '',
//           email: '',
//         };
//         setNewRows([...newRows, newRow]);
//       };

//     const handleDeleteSelected = () => {
//         Modal.confirm({
//           title: 'Are you sure you want to delete the selected admins?',
//           icon: <ExclamationCircleOutlined />,
//           content: 'This action cannot be undone.',
//           onOk() {
//             selectedRowKeys.forEach(key => {
//               const numericKey = Number(key);
//               if (!isNaN(numericKey)) {
//                 // TODO: Implement delete mutation
//                 // deleteMutation.mutate(numericKey);
//               }
//               setNewRows(prevRows => prevRows.filter(row => row.id.toString() !== key.toString()));
//             });
//             setSelectedRowKeys([]);
//           },
//           onCancel() {
//           },
//         });
//       };

//       const handleSave = async (record: Admin) => {
//         if (!record.name || !record.email) {
//           message.error('Please fill all fields');
//           return;
//         }
    
//         // TODO: Implement create mutation
//         // createMutation.mutate(record);
    
//         setNewRows(prevRows => prevRows.filter(row => row.id !== record.id));
//       };
    
//       const columns = [
//         {
//           title: 'Admins',
//           dataIndex: 'name',
//           render: (_: any, record: Admin) => {
//             return record.id.toString().startsWith('new-') ? (
//               <Select
//                 style={{ width: 200 }}
//                 value={record.name}
//                 onChange={(name) => {
//                   const selectedAdmin = mockAdmins.find(admin => admin.name === name);
//                   const updatedNewRows = newRows.map(row => 
//                     row.id === record.id ? { ...row, name, email: selectedAdmin?.email || '' } : row
//                   );
//                   setNewRows(updatedNewRows);
//                 }}
//                 options={mockAdmins.map((admin) => ({ value: admin.name, label: admin.name }))}
//               />
//             ) : (
//               record.name
//             );
//           },
//         },
//         {
//           title: 'Email',
//           dataIndex: 'email',
//         },
//         {
//           title: '',
//           dataIndex: 'actions',
//           render: (_: any, record: Admin) => {
//             return record.id.toString().startsWith('new-') ? (
//               <a onClick={() => handleSave(record)}>Save</a>
//             ) : null;
//           },
//         },
//       ];

//     return (
//         <div className='flex flex-col gap-4 mt-4 mb-4'>
//           <div className="flex gap-2">
//             <Button icon={<PlusOutlined />} type='default' onClick={handleAdd}>
//               Add
//             </Button>
//             <Button 
//               danger
//               type='primary'
//               disabled={selectedRowKeys.length === 0} 
//               icon={<DeleteOutlined />} 
//               onClick={handleDeleteSelected}
//             >
//               Delete
//             </Button>
//           </div>
//           <Table
//             className="w-screen"
//             rowSelection={{
//               type: 'checkbox',
//               selectedRowKeys,
//               onChange: (selectedKeys) => {
//                 setSelectedRowKeys(selectedKeys);
//               }
//             }}
//             columns={columns}
//             // dataSource={[...data, ...newRows]}
//             dataSource={[...mockAdmins, ...newRows]}
//             rowKey={(row) => row.id}
//           />
//         </div>
//       );
// }