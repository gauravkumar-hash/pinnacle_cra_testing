import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Layout, Input, Breadcrumb } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { ApiError, PublicHolidayResp, upsertPublicHolidayApiAdminPublicHolidaysUpsertPost } from '../../../services/client';
import { dateToStr, getErrorMsg, strToDate } from '../../../utils';
import { Link, useLocation, useNavigate } from "react-router-dom";
const { Header, Content } = Layout;


export function PublicHolidayUpsertScreen() {
    const { state } = useLocation();
    const { message } = App.useApp();
    const navigate = useNavigate();
    const record = state?.record as PublicHolidayResp;

    const [ date, setDate ] = useState<Dayjs>();
    const [ remarks, setRemarks ] = useState<string>();

    useEffect(() => {
        if (!record) return;
        setDate(record && strToDate(record.date));
        if (record.remarks) setRemarks(record.remarks);
    }, []);
    
    const queryClient = useQueryClient();
    const upsertMutation = useMutation({
        mutationFn: upsertPublicHolidayApiAdminPublicHolidaysUpsertPost,
        onSuccess: () => {
            message.success('Public holiday created/updated successfully');
            queryClient.invalidateQueries({ queryKey: ['public_holidays'] })
            navigate(-1);
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })


    const onSave = () => {
        if (!date) {
            message.error("Date is required.");
            return;
        }

        upsertMutation.mutate({
            requestBody: {
                id: record?.id,
                date: dateToStr(date),
                remarks: remarks
            }
        })
    }

    return (
        <Layout className='p-4'>
            <Breadcrumb
                items={[
                    { title: <Link to={'/dates'}>Dates</Link> },
                    { title: 'Public Holidays' }
                ]}
            />
            <Header style={{ padding: 0 }} className='bg-gray-100 flex flex-row justify-between items-center '>
                <h1 className='text-xl font-semibold'>Public Holidays</h1>
            </Header>
            <Content className='flex flex-col gap-4 font-medium' style={{ width: '400px' }}>
                <div>Date</div>
                <DatePicker
                    value={date}
                    minDate={dayjs()}
                    onChange={setDate}
                    />

                <div>Reason</div>
                <Input
                    placeholder='Reason for blockoff'
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value) }
                    />

                <Button onClick={onSave} loading={upsertMutation.isPending}>Save</Button>
            </Content>
        </Layout>
    )
}