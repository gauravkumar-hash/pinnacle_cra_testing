import { UploadOutlined } from "@ant-design/icons";
import { Button, Upload, UploadFile, message } from "antd";

export default function FileUploadButton({
    fileList,
    setFileList,
    loading
}: { fileList: UploadFile[], setFileList: (val: UploadFile[]) => void, loading: boolean }) {
    const uploadProps = {
        fileList,
        multiple: false,
        maxCount: 1,
        onRemove: (_: UploadFile) => {
            setFileList([]);
        },
        onChange: ({ file, fileList }: { file: UploadFile, fileList: UploadFile[]}) => {
            const isCSV = file.type === "text/csv" || file.name.toLowerCase().endsWith('.csv');
            if (!isCSV) {
                message.error("You can only upload CSV files!");
                return;
            }
            setFileList(fileList);
        },
        beforeUpload: (_: UploadFile) => {
            return false; // return false to show button
        },
    };

    return (
        <div>
            <Upload {...uploadProps}>
                <Button type="primary" icon={<UploadOutlined />} loading={loading}>
                    Import
                </Button>
            </Upload>
        </div>
    );
}