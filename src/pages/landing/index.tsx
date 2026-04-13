import { Spin } from "antd";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const isProd = import.meta.env.VITE_ENV === 'production';
const redirectUrl = isProd ? "https://pinnaclefamilyclinic.com.sg/pinnacle-family-clinic-app/" : "https://pinnaclefamilyclinic.com.sg/pinnacle-family-clinic-app/";
const appUrl = isProd ? "sg.com.pinnaclefamilyclinic.pinnaclesgplus://profile/yuu" : "sg.com.pinnaclefamilyclinic.test.pinnaclesgplus://profile/yuu";

export default function LandingPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const redirect = params.get('redirect');

  useEffect(() => {
    if (redirect === 'false') return;
    setTimeout(() => window.location.href = redirectUrl, 500);
    window.location.href = appUrl;
  }, []);

  return <div className="flex justify-center items-center h-screen">
    <Spin tip="Loading" size="large">
      <div className="p-12 rounded-sm" />
    </Spin>
  </div>;
}