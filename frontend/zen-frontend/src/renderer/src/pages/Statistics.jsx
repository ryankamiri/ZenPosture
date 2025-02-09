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
      backgroundColor: 'rgba(108, 92, 231, 0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: 6,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#6c5ce7',
      pointBorderWidth: 2,
      pointHoverRadius: 8,
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#6c5ce7',
      pointHoverBorderWidth: 3
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        displayColors: false,
        titleFont: {
          size: 13,
          weight: '500'
        },
        bodyFont: {
          size: 14,
          weight: '600'
        },
        callbacks: {
          title: (items) => `Time: ${items[0].label}`,
          label: (item) => `Score: ${item.raw}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            size: 12
          },
          padding: 10,
          stepSize: 20
        },
        title: {
          display: true,
          text: 'Posture Score (%)',
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 14,
            weight: '500'
          },
          padding: { bottom: 15 }
        }
      },
      x: {
        grid: {
          display: false
        },
        border: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: {
            size: 12
          },
          maxRotation: 45,
          minRotation: 45,
          padding: 10,
          autoSkip: true,
          maxTicksLimit: 8
        },
        title: {
          display: true,
          text: 'Time',
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 14,
            weight: '500'
          },
          padding: { top: 15 }
        }
      }
    },
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 10
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
      <div className="about-header">
        <h1>Posture Analytics</h1>
        <p className="about-subtitle">Track your posture performance over time</p>
      </div>

      <div className="features-grid">
        {/* Chart Card */}
        <div className="feature-card">
          <div className="feature-icon">
            <BiTrendingUp />
          </div>
          <h3>Average Score</h3>
          <div className="stat-value">{stats.avgScore}%</div>
          <p>Today's average posture score</p>
        </div>

        {/* Sessions Card */}
        <div className="feature-card">
          <div className="feature-icon">
            <BiBody />
          </div>
          <h3>Total Sessions</h3>
          <div className="stat-value">{stats.totalSessions}</div>
          <p>Number of sessions today</p>
        </div>
      </div>

      {/* Chart Section Below */}
      <div className="about-section">
        <div className="feature-card">
          <h2>Today's Timeline</h2>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Statistics 