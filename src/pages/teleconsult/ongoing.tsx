import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Layout,
  message,
  Popconfirm,
  Select,
  Skeleton,
  Table,
  TableColumnsType,
  Tag,
} from "antd";
import { Link } from "react-router-dom";
import {
  ApiError,
  getOngoingTeleconsultsApiAdminTeleconsultOngoingGet,
  TeleconsultAdminResp,
  TeleconsultStatus,
  untagDoctorApiAdminTeleconsultUntagDoctorPost,
  updateStatusApiAdminTeleconsultUpdateStatusPost,
} from "../../services/client";
import { useState } from "react";
import dayjs from "dayjs";
import { getErrorMsg } from "@/utils";
import { convertToTitleCase, dateSort, stringSort } from "@/utils/table";
const { Header, Content } = Layout;

const SGIMED_URL = import.meta.env.VITE_SGIMED_URL;

export default function OngoingTeleconsults() {
  const qry = useQuery({
    queryKey: ["teleconsults", "ongoing"],
    queryFn: getOngoingTeleconsultsApiAdminTeleconsultOngoingGet,
  });

  return (
    <Layout className="p-4">
      <Header
        style={{ padding: 0 }}
        className="bg-gray-100 flex flex-row justify-between items-center "
      >
        <h1 className="text-xl font-semibold">Ongoing Teleconsults</h1>
        {/* <DateSelector /> */}
      </Header>
      <Content className="flex flex-col gap-4 font-medium">
        {qry.isPending && <Skeleton active />}
        {qry.isError && <div>{qry.error?.message}</div>}
        {qry.isSuccess && <ContentData data={qry.data} />}
      </Content>
    </Layout>
  );
}

const filterGroup = (data: TeleconsultAdminResp[], key: string) => ({
  filters: [...new Set(data?.map((r: any) => r[key]))]
    .sort()
    .filter((r) => r)
    .map((r) => ({ text: convertToTitleCase(r), value: r })),
  onFilter: (v: any, r: any) => r[key]?.includes(v),
  filterSearch: true,
});
const link = (r: TeleconsultAdminResp) =>
  `${SGIMED_URL}/patient/${r.sgimed_patient_id}/dispensary?visit_id=${r.sgimed_visit_id}`;

const teleconsultStatusColor: { [key in TeleconsultStatus]?: string } = {
  Prepayment: "processing",
  "Checked In": "processing",
  "Consult Start": "success",
  "Consult End": "warning",
  Outstanding: "error",
  Cancelled: "error",
  Missed: "error",
  // "Dispense Medication": undefined,
  // "Checked Out": undefined
};

const ContentData = ({ data }: { data: TeleconsultAdminResp[] }) => {
  const [selectedId, setSelectedId] = useState<string>();

  const columns: TableColumnsType<TeleconsultAdminResp> = [
    {
      title: "Queue No.",
      dataIndex: "queue_number",
      sorter: stringSort("queue_number"),
    },
    {
      title: "Date & Time",
      dataIndex: "checkin_time",
      sorter: dateSort("checkin_time"),
      render: (_: string) => dayjs(`${_}Z`).format("DD MMM YYYY hh:mm a"),
    },
    {
      title: "Patient Type",
      dataIndex: "patient_type",
      ...filterGroup(data, "patient_type"),
      render: (_: string) => convertToTitleCase(_),
    },
    {
      title: "Name",
      dataIndex: "patient_name",
      ...filterGroup(data, "patient_name"),
      render: (_, r) => (
        <Link to={link(r)} target="_blank" rel="noopener noreferrer">
          {_}
        </Link>
      ),
    },
    {
      title: "NRIC / FIN",
      dataIndex: "patient_nric",
      ...filterGroup(data, "patient_nric"),
    },
    {
      title: "Branch",
      dataIndex: "branch_name",
      ...filterGroup(data, "branch_name"),
    },
    {
      title: "Code",
      dataIndex: "corporate_code",
      ...filterGroup(data, "corporate_code"),
    },
    // { title: 'Show Inv', dataIndex: 'hide_invoice', render: (_, r) => <Checkbox disabled={onToggleHideInvoice.isPending && r.id == onToggleHideInvoice.variables.requestBody.id} checked={!_} onChange={() => onToggleHideInvoice.mutate({ requestBody: { id: r.id, hide_invoice: !_ }})} /> },
    {
      title: "Status",
      dataIndex: "status",
      ...filterGroup(data, "status"),
      render: (_: TeleconsultStatus) => (
        <Tag color={teleconsultStatusColor[_]}>{_}</Tag>
      ),
    },
    {
      title: "",
      render: (_, r) => (
        <RowAction
          id={r.id}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          currValue={r.status}
          hasDoctorTagged={r.doctor_name?.length > 0}
        />
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data?.sort(dateSort("checkin_time")).reverse()}
      rowKey={(row) => row.id}
      pagination={{
        // position: ['topRight'],
        defaultPageSize: 50,
        pageSizeOptions: ["50", "100"],
        showSizeChanger: true,
      }}
    />
  );
};

const allowedStatus: TeleconsultStatus[] = [
  "Checked In",
  "Cancelled",
  "Missed",
  "Checked Out",
];

const RowAction = ({
  id,
  selectedId,
  setSelectedId,
  currValue,
  hasDoctorTagged,
}: {
  id: string;
  selectedId?: string;
  setSelectedId: (id?: string) => void;
  currValue: string;
  hasDoctorTagged: boolean;
}) => {
  const [status, setStatus] = useState<TeleconsultStatus>();

  const queryClient = useQueryClient();
  const updateStatusMutation = useMutation({
    mutationFn: updateStatusApiAdminTeleconsultUpdateStatusPost,
    onSuccess: (_) => {
      message.success("Updated teleconsult status successfully");
      queryClient.invalidateQueries({ queryKey: ["teleconsults", "ongoing"] });
      setSelectedId(undefined);
    },
    onError: (error: ApiError) => message.error(getErrorMsg(error)),
  });

  const untagMutation = useMutation({
    mutationFn: untagDoctorApiAdminTeleconsultUntagDoctorPost,
    onSuccess: (_) => {
      message.success("Untagged doctor successfully");
      queryClient.invalidateQueries({ queryKey: ["teleconsults", "ongoing"] });
      setSelectedId(undefined);
    },
    onError: (error: ApiError) => message.error(getErrorMsg(error)),
  });

  if (selectedId != id) {
    return (
      <>
        <Button type="link" size="small" onClick={() => setSelectedId(id)}>
          Change Status
        </Button>
        {
          hasDoctorTagged && <Popconfirm
            placement="top"
            title="Untag Doctor"
            description="Are you sure you want to untag the doctor?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => untagMutation.mutate({ requestBody: { id } })}
          >
            <Button
              type='link'
              size='small'
              loading={untagMutation.isPending && untagMutation.variables.requestBody.id == id}
            >
              Untag Doctor
            </Button>
          </Popconfirm>
        }
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-32">
      <Select
        options={allowedStatus
          .filter((r) => r != currValue)
          .map((r) => ({ value: r }))}
        size="small"
        onChange={(v) => setStatus(v)}
      />
      <Button
        size="small"
        onClick={() =>
          updateStatusMutation.mutate({ requestBody: { id, status: status! } })
        }
        loading={
          updateStatusMutation.isPending &&
          updateStatusMutation.variables.requestBody.id == id
        }
        disabled={updateStatusMutation.isPending || !status}
      >
        Update Status
      </Button>
    </div>
  );
};
