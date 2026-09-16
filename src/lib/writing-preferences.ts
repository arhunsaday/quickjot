export interface WritingPreferences {
  width: 'narrow' | 'comfortable' | 'wide'
  font: 'sans' | 'serif' | 'mono'
  fontSize: number
  lineHeight: number
  typewriter: boolean
  dimInactive: boolean
}
export const DEFAULT_WRITING_PREFERENCES: WritingPreferences = {
  width: 'comfortable',
  font: 'sans',
  fontSize: 17,
  lineHeight: 1.7,
  typewriter: false,
  dimInactive: false,
}
const KEY = 'quickjot:writing-preferences:v1'
export function readWritingPreferences(): WritingPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      width: ['narrow', 'comfortable', 'wide'].includes(value?.width) ? value.width : 'comfortable',
      font: ['sans', 'serif', 'mono'].includes(value?.font) ? value.font : 'sans',
      fontSize: [15, 17, 19, 21].includes(value?.fontSize) ? value.fontSize : 17,
      lineHeight: [1.5, 1.7, 2].includes(value?.lineHeight) ? value.lineHeight : 1.7,
      typewriter: value?.typewriter === true,
      dimInactive: value?.dimInactive === true,
    }
  } catch {
    return { ...DEFAULT_WRITING_PREFERENCES }
  }
}
export function storeWritingPreferences(value: WritingPreferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    /* Preferences still apply in memory. */
  }
}
