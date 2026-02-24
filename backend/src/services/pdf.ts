import PDFDocument from 'pdfkit';

interface InvoiceData {
  invoice_number: string;
  client_name: string;
  client_email?: string;
  client_address?: string;
  date: string;
  due_date: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

export function generateInvoicePDF(invoice: InvoiceData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50 });

  // Header
  doc.fontSize(28).font('Helvetica-Bold').text('INVOICE', 50, 50);
  doc.fontSize(10).font('Helvetica').text(`#${invoice.invoice_number}`, 50, 85);

  // Dates
  doc.fontSize(10).font('Helvetica');
  doc.text(`Date: ${invoice.date}`, 400, 50, { align: 'right' });
  doc.text(`Due: ${invoice.due_date}`, 400, 65, { align: 'right' });

  // Bill To
  doc.moveDown(2);
  const billToY = 120;
  doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, billToY);
  doc.font('Helvetica').text(invoice.client_name, 50, billToY + 15);
  if (invoice.client_email) doc.text(invoice.client_email);
  if (invoice.client_address) doc.text(invoice.client_address);

  // Table header
  const tableTop = 220;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Description', 50, tableTop);
  doc.text('Qty', 300, tableTop, { width: 60, align: 'right' });
  doc.text('Rate', 370, tableTop, { width: 80, align: 'right' });
  doc.text('Amount', 460, tableTop, { width: 80, align: 'right' });

  doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

  // Table rows
  let y = tableTop + 25;
  doc.font('Helvetica').fontSize(10);
  let total = 0;

  for (const item of invoice.items) {
    doc.text(item.description, 50, y, { width: 240 });
    doc.text(String(item.quantity), 300, y, { width: 60, align: 'right' });
    doc.text(`$${item.rate.toFixed(2)}`, 370, y, { width: 80, align: 'right' });
    doc.text(`$${item.amount.toFixed(2)}`, 460, y, { width: 80, align: 'right' });
    total += item.amount;
    y += 20;
  }

  // Total
  doc.moveTo(370, y + 5).lineTo(540, y + 5).stroke();
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Total:', 370, y + 15, { width: 80, align: 'right' });
  doc.text(`$${total.toFixed(2)}`, 460, y + 15, { width: 80, align: 'right' });

  // Notes
  if (invoice.notes) {
    doc.moveDown(4);
    doc.font('Helvetica-Bold').fontSize(10).text('Notes:', 50, y + 60);
    doc.font('Helvetica').text(invoice.notes, 50, y + 75);
  }

  return doc;
}
