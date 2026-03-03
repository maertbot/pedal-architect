import type { ComponentDefinition, EnclosureSize } from '../audio/types'

export const ENCLOSURES: EnclosureSize[] = [
  { id: '1590A', name: '1590A', widthMm: 92, heightMm: 38 },
  { id: '1590B', name: '1590B', widthMm: 112, heightMm: 60 },
  { id: '125B', name: '125B', widthMm: 122, heightMm: 67 },
  { id: '1590BB', name: '1590BB', widthMm: 119, heightMm: 94 },
  { id: '1590XX', name: '1590XX', widthMm: 145, heightMm: 121 },
]

export const COMPONENT_LIBRARY: ComponentDefinition[] = [
  { type: 'potentiometer', name: 'Potentiometer', holeMm: 7, shape: 'circle', widthMm: 16, heightMm: 16 },
  { type: 'footswitch-3pdt', name: '3PDT Footswitch', holeMm: 12, shape: 'circle', widthMm: 20, heightMm: 20 },
  { type: 'led-5mm', name: 'LED Bezel 5mm', holeMm: 5, shape: 'circle', widthMm: 8, heightMm: 8 },
  { type: 'led-3mm', name: 'LED Bezel 3mm', holeMm: 3, shape: 'circle', widthMm: 6, heightMm: 6 },
  { type: 'jack-quarter', name: '1/4" Jack', holeMm: 12, shape: 'circle', widthMm: 14, heightMm: 14, edgeConstraint: 'side' },
  { type: 'dc-jack', name: 'DC Power Jack', holeMm: 11, shape: 'circle', widthMm: 13, heightMm: 13, edgeConstraint: 'top' },
  { type: 'toggle-switch', name: 'Toggle Switch', holeMm: 6, shape: 'rect', widthMm: 8, heightMm: 12 },
]

export const getEnclosureById = (id: string) => ENCLOSURES.find((item) => item.id === id) ?? ENCLOSURES[2]

export const componentByType = (type: string) => COMPONENT_LIBRARY.find((item) => item.type === type)
