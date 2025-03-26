"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { calculateSPT } from "@/lib/spt-calculator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Plus, Trash2, Upload, Calendar, AlertTriangle } from "lucide-react"
import { calculateDaysFromDateRanges } from "@/lib/date-calculator"
import { parseI94Data } from "@/lib/i94-parser"

// Define the DateRange type
type DateRange = {
  id: string
  arrivalDate: string | null
  departureDate: string | null
}

export default function SPTCalculator() {
  const currentYear = new Date().getFullYear()
  const defaultYear = currentYear - 1
  const today = new Date().toISOString().split("T")[0]

  // Generate array of the 5 most recent years
  const recentYears = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const [results, setResults] = useState<any>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dateRanges, setDateRanges] = useState<DateRange[]>([])
  const [taxYear, setTaxYear] = useState(defaultYear)
  const [i94Data, setI94Data] = useState("")
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importError, setImportError] = useState("")
  const [importWarnings, setImportWarnings] = useState<string[]>([])

  // New state for the add period form
  const [newArrivalDate, setNewArrivalDate] = useState<string>("")
  const [newDepartureDate, setNewDepartureDate] = useState<string>("")
  const [noArrival, setNoArrival] = useState(false)
  const [noDeparture, setNoDeparture] = useState(false)
  const [addPeriodError, setAddPeriodError] = useState<string>("")

  const manualFormRef = useRef<HTMLFormElement>(null)
  const durationFormRef = useRef<HTMLFormElement>(null)

  // Function to check if a year is a leap year
  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  }

  // Get max days for each year
  const currentYearMaxDays = isLeapYear(taxYear) ? 366 : 365
  const firstPriorYearMaxDays = isLeapYear(taxYear - 1) ? 366 : 365
  const secondPriorYearMaxDays = isLeapYear(taxYear - 2) ? 366 : 365

  const handleTaxYearChange = (value: string) => {
    setTaxYear(Number(value))
  }

  // Add a new function to handle number input changes that removes leading zeros
  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // If the value is just "0" or empty, don't modify it
    if (value === "0" || value === "") return

    // Remove leading zeros by converting to number and back to string
    const numValue = Number.parseInt(value, 10)
    if (!isNaN(numValue)) {
      // Get the max value from the input element
      const maxValue = Number.parseInt(e.target.max, 10)

      // If the value exceeds the maximum, set it to the maximum
      if (maxValue && numValue > maxValue) {
        e.target.value = maxValue.toString()
      } else {
        e.target.value = numValue.toString()
      }
    }
  }

  const validateManualInputs = (formData: FormData) => {
    const newErrors: Record<string, string> = {}

    const currentYearDays = Number(formData.get("currentYearDays"))
    const firstPriorYearDays = Number(formData.get("firstPriorYearDays"))
    const secondPriorYearDays = Number(formData.get("secondPriorYearDays"))

    if (isNaN(currentYearDays) || currentYearDays < 0 || currentYearDays > currentYearMaxDays) {
      newErrors.currentYearDays = `Days must be between 0 and ${currentYearMaxDays}`
    }

    if (isNaN(firstPriorYearDays) || firstPriorYearDays < 0 || firstPriorYearDays > firstPriorYearMaxDays) {
      newErrors.firstPriorYearDays = `Days must be between 0 and ${firstPriorYearMaxDays}`
    }

    if (isNaN(secondPriorYearDays) || secondPriorYearDays < 0 || secondPriorYearDays > secondPriorYearMaxDays) {
      newErrors.secondPriorYearDays = `Days must be between 0 and ${secondPriorYearMaxDays}`
    }

    setErrors((prev) => ({ ...prev, ...newErrors }))
    return Object.keys(newErrors).length === 0
  }

  const validateDateRanges = () => {
    if (dateRanges.length === 0) {
      setErrors((prev) => ({ ...prev, dateRanges: "At least one travel period is required" }))
      return false
    }

    // Clear any previous errors
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.dateRanges
      return newErrors
    })

    return true
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData(e.target as HTMLFormElement)

    if (validateManualInputs(formData)) {
      const currentYearDays = Number(formData.get("currentYearDays"))
      const firstPriorYearDays = Number(formData.get("firstPriorYearDays"))
      const secondPriorYearDays = Number(formData.get("secondPriorYearDays"))

      const result = calculateSPT({
        currentYearDays,
        firstPriorYearDays,
        secondPriorYearDays,
      })

      setResults({
        ...result,
        taxYear,
        firstPriorYearDays,
        secondPriorYearDays,
      })
    }
  }

  const handleDurationSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateDateRanges()) {
      // Calculate days in each year based on date ranges
      const { currentYearDays, firstPriorYearDays, secondPriorYearDays } = calculateDaysFromDateRanges(
        dateRanges,
        taxYear,
      )

      const result = calculateSPT({
        currentYearDays,
        firstPriorYearDays,
        secondPriorYearDays,
      })

      setResults({
        ...result,
        taxYear,
        firstPriorYearDays,
        secondPriorYearDays,
        dateRanges: [...dateRanges],
      })
    }
  }

  const handleAddPeriod = () => {
    setAddPeriodError("")

    // Validate the new period
    if (!noArrival && !newArrivalDate) {
      setAddPeriodError("Please select an arrival date or check 'No arrival'")
      return
    }

    if (!noDeparture && !newDepartureDate) {
      setAddPeriodError("Please select a departure date or check 'No departure'")
      return
    }

    // Check if arrival is before departure when both are provided
    if (newArrivalDate && newDepartureDate && new Date(newArrivalDate) > new Date(newDepartureDate)) {
      setAddPeriodError("Arrival date must be before departure date")
      return
    }

    // Special case validations
    if (noArrival && noDeparture) {
      setAddPeriodError("Cannot have both 'No arrival' and 'No departure'")
      return
    }

    // Only allow "No arrival" for the earliest period
    if (noArrival && dateRanges.length > 0) {
      const hasEarlierDates = dateRanges.some((range) => {
        if (!newDepartureDate) return false
        return range.departureDate && new Date(range.departureDate) < new Date(newDepartureDate)
      })

      if (hasEarlierDates) {
        setAddPeriodError("'No arrival' can only be used for the earliest period")
        return
      }
    }

    // Only allow "No departure" for the latest period
    if (noDeparture && dateRanges.length > 0) {
      const hasLaterDates = dateRanges.some((range) => {
        if (!newArrivalDate) return false
        return range.arrivalDate && new Date(range.arrivalDate) > new Date(newArrivalDate)
      })

      if (hasLaterDates) {
        setAddPeriodError("'No departure' can only be used for the latest period")
        return
      }
    }

    // Check for overlapping periods with comprehensive handling of null dates
    // Allow for same-day arrival/departure between different periods
    const newArrivalDateTime = newArrivalDate ? new Date(newArrivalDate).getTime() : Number.NEGATIVE_INFINITY
    const newDepartureDateTime = newDepartureDate ? new Date(newDepartureDate).getTime() : Number.POSITIVE_INFINITY

    const hasOverlap = dateRanges.some((range) => {
      const rangeArrivalDateTime = range.arrivalDate ? new Date(range.arrivalDate).getTime() : Number.NEGATIVE_INFINITY
      const rangeDepartureDateTime = range.departureDate
        ? new Date(range.departureDate).getTime()
        : Number.POSITIVE_INFINITY

      // Special case: Allow departure on the same day as another period's arrival
      if (newDepartureDateTime === rangeArrivalDateTime) {
        return false
      }

      // Special case: Allow arrival on the same day as another period's departure
      if (newArrivalDateTime === rangeDepartureDateTime) {
        return false
      }

      // Check for overlap using the standard interval overlap formula
      // Two intervals [a,b] and [c,d] overlap if max(a,c) < min(b,d)
      // Note: We use < instead of <= to allow same-day arrival/departure
      return Math.max(newArrivalDateTime, rangeArrivalDateTime) < Math.min(newDepartureDateTime, rangeDepartureDateTime)
    })

    if (hasOverlap) {
      setAddPeriodError("This period overlaps with an existing period. Travel periods cannot overlap.")
      return
    }

    // Add the new period
    const newPeriod: DateRange = {
      id: Date.now().toString(),
      arrivalDate: noArrival ? null : newArrivalDate,
      departureDate: noDeparture ? null : newDepartureDate,
    }

    // Add to the list and sort by arrival date (or departure date for "No arrival" case)
    const updatedRanges = [...dateRanges, newPeriod].sort((a, b) => {
      // Handle null dates for sorting
      const aDate = a.arrivalDate ? new Date(a.arrivalDate) : a.departureDate ? new Date(a.departureDate) : new Date(0)
      const bDate = b.arrivalDate ? new Date(b.arrivalDate) : b.departureDate ? new Date(b.departureDate) : new Date(0)

      return bDate.getTime() - aDate.getTime() // Newest first
    })

    setDateRanges(updatedRanges)

    // Reset the form
    setNewArrivalDate("")
    setNewDepartureDate("")
    setNoArrival(false)
    setNoDeparture(false)
  }

  const removeDateRange = (id: string) => {
    setDateRanges(dateRanges.filter((range) => range.id !== id))
  }

  const handleImportI94 = () => {
    try {
      setImportError("")
      setImportWarnings([])

      const parseResult = parseI94Data(i94Data)

      if (parseResult.dateRanges.length === 0) {
        setImportError("No valid travel periods found in the data. Please check the format and try again.")
        return
      }

      // Store any warnings
      if (parseResult.warnings.length > 0) {
        setImportWarnings(parseResult.warnings)
      }

      // Convert to DateRange format with IDs
      const formattedRanges = parseResult.dateRanges.map((range, index) => ({
        id: `imported-${index}-${Date.now()}`,
        arrivalDate: range.arrivalDate,
        departureDate: range.departureDate,
      }))

      setDateRanges(formattedRanges)

      // Only close the dialog if there are no warnings
      if (parseResult.warnings.length === 0) {
        setImportDialogOpen(false)
        setI94Data("")
      }
    } catch (error) {
      setImportError("Error parsing I-94 data. Please check the format and try again.")
    }
  }

  const handleConfirmImport = () => {
    setImportDialogOpen(false)
    setI94Data("")
    setImportWarnings([])
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"

    // Create date with noon UTC time to avoid timezone issues
    const date = new Date(dateString + "T12:00:00Z")
    return date.toLocaleDateString()
  }

  // Calculate days between dates
  const calculateDays = (arrivalDate: string | null, departureDate: string | null) => {
    if (!arrivalDate || !departureDate) return "N/A"

    // Fix timezone issues by creating dates with noon UTC time
    const arrival = new Date(arrivalDate + "T12:00:00Z")
    const departure = new Date(departureDate + "T12:00:00Z")

    const days = Math.round((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return days
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Substantial Presence Test Calculator</h1>

      <div className="mb-6">
        <div className="flex items-center gap-2 w-full max-w-xs">
          <Label htmlFor="taxYear" className="whitespace-nowrap font-medium">
            Tax Year:
          </Label>
          <Select defaultValue={taxYear.toString()} onValueChange={handleTaxYearChange}>
            <SelectTrigger id="taxYear" className="w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {recentYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="duration">Date Ranges</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Manual Days Entry</CardTitle>
                <CardDescription>
                  Enter the number of days you were physically present in the United States
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={manualFormRef} onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentYearDays">
                      Days in {taxYear} ({currentYearMaxDays} days max)
                    </Label>
                    <Input
                      id="currentYearDays"
                      name="currentYearDays"
                      type="number"
                      defaultValue={0}
                      min={0}
                      max={currentYearMaxDays}
                      onChange={handleNumberInputChange}
                      className={errors.currentYearDays ? "border-red-500" : ""}
                    />
                    {errors.currentYearDays && <p className="text-red-500 text-sm">{errors.currentYearDays}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstPriorYearDays">
                      Days in {taxYear - 1} ({firstPriorYearMaxDays} days max)
                    </Label>
                    <Input
                      id="firstPriorYearDays"
                      name="firstPriorYearDays"
                      type="number"
                      defaultValue={0}
                      min={0}
                      max={firstPriorYearMaxDays}
                      onChange={handleNumberInputChange}
                      className={errors.firstPriorYearDays ? "border-red-500" : ""}
                    />
                    {errors.firstPriorYearDays && <p className="text-red-500 text-sm">{errors.firstPriorYearDays}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondPriorYearDays">
                      Days in {taxYear - 2} ({secondPriorYearMaxDays} days max)
                    </Label>
                    <Input
                      id="secondPriorYearDays"
                      name="secondPriorYearDays"
                      type="number"
                      defaultValue={0}
                      min={0}
                      max={secondPriorYearMaxDays}
                      onChange={handleNumberInputChange}
                      className={errors.secondPriorYearDays ? "border-red-500" : ""}
                    />
                    {errors.secondPriorYearDays && <p className="text-red-500 text-sm">{errors.secondPriorYearDays}</p>}
                  </div>

                  <Button type="submit" className="w-full">
                    Calculate
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="duration">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Date Range Entry</CardTitle>
                <CardDescription>Enter your arrival and departure dates for the US</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={durationFormRef} onSubmit={handleDurationSubmit} className="space-y-6">
                  {/* Add Period Form */}
                  <div className="border rounded-md p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Add Travel Period</h3>
                      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="text-xs">
                            <Upload className="h-3.5 w-3.5 mr-1" />
                            Import from I-94
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Import I-94 Travel History</DialogTitle>
                            <DialogDescription>
                              Paste your I-94 travel history below. The format should be tab-separated with columns:
                              Row, DATE, TYPE, LOCATION.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Textarea
                              placeholder="Paste your I-94 travel history here..."
                              value={i94Data}
                              onChange={(e) => setI94Data(e.target.value)}
                              className="min-h-[200px] font-mono text-sm"
                            />
                            {importError && (
                              <Alert variant="destructive" className="py-2">
                                <AlertDescription>{importError}</AlertDescription>
                              </Alert>
                            )}
                            {importWarnings.length > 0 && (
                              <Alert variant="default" className="py-2 bg-amber-50 border-amber-200">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                                  <div>
                                    <AlertTitle className="text-amber-800">Data Inconsistencies Found</AlertTitle>
                                    <AlertDescription className="text-amber-700">
                                      <ul className="list-disc pl-5 mt-1 space-y-1">
                                        {importWarnings.map((warning, index) => (
                                          <li key={index}>{warning}</li>
                                        ))}
                                      </ul>
                                      <p className="mt-2">
                                        Please review the data and make any necessary corrections. You can still import
                                        the data as is, but the results may not be accurate.
                                      </p>
                                    </AlertDescription>
                                  </div>
                                </div>
                              </Alert>
                            )}
                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium">Example format:</p>
                              <pre className="mt-1 p-2 bg-muted rounded-md overflow-x-auto">
                                1 2024-12-23 Arrival LOS
                                <br />2 2024-12-15 Departure HHW
                                <br />3 2024-11-02 Arrival OTM
                              </pre>
                            </div>
                          </div>
                          <DialogFooter className="flex flex-col sm:flex-row gap-2">
                            <Button type="button" variant="secondary" onClick={() => setImportDialogOpen(false)}>
                              Cancel
                            </Button>
                            {importWarnings.length > 0 ? (
                              <>
                                <Button type="button" onClick={handleConfirmImport}>
                                  Import Anyway
                                </Button>
                              </>
                            ) : (
                              <Button type="button" onClick={handleImportI94}>
                                Import
                              </Button>
                            )}
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="newArrivalDate">Arrival Date</Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="noArrival"
                              checked={noArrival}
                              onCheckedChange={(checked) => {
                                setNoArrival(checked === true)
                                if (checked) setNewArrivalDate("")
                              }}
                            />
                            <Label htmlFor="noArrival" className="text-xs font-normal cursor-pointer">
                              No arrival
                            </Label>
                          </div>
                        </div>
                        <Input
                          id="newArrivalDate"
                          type="date"
                          value={newArrivalDate}
                          onChange={(e) => setNewArrivalDate(e.target.value)}
                          disabled={noArrival}
                          max={today}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="newDepartureDate">Departure Date</Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="noDeparture"
                              checked={noDeparture}
                              onCheckedChange={(checked) => {
                                setNoDeparture(checked === true)
                                if (checked) setNewDepartureDate("")
                              }}
                            />
                            <Label htmlFor="noDeparture" className="text-xs font-normal cursor-pointer">
                              No departure
                            </Label>
                          </div>
                        </div>
                        <Input
                          id="newDepartureDate"
                          type="date"
                          value={newDepartureDate}
                          onChange={(e) => setNewDepartureDate(e.target.value)}
                          disabled={noDeparture}
                          max={today}
                        />
                      </div>
                    </div>

                    {addPeriodError && (
                      <Alert variant="destructive" className="py-2 mt-2">
                        <AlertDescription>{addPeriodError}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="button" onClick={handleAddPeriod} className="w-full" size="sm">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Period
                    </Button>
                  </div>

                  {/* Travel Periods Table */}
                  {dateRanges.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Arrival Date</TableHead>
                            <TableHead>Departure Date</TableHead>
                            <TableHead className="text-right">Days</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dateRanges.map((range) => (
                            <TableRow key={range.id}>
                              <TableCell>{formatDate(range.arrivalDate)}</TableCell>
                              <TableCell>{formatDate(range.departureDate)}</TableCell>
                              <TableCell className="text-right">
                                {calculateDays(range.arrivalDate, range.departureDate)}
                              </TableCell>
                              <TableCell className="p-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeDateRange(range.id)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 border rounded-md text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                      <p>No travel periods added yet</p>
                      <p className="text-sm">Add a period above or import from I-94</p>
                    </div>
                  )}

                  {errors.dateRanges && (
                    <Alert variant="destructive" className="py-2">
                      <AlertDescription>{errors.dateRanges}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full">
                    Calculate
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Substantial Presence Test calculation results</CardDescription>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className="space-y-6">
                <Alert variant={results.passesTest ? "default" : "destructive"}>
                  <div className="flex items-center gap-2">
                    {results.passesTest ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    <AlertTitle>
                      {results.passesTest
                        ? "You meet the Substantial Presence Test"
                        : "You do not meet the Substantial Presence Test"}
                    </AlertTitle>
                  </div>
                  <AlertDescription>
                    {results.passesTest
                      ? `Based on your input, you are considered a U.S. resident for tax purposes for ${results.taxYear}.`
                      : `Based on your input, you are not considered a U.S. resident for tax purposes for ${results.taxYear}.`}
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Calculation Breakdown</h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">Current Year ({results.taxYear}):</div>
                    <div>{results.currentYearDays} days</div>

                    <div className="font-medium">First Prior Year ({results.taxYear - 1}):</div>
                    <div>
                      {results.firstPriorYearDays} days × 1/3 = {results.firstPriorYearDaysCalculated.toFixed(2)} days
                    </div>

                    <div className="font-medium">Second Prior Year ({results.taxYear - 2}):</div>
                    <div>
                      {results.secondPriorYearDays} days × 1/6 = {results.secondPriorYearDaysCalculated.toFixed(2)} days
                    </div>

                    <div className="font-medium border-t pt-2">Total Days:</div>
                    <div className="border-t pt-2 font-bold">{results.totalDays.toFixed(2)} days</div>
                  </div>

                  <div className="mt-4 text-sm">
                    <p className="mb-2">
                      <strong>Requirements to meet the test:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li className={results.meetsCurrentYearRequirement ? "text-green-600" : "text-red-600"}>
                        At least 31 days in the current year: {results.meetsCurrentYearRequirement ? "✓" : "✗"}
                      </li>
                      <li className={results.meetsTotalDaysRequirement ? "text-green-600" : "text-red-600"}>
                        At least 183 total calculated days: {results.meetsTotalDaysRequirement ? "✓" : "✗"}
                      </li>
                    </ul>
                  </div>

                  {results.dateRanges && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Travel Periods Used:</h4>
                      <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Arrival</th>
                              <th className="text-left py-2">Departure</th>
                              <th className="text-right py-2">Days</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.dateRanges.map((range: DateRange, index: number) => {
                              const arrival = range.arrivalDate ? new Date(range.arrivalDate) : null
                              const departure = range.departureDate ? new Date(range.departureDate) : null
                              const days =
                                arrival && departure
                                  ? Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)) + 1
                                  : "N/A"

                              return (
                                <tr key={index} className="border-b last:border-0">
                                  <td className="py-2">{arrival ? arrival.toLocaleDateString() : "N/A"}</td>
                                  <td className="py-2">{departure ? departure.toLocaleDateString() : "N/A"}</td>
                                  <td className="text-right py-2">{days}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Enter your information and click Calculate to see results
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            <p>
              This calculator is for informational purposes only and does not constitute tax advice. Consult with a tax
              professional for your specific situation.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

