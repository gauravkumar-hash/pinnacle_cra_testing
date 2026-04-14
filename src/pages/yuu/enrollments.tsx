import { Button, Input, Table, TableColumnsType, Tag, Space, DatePicker } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { stringSort } from "@/utils/table";
import dayjs, { Dayjs } from "dayjs";
import { FileExcelOutlined, SearchOutlined } from "@ant-design/icons";
import xlsx from "json-as-xlsx";
import { OpenAPI } from "@/services/client";

const { RangePicker } = DatePicker;

interface YuuEnrollment {
  id: string;
  patient_name: string;
  nric: string;
  tomo_id: string;
  linked_at: string;
}

const BASE_URL = import.meta.env.VITE_ADMIN_API_URL ?? "";

const fetchEnrollments = async (
  page: number,
  search: string,
  startDate?: string,
  endDate?: string
) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (search && search.trim()) params.set("search", search.trim());
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({ method: "GET", url: "/api/admin/yuu/enrollments" })
      : OpenAPI.TOKEN;

  const res = await fetch(
    `${BASE_URL}/api/admin/yuu/enrollments?${params.toString()}`,
    {
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.json();
};

export function EnrollmentsScreen() {
  // Raw input value (what user types)
  const [searchInput, setSearchInput] = useState("");
  // Debounced value used for the actual API query
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ✅ FIX: Debounce search input by 400ms to avoid race conditions
  // where a slower earlier request resolves after a later one
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // reset page when debounced search commits
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const startDate = dates?.[0]
    ? dates[0].startOf("day").format("YYYY-MM-DD")
    : undefined;
  const endDate = dates?.[1]
    ? dates[1].endOf("day").format("YYYY-MM-DD")
    : undefined;

  const qry = useQuery({
    queryKey: ["yuu-enrollments", page, search, startDate, endDate],
    queryFn: () => fetchEnrollments(page, search, startDate, endDate),
    staleTime: 0,
    gcTime: 0,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const totalRows = qry.data?.pager?.rows ?? 0;
      const pageSize = qry.data?.pager?.n ?? 20;
      const totalPages = Math.ceil(totalRows / pageSize);

      if (totalPages === 0) return;

      const results = await Promise.all(
        Array.from({ length: totalPages }, (_, i) =>
          fetchEnrollments(i + 1, search, startDate, endDate)
        )
      );

      const allData = results.flatMap((r) => r.data ?? []);

      if (allData.length === 0) {
        alert("No records found for the selected filters.");
        return;
      }

      xlsx(
        [
          {
            sheet: "Yuu Enrollments",
            columns: [
              { label: "Patient Name", value: "patient_name" },
              { label: "NRIC", value: "nric" },
              { label: "Tomo ID", value: "tomo_id" },
              {
                label: "Linked Date",
                value: (row: any) =>
                  dayjs(row.linked_at).format("YYYY-MM-DD HH:mm"),
              },
              { label: "Status", value: () => "Active" },
            ],
            content: allData,
          },
        ],
        {
          fileName: `Yuu_Enrollments_${startDate ?? "All"}_to_${
            endDate ?? "Today"
          }`,
          extraLength: 3,
          writeOptions: {},
        }
      );
    } finally {
      setIsExporting(false);
    }
  };

  const columns: TableColumnsType<YuuEnrollment> = [
    {
      title: "Patient Name",
      dataIndex: "patient_name",
      sorter: stringSort("patient_name"),
      width: "25%",
    },
    { title: "NRIC", dataIndex: "nric", width: "15%" },
    { title: "Tomo ID", dataIndex: "tomo_id", width: "15%" },
    {
      title: "Linked Date",
      dataIndex: "linked_at",
      render: (date) => dayjs(date).format("YYYY-MM-DD HH:mm"),
      width: "20%",
    },
    {
      title: "Status",
      render: () => <Tag color="green">Active</Tag>,
      width: "15%",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">Yuu Enrollments</h2>
        <Space size="middle">
          <RangePicker
            onChange={(v) => {
              // ✅ FIX: Explicitly handle null (clear) vs valid range
              setDates(v as [Dayjs | null, Dayjs | null] | null);
              setPage(1);
            }}
            placeholder={["Start Date", "End Date"]}
          />
          <Input
            placeholder="Search name/NRIC..."
            prefix={<SearchOutlined />}
            // ✅ FIX: Bind to searchInput (raw), not search (debounced)
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              // Note: page reset happens inside the debounce useEffect
            }}
            style={{ width: 220 }}
            allowClear
            // ✅ FIX: Also support pressing Enter to search immediately
            onPressEnter={() => {
              setSearch(searchInput);
              setPage(1);
            }}
          />
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={handleExport}
            loading={isExporting}
            disabled={isExporting || !qry.data?.pager?.rows}
            style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
          >
            Export Excel
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={qry.data?.data ?? []}
        rowKey="id"
        pagination={{
          current: qry.data?.pager?.p ?? 1,
          total: qry.data?.pager?.rows ?? 0,
          pageSize: qry.data?.pager?.n ?? 20,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} enrollments`,
        }}
        loading={qry.isLoading}
        bordered
      />
    </div>
  );
}
