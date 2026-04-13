import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, message } from "antd"
import { ApiError, searchUsersApiAdminNotificationsUsersSearchPost, sendNotificationApiAdminNotificationsSendPost } from "../../services/client";
import { getErrorMsg } from "@/utils";
import { ContentView } from "@/components/Content";
import { useState } from "react";
import { DebounceSelect } from "@/components/DebounceSelect";

const fetchUserList = async (search: string) =>{
    const resp = await searchUsersApiAdminNotificationsUsersSearchPost({ requestBody: { search }})
    return resp.rows.map(row => ({
        label: `${row.nric} - ${row.name}`,
        value: row.id
    }))
  }

interface SelectValue {
    label: string;
    value: string;
}

type FormFields = {
    title: string;
    msg: string;
    users: SelectValue[];
}

export function NotificationsScreen() {
    const [ title, setTitle ] = useState('');
    const [ msg, setMsg ] = useState('');
    const [ users, setUsers ] = useState<SelectValue[]>([]);

    const sendMutation = useMutation({
        mutationFn: sendNotificationApiAdminNotificationsSendPost,
        onSuccess: (_) => {
            message.success('Notification sent successfully');
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error))
    })

    const onFinish = (values: FormFields) => {
        sendMutation.mutate({
            requestBody: {
                ids: users.map(user => user.value),
                title: values.title,
                message: values.msg,
            }
        })
    };

    return (
        <ContentView
            title="App Notifications"
            >
            <Form
                name="basic"
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 16 }}
                style={{ maxWidth: 600 }}
                onFinish={onFinish}
                autoComplete="off"
                >
                <Form.Item<FormFields>
                    label="Title"
                    name="title"
                    rules={[{ required: true, message: 'Title is required' }]}
                    >
                    <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Form.Item>

                <Form.Item<FormFields>
                    label="Message"
                    name="msg"
                    rules={[{ required: true, message: 'Message is required' }]}
                    >
                    <Input placeholder="Message" value={msg} onChange={(e) => setMsg(e.target.value)} />
                </Form.Item>

                <Form.Item<FormFields>
                    label="Users"
                    name="users"
                    rules={[{ required: true, message: 'Users is/are required' }]}
                    >
                    <DebounceSelect
                        maxCount={10}
                        debounceTimeout={500}
                        mode="multiple"
                        value={users}
                        placeholder="Select users"
                        fetchOptions={fetchUserList}
                        onChange={(newValue) => setUsers(newValue as SelectValue[])}
                        style={{ width: '100%' }}
                        />
                </Form.Item>
                <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
                    <Button type="primary" htmlType="submit">
                        Send Notification(s)
                    </Button>
                </Form.Item>
            </Form>    
        </ContentView>
    )
}
