// @ts-check
// Based on code by Jess Telford <jess@cete.io>
// https://github.com/ceteio/styled-components-rhythm

/**
 * @param {number} value
 * @param {number} multiple
 * @param {'nearest'|'up'|'down'} direction
 */
function roundToMultiple(value, multiple, direction = 'nearest') {
  const valueRoundedDown = Math.floor(value / multiple) * multiple

  // purposely avoiding floating point and division
  const isHalfOrOver = (value - valueRoundedDown) * 2 >= multiple

  if (direction === 'up' || (direction === 'nearest' && isHalfOrOver)) {
    // force rounding up
    return valueRoundedDown + multiple
  } else {
    // force rounding down
    return valueRoundedDown
  }
}

/**
 * @param {number} capHeightFraction
 * @param {number} lineHeightRem
 * @param {number} fontSizeRem
 */
function rhythmShift(capHeightFraction, lineHeightRem, fontSizeRem) {
  const capHeight = fontSizeRem * capHeightFraction
  return (lineHeightRem - capHeight) / 2
}

/**
 * @param {number} rhythmHeight
 * @param {number} capHeightFraction
 * @param {number} fontSizeRem
 * @param {number} desiredLineHeight
 */
function rhythmLineHeight(rhythmHeight, capHeightFraction, fontSizeRem, desiredLineHeight) {
  const baseFontSizePx = 16
  const fontSizePx = fontSizeRem * baseFontSizePx
  const desiredHeightPx = desiredLineHeight * fontSizePx
  const capHeightPx = capHeightFraction * fontSizePx
  const rhythmHeightPx = rhythmHeight * baseFontSizePx

  // Rounded to the nearest rhythm line
  let roundedHeightPx = roundToMultiple(desiredHeightPx, rhythmHeightPx)

  // Disallow line heights below the cap height
  if (roundedHeightPx < capHeightPx) {
    roundedHeightPx = roundToMultiple(capHeightPx, rhythmHeightPx, 'up')
  }

  // convert back to a value relative to the font size rem
  return roundedHeightPx / baseFontSizePx
}

/**
 * @param {string} value
 * @param {string} path
 */
function validateIsUnitless(value, path) {
  const match = /^\s*((?:\d*\.)?\d+)\s*$/.exec(value)
  if (!match) {
    throw new Error(`${path} must be unitless. Specified value was '${value}'`)
  }

  return parseFloat(match[1])
}

/**
 * @param {string} value
 * @param {string} path
 */
function validateIsRem(value, path) {
  const match = /^\s*((?:\d*\.)?\d+)\s*rem$/.exec(value)
  if (!match) {
    throw new Error(`${path} must be in rem. Specified value was '${value}'`)
  }

  return parseFloat(match[1])
}

// @ts-ignore
module.exports = function({ addUtilities, config, e, theme, variants }) {
  const rhythmHeight = config('verticalRhythm.height')

  /**
   * @param {number} fontSizeRem
   * @param {number} desiredLineHeight
   * @param {number} capHeightFraction
   */
  function setFontWithRhythm(fontSizeRem, desiredLineHeight, capHeightFraction) {
    const lineHeightRem = rhythmLineHeight(
      rhythmHeight,
      capHeightFraction,
      fontSizeRem,
      desiredLineHeight
    )
    const shiftRem = rhythmShift(capHeightFraction, lineHeightRem, fontSizeRem)

    return {
      fontSize: `${fontSizeRem}rem`,
      paddingTop: `${shiftRem}rem`,
      marginBottom: `-${shiftRem}rem`,
      lineHeight: `${lineHeightRem}rem`
    }
  }

  const fontCapHeights = Object.entries(config('verticalRhythm.fontCapHeight'))
  const defaultLineHeight = config('verticalRhythm.defaultLineHeight')

  /** @type {[string, number][]} */
  const fontSizes = Object.entries(theme('fontSize')).map(
    ([k, v]) => [k, validateIsRem(v, `theme.fontSize.${k}`)]
  )
  /** @type {[string, number][]} */
  const lineHeights = Object.entries(theme('lineHeight')).map(
    ([k, v]) => [k, validateIsUnitless(v, `theme.lineHeight.${k}`)]
  )

  if (defaultLineHeight) {
    /** @type {[string, number]|undefined} */
    const defaultLineHeightEntry = lineHeights.find(
      ([k]) => k === defaultLineHeight
    )
    if (defaultLineHeightEntry) {
      lineHeights.push(['', defaultLineHeightEntry[1]])
    }
  }

  /** @type {Record<string, object>} */
  const utilities = {}

  for (const [fontFamily, capHeightFraction] of fontCapHeights) {
    const fontFamilySelector = fontFamily === 'default'
      ? ''
      : e(fontFamily.replace(/\s+/, '-').toLowerCase())

    for (const [fontSize, fontSizeRem] of fontSizes) {
      for (const [lineHeight, lineHeightFraction] of lineHeights) {
        const parts = [
          '.vr',
          fontFamilySelector,
          lineHeight,
          fontSize
        ]
        const className = parts.filter(Boolean).join('-')

        utilities[className] = setFontWithRhythm(
          fontSizeRem,
          lineHeightFraction,
          capHeightFraction
        )

        if (fontFamilySelector) {
          utilities[className].fontFamily = fontFamily
        }
      }
    }
  }

  addUtilities({
    '.vr-debug': {
      background: 'linear-gradient(rgba(255, 0, 0, 0.15), rgba(255, 0, 0, 0.15) 1px, transparent 1px)',
      backgroundSize: `1px ${rhythmHeight}rem`
    }
  })

  addUtilities(utilities, variants('fontSize'))
}
