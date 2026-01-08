import * as XLSX from 'xlsx'
import { format, parseISO, startOfWeek } from 'date-fns'

// Export class roster to Excel
export const exportRoster = (session, learners, topicLabel, clientLabel) => {
  const data = learners.map((learner, index) => ({
    '#': index + 1,
    'Name': learner.learner_name || 'N/A',
    'Email': learner.learner_email || 'N/A',
    'Unique ID': learner.learner_unique_id || 'N/A',
    'Status': learner.status || 'enrolled',
    'Enrolled At': learner.created_at ? format(new Date(learner.created_at), 'MMM d, yyyy h:mm a') : 'N/A'
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  
  // Add header info
  XLSX.utils.sheet_add_aoa(ws, [
    [`Class Roster: ${topicLabel}`],
    [`Client: ${clientLabel}`],
    [`Date: ${format(parseISO(session.session_date), 'MMM d, yyyy')}${session.end_date && session.end_date !== session.session_date ? ` - ${format(parseISO(session.end_date), 'MMM d, yyyy')}` : ''}`],
    [`Total Enrolled: ${learners.length}`],
    []
  ], { origin: 'A1' })

  // Adjust column widths
  ws['!cols'] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 30 },
    { wch: 15 },
    { wch: 12 },
    { wch: 20 }
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Roster')
  XLSX.writeFile(wb, `Roster_${topicLabel.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`)
}

// Export attendance records to Excel
export const exportAttendance = (session, attendance, learners, trainingDays, topicLabel, clientLabel) => {
  // Create a map of learner names
  const learnerMap = {}
  learners.forEach(l => {
    if (l.learner_id) {
      learnerMap[l.learner_id] = l.learner_name || l.learner_email || 'Unknown'
    }
  })

  // Group attendance by learner
  const attendanceByLearner = {}
  attendance.forEach(a => {
    if (!attendanceByLearner[a.learner_id]) {
      attendanceByLearner[a.learner_id] = {}
    }
    attendanceByLearner[a.learner_id][a.attendance_date] = a.status
  })

  // Build data rows
  const data = Object.entries(attendanceByLearner).map(([learnerId, dates]) => {
    const row = {
      'Learner': learnerMap[learnerId] || learnerId
    }
    trainingDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dateLabel = format(day, 'MMM d')
      row[dateLabel] = dates[dateStr] || '-'
    })
    
    // Calculate totals
    const statuses = Object.values(dates)
    row['Present'] = statuses.filter(s => s === 'present').length
    row['Absent'] = statuses.filter(s => s === 'absent').length
    row['Late'] = statuses.filter(s => s === 'late').length
    
    return row
  })

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()

  // Add header info
  XLSX.utils.sheet_add_aoa(ws, [
    [`Attendance Report: ${topicLabel}`],
    [`Client: ${clientLabel}`],
    [`Date: ${format(parseISO(session.session_date), 'MMM d, yyyy')}${session.end_date && session.end_date !== session.session_date ? ` - ${format(parseISO(session.end_date), 'MMM d, yyyy')}` : ''}`],
    []
  ], { origin: 'A1' })

  XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
  XLSX.writeFile(wb, `Attendance_${topicLabel.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`)
}

// Export progress scores to Excel
export const exportProgress = (session, progress, learners, trainingDays, topicLabel, clientLabel) => {
  // Create learner map
  const learnerMap = {}
  learners.forEach(l => {
    if (l.learner_id) {
      learnerMap[l.learner_id] = l.learner_name || l.learner_email || 'Unknown'
    }
  })

  // Group progress by learner
  const progressByLearner = {}
  progress.forEach(p => {
    if (!progressByLearner[p.learner_id]) {
      progressByLearner[p.learner_id] = []
    }
    progressByLearner[p.learner_id].push(p)
  })

  // Daily scores sheet
  const dailyData = []
  Object.entries(progressByLearner).forEach(([learnerId, records]) => {
    records.forEach(r => {
      dailyData.push({
        'Learner': learnerMap[learnerId] || learnerId,
        'Date': format(parseISO(r.progress_date), 'MMM d, yyyy'),
        'Participation': r.participation_score ?? '-',
        'Accuracy': r.accuracy_score ?? '-',
        'Productivity': r.productivity_score ?? '-',
        'Notes': r.notes || ''
      })
    })
  })

  // Weekly averages sheet
  const weeklyData = []
  Object.entries(progressByLearner).forEach(([learnerId, records]) => {
    const weeks = {}
    records.forEach(r => {
      const date = parseISO(r.progress_date)
      const weekStart = format(startOfWeek(date), 'yyyy-MM-dd')
      if (!weeks[weekStart]) {
        weeks[weekStart] = { participation: [], accuracy: [], productivity: [] }
      }
      if (r.participation_score !== null) weeks[weekStart].participation.push(r.participation_score)
      if (r.accuracy_score !== null) weeks[weekStart].accuracy.push(r.accuracy_score)
      if (r.productivity_score !== null) weeks[weekStart].productivity.push(r.productivity_score)
    })

    Object.entries(weeks).forEach(([weekStart, data], idx) => {
      weeklyData.push({
        'Learner': learnerMap[learnerId] || learnerId,
        'Week': `Week ${idx + 1}`,
        'Week Starting': format(parseISO(weekStart), 'MMM d, yyyy'),
        'Avg Participation': data.participation.length > 0 ? Math.round(data.participation.reduce((a, b) => a + b, 0) / data.participation.length) : '-',
        'Avg Accuracy': data.accuracy.length > 0 ? Math.round(data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length) : '-',
        'Avg Productivity': data.productivity.length > 0 ? Math.round(data.productivity.reduce((a, b) => a + b, 0) / data.productivity.length) : '-'
      })
    })
  })

  const wb = XLSX.utils.book_new()

  // Daily sheet
  const wsDailyData = XLSX.utils.json_to_sheet(dailyData)
  XLSX.utils.sheet_add_aoa(wsDailyData, [
    [`Progress Report: ${topicLabel}`],
    [`Client: ${clientLabel}`],
    []
  ], { origin: 'A1' })
  XLSX.utils.book_append_sheet(wb, wsDailyData, 'Daily Scores')

  // Weekly sheet
  const wsWeekly = XLSX.utils.json_to_sheet(weeklyData)
  XLSX.utils.book_append_sheet(wb, wsWeekly, 'Weekly Averages')

  XLSX.writeFile(wb, `Progress_${topicLabel.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`)
}

// Parse imported file (CSV or Excel)
export const parseImportFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        
        if (jsonData.length < 2) {
          reject(new Error('File must have headers and at least one data row'))
          return
        }

        // Get headers (first row)
        const headers = jsonData[0].map(h => String(h).toLowerCase().trim())
        
        // Find column indices
        const nameIdx = headers.findIndex(h => h.includes('name'))
        const emailIdx = headers.findIndex(h => h.includes('email'))
        const idIdx = headers.findIndex(h => h.includes('id') && !h.includes('email'))

        if (nameIdx === -1 && emailIdx === -1 && idIdx === -1) {
          reject(new Error('File must have at least one column: Name, Email, or ID'))
          return
        }

        // Parse data rows
        const learners = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const learner = {
            name: nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '',
            email: emailIdx >= 0 ? String(row[emailIdx] || '').trim() : '',
            uniqueId: idIdx >= 0 ? String(row[idIdx] || '').trim() : ''
          }

          // Skip empty rows
          if (!learner.name && !learner.email && !learner.uniqueId) continue

          learners.push(learner)
        }

        resolve(learners)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// Download sample import template
export const downloadImportTemplate = () => {
  const data = [
    { Name: 'John Doe', Email: 'john.doe@example.com', 'Unique ID': 'EMP001' },
    { Name: 'Jane Smith', Email: 'jane.smith@example.com', 'Unique ID': 'EMP002' }
  ]

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  
  ws['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 15 }
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Learners')
  XLSX.writeFile(wb, 'Learner_Import_Template.xlsx')
}
