import React from 'react';
import { Modal, Form, Input, Row, Col, DatePicker, Select, Alert, Button, FormInstance } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

interface DriverOption {
    value: string;
    label: string;
}

interface BulkUpdateDeliveryProps {
    open: boolean;
    selectedCount: number;
    onCancel: () => void;
    onUpdate: () => void;
    driverOptions: DriverOption[];
    form: FormInstance;
}

export const BulkUpdateDeliveryModal: React.FC<BulkUpdateDeliveryProps> = ({
    open,
    selectedCount,
    onCancel,
    onUpdate,
    driverOptions,
    form,
}) => (
    <Modal
        title={<span className="font-bold text-lg">Bulk Update Delivery Status</span>}
        open={open}
        onCancel={onCancel}
        footer={null}
        width={500}
        centered
    >
        <div className="mb-4 text-gray-500 font-medium">
            Updating {selectedCount} selected item{selectedCount > 1 ? 's' : ''}
        </div>
        <Form layout="vertical" form={form}>
            <Form.Item label={<span className="font-semibold">Delivery Status</span>} name="status" required rules={[{ required: true, message: 'Please select delivery status!' }]}> 
                <Select
                    placeholder="Select delivery status"
                    size="large"
                >
                    <Select.Option value="pending">Pending</Select.Option>
                    <Select.Option value="success">Success</Select.Option>
                    <Select.Option value="failed">Failed</Select.Option>
                    <Select.Option value="cancelled">Cancelled</Select.Option>
                    <Select.Option value="retry">Retry</Select.Option>
                    <Select.Option value="no_delivery_service">No Delivery Service</Select.Option>
                </Select>
            </Form.Item>
            <Form.Item label={<span className="font-semibold">Delivery Driver</span>} name="driver" rules={[{ required: true, message: 'Please select delivery driver!' }]}> 
                <Select
                    placeholder="Select delivery driver"
                    size="large"
                >
                    {driverOptions.map(driver => (
                        <Select.Option key={driver.value} value={driver.value}>{driver.label}</Select.Option>
                    ))}
                </Select>
            </Form.Item>
            <div className="flex justify-end gap-2 mt-6">
                <Button onClick={onCancel} size="large">
                    Cancel
                </Button>
                <Button
                    type="primary"
                    size="large"
                    onClick={onUpdate}
                >
                    Update
                </Button>
            </div>
        </Form>
    </Modal>
);

interface EditDeliveryDetailsModalProps {
    open: boolean;
    form: any;
    onOk: () => void;
    onCancel: () => void;
}

export const EditDeliveryDetailsModal: React.FC<EditDeliveryDetailsModalProps> = ({
    open,
    form,
    onOk,
    onCancel,
}) => (
    <Modal
        title="Edit Delivery Details"
        open={open}
        onOk={onOk}
        onCancel={onCancel}
        width={800}
    >
        <Form
            form={form}
            layout="vertical"
            className="mt-4"
        >
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label="NRIC"
                        name="nric"
                    >
                        <Input disabled />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Queue Number"
                        name="queue"
                    >
                        <Input disabled />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label="Patient Name"
                        name="patientName"
                    >
                        <Input disabled />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Delivery Date"
                        name="deliveryDate"
                        rules={[{ required: true, message: 'Please select delivery date!' }]}
                    >
                        <DatePicker className="w-full" format="YYYY-MM-DD" />
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item
                label="Address"
                name="address"
                rules={[{ required: true, message: 'Please input address!' }]}
            >
                <Input.TextArea rows={3} />
            </Form.Item>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item
                        label="Postal"
                        name="postal"
                        rules={[{ required: true, message: 'Please input postal code!' }]}
                    >
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item
                        label="Zone"
                        name="zone"
                        tooltip="Only edit this if you manually change the zone"
                    >
                        <Select>
                            <Select.Option value="north">North</Select.Option>
                            <Select.Option value="south">South</Select.Option>
                            <Select.Option value="east">East</Select.Option>
                            <Select.Option value="west">West</Select.Option>
                            <Select.Option value="central">Central</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item
                        label="Number of Packages"
                        name="packages"
                        rules={[{ required: true, message: 'Please input number of packages!' }]}
                    >
                        <Input type="number" min={0} />
                    </Form.Item>
                </Col>
            </Row>
            <Alert
                message="Zone Warning"
                description="Only edit the zone if you are manually changing it. The zone is typically determined by the postal code."
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                className="mb-4"
            />
        </Form>
    </Modal>
);

interface UpdateDeliveryStatusModalProps {
    open: boolean;
    form: any;
    onOk: () => void;
    onCancel: () => void;
}

export const UpdateDeliveryStatusModal: React.FC<UpdateDeliveryStatusModalProps> = ({
    open,
    form,
    onOk,
    onCancel,
}) => (
    <Modal
        title="Update Delivery Status"
        open={open}
        onOk={onOk}
        onCancel={onCancel}
        width={600}
    >
        <Form
            form={form}
            layout="vertical"
            className="mt-4"
        >
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label="Queue Number"
                        name="queue"
                    >
                        <Input disabled />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="NRIC"
                        name="nric"
                    >
                        <Input disabled />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label="Patient Name"
                        name="patientName"
                    >
                        <Input disabled />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Delivery Date"
                        name="deliveryDate"
                    >
                        <Input disabled />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label="Recipient Name"
                        name="recipientName"
                    >
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Status"
                        name="status"
                        rules={[{ required: true, message: 'Please select status!' }]}
                    >
                        <Select>
                            <Select.Option value="pending">Pending</Select.Option>
                            <Select.Option value="success">Success</Select.Option>
                            <Select.Option value="failed">Failed</Select.Option>
                            <Select.Option value="cancelled">Cancelled</Select.Option>
                            <Select.Option value="retry">Retry</Select.Option>
                            <Select.Option value="no_delivery_service">No Delivery Service</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    </Modal>
);
