import { OpenAPI } from '../client';
import supabase from '../supabase';

OpenAPI.BASE = import.meta.env.VITE_ADMIN_API_URL;
OpenAPI.TOKEN = async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
        throw new Error(error?.toString());
    }
    return data.session?.access_token ?? '';
}

// export const getBranches = getBranchesApiAdminBranchesGet;
// export const getSgimedBranches = getSgimedBranchesApiAdminBranchesSgimedGet;
// export const getBranch = getBranchApiAdminBranchesBranchIdGet;
// export const updateBranch = updateBranchApiAdminBranchesBranchIdPut;
// export const getBranchOperatingHours = getOperatingHoursApiAdminBranchesBranchIdOperatingHoursGet;