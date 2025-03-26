type I94Entry = {
  date: string
  type: "Arrival" | "Departure"
  location: string
}

type DateRange = {
  arrivalDate: string | null
  departureDate: string | null
}

type ParseResult = {
  dateRanges: DateRange[]
  warnings: string[]
}

/**
 * Parses I-94 travel history data and converts it to date ranges
 * @param data The raw I-94 data in tab-separated format
 * @returns Object containing date ranges and any warnings about inconsistent data
 */
export function parseI94Data(data: string): ParseResult {
  // Split the data into lines and parse each line
  const lines = data.trim().split("\n")
  const entries: I94Entry[] = []
  const warnings: string[] = []

  for (const line of lines) {
    // Skip header line if present
    if (line.startsWith("Row") || line.toLowerCase().includes("date") || line.toLowerCase().includes("type")) {
      continue
    }

    const parts = line.split("\t")
    if (parts.length < 3) continue

    // Extract date and type (ignore row number and location)
    const date = parts[1]?.trim()
    const type = parts[2]?.trim() as "Arrival" | "Departure"
    const location = parts[3]?.trim() || ""

    // Validate date format (YYYY-MM-DD)
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) continue

    // Validate type
    if (type !== "Arrival" && type !== "Departure") continue

    entries.push({ date, type, location })
  }

  // Sort entries by date (oldest first) to process them chronologically
  entries.sort((a, b) => {
    // Create dates with noon UTC time to avoid timezone issues
    const dateA = new Date(a.date + "T12:00:00Z")
    const dateB = new Date(b.date + "T12:00:00Z")
    return dateA.getTime() - dateB.getTime()
  })

  // Create date ranges by pairing arrivals with departures
  const dateRanges: DateRange[] = []

  // Check if the first entry is a departure (meaning the person was already in the US)
  if (entries.length > 0 && entries[0].type === "Departure") {
    // Add a date range with no arrival date
    dateRanges.push({
      arrivalDate: null,
      departureDate: entries[0].date,
    })
  }

  // Process entries to create date ranges
  let currentArrival: I94Entry | null = null
  let lastProcessedIndex = -1

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    if (entry.type === "Arrival") {
      // If we already have a pending arrival without a matching departure,
      // this is an inconsistency (two consecutive arrivals)
      if (currentArrival) {
        warnings.push(
          `Found two consecutive arrivals without a departure in between: ` +
            `${currentArrival.date} and ${entry.date}. The first arrival has been treated as if ` +
            `you departed on the same day as the second arrival.`,
        )

        // Create a date range with the first arrival and assume departure on the same day as the second arrival
        dateRanges.push({
          arrivalDate: currentArrival.date,
          departureDate: entry.date,
        })
      }

      // Store the current arrival
      currentArrival = entry
      lastProcessedIndex = i
    } else if (entry.type === "Departure") {
      if (currentArrival) {
        // Normal case: arrival followed by departure
        dateRanges.push({
          arrivalDate: currentArrival.date,
          departureDate: entry.date,
        })
        currentArrival = null
      } else if (i > 0 && lastProcessedIndex !== i - 1) {
        // This is a departure without a matching arrival (and not the first entry which we already handled)
        warnings.push(
          `Found a departure on ${entry.date} without a matching arrival. ` + `This may indicate missing data.`,
        )
      }
      lastProcessedIndex = i
    }
  }

  // Handle the case where the last entry is an arrival (person is still in the US)
  if (currentArrival) {
    dateRanges.push({
      arrivalDate: currentArrival.date,
      departureDate: null,
    })
  }

  // Check for overlapping periods
  for (let i = 0; i < dateRanges.length; i++) {
    for (let j = i + 1; j < dateRanges.length; j++) {
      const range1 = dateRanges[i]
      const range2 = dateRanges[j]

      // Skip if either range has both null dates (shouldn't happen, but just in case)
      if ((!range1.arrivalDate && !range1.departureDate) || (!range2.arrivalDate && !range2.departureDate)) {
        continue
      }

      // Convert dates to timestamps for comparison
      const range1Start = range1.arrivalDate ? new Date(range1.arrivalDate).getTime() : Number.NEGATIVE_INFINITY
      const range1End = range1.departureDate ? new Date(range1.departureDate).getTime() : Number.POSITIVE_INFINITY
      const range2Start = range2.arrivalDate ? new Date(range2.arrivalDate).getTime() : Number.NEGATIVE_INFINITY
      const range2End = range2.departureDate ? new Date(range2.departureDate).getTime() : Number.POSITIVE_INFINITY

      // Special case: Allow departure on the same day as another period's arrival
      if (range1End === range2Start || range2End === range1Start) {
        continue
      }

      // Check for overlap
      if (Math.max(range1Start, range2Start) < Math.min(range1End, range2End)) {
        const range1Desc = formatRangeForWarning(range1)
        const range2Desc = formatRangeForWarning(range2)

        warnings.push(
          `Found overlapping travel periods: ${range1Desc} and ${range2Desc}. ` +
            `This may result in incorrect calculations.`,
        )
      }
    }
  }

  // Sort date ranges by arrival date (newest first) for display
  const sortedRanges = dateRanges.sort((a, b) => {
    // Create dates with noon UTC time to avoid timezone issues
    // For sorting, use departure date if arrival is null, and vice versa
    const dateA = a.arrivalDate
      ? new Date(a.arrivalDate + "T12:00:00Z")
      : a.departureDate
        ? new Date(a.departureDate + "T12:00:00Z")
        : new Date(0)

    const dateB = b.arrivalDate
      ? new Date(b.arrivalDate + "T12:00:00Z")
      : b.departureDate
        ? new Date(b.departureDate + "T12:00:00Z")
        : new Date(0)

    return dateB.getTime() - dateA.getTime()
  })

  return {
    dateRanges: sortedRanges,
    warnings,
  }
}

/**
 * Helper function to format a date range for warning messages
 */
function formatRangeForWarning(range: DateRange): string {
  if (range.arrivalDate && range.departureDate) {
    return `${range.arrivalDate} to ${range.departureDate}`
  } else if (range.arrivalDate && !range.departureDate) {
    return `${range.arrivalDate} to present (no departure)`
  } else if (!range.arrivalDate && range.departureDate) {
    return `unknown arrival to ${range.departureDate} (no arrival)`
  } else {
    return "invalid range"
  }
}

