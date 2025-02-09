import React, { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { BiTrendingUp, BiBody } from 'react-icons/bi'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function Statistics() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await window.api.getTodaySessions()
        setSessions(data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)))
      } catch (err) {
        console.error('Failed to load sessions:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [])

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const chartData = {
    labels: sessions.map(session => formatTime(session.timestamp)),
    datasets: [{
      label: 'Posture Score',
      data: sessions.map(session => session.score),
      borderColor: '#6c5ce7',
      backgroundColor: 'rgba(108, 92, 231, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#6c5ce7',
      pointBorderWidth: 2
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        displayColors: false
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#999'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#999'
        }
      }
    }
  }

  const stats = {
    avgScore: sessions.length 
      ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length) 
      : 0,
    totalSessions: sessions.length
  }

  if (loading) {
    return <div className="statistics-container">Loading...</div>
  }

  return (
    <div className="statistics-container">
      <div className="stats-header">
        <h1>Today's Statistics</h1>
      </div>

      <div className="stats-content-wrapper">
        <div className="chart-section">
          <h2>Posture Score Timeline</h2>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="stats-cards-section">
          <div className="stat-card">
            <BiTrendingUp className="stat-card-icon" />
            <div className="stat-card-content">
              <h3>Average Score</h3>
              <div className="stat-card-value">{stats.avgScore}%</div>
              <div className="stat-card-subtitle">Today's average</div>
            </div>
          </div>

          <div className="stat-card">
            <BiBody className="stat-card-icon" />
            <div className="stat-card-content">
              <h3>Sessions</h3>
              <div className="stat-card-value">{stats.totalSessions}</div>
              <div className="stat-card-subtitle">Total today</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Statistics 