import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import type { IssuedTicket } from "./ticketing";

/**
 * Downloads the digital pass card directly as a high-resolution PNG image
 */
export async function downloadTicketPNG(
  cardElement: HTMLElement,
  ticket: IssuedTicket
): Promise<void> {
  const filename = `EcoMove_Pass_${ticket.id}.png`;

  // Render high-DPI image directly from the DOM element
  const dataUrl = await toPng(cardElement, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });

  const res = await fetch(dataUrl);
  const blob = await res.blob();

  // Direct file download
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads the digital pass card directly as a formatted A4 PDF document
 */
export async function downloadTicketPDF(
  cardElement: HTMLElement,
  ticket: IssuedTicket
): Promise<void> {
  const filename = `EcoMove_Pass_${ticket.id}.pdf`;

  // Render high-DPI image from DOM
  const dataUrl = await toPng(cardElement, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // Background tint
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Top Header Banner
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("ECO-MOVE NAGPUR — OFFICIAL DIGITAL TRANSIT PASS", pageWidth / 2, 12, { align: "center" });
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Nagpur Smart City Public Transport Corridor • Maha Metro & Aapli Bus", pageWidth / 2, 17.5, { align: "center" });

  // Ticket card dimensions centered on page
  const printWidth = 145; // mm
  const printHeight = (img.height * printWidth) / img.width;
  const xOffset = (pageWidth - printWidth) / 2;
  const yOffset = 28;

  // Render the high-resolution ticket pass image
  doc.addImage(dataUrl, "PNG", xOffset, yOffset, printWidth, printHeight);

  // Footer Security Note
  const footerY = Math.min(yOffset + printHeight + 8, pageHeight - 10);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Official Transit Token: ${ticket.id}   •   Booking: ${new Date(ticket.bookingTime).toLocaleString()}   •   Valid for Entry Turnstiles`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  // Direct file download
  doc.save(filename);
}
