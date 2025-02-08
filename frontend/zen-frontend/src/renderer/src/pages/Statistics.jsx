import React from 'react'

function Statistics() {
  // Mock data - replace with actual data from your backend
  const mockData = [
    { date: '2024-03-20', exercisesCompleted: 8, complianceRate: 80 },
    { date: '2024-03-21', exercisesCompleted: 6, complianceRate: 60 },
    // Add more mock data
  ]

  return (
    <div className="statistics-container">
      <h1>Your Progress</h1>
      <div className="stats-content">
        <div className="stats-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Exercises Completed</th>
                <th>Compliance Rate</th>
              </tr>
            </thead>
            <tbody>
              {mockData.map((day) => (
                <tr key={day.date}>
                  <td>{day.date}</td>
                  <td>{day.exercisesCompleted}</td>
                  <td>{day.complianceRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="stats-graph">
          {/* Add graph component here */}
          <p>Graph visualization will be implemented here</p>
        </div>
      </div>
    </div>
  )
}

export default Statistics 