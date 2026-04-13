import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { TeleconsultDeliveryResponse } from '@/services/client/types.gen';

// Adjusted styles for clarity and logo prominence
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    padding: 36,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  titleBlock: {
    flexDirection: 'column',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    marginBottom: 2,
    fontWeight: 'bold',
    color: '#222',
  },
  subtitle: {
    fontSize: 24,
    marginBottom: 12,
    fontWeight: 'bold',
    color: '#222',
  },
  logo: {
    width: "40%",    // Larger logo
    height: 60,
    minWidth: 200,
    marginLeft: 12,
    marginTop: 2,
    objectFit: 'contain',
  },
  patientLabel: {
    marginTop: 18,
    marginBottom: 80,
    fontSize: 14,
  },
  table: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  tableColHeader: {
    // borderWidth: 1,
    borderTopWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 1,
    borderColor: '#000',
    flex: 1.3,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    padding: 6,
    fontSize: 14,
    margin: 0,
  },
  tableCol: {
    borderTopWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 1,
    borderColor: '#000',
    flex: 1,
    justifyContent: 'center',
    padding: 6,
    margin: 0,
    textAlign: 'center',
    marginRight: 4,
  },
  tableRightBorder: {
    borderRightWidth: 1,
  },
  tableBottomBorder: {
    borderBottomWidth: 1,
  },
  instructions: {
    marginTop: 18,
    marginBottom: 18,
    fontSize: 14,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 8,
    marginTop: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: '#fff',
  },
  checkmark: {
    color: '#000',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 0,
  },
  checkText: {
    fontSize: 14,
    flex: 1,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50,
    marginBottom: 16,
  },
  signatureBlock: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    width: '80%',
    height: 1,
    marginBottom: 4,
  },
  signatureText: {
    fontSize: 14,
    color: '#000',
  },
  signatureLabel: {
    fontSize: 11,
    color: '#000',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // No padding or margin here, so the blue bar can extend full width
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#15405F',
    // color: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 18, // matches your page padding
    // No margin here
  },
  footerCol: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 13,
    color: '#fff', // ensure text is white
    marginRight: 8,
  },
  footerIcon: {
    width: 20,
    height: 20,
    marginRight: 2,
    objectFit: 'contain',
  },
  archiveSection: {
    paddingHorizontal: 36,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  archiveTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 0,
    marginBottom: 4,
    color: '#222',
  },
  archiveText: {
    fontSize: 14,
    color: '#222',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center', // vertical centering
    marginTop: 0,
    marginBottom: 64,
    width: '100%',
  },
  patientInfoBox: {
    maxWidth: 400, // adjust as needed
    marginLeft: 30,
    marginTop: -12,
    backgroundColor: '#fafafa', // lighter gray background
    border: '1pt solid #ccc',
    borderRadius: 8,
    padding: 10,
    boxShadow: '0 1pt 4pt rgba(0,0,0,0.04)', // optional, for subtle shadow
  },
  patientInfoName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  patientInfoId: {
    fontSize: 11,
    color: '#555',
    marginBottom: 2,
  },
  patientInfoAddress: {
    fontSize: 11,
    color: '#555',
    // wraps by default
  },
});


interface DeliveryNotePDFProps {
  delivery: TeleconsultDeliveryResponse;
  patientName: string;
  patientId: string;
  nameOfRecipient: string | null;
  trimmedDataURL: string | null;
}

const DeliveryNotePDF = ({ delivery, patientName, patientId, nameOfRecipient, trimmedDataURL }: DeliveryNotePDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Medication</Text>
          <Text style={styles.subtitle}>Delivery Notice</Text>
        </View>
        <Image style={styles.logo} src="/delivery/pinnacle-logo.jpg" />
      </View>

      <View style={styles.patientInfoRow}>
        <Text style={styles.patientLabel}>Patient:</Text>
        <View style={styles.patientInfoBox}>
          <Text style={styles.patientInfoName}>{patientName}</Text>

          <Text style={styles.patientInfoId}>PID: {patientId}</Text>
          <Text style={styles.patientInfoAddress}>
            {delivery.address}, {delivery.postal}
          </Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableColHeader}>
          <Text>Date of Consultation</Text>
        </View>
        <View style={[styles.tableCol, styles.tableRightBorder]}>
          <Text>{delivery.consultation_date ? new Date(delivery.consultation_date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : ''}</Text>
        </View>
        <View style={styles.tableColHeader}>
          <Text>No. of Package(s)</Text>
        </View>
        <View style={[styles.tableCol, styles.tableRightBorder]}>
          <Text>{delivery.number_of_packages}</Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={[styles.tableColHeader, styles.tableBottomBorder]}>
          <Text>Date of Delivery</Text>
        </View>
        <View style={[styles.tableCol, styles.tableRightBorder, styles.tableBottomBorder]}>
          <Text>{delivery.delivery_date ? new Date(delivery.delivery_date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : ''}</Text>
        </View>
        <View style={[styles.tableColHeader, styles.tableBottomBorder]}>
          <Text>Delivery Attempt</Text>
        </View>
        <View style={[styles.tableCol, styles.tableRightBorder, styles.tableBottomBorder]}>
          <Text>{delivery.delivery_attempt}</Text>
        </View>
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>
        Please ensure all medications are in order.
        {"\n"}You may contact our 24/7 hotline 62351852 if you have any enquiries.
      </Text>

      {/* Checkboxes */}
      <View style={styles.checkRow}>
        <View style={[styles.checkbox, styles.checked]}>
          <Text style={styles.checkmark}>X</Text>
        </View>
        <Text style={styles.checkText}>Patient's Copy</Text>
      </View>
      <View style={styles.checkRow}>
        <View style={styles.checkbox}></View>
        <Text style={styles.checkText}>Patient has instructed for the medication to be left at their doorstep.</Text>
      </View>
      <View style={styles.checkRow}>
        <View style={[styles.checkbox, styles.checked]}>
          <Text style={styles.checkmark}>X</Text>
        </View>
        <Text style={styles.checkText}>
          The recipient whose signature below acknowledges they received the medication delivery order for the consultation as dated on this form.
        </Text>
      </View>

      {/* Signature lines */}
      <View style={styles.signatureRow}>
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureText}>{nameOfRecipient}</Text>
          <View style={styles.signatureLine}></View>
          <Text style={styles.signatureLabel}>Name of Recipient</Text>
        </View>
        <View style={styles.signatureBlock}></View>
      </View>

      <View style={styles.signatureRow}>
        <View style={[styles.signatureBlock, {marginTop: 15}]}>
          {trimmedDataURL && <Image style={{width: 75, height: 75, margin: 0, marginTop: -75}} src={trimmedDataURL} />}
          <View style={styles.signatureLine}></View>
          <Text style={styles.signatureLabel}>Signature of Recipient</Text>
        </View>
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureText}>{new Date().toLocaleString('en-GB', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore'})}</Text>
          <View style={styles.signatureLine}>
          </View>
          <Text style={styles.signatureLabel}>Date of Receipt</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        {/* Blue bar */}
        <View style={styles.footerRow}>
          <View style={styles.footerCol}>
            <Image style={styles.footerIcon} src="/delivery/phone-icon.png" />
            <Text>+65 6235 1852</Text>
          </View>
          <View style={styles.footerCol}>
          <Image style={styles.footerIcon} src="/delivery/mail-icon.png" />
            <Text>connect@pinnaclefamilyclinic.com.sg</Text>
          </View>
          <View style={styles.footerCol}>
            <Image style={styles.footerIcon} src="/delivery/web-icon.png" />
            <Text>pinnaclefamilyclinic.com.sg</Text>
          </View>
        </View>
        {/* Archive section */}
        <View style={styles.archiveSection}>
          <Text style={styles.archiveTitle}>E-document Archive on PinnacleSG+</Text>
          <Text style={styles.archiveText}>
            You may access your invoices, medical certificates, memos, and other medical documents via the app, <Text style={{ fontWeight: 'bold' }}>PinnacleSG+</Text>, under <Text style={{ fontStyle: 'italic' }}>My Records</Text>.
          </Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default DeliveryNotePDF;
