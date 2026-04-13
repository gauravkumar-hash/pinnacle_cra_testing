import { Tag } from "antd";
import { Role } from "../services/client";

export const RoleTag = ({ role }: { role: Role }) => {
    const roles: { [key in Role]: { color: string, label: string } } = {
        'superadmin': { color: 'gold', label: 'Super Admin' },
        'admin': { color: 'green', label: 'Admin' },
        'doctor': { color: 'red', label: 'Doctor' },
        "logistic": { color: 'blue', label: 'Logistics' },
        "dispatch": { color: 'purple', label: 'Dispatch' },
    };
    
    const { color, label } = roles[role];
    return <Tag color={color}>{label}</Tag>;
}