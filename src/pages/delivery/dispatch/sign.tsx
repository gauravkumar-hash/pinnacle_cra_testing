import { useRef, useState } from "react";
import { Button, Modal } from "antd";
import SignatureCanvas from "react-signature-canvas";
import PDFViewer from "./display-pdf";
import { TeleconsultDeliveryResponse } from "../../../services/client/types.gen";
import DeliveryNotePDF from "./delivery-pdf";
import { pdf } from "@react-pdf/renderer";


interface SignComponentProps {
  delivery: TeleconsultDeliveryResponse;
  handleSubmit: (recipient_name: string | undefined, file: File | null) => void;
}
export function SignComponent({ delivery, handleSubmit }: SignComponentProps) {
  const signCanvas = useRef<SignatureCanvas>(null);
  const [recipientName, setRecipientName] = useState(delivery.patient_name?.split("\n")[0] || "");
  const [trimmedDataURL, setTrimmedDataURL] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function trim() {
    if (signCanvas.current) {
      setTrimmedDataURL(signCanvas.current.toDataURL("image/png"));
      setIsModalOpen(false); // Close modal after trimming
    }
  }

  // Clear the signature pad
  function clear() {
    if (signCanvas.current) {
      signCanvas.current.clear();
    }
  }

  // Combine Sgimed Patient ID and name into a single array of elements
  const patientInfoArray = (delivery.sgimed_patient_id || "")
    .split("\n")
    .map((sgimedPatientId, index) => {
      const names = (delivery.patient_name || "").split("\n");
      return {
        sgimedPatientId: sgimedPatientId.trim(),
        name: names[index]?.trim() || "",
        address: delivery.address || "",  
      };
    });

    async function submitPdf(
      formatPatientName: string,
      formatPatientId: string,
      delivery: TeleconsultDeliveryResponse,
      nameOfRecipient: string,
      trimmedDataURL: string,
    ) {
    
      const blob = await pdf(<DeliveryNotePDF 
        patientName={formatPatientName} 
        patientId={formatPatientId} 
        delivery={delivery}
        nameOfRecipient={nameOfRecipient}
        trimmedDataURL={trimmedDataURL}
      />).toBlob();
    
      const file = new File([blob], "modified.pdf", { type: "application/pdf" });
      handleSubmit(nameOfRecipient, file);
    }

  return (
    <div className="flex flex-col gap-4 w-full">
      <PDFViewer
        nameOfRecipient={recipientName}
        setNameOfRecipient={setRecipientName}
        trimmedDataURL={trimmedDataURL}
        setIsModalOpen={setIsModalOpen}
        delivery={delivery}
        patientInfoArray={patientInfoArray}
        handleSubmitReactPdf={submitPdf}
      />

      <Modal
        title="Sign Here"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        style={{ maxWidth: "400px", maxHeight: "300px" }}
        footer={[
          <Button key="clear" onClick={clear}>
            Clear
          </Button>,
          <Button key="trim" type="primary" onClick={trim}>
            Trim & Save
          </Button>,
        ]}
      >
        <SignatureCanvas
          ref={signCanvas}
          canvasProps={{
            width: "300px",
            height: "200px",
            className: "sigCanvas",
            style: { border: "1px solid #ccc" },
          }}
          backgroundColor="rgba(0,0,0,0)"
        />
      </Modal>

    </div>
  );
}
