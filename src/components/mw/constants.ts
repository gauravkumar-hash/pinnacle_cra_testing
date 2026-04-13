const migrant_worker_keys = {
    comp_code: "Comp Code",
    company_name: "Company Name",
    uen: "UEN",
    employee_no: "Employee No",
    employee_name: "Employee Name",
    nric: "NRIC",
    passport: "Passport",
    sector: "Sector",
    pcp_start: "PCP Start",
    pcp_end: "PCP End",
    checkup_mwoc: "CheckUp (MWOC)",
    status: "Status",
    created_date_time: "Created Date & Time",
    termination_date: "Termination Date",
    handphone_no: "Handphone No.",
};

function match_migrant_worker_excel_headers(uploaded_headers: string[]) {
    const migrant_worker_excel_headers = Object.values(migrant_worker_keys);

    if (uploaded_headers.length !== migrant_worker_excel_headers.length)
        return false;

    for (let i = 0; i < uploaded_headers.length; i++) {
        if (uploaded_headers[i] !== migrant_worker_excel_headers[i]) return false;
    }

    return true;
}

const defaultOptions = {
    INSERT: [],
    UPDATE: [],
    DELETE: [],
};

const constants = {
    migrant_worker_keys,
    match_migrant_worker_excel_headers,
    defaultOptions,
};

export default constants;