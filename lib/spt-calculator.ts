interface SPTInput {
  currentYearDays: number
  firstPriorYearDays: number
  secondPriorYearDays: number
}

// Update the SPTResult interface to include taxYear and the original input values
interface SPTResult {
  taxYear?: number
  currentYearDays: number
  firstPriorYearDays?: number
  secondPriorYearDays?: number
  firstPriorYearDaysCalculated: number
  secondPriorYearDaysCalculated: number
  totalDays: number
  meetsCurrentYearRequirement: boolean
  meetsTotalDaysRequirement: boolean
  passesTest: boolean
}

// Update the calculateSPT function to include the original input values in the result
export function calculateSPT(input: SPTInput): SPTResult {
  // Calculate the weighted days for each year
  const currentYearDays = input.currentYearDays
  const firstPriorYearDaysCalculated = input.firstPriorYearDays / 3
  const secondPriorYearDaysCalculated = input.secondPriorYearDays / 6

  // Calculate the total days
  const totalDays = currentYearDays + firstPriorYearDaysCalculated + secondPriorYearDaysCalculated

  // Check if the requirements are met
  const meetsCurrentYearRequirement = currentYearDays >= 31
  const meetsTotalDaysRequirement = totalDays >= 183

  // Determine if the test is passed
  const passesTest = meetsCurrentYearRequirement && meetsTotalDaysRequirement

  return {
    currentYearDays,
    firstPriorYearDays: input.firstPriorYearDays,
    secondPriorYearDays: input.secondPriorYearDays,
    firstPriorYearDaysCalculated,
    secondPriorYearDaysCalculated,
    totalDays,
    meetsCurrentYearRequirement,
    meetsTotalDaysRequirement,
    passesTest,
  }
}

