import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Login from './pages/Login.tsx'
import { BrowserRouter, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import AuthRoute from './AuthRoute.tsx'
import AuthProvider, { useAuth } from './context/AuthProvider.tsx'
import { AccountsScreen } from './pages/accounts'
import { CreateAccount } from './pages/accounts/create.tsx'
import { App, ConfigProvider, Layout } from 'antd'
import SetPassword from './pages/SetPassword.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import Sidebar from './components/Sidebar.tsx'

import { DatesScreen } from './pages/dates';
import { BranchesScreen } from './pages/branches'
import { BranchDetailsScreen } from './pages/branches/details'
import { BlockoffUpsertScreen } from './pages/dates/blockoffs/upsert.tsx'
import { PublicHolidayUpsertScreen } from './pages/dates/public_holidays/upsert.tsx'
import { PatientsScreen } from './pages/patients'

import supabase from './services/supabase.ts';
import { OpenAPI } from './services/client'
import { ContentScreen } from './pages/content'
import { TeleconsultScreen } from './pages/teleconsult'
import { WalkinScreen } from './pages/walkin/index.tsx'
import OngoingTeleconsults from './pages/teleconsult/ongoing.tsx'
import HiddenDocumentsScreen from './pages/documents/hidden.tsx'
import { RatesScreen } from './pages/rates/index.tsx'
import { DynamicRatesScreen } from './pages/rates/dynamic.tsx'
import { NotificationsScreen } from './pages/notifications/index.tsx'
import { CorporateCodesScreen } from './pages/corporate/codes.tsx'
import { CorporateRatesScreen } from './pages/corporate/rates.tsx'
import CorporateUsersUpload from './pages/corporate/upload.tsx'
import ReconciliationScreen from './pages/reports/reconciliation.tsx'
import HealthReportsScreen from './pages/reports/health-reports.tsx'
import OnsiteHours from './pages/appointments/onsite-hours.tsx'
import OnsiteBranches from './pages/appointments/onsite-branches.tsx'
import OnsiteBranchDetails from './pages/appointments/onsite-branch-details.tsx'
import Appointment from './pages/appointments/index.tsx'
import AppointmentServices from './pages/appointments/services.tsx'
import ServiceDetails from './pages/appointments/service-details.tsx'
import AppointmentCorporateCodes from './pages/appointments/corporate-codes.tsx'
import { TeleconsultDeliveryScreen } from './pages/delivery'
import { DispatchDeliveryScreen } from './pages/delivery/dispatch/dispatch.tsx'
import Topbar from './components/Topbar.tsx'
import { SignDeliveryScreen } from './pages/delivery/dispatch/sign-page.tsx'
import { ZoneScreen } from './pages/delivery/admin/admin.tsx'
import { ConfigurePinnacleZone } from './pages/delivery/admin/configure.tsx'
import LandingPage from './pages/landing/index.tsx'
import { YuuScreen } from './pages/yuu'
import BranchOperatingHours from './pages/branches/operating-hours.tsx'
import BranchAppointmentHours from './pages/branches/appointment-hours.tsx'
import HealthReportTable from './components/HealthReportTable.tsx'
OpenAPI.BASE = import.meta.env.VITE_ADMIN_API_URL;
OpenAPI.TOKEN = async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
        throw new Error(error?.toString());
    }
    return data.session?.access_token ?? '';
}

const queryClient = new QueryClient()

const RootApp = () => (
    <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <BrowserRouter>
            <App><ConfigProvider>
                <AuthProvider>
                    <AdminApp />
                </AuthProvider>
            </ConfigProvider></App>
        </BrowserRouter>
    </QueryClientProvider>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <RootApp />
    </React.StrictMode>,
)

const ScreenLayout = () => (
    <Layout style={{ minHeight: '100vh' }}>
        <Sidebar />
        <Outlet />
    </Layout>
);  

const DispatchDeliveryLayout = () => (
    <Layout style={{ minHeight: '100vh' }}>
        <Topbar />
        <Outlet />
    </Layout>
);

const IndexScreen = () => {
    const { role } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (role === "logistic") {
            navigate('/teleconsult_delivery');
        } else if (role === "dispatch") {
            navigate('/delivery');
        } else {
            navigate('/teleconsults')
        }
    }, [role, navigate]);

    return <></>
}

function AdminApp() {
    return (
        <Routes>
            <Route element={<AuthRoute />}>
                <Route index element={<IndexScreen />} />
                <Route path="/teleconsults" element={<ScreenLayout />}>
                    <Route index element={<TeleconsultScreen />} />
                    <Route path="ongoing" element={<OngoingTeleconsults />} />
                </Route>
                <Route path="/teleconsult_delivery" element={<ScreenLayout />}>
                    <Route index element={<TeleconsultDeliveryScreen />} />
                </Route>
                <Route path="/zone" element={<ScreenLayout />}>
                    <Route index element={<ZoneScreen />} />
                    <Route path="configure" element={<ConfigurePinnacleZone />} />
                </Route>
                <Route path="/walkins" element={<ScreenLayout />}>
                    <Route index element={<WalkinScreen />} />
                </Route>
                <Route path="/appointments" element={<ScreenLayout />}>
                    <Route index element={<Appointment />} />
                    <Route path="services" element={<AppointmentServices />} />
                    <Route path="services/:groupId" element={<ServiceDetails />} />
                    <Route path="corporate-codes" element={<AppointmentCorporateCodes />} />
                    <Route path="onsite-hours" element={<OnsiteHours />} />
                    <Route path="onsite-branches" element={<OnsiteBranches />} />
                    <Route path="onsite-branches/:branchId" element={<OnsiteBranchDetails />} />
                </Route>
                <Route path="/documents" element={<ScreenLayout />}>
                    <Route path="hidden" element={<HiddenDocumentsScreen />} />
                </Route>
                <Route path="/rates" element={<ScreenLayout />}>
                    <Route index element={<RatesScreen />} />
                    <Route path="dynamic" element={<DynamicRatesScreen />} />
                </Route>
                <Route path="/corporate" element={<ScreenLayout />}>
                    <Route path="codes" element={<CorporateCodesScreen />} />
                    <Route path="rates" element={<CorporateRatesScreen />} />
                    <Route path="upload" element={<CorporateUsersUpload />} />
                </Route>
                <Route path="/notifications" element={<ScreenLayout />}>
                    <Route index element={<NotificationsScreen />} />
                </Route>
                <Route path="/reports" element={<ScreenLayout />}>
                    <Route path="reconciliation" element={<ReconciliationScreen />} />
                    <Route path="health-reports" element={<HealthReportsScreen />} />
                     <Route path="export-health-reports" element={<HealthReportTable />} />
                </Route>
                <Route path="/yuu" element={<ScreenLayout />}>
                    <Route index element={<YuuScreen />} />
                </Route>
                <Route path="/patients" element={<ScreenLayout />}>
                    <Route index element={<PatientsScreen />} />
                </Route>
                <Route path="/accounts" element={<ScreenLayout />}>
                    <Route index element={<AccountsScreen />} />
                    <Route path="create" element={<CreateAccount />} />
                </Route>
                <Route path="/branches" element={<ScreenLayout />}>
                    <Route index element={<BranchesScreen />} />
                    <Route path=":branchId" element={<BranchDetailsScreen />} />
                    <Route path=":branchId/operating-hours" element={<BranchOperatingHours />} />
                    <Route path=":branchId/appointment-hours" element={<BranchAppointmentHours />} />
                </Route>
                <Route path="/dates" element={<ScreenLayout />}>
                    <Route index element={<DatesScreen />} />
                    <Route path="blockoffs/create" element={<BlockoffUpsertScreen />} />
                    <Route path="blockoffs/:id" element={<BlockoffUpsertScreen />} />
                    <Route path="public_holidays/create" element={<PublicHolidayUpsertScreen />} />
                    <Route path="public_holidays/:id" element={<PublicHolidayUpsertScreen />} />
                </Route>
                <Route path="/content" element={<ScreenLayout />}>
                    <Route index element={<ContentScreen />} />
                </Route>
                <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="/delivery" element={<DispatchDeliveryLayout />}>
                <Route index element={<DispatchDeliveryScreen />} />
                <Route path="sign" element={<SignDeliveryScreen />} />
            </Route>
            <Route path="/set_password" element={<SetPassword />} />
            <Route path="/login" element={<Login />} />
            <Route path="/landing" element={<LandingPage />} />
        </Routes>
    )
}

function NotFound() {
    return <h1>404 - Not Found</h1>;
}
