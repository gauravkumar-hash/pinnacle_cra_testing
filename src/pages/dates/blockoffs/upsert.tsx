import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Layout, Input, Select, Skeleton, TimePicker, Breadcrumb } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useState } from 'react';
import { ApiError, BlockOffResp, createBlockoffApiAdminBlockoffsPost, getBlockoffOptionsApiAdminBlockoffsOptionsGet, updateBlockoffApiAdminBlockoffsBlockoffIdPut } from '../../../services/client';
import { dateToStr, getErrorMsg, strToDate, strToTime, timeToStr } from '../../../utils';
import { Link, useLocation, useNavigate } from "react-router-dom";
const { Header, Content } = Layout;


export function BlockoffUpsertScreen() {
    const { state } = useLocation();
    const blockoff = state?.blockoff as BlockOffResp;

    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    
    const [ branchIds, setBranchIds ] = useState<string[]>();
    const [ date, setDate ] = useState<Dayjs>();
    const [ hours, setHours ] = useState<[start: Dayjs | null, end: Dayjs | null] | null>();
    const [ remarks, setRemarks ] = useState<string>();

    const insertMutation = useMutation({
        mutationFn: createBlockoffApiAdminBlockoffsPost,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blockoffs'] })
            message.success('Blockoff created successfully');
            navigate(-1);
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    const updateMutation = useMutation({
        mutationFn: updateBlockoffApiAdminBlockoffsBlockoffIdPut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blockoffs'] })
            message.success('Blockoff updated successfully');
            navigate(-1);
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    const { isPending, isError, data, error } = useQuery({
        queryKey: ['blockoffs', 'options'],
        queryFn: getBlockoffOptionsApiAdminBlockoffsOptionsGet,
    })

    if (isPending) return <Skeleton className='m-4' />;
    if (isError) return <div>{error.message}</div>;


    const createBlockoff = () => {
        // TODO: Validate on client side that branchId, date, timeslot is filled
        if (!branchIds || !date || !hours?.[0] || !hours?.[1] ) {
            message.error('Please fill all required fields');
            return;
        }

        insertMutation.mutate({
            requestBody: {
                branch_ids: branchIds,
                start_date: dateToStr(date),
                start_time: timeToStr(hours[0]),
                end_time: timeToStr(hours[1]),
                remarks
            }
        })
    }

    const updateBlockoff = () => {
        if (!blockoff) return;

        updateMutation.mutate({
            blockoffId: blockoff.id,
            requestBody: {
                branch_ids: branchIds ?? blockoff.branches.map(b => b.value),
                start_date: date ? dateToStr(date) : blockoff.date,
                start_time: hours?.[0] ? timeToStr(hours[0]) : blockoff.start_time,
                end_time: hours?.[1] ? timeToStr(hours[1]) : blockoff.end_time,
                remarks: remarks ?? blockoff.remarks
            }
        })
    }

    const onSave = () => {
        if (blockoff) {
            updateBlockoff();
        } else {
            createBlockoff();
        }
    }

    return (
        <Layout className='p-4'>
            <Breadcrumb
                items={[
                    { title: <Link to={'/dates'}>Dates</Link> },
                    { title: 'Blockoffs' }
                ]}
            />
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>Blockoffs</h1>
            </Header>
            <Content className='flex flex-col gap-4 font-medium' style={{ width: '400px' }}>
                <div>Branch</div>
                <Select
                    mode="multiple"
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="Please select"
                    defaultValue={blockoff?.branches.map((b) => b.value)}
                    value={branchIds}
                    onChange={setBranchIds}
                    options={data.branch_ids}
                    />

                <div>Date</div>
                <DatePicker
                    defaultValue={blockoff && strToDate(blockoff?.date)}
                    value={date}
                    minDate={dayjs()}
                    onChange={setDate}
                    />

                <div>Start & End Time</div>
                <TimePicker.RangePicker
                    defaultValue={blockoff && [strToTime(blockoff?.start_time), strToTime(blockoff?.end_time)]}
                    value={hours}
                    onChange={(hours) => setHours(hours)}/>

                <div>Reason</div>
                <Input
                    placeholder='Reason for blockoff'
                    defaultValue={blockoff?.remarks ?? undefined}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value) }
                    />

                <Button onClick={onSave} loading={insertMutation.isPending || updateMutation.isPending}>Save</Button>
            </Content>
        </Layout>
    )
}