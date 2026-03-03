import { jsPDF } from 'jspdf'
import { componentByType, getEnclosureById } from '../data/enclosures'
import type { PlacedComponent } from '../audio/types'

const MARGIN_MM = 15

export const exportDrillTemplate = (enclosureId: string, components: PlacedComponent[]) => {
  const enclosure = getEnclosureById(enclosureId)
  const doc = new jsPDF({
    orientation: enclosure.widthMm > enclosure.heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const originX = (pageWidth - enclosure.widthMm) / 2
  const originY = Math.max(MARGIN_MM, (pageHeight - enclosure.heightMm) / 2)

  doc.setDrawColor(30)
  doc.setLineWidth(0.35)
  doc.roundedRect(originX, originY, enclosure.widthMm, enclosure.heightMm, 3, 3)

  doc.setFontSize(11)
  doc.text(`${enclosure.name} Drill Template (${enclosure.widthMm}mm x ${enclosure.heightMm}mm)`, MARGIN_MM, 10)
  doc.setFontSize(8)
  doc.text('PRINT AT 100% / ACTUAL SIZE', MARGIN_MM, 14)

  components.forEach((placed) => {
    const def = componentByType(placed.componentType)
    if (!def) return
    const x = originX + placed.x
    const y = originY + placed.y
    const radius = def.holeMm / 2

    doc.circle(x, y, radius)
    doc.line(x - 2.2, y, x + 2.2, y)
    doc.line(x, y - 2.2, x, y + 2.2)
    doc.setFontSize(7)
    doc.text(`${def.name} ${def.holeMm}mm`, x + radius + 1.5, y + 0.8)
  })

  const calX = pageWidth - MARGIN_MM - 25
  const calY = MARGIN_MM
  doc.setLineWidth(0.4)
  doc.rect(calX, calY, 25, 25)
  doc.setFontSize(7)
  doc.text('25mm calibration', calX - 1, calY + 29)

  const legend = components.reduce<Record<string, number>>((acc, item) => {
    acc[item.componentType] = (acc[item.componentType] ?? 0) + 1
    return acc
  }, {})

  let legendY = originY + enclosure.heightMm + 8
  doc.setFontSize(8)
  doc.text('Legend:', MARGIN_MM, legendY)
  legendY += 4
  Object.entries(legend).forEach(([type, count]) => {
    const def = componentByType(type)
    if (!def) return
    doc.text(`${def.name}: ${count}x (${def.holeMm}mm)`, MARGIN_MM + 2, legendY)
    legendY += 4
  })

  const today = new Date().toISOString().slice(0, 10)
  doc.setFontSize(7)
  doc.text(`Pedal Architect | ${today}`, MARGIN_MM, pageHeight - 8)

  doc.save(`pedal-architect-${enclosure.name}-template.pdf`)
}
