import { post } from ".";
import { MessageInstance } from "antd/es/message/interface";
import { Session } from "@supabase/supabase-js";

type MWData = {
    comp_code: string;
    company_name: string;
    uen: string;
    employee_no: string;
    employee_name: string;
    nric: string;
    sector: string;
    pcp_start: string;
    pcp_end: string;
    checkup_mwoc: string;
    status: string;
    created_date_time: string;
    termination_date: string;
    handphone_no: string;
};

export const fetchMigrantWorkerOptions = async (message: MessageInstance, session: Session, preparedData: MWData[]) => {
    const resp = post({
        url: "/mw/migrant-workers-options",
        body: preparedData,
        session,
        onError: (status, msg) => {
            console.error(status, msg)
            message.error(msg)
            // message.error("Error in retrieving available operations on file data.");
            throw new Error(msg)
        }
    })

    return resp;
};

export const uploadMigrantWorkers = async (message: MessageInstance, session: Session, preparedData: { [key: string]: MWData[] }) => {
    const resp = post({
        url: "/mw/migrant-workers-publish",
        body: preparedData,
        session,
        onError: (status, msg) => {
            console.error(status, msg)
            message.error(msg)
            // message.error("Error in uploading file data.");
            throw new Error(msg)
        }
    })

    return resp;
};
