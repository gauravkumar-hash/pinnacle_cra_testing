import { App, Breadcrumb, Button, Input, Layout, Select, Skeleton, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, createAccountApiAdminAccountsCreatePost, fetchCreateAccountOptionsApiAdminAccountsOptionsGet, fetchSgimedDoctorsApiAdminDoctorsGet, Role, SGiMedDoctorResp } from '../../services/client';
import { getErrorMsg } from '../../utils';
const { Header, Content } = Layout;

export function DoctorSelect({ sgimedBranchId, onSelectDoctor }: { sgimedBranchId: string, onSelectDoctor: (doctor: SGiMedDoctorResp) => void }) {
    const { isPending, isError, data, error } = useQuery({
        queryKey: ['doctors'],
        queryFn: fetchSgimedDoctorsApiAdminDoctorsGet,
    })

    if (isPending) return <Skeleton className='m-4' />;
    if (isError) return <div>{error.message}</div>;

    const onSelectAccount = (value: string) => {
        const doctor = data.find((d) => d.sgimed_id === value)
        if (!doctor) return;
        onSelectDoctor(doctor);
    }

    return (
        <>
            <Typography className='text-gray-500'>SGiMed Doctor Record</Typography>
            <Select
                options={data.filter((d) => d.sgimed_branch_id == sgimedBranchId).map((d) => ({ value: d.sgimed_id, label: d.name }))}
                onSelect={onSelectAccount}
                />
        </>
    )
}

export function CreateAccount() {
    const navigate = useNavigate();
    const { message } = App.useApp();

    const [ role, setRole ] = useState<Role>();
    const [ branchId, setBranchId ] = useState<string>(); 
    const [ doctorId, setDoctorId ] = useState<string>();
    const [ name, setName ] = useState<string>();
    const [ email, setEmail ] = useState<string>();

    const queryClient = useQueryClient();
    const { isPending, isError, data, error } = useQuery({
        queryKey: ['accounts', 'roles'],
        queryFn: fetchCreateAccountOptionsApiAdminAccountsOptionsGet,
    })

    const createMutation = useMutation({
        mutationFn: createAccountApiAdminAccountsCreatePost,
        onSuccess: () => {
            message.success('Account created successfully');
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            navigate(-1);
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    if (isPending) return <Skeleton className='m-4' />;
    if (isError) return <div>{error.message}</div>;

    const createAccount = async () => {
        // Validation
        if (role == 'doctor' && !doctorId) {
            message.error("Please select a doctor");
            return
        }
        if ((role == 'doctor' || role == 'admin') && !branchId) {
            message.error("Please select a branch");
            return
        }
        if (!email || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email)) {
            message.error("Please enter a valid email");
            return
        }
        if (!role || !name || !email) {
            message.error("Please ensure role, name and email are filled");
            return;
        }

        createMutation.mutate({
            requestBody: {
                role,
                sgimed_id: role === 'doctor' ? doctorId : undefined,
                branch_id: (role === 'doctor' || role === 'admin') ? branchId : undefined,
                name,
                email,
            }
        })
    }

    const onSelectDoctor = (doctor: SGiMedDoctorResp) => {
        const branch = data.branches.find((b) => b.sgimed_branch_id === doctor.sgimed_branch_id);
        setBranchId(branch?.id);
        setDoctorId(doctor.sgimed_id);
        setName(doctor.name);
        setEmail(doctor.email ?? undefined);
    }

    return (
        <Layout className='p-4'>
            <Breadcrumb
                items={[
                    { title: <Link to={'/accounts'}>Accounts</Link> },
                    { title: 'Add Account' }
                ]}
            />
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>Add Account</h1>
                <div className='flex flex-row gap-2'>
                    <Button onClick={() => { navigate(-1) }}>Cancel</Button>
                    <Button type='primary' onClick={createAccount} loading={createMutation.isPending}>Save</Button>
                </div>
            </Header>
            <Content className='flex flex-col gap-4 font-medium' style={{ width: 400 }}>
                <Typography className='text-gray-500'>User Type</Typography>
                <Select options={data.roles} onSelect={setRole} value={role} />
                {
                    (role === 'doctor' || role === 'admin') && <>
                        <Typography className='text-gray-500'>Branch</Typography>
                        <Select options={data.branches.map((b) => ({ value: b.id, label: b.name }))} onSelect={setBranchId} value={branchId} />
                    </>
                }
                { role === 'doctor' && branchId && <DoctorSelect sgimedBranchId={data.branches.find((d) => d.id == branchId)?.sgimed_branch_id!} onSelectDoctor={onSelectDoctor} /> }
                <Typography className='text-gray-500'>Name</Typography>
                <Input placeholder='Name' onChange={(e) => setName(e.target.value)} value={name} />

                <Typography className='text-gray-500'>Email</Typography>
                <Input placeholder='Email' onChange={(e) => setEmail(e.target.value)} value={email} />
            </Content>
        </Layout>
    )
}