import { useEffect, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Document as PDFDoc, Page, pdfjs } from 'react-pdf';
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Button, Input } from "antd";
import { TeleconsultDeliveryResponse } from "@/services/client/types.gen";
import { PatientInfo } from "../util";
import DeliveryNotePDF from "./delivery-pdf";

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  nameOfRecipient: string;
  setNameOfRecipient: (nameOfRecipient: string) => void;
  trimmedDataURL: string | null;
  setIsModalOpen: (isModalOpen: boolean) => void;
  delivery: TeleconsultDeliveryResponse;
  patientInfoArray: PatientInfo[];
  handleSubmitReactPdf: (
    formatPatientName: string, 
    formatPatientId: string, 
    delivery: TeleconsultDeliveryResponse, 
    nameOfRecipient: string, 
    trimmedDataURL: string,
  ) => Promise<void>;
}

function PDFViewer({
  nameOfRecipient,
  setNameOfRecipient,
  trimmedDataURL,
  setIsModalOpen,
  delivery,
  patientInfoArray,
  handleSubmitReactPdf,
}: PDFViewerProps) {
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  function onDocumentLoadSuccess() {
    setPdfLoaded(true);
  }

  const formatPatientName =  patientInfoArray.reduce((acc, info, index) => {
    if (index === 0) {
      return info.name
    }
    return acc + ", " + info.name
  }, "")

  const formatPatientId =  patientInfoArray.reduce((acc, info, index) => {
    if (index === 0) {
      return info.sgimedPatientId
    }
    return acc + ", " + info.sgimedPatientId
  }, "")

  useEffect(() => {
    // Generate PDF as Blob
    const generatePdf = async () => {
      const blob = await pdf(<DeliveryNotePDF 
        patientName={formatPatientName} 
        patientId={formatPatientId} 
        delivery={delivery}
        nameOfRecipient={nameOfRecipient}
        trimmedDataURL={trimmedDataURL}
      />).toBlob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    };
    generatePdf();
  }, []);

  return (
    <>
     <div
      className="flex flex-col items-center justify-center"
      style={{ position: "relative" }}
    >
      {pdfUrl ? (
        <PDFDoc file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
            <Page pageNumber={1} width={400}/>
          </PDFDoc>
      ) : (
        <div>Loading PDF...</div>
      )}
    </div>
    {pdfLoaded && (
      <Input
        placeholder="Recipient Name"
        value={nameOfRecipient}
        onChange={(e) => setNameOfRecipient(e.target.value)}
        style={{ 
          position: "absolute", 
          zIndex: 1000, 
          top: 422, 
          left: 35, 
          width: 150, 
          fontSize: 10,
          border: "1px dashed #ccc", 
          borderRadius: 4, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
       }}
      />
    )}

    {pdfLoaded && (
        <>
          <div
            style={{
              position: "absolute",
              zIndex: 1000,
              top: 480,
              left: 35,
              width: 150,
              height: 30,
              fontSize: 10,
              border: "1px dashed #ccc",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backgroundColor: trimmedDataURL ? "transparent" : "#fafafa",
            }}
            onClick={() => setIsModalOpen(true)}
          >
            {trimmedDataURL ? (
              <img
                src={trimmedDataURL}
                alt="Signature"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
              />
            ) : (
              <span style={{ fontSize: 10, color: "#999" }}>Click to sign</span>
            )}
          </div>
        </>
      )}
      <div style={{  }}>
        <Button
          type="primary"
          disabled={!nameOfRecipient || !trimmedDataURL}
          onClick={() => handleSubmitReactPdf(formatPatientName, formatPatientId, delivery, nameOfRecipient, trimmedDataURL || "")}
          className="w-full"    
        >
          Submit Successful Delivery
        </Button>
      </div>
    </>
  );
}

export default PDFViewer;
