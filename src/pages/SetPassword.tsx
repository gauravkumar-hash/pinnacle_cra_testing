import { useState, useEffect } from 'react';
import type { FormProps } from 'antd';
import { App, Button, Form, Input, Tag, Typography } from 'antd';
import PinnacleLogo from '../assets/pinnacle-logo.png'
import { useForm } from 'antd/es/form/Form';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabase';

const { Paragraph } = Typography;

interface FieldType {
    email?: string;
    password?: string;
    passwordConfirm?: string;
}

const validateMessages = {
    types: { email: 'Invalid Email!' },
    required: 'Required field',
  };

export default function SetPassword() {
    const { message } = App.useApp();
    const { session, logout } = useAuth();
    const [ form ] = useForm();
    const navigate = useNavigate(); 
    
    const [ complete, setComplete ] = useState<boolean>(false);

    useEffect(() => {
        if (session === undefined) return; // Still Loading
        if (!session && !complete) navigate('/');
        if (!session) return;
        form.setFieldsValue({ email: session?.user.email });
    }, [session, complete])
    

    const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
        const { password, passwordConfirm } = values;

        if (password !== passwordConfirm) {
            message.error('Passwords do not match. Please try again.');
            return;
        }

        const resp = await supabase.auth.updateUser({ password: password })
        if (resp.error) {
            message.error(resp.error.message);
        } else {
            setComplete(true);
            if (session?.user?.user_metadata?.role == 'doctor') {
                message.success('Password updated successfully. Please login via the PinnacleSG+ (Doctor) mobile app.', 30);
                await supabase.auth.signOut(); // Using this instead of logout() from useAuth() to prevent redirect
            } else {
                message.success('Password updated successfully.');
                await logout();
            }
        }
    };
    
    const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = (errorInfo) => {
        console.error('Failed:', errorInfo)
        message.error(`Please ensure password fields are filled in. Please try again.`)
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-100">
            <div className="flex-grow flex flex-col items-center justify-center gap-4 p-4">
                <div className="text-center">
                    <div className='flex items-center p-4'>
                        <img className='w-8 h-8 rounded' src={PinnacleLogo} alt='Pinnacle Clinic Logo'/>
                        <h1 className="font-semibold text-xl p-2">Pinnacle Clinic (Accounts)</h1>
                    </div>
                    <div>
                        <Tag>Version 1.0</Tag>
                    </div>
                </div>
                <Form
                    className="p-4 w-96"
                    name="basic"
                    // initialValues={{ email: session?.user.email }}
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}
                    autoComplete="off"
                    validateMessages={validateMessages}
                    form={form}
                >
                    <Form.Item<FieldType>
                        name="email"
                        rules={[{ required: true, type: 'email'}]}
                    >
                        <Input placeholder="Email" disabled />
                    </Form.Item>

                    <Form.Item<FieldType>
                        name="password"
                        rules={[{ required: true }]}
                    >
                        <Input.Password placeholder="Password" disabled={complete} />
                    </Form.Item>

                    <Form.Item<FieldType>
                        name="passwordConfirm"
                        rules={[{ required: true }]}
                    >
                        <Input.Password placeholder="Confirm Password" disabled={complete}  />
                    </Form.Item>
                    <Form.Item dependencies={['email', 'password', 'passwordConfirm']}>
                        {() => (
                            <Button type="primary" htmlType="submit" className="w-full" disabled={complete}>
                                Set Password
                            </Button>
                        )}
                    </Form.Item>
                </Form>
            </div>
            <div className="w-full text-center p-4">
                <Paragraph>
                    Copyright © 2024 Pinnacle Clinic Pte. Ltd. All Rights Reserved
                </Paragraph>
            </div>
        </div>
    );
}
