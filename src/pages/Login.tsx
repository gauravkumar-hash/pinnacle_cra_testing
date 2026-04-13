import { useState, useEffect } from 'react';
import type { FormProps } from 'antd';
import { Alert, Button, Form, Input, Tag, Typography } from 'antd';
import PinnacleLogo from '../assets/pinnacle-logo.png'
import { useForm } from 'antd/es/form/Form';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';

const { Paragraph } = Typography;

interface FieldType {
    email?: string;
    password?: string;
    remember?: string;
}

const validateMessages = {
    types: { email: 'Invalid Email!' },
    required: 'Required field',
};

const Login = () => {
    
    const [submittable, setSubmittable] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const { session, login } = useAuth();
    const [form] = useForm();
    const values = Form.useWatch([], form); // Watch form values
    const navigate = useNavigate(); 
    

    const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
        try {
            const { email, password } = values;

            if (typeof email === 'string' && typeof password === 'string') {

                // const { data, error } = await login({ email, password }); // if Data is required for debugging
                const { error } = await login({ email, password });

                // LOGIN FAILURE
                if (error) {
                    // console.error('Login failed:', error.message);
                    setError(`${error.message}. Please try again.`)
                } else {
                    // LOGIN SUCCESS - only navigate on successful login
                    navigate('/');
                }
            } else {
                console.error('Email or password is not a string');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError(`${error}. Please try again.`)
        }
    };
    
    const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = (errorInfo) => {
        console.log('Failed:', errorInfo);
        setError(`${errorInfo}. Please try again.`)
    };

    useEffect(() => {
        form
            .validateFields({ validateOnly: true })
            .then(() => setSubmittable(true))
            .catch(() => setSubmittable(false));
    }, [form, values])

    if(session) navigate('/');

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-100">
            { error && 
                <div className='absolute z-10 m-10'>
                    <Alert message={error} type="error" showIcon closable onClose={()=>{setError('')}}/>
                </div>
            }
            <div className="flex-grow flex flex-col items-center justify-center gap-4 p-4">
                <div className="text-center">
                    <div className='flex items-center p-4'>
                        <img className='w-8 h-8 rounded' src={PinnacleLogo} alt='Pinnacle Clinic Logo'/>
                        <h1 className="font-semibold text-xl p-2">Pinnacle Clinic</h1>
                    </div>
                    <div>
                        <Tag color="gold">Admin</Tag>
                        <Tag>Version 1.0</Tag>
                    </div>
                </div>
                <Form
                    className="p-4 w-96"
                    name="basic"
                    initialValues={{ remember: true }}
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
                        <Input placeholder="Email" />
                    </Form.Item>

                    <Form.Item<FieldType>
                        name="password"
                        rules={[{ required: true }]}
                    >
                        <Input.Password placeholder="Password" />
                    </Form.Item>
                    <Form.Item dependencies={['email', 'password']}>
                        {() => (
                            <Button type="primary" htmlType="submit" className="w-full" disabled={!submittable}>
                                Login
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
};

export default Login;
