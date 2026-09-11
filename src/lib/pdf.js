import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { bob, bobCorto } from './formato'
import { timestampBolivia } from './fecha'

const DORADO = [212, 175, 55]
const NEGRO = [10, 10, 10]

async function cargarLogo() {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo.png'
  })
}

export async function generarPDF({
  titulo, subtitulo, headers, rows, totales, filtroInfo,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // ===== HEADER =====
  doc.setFillColor(...NEGRO)
  doc.rect(0, 0, pageWidth, 35, 'F')

  doc.setFillColor(...DORADO)
  doc.rect(0, 35, pageWidth, 1.5, 'F')

  // Logo
  const logo = await cargarLogo()
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 12, 6, 22, 22)
    } catch (e) { /* ignorar */ }
  }

  // Nombre negocio
  doc.setTextColor(212, 175, 55)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('NEW STYLE BARBER SHOP', logo ? 40 : 12, 16)

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Sistema de gestión profesional', logo ? 40 : 12, 22)

  // Fecha generación
  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  const fechaGen = timestampBolivia(new Date().toISOString())
  doc.text('Generado:', pageWidth - 12, 12, { align: 'right' })
  doc.setTextColor(255, 255, 255)
  doc.text(fechaGen, pageWidth - 12, 17, { align: 'right' })

  // ===== TÍTULO =====
  let y = 48
  doc.setTextColor(...NEGRO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(titulo, 12, y)

  if (subtitulo) {
    y += 7
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(subtitulo, 12, y)
  }

  // Filtros
  if (filtroInfo) {
    y += 7
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(12, y - 4, pageWidth - 24, 8, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text(filtroInfo, 15, y + 1)
    y += 6
  }

  // ===== TABLA =====
  y += 6
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: NEGRO,
      textColor: DORADO,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    styles: {
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    margin: { left: 12, right: 12 },
  })

  // ===== TOTALES (mejorados) =====
  if (totales && Object.keys(totales).length > 0) {
    const finalY = doc.lastAutoTable.finalY + 8
    const boxWidth = 95
    const boxHeight = 10 + Object.keys(totales).length * 7
    const boxX = pageWidth - boxWidth - 12

    // Fondo caja
    doc.setFillColor(250, 248, 240)
    doc.setDrawColor(...DORADO)
    doc.setLineWidth(0.6)
    doc.roundedRect(boxX, finalY, boxWidth, boxHeight, 3, 3, 'FD')

    // Barra lateral dorada
    doc.setFillColor(...DORADO)
    doc.roundedRect(boxX, finalY, 2, boxHeight, 1, 1, 'F')

    let ty = finalY + 7
    const entries = Object.entries(totales)
    const lastIdx = entries.length - 1

    entries.forEach(([label, valor], i) => {
      const esUltimo = i === lastIdx

      if (esUltimo) {
        // Separador arriba del total
        doc.setDrawColor(...DORADO)
        doc.setLineWidth(0.3)
        doc.line(boxX + 6, ty - 4, boxX + boxWidth - 6, ty - 4)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(...DORADO)
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(70, 70, 70)
      }

      doc.text(String(label), boxX + 8, ty)
      doc.text(String(valor), boxX + boxWidth - 6, ty, { align: 'right' })
      ty += 7
    })
  }

  // ===== FOOTER =====
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()

    doc.setDrawColor(...DORADO)
    doc.setLineWidth(0.3)
    doc.line(12, pageHeight - 15, pageWidth - 12, pageHeight - 15)

    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text('New Style Barber Shop — Reporte generado automáticamente', 12, pageHeight - 10)
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 12, pageHeight - 10, { align: 'right' })
  }

  const nombreArchivo = `${titulo.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nombreArchivo)
}