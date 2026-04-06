import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation, CompanyProfile } from '../types';
import { formatCurrency, numberToWords } from './utils';

export const generatePDF = (quotation: Quotation, company: CompanyProfile, action: 'save' | 'preview' = 'save') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Helper for colors
  const colors = {
    primary: [40, 75, 120] as [number, number, number], // Dark blue from screenshots
    secondary: [230, 240, 250] as [number, number, number], // Light blue background
    text: [50, 50, 50] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    accent: [252, 211, 77] as [number, number, number], // Gold/Yellow
  };

  // Ensure data exists to avoid crashes
  const safeCompany = {
    name: company?.name || 'Your Company Name',
    tagline: company?.tagline || 'Authorized Eaton Partner',
    address: company?.address || 'Your Address',
    phone: company?.phone || 'Your Phone',
    mobile: company?.mobile || '',
    email: company?.email || 'Your Email',
    gst_number: company?.gst_number || 'Your GST',
    msme_reg: company?.msme_reg || 'N/A',
    established_year: company?.established_year || 'N/A',
    company_type: company?.company_type || 'Pvt. Ltd.',
    headquarters: company?.headquarters || 'Pune, Maharashtra',
    authorized_partner_since: company?.authorized_partner_since || 'N/A',
    service_locations: company?.service_locations || 'All India',
    authorized_signatory: company?.authorized_signatory || 'Authorized Signatory',
    logo_url: company?.logo_url
  };

  const safeQuotation = {
    ...quotation,
    ref_number: quotation?.ref_number || 'N/A',
    date: quotation?.date || new Date().toISOString().split('T')[0],
    client_name: quotation?.client_name || 'Client Name',
    client_address: quotation?.client_address || 'Client Address',
    kind_attention: quotation?.kind_attention || 'N/A',
    subject: quotation?.subject || 'N/A',
    items: quotation?.items || [],
    terms: quotation?.terms || [],
    total_basic: quotation?.total_basic || 0,
    total_gst: quotation?.total_gst || 0,
    grand_total: quotation?.grand_total || 0,
    location: quotation?.location || 'Client Site',
    requirement_summary: quotation?.requirement_summary || 'N/A',
    proposed_solution: quotation?.proposed_solution || 'N/A',
    key_benefit: quotation?.key_benefit || 'N/A',
    delivery_timeline: quotation?.delivery_timeline || '2-3 weeks',
    warranty_period: quotation?.warranty_period || '2 years',
    understanding: quotation?.understanding || {},
    technical_specs: quotation?.technical_specs || {},
    amc_options: quotation?.amc_options || {}
  };

  // Helper to add page header
  const addSectionHeader = (title: string, number: string) => {
    doc.setFillColor(...colors.primary);
    doc.rect(10, 10, pageWidth - 20, 10, 'F');
    doc.setTextColor(...colors.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${number} ${title}`, 15, 17);
  };

  // --- PAGE 1: TITLE PAGE ---
  doc.setFillColor(...colors.primary);
  doc.rect(10, 20, pageWidth - 20, 30, 'F');
  doc.setTextColor(...colors.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(safeCompany.name.toUpperCase(), pageWidth / 2, 38, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  doc.text(safeCompany.tagline, pageWidth / 2, 45, { align: 'center' });

  doc.setFillColor(...colors.secondary);
  doc.rect(10, 60, pageWidth - 20, 100, 'F');
  doc.setTextColor(...colors.primary);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSAL FOR UPS SYSTEMS', pageWidth / 2, 80, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Submitted To:', pageWidth / 2, 95, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text(safeQuotation.client_name.toUpperCase(), pageWidth / 2, 105, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text(safeQuotation.client_address, pageWidth / 2, 112, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.text);
  doc.text(`Attn: ${safeQuotation.kind_attention}`, pageWidth / 2, 125, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Ref. No.: ${safeQuotation.ref_number}`, pageWidth / 2, 140, { align: 'center' });
  doc.text(`Date: ${safeQuotation.date}`, pageWidth / 2, 147, { align: 'center' });
  doc.text(`Valid Until: ${new Date(new Date(safeQuotation.date).getTime() + safeQuotation.validity_days * 24 * 60 * 60 * 1000).toLocaleDateString()}`, pageWidth / 2, 154, { align: 'center' });

  // --- PAGE 2: COVER LETTER ---
  doc.addPage();
  addSectionHeader('Cover Letter', '01');
  
  autoTable(doc, {
    startY: 25,
    body: [
      ['To', safeQuotation.client_name],
      ['Address', safeQuotation.client_address],
      ['Kind Attention', safeQuotation.kind_attention],
      ['Subject', safeQuotation.subject],
      ['Ref.', `Previous discussions dated ${safeQuotation.date}`]
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, fillColor: [255, 250, 230] } }
  });

  const coverLetterY = (doc as any).lastAutoTable.finalY + 15;
  doc.setTextColor(...colors.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dear ${safeQuotation.kind_attention.split(' ')[0]},`, 15, coverLetterY);
  doc.setFont('helvetica', 'normal');
  const introText = safeQuotation.intro_paragraph;
  const introLines = doc.splitTextToSize(introText, pageWidth - 30);
  doc.text(introLines, 15, coverLetterY + 10);
  
  doc.text('We assure you of our best quality products and prompt after-sales support at all times. Please find the detailed proposal in the following pages.', 15, coverLetterY + 35);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Thanking you,', 15, coverLetterY + 50);
  doc.text(`For ${safeCompany.name}`, 15, coverLetterY + 57);
  doc.setFont('helvetica', 'normal');
  doc.text(`${safeCompany.authorized_signatory} | Authorized Signatory`, 15, coverLetterY + 64);
  doc.text(`${safeCompany.mobile} | ${safeCompany.email}`, 15, coverLetterY + 71);

  // --- PAGE 3: EXECUTIVE SUMMARY ---
  doc.addPage();
  addSectionHeader('Executive Summary', '02');

  autoTable(doc, {
    startY: 25,
    body: [
      ['Client', safeQuotation.client_name],
      ['Location', safeQuotation.location],
      ['Requirement', safeQuotation.requirement_summary],
      ['Proposed Solution', safeQuotation.proposed_solution],
      ['Key Benefit', safeQuotation.key_benefit],
      ['Total Investment', formatCurrency(safeQuotation.grand_total) + ' (Inclusive of GST)'],
      ['Delivery Timeline', safeQuotation.delivery_timeline],
      ['Warranty', safeQuotation.warranty_period]
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [255, 250, 230] } }
  });

  // --- PAGE 4: ABOUT COMPANY & UNDERSTANDING ---
  doc.addPage();
  addSectionHeader('About Our Company', '03');
  
  autoTable(doc, {
    startY: 25,
    body: [
      ['Company Name', safeCompany.name],
      ['Established', safeCompany.established_year],
      ['Type', safeCompany.company_type],
      ['GST No.', safeCompany.gst_number],
      ['MSME Reg. No.', safeCompany.msme_reg],
      ['Headquarters', safeCompany.headquarters],
      ['Authorized Partner', safeCompany.authorized_partner_since],
      ['Service Locations', safeCompany.service_locations]
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [255, 250, 230] } }
  });

  const understandingY = (doc as any).lastAutoTable.finalY + 15;
  addSectionHeader('Understanding of Client Requirements', '04');
  (doc as any).lastAutoTable.finalY = understandingY; // Manual adjustment for next table

  autoTable(doc, {
    startY: understandingY + 12,
    body: [
      ['Client Site', safeQuotation.understanding?.client_site || 'N/A'],
      ['Equipment to Protect', safeQuotation.understanding?.equipment_to_protect || 'N/A'],
      ['No. of UPS Required', safeQuotation.items.reduce((sum, item) => sum + item.quantity, 0).toString()],
      ['UPS Capacity Required', safeQuotation.understanding?.backup_time || 'N/A'],
      ['Required Backup Time', safeQuotation.understanding?.backup_time || 'N/A'],
      ['Input Power Supply', safeQuotation.understanding?.input_power || 'N/A'],
      ['Output Requirement', safeQuotation.understanding?.output_requirement || 'N/A'],
      ['Site Survey Done', safeQuotation.understanding?.site_survey || 'N/A'],
      ['Any Special Requirement', safeQuotation.understanding?.special_requirement || 'N/A']
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [255, 250, 230] } }
  });

  // --- PAGE 5: TECHNICAL SPECIFICATIONS ---
  doc.addPage();
  addSectionHeader('Technical Specifications', '05');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('5A. UPS Unit', 15, 28);

  const upsSpecs = safeQuotation.technical_specs?.ups_unit || {};
  autoTable(doc, {
    startY: 32,
    head: [['Parameter', 'Specification']],
    body: [
      ['Make & Model', upsSpecs.make_model || 'Eaton 9E Series'],
      ['Type', upsSpecs.type || 'True Online Double Conversion'],
      ['Capacity', upsSpecs.capacity || 'N/A'],
      ['Input Voltage Range', upsSpecs.input_voltage || '160V - 280V'],
      ['Input Frequency', upsSpecs.input_frequency || '50Hz ± 5%'],
      ['Output Voltage', upsSpecs.output_voltage || '230V ± 2%'],
      ['Output Frequency', upsSpecs.output_frequency || '50Hz ± 0.5%'],
      ['Efficiency', upsSpecs.efficiency || 'Up to 95%'],
      ['Transfer Time', upsSpecs.transfer_time || 'Zero ms'],
      ['Waveform', upsSpecs.waveform || 'Pure Sine Wave'],
      ['Communication', upsSpecs.communication || 'USB / RS232'],
      ['Display', upsSpecs.display || 'LCD Panel'],
      ['Standards', upsSpecs.standards || 'IEC 62040-1'],
      ['Dimensions', upsSpecs.dimensions || 'N/A'],
      ['Weight', upsSpecs.weight || 'N/A']
    ],
    theme: 'striped',
    headStyles: { fillColor: colors.primary },
    styles: { fontSize: 8, cellPadding: 2 }
  });

  const batteryY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('5B. Battery', 15, batteryY);

  const batterySpecs = safeQuotation.technical_specs?.battery || {};
  autoTable(doc, {
    startY: batteryY + 4,
    head: [['Parameter', 'Specification']],
    body: [
      ['Make', batterySpecs.make || 'Exide / Quanta'],
      ['Type', batterySpecs.type || 'VRLA SMF'],
      ['Voltage x Capacity', batterySpecs.voltage_capacity || '12V x 26Ah'],
      ['Batteries per UPS', batterySpecs.batteries_per_ups || 'N/A'],
      ['Configuration', batterySpecs.configuration || 'N/A'],
      ['Design Life', batterySpecs.design_life || '3-5 years'],
      ['Operating Temp.', batterySpecs.operating_temp || '0°C to 40°C'],
      ['Backup at Full Load', batterySpecs.backup_time || 'N/A']
    ],
    theme: 'striped',
    headStyles: { fillColor: colors.primary },
    styles: { fontSize: 8, cellPadding: 2 }
  });

  // --- PAGE 6: COMMERCIAL OFFER ---
  doc.addPage();
  addSectionHeader('Commercial Offer', '06');
  
  const commercialData = safeQuotation.items.map((item, index) => [
    index + 1,
    item.description,
    formatCurrency(item.basic_price),
    item.quantity,
    formatCurrency(item.basic_price * item.quantity),
    `${item.gst_percent}%`,
    formatCurrency((item.basic_price * item.quantity * item.gst_percent) / 100),
    formatCurrency((item.basic_price * item.quantity) * (1 + item.gst_percent / 100))
  ]);

  autoTable(doc, {
    startY: 25,
    head: [['Sr. No.', 'Description', 'Basic Price', 'Qty', 'Total Basic', 'GST %', 'GST Amt', 'Total']],
    body: commercialData,
    theme: 'grid',
    headStyles: { fillColor: colors.primary },
    styles: { fontSize: 8, cellPadding: 3 },
    foot: [
      ['', 'TOTAL AMOUNT', '', '', formatCurrency(safeQuotation.total_basic), '', formatCurrency(safeQuotation.total_gst), formatCurrency(safeQuotation.grand_total)]
    ],
    footStyles: { fillColor: colors.accent, textColor: 0, fontStyle: 'bold' }
  });

  // --- PAGE 7: AFTER-SALES SUPPORT ---
  doc.addPage();
  addSectionHeader('After-Sales Support & AMC', '07');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Warranty Support:', 15, 30);
  doc.setFont('helvetica', 'normal');
  doc.text(`• ${safeQuotation.warranty_period} comprehensive warranty on UPS and Batteries`, 20, 38);
  doc.text('• On-site support within 4-8 hours of complaint (Pune region)', 20, 45);
  doc.text(`• Dedicated service engineer contact: ${safeCompany.authorized_signatory} | ${safeCompany.mobile}`, 20, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('AMC Options (Post-Warranty):', 15, 65);
  
  autoTable(doc, {
    startY: 70,
    head: [['Feature', 'Comprehensive AMC', 'Non-Comprehensive AMC']],
    body: [
      ['Preventive Maintenance Visits', '4 per year', '4 per year'],
      ['Labour Charges', 'Included', 'Included'],
      ['Spare Parts', 'Included', 'Extra at actual'],
      ['Battery Replacement', 'Included', 'Extra at actual'],
      ['Response Time', '4-8 hrs', '4-8 hrs'],
      ['Annual Cost (per UPS)', formatCurrency(safeQuotation.amc_options?.comprehensive?.cost || 0), formatCurrency(safeQuotation.amc_options?.non_comprehensive?.cost || 0)]
    ],
    theme: 'grid',
    headStyles: { fillColor: colors.primary },
    styles: { fontSize: 9, cellPadding: 4 }
  });

  // --- PAGE 8: TERMS & CONDITIONS ---
  doc.addPage();
  addSectionHeader('Terms & Conditions', '08');
  
  const termsData = safeQuotation.terms.map((term, index) => {
    const parts = term.split(':');
    return [index + 1, parts[0] || 'Term', parts[1] || term];
  });

  autoTable(doc, {
    startY: 25,
    head: [['#', 'Term', 'Details']],
    body: termsData,
    theme: 'grid',
    headStyles: { fillColor: colors.primary },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 40, fontStyle: 'bold' } }
  });

  if (action === 'preview') {
    const blob = doc.output('bloburl');
    window.open(blob, '_blank');
  } else {
    doc.save(`Quotation_${safeQuotation.ref_number}.pdf`);
  }
};
