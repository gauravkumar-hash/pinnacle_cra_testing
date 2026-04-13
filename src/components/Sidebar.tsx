import { useAuth } from '../context/AuthProvider';
import { ConfigProvider, Layout, Menu, MenuProps, Tag, Typography, theme } from 'antd';
import PinnacleLogo from '../assets/pinnacle-logo.png'
import { DatabaseOutlined, LogoutOutlined, UserOutlined, EnvironmentOutlined, CalendarOutlined, FileUnknownOutlined, SyncOutlined, VideoCameraOutlined, UsergroupAddOutlined, DollarOutlined, NotificationOutlined, FileTextOutlined, DeliveredProcedureOutlined, GiftOutlined,HistoryOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoleTag } from './RoleTag';

const { Sider } = Layout;
type MenuItem = Required<MenuProps>['items'][number];


const Sidebar = () => {
    const { logout, role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const routes: MenuItem[] = [];
    if (["superadmin", "admin", "doctor"].includes(role)) {
        routes.push(
            {  key: '/teleconsults', label: 'Telemed Queue', icon: <VideoCameraOutlined />}, 
        )
    }

    if (role === 'superadmin') {
        routes.push(
            {  key: '/walkins', label: 'Queue Requests', icon: <UsergroupAddOutlined />},
            {  key: '/teleconsult_delivery', label: 'Telemed Delivery', icon: <DeliveredProcedureOutlined />},
            { key: '/appointments', label: 'Appointments', icon: <CalendarOutlined />},
            {
                key: 'maintanence',
                label: 'Maintanence',
                type: 'group',
                children: [
                    { key: '/teleconsults/ongoing', label: 'Ongoing Teleconsults', icon: <SyncOutlined />}, 
                    { key: '/documents/hidden', label: 'Hidden Documents', icon: <FileUnknownOutlined />}, 
                    // { key: '/rates', label: 'Dynamic Rates (Legacy)', icon: <DollarOutlined />},
                    { key: '/rates/dynamic', label: 'Configure Dynamic Rates', icon: <DollarOutlined />},
                    // { key: '/corporate/codes', label: 'Corporate Codes', icon: <BarcodeOutlined />},
                    { key: '/corporate/rates', label: 'Corporate Rates', icon: <DollarOutlined />},
                    { key: '/corporate/upload', label: 'Upload Corporate Users', icon: <UsergroupAddOutlined />}
                ],
            },
            {
                key: 'app_mgmt',
                label: 'App Management',
                type: 'group',
                children: [
                    { key: '/notifications', label: 'App Notifications', icon: <NotificationOutlined />}, 
                ],
            },
            {
                key: 'reports',
                label: 'Reports',
                type: 'group',
                children: [
                    { key: '/reports/reconciliation', label: 'Reconciliation', icon: <DollarOutlined />}, 
                    { key: '/reports/health-reports', label: 'Health Reports', icon: <FileTextOutlined />}, 
                       { key: '/reports/export-health-reports', label: 'Export Health Reports', icon: <HistoryOutlined />}, 
                ],
            },
            {
                key: 'integrations',
                label: 'Integrations',
                type: 'group',
                children: [
                    { key: '/yuu', label: 'Yuu Integration', icon: <GiftOutlined />}, 
                ],
            },
            {
                key: 'setup',
                label: 'Setup',
                type: 'group',
                children: [
                    { key: '/patients', label: 'Patients DB', icon: <DatabaseOutlined />}, 
                    { key: '/accounts', label: 'Accounts', icon: <UserOutlined />}, 
                    { key: '/branches', label: 'Branches', icon: <EnvironmentOutlined />}, 
                    { key: '/dates', label: 'Dates', icon: <CalendarOutlined />}, 
                    { key: '/zone', label: 'Delivery Zones', icon: <EnvironmentOutlined />}, 
                    // { key: '/content', label: 'Content', icon: <EditOutlined />}, 
                ],
            }
        )
    } else if (['admin', 'logistic'].includes(role)) {
        routes.push(
            {  key: '/teleconsult_delivery', label: 'Telemed Delivery', icon: <DeliveredProcedureOutlined />},
        )
    }

    routes.push(
        {  key: '/logout', label: 'Logout', icon: <LogoutOutlined />} 
    )

    const handleMenuClick: MenuProps['onClick'] = (e) => {
        if (e.key === '/logout') {
            logout();
            return;
        }
        navigate(e.key);
    };

    return (
        <Sider width={250} style={{ minHeight: '100vh' }}>
            <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
                <div className='h-full flex flex-col justify-between'>
                    <div className='flex-1'>
                        <div className='flex items-center p-4'>
                            <img className='w-8 h-8 rounded' src={PinnacleLogo} alt='Pinnacle Clinic Logo' />
                            <h1 className='font-semibold text-md p-2 text-white'>Pinnacle Clinic</h1>
                        </div>
                        <Menu theme='dark' mode='inline' selectedKeys={[location.pathname]} items={routes} onClick={handleMenuClick} />
                    </div>
                    <div className='flex flex-col p-4 gap-4'>
                        <div>
                            <RoleTag role={role} />
                            <Tag>Version 1.0</Tag>
                        </div>
                        <Typography className='text-xs'>Copyright © 2024 Pinnacle Clinic Pte. Ltd. All Rights Reserved</Typography>
                    </div>
                </div>
            </ConfigProvider>
        </Sider>
    );
};

export default Sidebar;
