type DateRange = {
  id: string
  arrivalDate: string | null
  departureDate: string | null
}

/**
 * Calculates the number of days a person was present in the US for each relevant tax year
 * based on arrival and departure date ranges.
 */
export function calculateDaysFromDateRanges(
  dateRanges: DateRange[],
  taxYear: number,
): { currentYearDays: number; firstPriorYearDays: number; secondPriorYearDays: number } {
  // Initialize counters for each year
  let currentYearDays = 0
  let firstPriorYearDays = 0
  let secondPriorYearDays = 0

  // Define year boundaries
  const currentYearStart = new Date(`${taxYear}-01-01`)
  const currentYearEnd = new Date(`${taxYear}-12-31`)

  const firstPriorYearStart = new Date(`${taxYear - 1}-01-01`)
  const firstPriorYearEnd = new Date(`${taxYear - 1}-12-31`)

  const secondPriorYearStart = new Date(`${taxYear - 2}-01-01`)
  const secondPriorYearEnd = new Date(`${taxYear - 2}-12-31`)

  // Get today's date for ranges with no departure date
  const today = new Date()

  // Track days that have already been counted to avoid double-counting
  const countedDays = new Set<string>()

  // Process each date range
  dateRanges.forEach((range) => {
    // Skip invalid ranges
    if (!range.arrivalDate && !range.departureDate) return

    // Handle special cases
    let arrival: Date
    let departure: Date

    // Case 1: No arrival date (already in the US at the start of the period)
    if (!range.arrivalDate && range.departureDate) {
      // For "no arrival" case, use the earliest relevant date (start of second prior year)
      arrival = secondPriorYearStart
      departure = new Date(range.departureDate)
    }
    // Case 2: No departure date (still in the US)
    else if (range.arrivalDate && !range.departureDate) {
      arrival = new Date(range.arrivalDate)
      // For "no departure" case, use today or the end of the current year, whichever is earlier
      departure = new Date(Math.min(today.getTime(), currentYearEnd.getTime()))
    }
    // Case 3: Normal case with both dates
    else if (range.arrivalDate && range.departureDate) {
      arrival = new Date(range.arrivalDate)
      departure = new Date(range.departureDate)
    } else {
      // This shouldn't happen due to the earlier check, but just in case
      return
    }

    // Calculate days for each year, avoiding double-counting
    currentYearDays += countDaysInRangeWithoutDuplicates(
      arrival,
      departure,
      currentYearStart,
      currentYearEnd,
      countedDays,
      taxYear,
    )

    firstPriorYearDays += countDaysInRangeWithoutDuplicates(
      arrival,
      departure,
      firstPriorYearStart,
      firstPriorYearEnd,
      countedDays,
      taxYear - 1,
    )

    secondPriorYearDays += countDaysInRangeWithoutDuplicates(
      arrival,
      departure,
      secondPriorYearStart,
      secondPriorYearEnd,
      countedDays,
      taxYear - 2,
    )
  })

  return {
    currentYearDays,
    firstPriorYearDays,
    secondPriorYearDays,
  }
}

/**
 * Counts the number of days a person was present within a specific year range,
 * avoiding double-counting days that have already been counted.
 */
function countDaysInRangeWithoutDuplicates(
  arrival: Date,
  departure: Date,
  yearStart: Date,
  yearEnd: Date,
  countedDays: Set<string>,
  year: number,
): number {
  // If the entire stay is outside the year range, return 0
  if (departure < yearStart || arrival > yearEnd) {
    return 0
  }

  // Adjust arrival and departure dates to be within the year range
  const effectiveArrival = arrival < yearStart ? yearStart : arrival
  const effectiveDeparture = departure > yearEnd ? yearEnd : departure

  // Fix timezone issues by working with UTC dates at noon
  const startDate = new Date(
    Date.UTC(effectiveArrival.getFullYear(), effectiveArrival.getMonth(), effectiveArrival.getDate(), 12, 0, 0),
  )

  const endDate = new Date(
    Date.UTC(effectiveDeparture.getFullYear(), effectiveDeparture.getMonth(), effectiveDeparture.getDate(), 12, 0, 0),
  )

  // Count days without duplicates
  let daysCount = 0
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    // Create a unique key for this day in this year
    const dayKey = `${year}-${currentDate.getUTCMonth() + 1}-${currentDate.getUTCDate()}`

    // Only count this day if it hasn't been counted before
    if (!countedDays.has(dayKey)) {
      daysCount++
      countedDays.add(dayKey)
    }

    // Move to the next day
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  }

  return daysCount
}

