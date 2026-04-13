import React, { useState } from 'react';
import { Layout, Dropdown, Menu, Typography } from 'antd';
import { MenuOutlined, LogoutOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthProvider';
import { colorConfig } from '../utils/config';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

const Topbar: React.FC<{ title?: string }> = () => {
  const { logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const navigate = useNavigate();

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
    }
    setMenuVisible(false);
  };

  const handleHomeClick = () => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const location = params.get('location');
    navigate(`/delivery${type ? `?type=${type}` : ''}${location ? `&location=${location}` : ''}`);
  };

  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="home" icon={<HomeOutlined />} onClick={handleHomeClick}>
        Home
      </Menu.Item>
      <Menu.Item key="logout" icon={<LogoutOutlined />} danger>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        background: colorConfig.sidebarBackgroundColor,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        height: 56,
        boxShadow: '0 2px 8px #f0f1f2',
      }}
    >
      <Dropdown
        overlay={menu}
        trigger={['click']}
        visible={menuVisible}
        onVisibleChange={setMenuVisible}
        placement="bottomLeft"
      >
        <MenuOutlined style={{ fontSize: 18, color: 'white', cursor: 'pointer' }} />
      </Dropdown>
      <Typography.Title
        level={2}
        style={{
          color: 'white',
          margin: 0,
          flex: 1,
          textAlign: 'center',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        Delivery Dashboard
      </Typography.Title>
    </Header>
  );
};

export default Topbar;
