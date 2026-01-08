import { format, parseISO } from 'date-fns'

// Generate ICS file content for calendar export
export const generateICS = (event) => {
  const {
    title,
    description,
    location,
    startDate,
    endDate,
    startTime,
    endTime
  } = event

  // Parse dates and times
  const start = parseISO(startDate)
  const end = endDate ? parseISO(endDate) : start

  // Format datetime for ICS (YYYYMMDDTHHMMSS)
  const formatDateTime = (date, time) => {
    const [hours, minutes] = (time || '09:00').split(':')
    date.setHours(parseInt(hours), parseInt(minutes), 0)
    return format(date, "yyyyMMdd'T'HHmmss")
  }

  const dtStart = formatDateTime(new Date(start), startTime)
  const dtEnd = formatDateTime(new Date(end), endTime)

  // Generate unique ID
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@hrplearninghub`

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HRP Learning Hub//Training Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss")}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${title}
DESCRIPTION:${description || ''}
LOCATION:${location || ''}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`

  return icsContent
}

// Download ICS file
export const downloadICS = (event) => {
  const icsContent = generateICS(event)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${event.title.replace(/\s+/g, '_')}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Generate Google Calendar URL
export const getGoogleCalendarUrl = (event) => {
  const {
    title,
    description,
    location,
    startDate,
    endDate,
    startTime,
    endTime
  } = event

  const start = parseISO(startDate)
  const end = endDate ? parseISO(endDate) : start

  const formatGoogleDate = (date, time) => {
    const [hours, minutes] = (time || '09:00').split(':')
    date.setHours(parseInt(hours), parseInt(minutes), 0)
    return format(date, "yyyyMMdd'T'HHmmss")
  }

  const dtStart = formatGoogleDate(new Date(start), startTime)
  const dtEnd = formatGoogleDate(new Date(end), endTime)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${dtStart}/${dtEnd}`,
    details: description || '',
    location: location || '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Generate Outlook Web URL
export const getOutlookCalendarUrl = (event) => {
  const {
    title,
    description,
    location,
    startDate,
    endDate,
    startTime,
    endTime
  } = event

  const start = parseISO(startDate)
  const end = endDate ? parseISO(endDate) : start

  const formatOutlookDate = (date, time) => {
    const [hours, minutes] = (time || '09:00').split(':')
    date.setHours(parseInt(hours), parseInt(minutes), 0)
    return date.toISOString()
  }

  const dtStart = formatOutlookDate(new Date(start), startTime)
  const dtEnd = formatOutlookDate(new Date(end), endTime)

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: dtStart,
    enddt: dtEnd,
    body: description || '',
    location: location || '',
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
