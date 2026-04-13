import { ApiError, getPatientDiffsApiAdminPatientsDiffGet, PatientDetailsDiff, updatePatientDiffApiAdminPatientsDiffPost } from "@/services/client";
import { getErrorMsg } from "@/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Layout, Popconfirm, Skeleton, Table, Tooltip } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";

const { Content } = Layout;

const SGIMED_URL = import.meta.env.VITE_SGIMED_URL;

export function PatientDataSyncScreen() {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [ page, setPage ] = useState(1);

    const { isPending, isError, data, error } = useQuery({
        queryKey: ['patient_diff', page],
        queryFn: ({ queryKey }) => getPatientDiffsApiAdminPatientsDiffGet({ page: queryKey[1] as number }),
    });
    const updateMutation = useMutation({
        mutationFn: updatePatientDiffApiAdminPatientsDiffPost,
        onSuccess: () => {
            message.success('Record updated successfully');
            queryClient.invalidateQueries({ queryKey: ['patient_diff', page] })
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    });
    
    if (isPending) return <Skeleton />;
    if (isError) return <div>{error.message}</div>;

    const renderDiffs = (_: {[k: string]: any}) => {
        const transformKey = (key: string) => key.split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

        const keys = Object.keys(_).sort((a, b) => a.localeCompare(b));
        return keys.map(k => <div key={k}>{transformKey(k)}: {_[k]}</div>);
    }

    const link = (r: PatientDetailsDiff) => `${SGIMED_URL}/patient/${r.sgimed_patient_id}`;
    return (
        <Content className='flex flex-col gap-4 font-medium'>
            <Table
                pagination={{
                    defaultPageSize: data.pager.n,
                    current: data.pager.p,
                    total: data.pager.rows,
                    showSizeChanger: false,
                    showTotal: (total) => `Total ${total} items`,
                    onChange: (page, _) => setPage(page)
                }}
                rowKey={(r: PatientDetailsDiff) => r.user_id}
                columns={[
                        { title: 'NRIC / FIN', dataIndex: 'nric', render: (_, r) => <Link to={link(r)} target="_blank" rel="noopener noreferrer">{_}</Link> },
                        { title: 'PinnacleSG+', dataIndex: 'app', render: renderDiffs },
                        { title: 'SGiMed', dataIndex: 'sgimed', render: renderDiffs },
                        { 
                            title: '', 
                            width: 150,
                            render: (_, r) => <>
                                <Tooltip title="Update SGiMed to PinnacleSG+">
                                    <Button type="link" size='small' 
                                        onClick={() => updateMutation.mutate({ requestBody: { user_id: r.user_id, update_dest: 'app' } })}
                                        loading={updateMutation.isPending && updateMutation.variables.requestBody.user_id == r.user_id && updateMutation.variables.requestBody.update_dest == 'app'}
                                        disabled={updateMutation.isPending}
                                        >
                                        Update PinnacleSG+
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Update PinnacleSG+ to SGiMed">
                                    <Popconfirm
                                        title="Update Data to SGiMed"
                                        description="Are you sure to update this user data (PinnacleSG+ -> SGiMed)?"
                                        onConfirm={() => updateMutation.mutate({ requestBody: { user_id: r.user_id, update_dest: 'sgimed' } })}
                                        onCancel={() => {}}
                                        okText="Yes"
                                        cancelText="No"
                                        >
                                        <Button type="link" size='small'     
                                            loading={updateMutation.isPending && updateMutation.variables.requestBody.user_id == r.user_id && updateMutation.variables.requestBody.update_dest == 'sgimed'}
                                            disabled={updateMutation.isPending}
                                            >
                                            Update SGiMed
                                        </Button>
                                    </Popconfirm> 
                                </Tooltip>
                            </>
                        }
                    ]}
                dataSource={data.data}
                />
        </Content>
);   
}