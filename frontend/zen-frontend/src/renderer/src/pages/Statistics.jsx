import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { BiTrendingUp, BiTime, BiBody, BiCalendar } from 'react-icons/bi'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

function Statistics() {
  // Mock data for the past week
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  })

  const postureScores = [75, 82, 78, 85, 88, 84, 92]
  const sittingTime = [6.5, 7, 6.8, 7.2, 6.9, 6.5, 7.1]

  const chartData = {
    labels: dates,
    datasets: [
      {
        label: 'Posture Score',
        data: postureScores,
        fill: true,
        backgroundColor: 'rgba(108, 92, 231, 0.1)',
        borderColor: 'rgba(108, 92, 231, 1)',
        tension: 0.4,
        pointBackgroundColor: 'rgba(108, 92, 231, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(45, 46, 50, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        min: 50,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)'
        }
      }
    }
  }

  const weeklyStats = {
    averageScore: Math.round(postureScores.reduce((a, b) => a + b, 0) / postureScores.length),
    improvement: '+8%',
    averageTime: Math.round(sittingTime.reduce((a, b) => a + b, 0) / sittingTime.length * 10) / 10,
    daysTracked: dates.length
  }

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h1>Your Progress</h1>
        <p>Track your posture improvement over time</p>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <BiTrendingUp className="stat-card-icon" />
          <div className="stat-card-content">
            <h3>Average Score</h3>
            <div className="stat-card-value">{weeklyStats.averageScore}%</div>
            <div className="stat-card-trend positive">{weeklyStats.improvement} this week</div>
          </div>
        </div>

        <div className="stat-card">
          <BiTime className="stat-card-icon" />
          <div className="stat-card-content">
            <h3>Daily Average</h3>
            <div className="stat-card-value">{weeklyStats.averageTime}h</div>
            <div className="stat-card-subtitle">Time tracked</div>
          </div>
        </div>

        <div className="stat-card">
          <BiCalendar className="stat-card-icon" />
          <div className="stat-card-content">
            <h3>Days Active</h3>
            <div className="stat-card-value">{weeklyStats.daysTracked}</div>
            <div className="stat-card-subtitle">This week</div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h2>Weekly Posture Score</h2>
          <div className="chart-legend">
            <BiBody className="chart-legend-icon" />
            <span>Posture Quality</span>
          </div>
        </div>
        <div className="chart-wrapper">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  )
}

export default Statistics 