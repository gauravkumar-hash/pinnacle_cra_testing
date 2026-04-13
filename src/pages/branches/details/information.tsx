import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Checkbox, GetProp, Input, Skeleton, Upload, UploadFile } from "antd"
import { useState } from "react";
import { UploadOutlined } from "@ant-design/icons";
import { UploadProps } from "antd/es/upload";
import { ApiError, getBranchApiAdminBranchesBranchIdGet, updateBranchApiAdminBranchesBranchIdPut } from "@/services/client";
import { getErrorMsg } from "@/utils";

export function InformationTab({ branchId }: { branchId: string }) {
    const { message } = App.useApp();
    const [ address, setAddress ] = useState<string>();
    const [ url, setUrl ] = useState<string>();
    const [ fileList, setFileList ] = useState<UploadFile[]>(); 
    const [ services, setServices ] = useState<string[]>();

    const queryClient = useQueryClient();
    const { isPending, isError, data, error } = useQuery({
        queryKey: ['branches', branchId],
        queryFn: () => getBranchApiAdminBranchesBranchIdGet({ branchId })
    })

    const saveMutation = useMutation({
        mutationFn: updateBranchApiAdminBranchesBranchIdPut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            message.success('Branch updated successfully');
        },
        onError: (error: ApiError) => message.error(getErrorMsg(error)),
    });

    if (isPending) return <Skeleton />;
    if (isError) return <div>{error.message}</div>;

    const onBeforeUpload = (file: UploadFile) => {
        setFileList([file]);
        return false;
    }

    type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];
    const onSave = async () => {
        if (services?.length === 0) {
            message.error('Please select at least one service');
            return;
        }

        const image = fileList ? fileList[0] as FileType : null;
        const formData = { address, url, services, image };
        console.log(formData);
        saveMutation.mutate({
            branchId,
            formData
        })
    };

    const defaultFileList: UploadFile[] = [
        {
          uid: '1',
          name: data.data.image_url?.split('/').pop()?.split('?')[0] ?? '',
          status: 'done',
          url: data.data.image_url ?? '',
        }
    ];
    const edited = address || url || services || fileList;

    return (
        <div>
            <div className='flex flex-col gap-8 mt-4 mb-4' style={{ width: 400 }}>
                <div className='flex flex-col gap-2'>
                    <div>Location Address</div>
                    <Input placeholder='Address' defaultValue={data.data.address ?? ''} value={address} onChange={(e) => setAddress(e.target.value) }/>
                </div>
                <div className='flex flex-col gap-2'>
                    <div>Location URL</div>
                    <Input placeholder='URL' defaultValue={data.data.url ?? ''} value={url} onChange={(e) => setUrl(e.target.value) } />
                </div>
                <div className='flex flex-col gap-2'>
                    <div>Thumbnail Image</div>
                    <Upload listType="picture" beforeUpload={onBeforeUpload} fileList={fileList ?? defaultFileList} onRemove={() => setFileList([])}>
                        <Button icon={<UploadOutlined />}>Upload</Button>
                    </Upload>
                </div>
                <div className='flex flex-col gap-2'>
                    <div>Services offered (Walk-In)</div>
                    <Checkbox.Group style={{gap: 8}} options={data?.options.services} defaultValue={data?.data.services} onChange={setServices} />
                </div>
            </div>
            <Button className="mt-4" type='primary' onClick={onSave} loading={saveMutation.isPending} disabled={!edited}>Save</Button>
        </div>
    )
}