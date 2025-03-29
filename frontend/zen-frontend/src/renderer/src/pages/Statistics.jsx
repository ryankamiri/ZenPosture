import React, { useState, useEffect, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  Filler
} from 'chart.js'
import { BiTrendingUp, BiBody, BiCalendar, BiTimeFive, BiCalendarCheck, BiTrendingDown, BiLineChart } from 'react-icons/bi'
import { FiArrowUp, FiArrowDown } from 'react-icons/fi'

// Register ChartJS components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

function Statistics() {
  // Period states
  const [activePeriod, setActivePeriod] = useState('daily')
  const [selectedYear, setSelectedYear] = useState(() => {
    const currentYear = new Date().getFullYear();
    return currentYear;
  })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const currentMonth = new Date().getMonth() + 1;
    return currentMonth;
  })
  
  // Add a chart reference to access the chart instance
  const chartRef = useRef(null);
  
  // Add a refresh key to force chart re-renders
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Data states
  const [dailySessions, setDailySessions] = useState([])
  const [monthlyStats, setMonthlyStats] = useState({})
  const [yearlyStats, setYearlyStats] = useState({})
  const [monthlyDailyData, setMonthlyDailyData] = useState([]) // Data for daily points in monthly view
  const [yearlyMonthlyData, setYearlyMonthlyData] = useState([]) // Data for monthly points in yearly view
  const [loading, setLoading] = useState(true)
  
  // API and server state
  const [apiError, setApiError] = useState(false)
  const [serverStatus, setServerStatus] = useState('unknown') // 'online', 'offline', 'unknown'
  
  // UI state
  const [progressionMetrics, setProgressionMetrics] = useState({
    trend: 'stable',
    percentChange: 0,
    description: 'Not enough data to determine trend'
  })

  // Function to check dark mode - moved outside to be reused
  const isDarkModeActive = () => {
    // Get computed style from document root to check background color
    const computedStyle = getComputedStyle(document.documentElement);
    const bgColor = computedStyle.getPropertyValue('--primary-bg').trim();
    
    // Dark backgrounds will have lower RGB values
    // This provides a more reliable check than class names
    return bgColor.includes('rgb(19') || // Check for dark value
           bgColor.includes('#13') ||    // Check for hex dark value
           !document.documentElement.classList.contains('light-theme');
  };

  
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setApiError(false);
      try {
        // Check server status first
        await checkServerStatus();
        
        // Load all periods of data
        await Promise.all([
          loadDailySessions(),
          loadMonthlyStats(),
          loadYearlyStats()
        ]);
      } catch (err) {
        console.error('Error loading statistics data:', err);
        setApiError(true);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
    
    // Set up periodic server status check
    const statusInterval = setInterval(checkServerStatus, 60000); // Check every minute
    
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // Check if the API server is online
  const checkServerStatus = async () => {
    try {
      const testEndpoint = 'https://zen-posture-df6c9e802988.herokuapp.com';
      const response = await fetch(testEndpoint, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Short timeout to quickly determine if server is responsive
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        setServerStatus('online');
        return true;
      } else {
        setServerStatus('offline');
        return false;
      }
    } catch (error) {
      console.error('Server status check failed:', error);
      setServerStatus('offline');
      return false;
    }
  };

  useEffect(() => {
    // When month or year changes, reload monthly daily data
    if (activePeriod === 'monthly') {
      loadMonthlyDailyData();
    }
  }, [selectedYear, selectedMonth, activePeriod]);

  useEffect(() => {
    // When year changes, process yearly data to show monthly averages
    if (activePeriod === 'yearly') {
      processYearlyMonthlyData();
    }
  }, [selectedYear, yearlyStats, activePeriod]);

  useEffect(() => {
    // When active period changes, calculate progression metrics
    calculateProgressionMetrics();
  }, [activePeriod, dailySessions, monthlyStats, yearlyStats, monthlyDailyData, yearlyMonthlyData]);

  // Use effect to set up theme change detection
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Increment the refresh key to force chart re-rendering
      setRefreshKey(prev => prev + 1);
      console.log("Theme change detected! Forcing chart refresh...");
    });
    
    // Watch for class changes on documentElement (theme changes)
    observer.observe(document.documentElement, { 
      attributes: true,
      attributeFilter: ['class'] 
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);

  const loadDailySessions = async () => {
    try {
      const response = await window.api.getTodaySessions();
      
      // Handle the new format from our API
      const sessions = Array.isArray(response) ? response : (response.sessions || []);
      
      // Sort sessions by timestamp
      const sortedSessions = [...sessions].sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
      
      setDailySessions(sortedSessions);
      
      // Calculate progression metrics based on sessions
      if (sortedSessions.length >= 2) {
        const firstSession = sortedSessions[0];
        const lastSession = sortedSessions[sortedSessions.length - 1];
        
        // Use the score field instead of postureScore
        const startScore = firstSession.score || 0;
        const endScore = lastSession.score || 0;
        
        // Calculate the change and percentage
        const scoreChange = endScore - startScore;
        const percentChange = startScore > 0 
          ? Math.round((scoreChange / startScore) * 100) 
          : 0;
        
        // Determine trend
        let trend = 'stable';
        if (percentChange > 5) trend = 'improving';
        if (percentChange < -5) trend = 'deteriorating';
        
        // Set progression metrics
        setProgressionMetrics({
          trend,
          percentChange,
          description: getProgressionDescription(trend, percentChange)
        });
      }
      
      return sortedSessions;
    } catch (error) {
      console.error('Error loading daily sessions:', error);
      setApiError(true);
      return [];
    }
  };

  // Helper function for progression description
  const getProgressionDescription = (trend, percentChange) => {
    if (trend === 'improving') {
      return `Your posture has improved by ${percentChange}% today`;
    } else if (trend === 'deteriorating') {
      return `Your posture has declined by ${Math.abs(percentChange)}% today`;
    } else {
      return 'Your posture has been consistent today';
    }
  };

  const loadMonthlyStats = async () => {
    try {
      // Call our new API endpoint
      const response = await window.api.getMonthlyStats(selectedYear);
      setMonthlyStats(response.monthlyStats || {});
      return response.monthlyStats;
    } catch (err) {
      console.error('Failed to load monthly stats:', err);
      return {};
    }
  };

  const loadYearlyStats = async () => {
    try {
      // Call our new API endpoint
      const response = await window.api.getYearlyStats();
      setYearlyStats(response.yearlyStats || {});
      return response.yearlyStats;
    } catch (err) {
      console.error('Failed to load yearly stats:', err);
      return {};
    }
  };

  // Load daily data points for a specific month
  const loadMonthlyDailyData = async () => {
    try {
      console.log(`Loading daily data for ${selectedYear}-${selectedMonth}`);
      
      // Check if the selected month is in the future
      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth() + 1; // 0-indexed to 1-indexed
      
      // If selected date is in the future, return empty data
      if (selectedYear > thisYear || (selectedYear === thisYear && selectedMonth > thisMonth)) {
        console.log(`Selected month (${selectedYear}-${selectedMonth}) is in the future, showing no data`);
        setMonthlyDailyData([]);
        return;
      }
      
      // Determine if we're looking at a past month
      const isPastMonth = selectedYear < thisYear || (selectedYear === thisYear && selectedMonth < thisMonth);
      
      // Call our API method to get daily data for the selected month
      const response = await window.api.getDailyDataForMonth(selectedYear, selectedMonth);
      
      if (response && response.dailyData && response.dailyData.length > 0) {
        // For past months, use the data as is - it should be historical and not change
        // For the current month, filter to only show days up to today
        const isCurrentMonth = selectedYear === thisYear && selectedMonth === thisMonth;
        
        const filteredData = isCurrentMonth
          ? response.dailyData.filter(day => day.day <= now.getDate())
          : response.dailyData;
        
        // Log if we're loading historical data or current data
        if (isPastMonth) {
          console.log(`Loading historical data for past month: ${selectedYear}-${selectedMonth}`);
        } else {
          console.log(`Loading current month data up to day ${now.getDate()}`);
        }
        
        setMonthlyDailyData(filteredData);
      } else {
        console.warn(`No daily data returned for ${selectedYear}-${selectedMonth}, using empty array`);
        setMonthlyDailyData([]);
      }
    } catch (err) {
      console.error('Failed to load daily data for month:', err);
      setMonthlyDailyData([]);
    }
  };

  // Process yearly data to show monthly averages
  const processYearlyMonthlyData = () => {
    try {
      console.log(`Processing monthly averages for ${selectedYear}`);
      
      // Check if the selected year is in the future
      const today = new Date();
      const thisYear = today.getFullYear();
      const thisMonth = today.getMonth() + 1; // 0-indexed to 1-indexed
      
      // If selected year is in the future, return empty data
      if (selectedYear > thisYear) {
        console.log(`Selected year (${selectedYear}) is in the future, showing no data`);
        setYearlyMonthlyData([]);
        return;
      }
      
      // Extract month data from monthlyStats for the selected year
      const yearMonths = Object.keys(monthlyStats)
        .filter(key => monthlyStats[key].year === parseInt(selectedYear))
        .map(key => monthlyStats[key])
        .sort((a, b) => a.month - b.month);
      
      console.log('Found real data for months:', yearMonths.map(m => m.month));
      
      // Fill in all months with null values by default
      const completeMonthData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        
        // If viewing current year and this month is in the future, return null data
        if (selectedYear === thisYear && month > thisMonth) {
          return {
            month: month,
            monthName: new Date(selectedYear, i, 1).toLocaleString('default', { month: 'short' }),
            averageScore: null, // No data for future months
            sessionCount: 0
          };
        }
        
        // Look for real data for this month
        const existingData = yearMonths.find(m => m.month === month);
        
        if (existingData) {
          // Use real data if it exists
          return {
            month: month,
            monthName: new Date(selectedYear, i, 1).toLocaleString('default', { month: 'short' }),
            averageScore: Math.round(existingData.averageScore),
            sessionCount: existingData.totalSessions
          };
        } else {
          // If no real data exists, keep it as null (don't generate fake data)
          return {
            month: month,
            monthName: new Date(selectedYear, i, 1).toLocaleString('default', { month: 'short' }),
            averageScore: null, // No data available
            sessionCount: 0
          };
        }
      });
      
      setYearlyMonthlyData(completeMonthData);
      
    } catch (err) {
      console.error('Failed to process yearly monthly data:', err);
      setYearlyMonthlyData([]);
    }
  };

  const calculateProgressionMetrics = () => {
    let trend = 'stable';
    let percentChange = 0;
    let description = 'Not enough data to determine trend';

    if (activePeriod === 'daily') {
      // Filter out any invalid entries just in case
      const validSessions = dailySessions.filter(session => session && typeof session.score === 'number');
      
      if (validSessions.length >= 2) {
        const recentSessions = [...validSessions].slice(-5); // Get last 5 sessions
        const oldAvg = recentSessions.slice(0, Math.ceil(recentSessions.length / 2))
          .reduce((sum, s) => sum + s.score, 0) / Math.ceil(recentSessions.length / 2);
        const newAvg = recentSessions.slice(Math.ceil(recentSessions.length / 2))
          .reduce((sum, s) => sum + s.score, 0) / (recentSessions.length - Math.ceil(recentSessions.length / 2));
        
        percentChange = Math.round(((newAvg - oldAvg) / oldAvg) * 100);
        trend = percentChange > 0 ? 'improving' : percentChange < 0 ? 'deteriorating' : 'stable';
        
        if (trend === 'improving') {
          description = `Your posture has improved by ${Math.abs(percentChange)}% today`;
        } else if (trend === 'deteriorating') {
          description = `Your posture has declined by ${Math.abs(percentChange)}% today`;
        } else {
          description = 'Your posture is consistent today';
        }
      }
    } else if (activePeriod === 'monthly') {
      // For monthly view, compare first half and second half of the month using only valid data
      const validData = monthlyDailyData.filter(day => day && day.averageScore !== null && typeof day.averageScore === 'number');
      
      if (validData.length >= 2) {
        const firstHalf = validData.slice(0, Math.floor(validData.length / 2));
        const secondHalf = validData.slice(Math.floor(validData.length / 2));
        
        const oldAvg = firstHalf.reduce((sum, day) => sum + day.averageScore, 0) / firstHalf.length;
        const newAvg = secondHalf.reduce((sum, day) => sum + day.averageScore, 0) / secondHalf.length;
        
        if (oldAvg > 0) {
          percentChange = Math.round(((newAvg - oldAvg) / oldAvg) * 100);
          trend = percentChange > 0 ? 'improving' : percentChange < 0 ? 'deteriorating' : 'stable';
          
          const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
          
          if (trend === 'improving') {
            description = `Your posture improved by ${Math.abs(percentChange)}% in ${monthName}`;
          } else if (trend === 'deteriorating') {
            description = `Your posture declined by ${Math.abs(percentChange)}% in ${monthName}`;
          } else {
            description = `Your posture was consistent in ${monthName}`;
          }
        }
      }
    } else if (activePeriod === 'yearly') {
      // For yearly view, compare first half and second half of the year using only valid data
      const validData = yearlyMonthlyData.filter(m => m && m.averageScore !== null && typeof m.averageScore === 'number');
      
      if (validData.length >= 2) {
        const firstHalf = validData.slice(0, Math.floor(validData.length / 2));
        const secondHalf = validData.slice(Math.floor(validData.length / 2));
        
        const oldAvg = firstHalf.reduce((sum, month) => sum + month.averageScore, 0) / firstHalf.length;
        const newAvg = secondHalf.reduce((sum, month) => sum + month.averageScore, 0) / secondHalf.length;
        
        if (oldAvg > 0) {
          percentChange = Math.round(((newAvg - oldAvg) / oldAvg) * 100);
          trend = percentChange > 0 ? 'improving' : percentChange < 0 ? 'deteriorating' : 'stable';
          
          if (trend === 'improving') {
            description = `Your posture improved by ${Math.abs(percentChange)}% in ${selectedYear}`;
          } else if (trend === 'deteriorating') {
            description = `Your posture declined by ${Math.abs(percentChange)}% in ${selectedYear}`;
          } else {
            description = `Your posture was consistent in ${selectedYear}`;
          }
        }
      }
    }

    setProgressionMetrics({ trend, percentChange, description });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDay = (day) => {
    return `${day}`;
  }

  const formatMonth = (monthNum) => {
    return new Date(0, monthNum - 1).toLocaleString('default', { month: 'short' });
  }

  const getChartData = () => {
    if (activePeriod === 'daily') {
      return {
        labels: dailySessions.map(session => formatTime(session.timestamp)),
    datasets: [{
      label: 'Posture Score',
          data: dailySessions.map(session => session.score),
          borderColor: '#3182ce',
          backgroundColor: 'rgba(92, 141, 231, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 6,
          pointBackgroundColor: '#3182ce',
          pointBorderColor: '#3182ce',
          pointBorderWidth: 2,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: '#3182ce',
          pointHoverBorderColor: '#3182ce',
          pointHoverBorderWidth: 3
        }]
      };
    } else if (activePeriod === 'monthly') {
      // Use daily data points for the monthly view
      // Filter out null values for visualization
      const validDays = monthlyDailyData.filter(day => day.averageScore !== null);
      
      return {
        labels: validDays.map(day => formatDay(day.day)),
        datasets: [{
          label: 'Daily Average Score',
          data: validDays.map(day => day.averageScore),
          borderColor: '#3182ce',
          backgroundColor: 'rgba(92, 141, 231, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#3182ce',
          pointBorderColor: '#3182ce',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#3182ce',
          pointHoverBorderColor: '#3182ce',
          pointHoverBorderWidth: 3
        }]
      };
    } else if (activePeriod === 'yearly') {
      // Use monthly data points for the yearly view
      // Filter out null values for visualization
      const validMonths = yearlyMonthlyData.filter(month => month.averageScore !== null);
      
      return {
        labels: validMonths.map(month => month.monthName),
        datasets: [{
          label: 'Monthly Average Score',
          data: validMonths.map(month => month.averageScore),
      borderColor: '#3182ce',
      backgroundColor: 'rgba(92, 141, 231, 0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: 6,
      pointBackgroundColor: '#3182ce',
      pointBorderColor: '#3182ce',
      pointBorderWidth: 2,
      pointHoverRadius: 8,
      pointHoverBackgroundColor: '#3182ce',
      pointHoverBorderColor: '#3182ce',
      pointHoverBorderWidth: 3
    }]
      };
    }
    
    // Default empty chart data
    return {
      labels: [],
      datasets: [{
        label: 'No Data',
        data: [],
        borderColor: '#3182ce',
        backgroundColor: 'rgba(92, 141, 231, 0.15)',
      }]
    };
  };

  const getChartOptions = () => {
    // Directly check if light-theme class exists on documentElement (root HTML)
    const isLightMode = document.documentElement.classList.contains('light-theme');
    
    // HARDCODE the colors - don't use variables or CSS that might not be applied
    // Pure white for dark mode, dark colors for light mode
    const textColor = isLightMode ? '#333333' : '#FFFFFF';
    const titleColor = isLightMode ? '#111111' : '#FFFFFF';
    const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)';
    
    // Forcibly set Chart.js defaults
    Chart.defaults.color = textColor;
    
    console.log("Chart colors:", {
      isLightMode,
      textColor,
      titleColor,
      chartDefaultColor: Chart.defaults.color
    });
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      color: textColor, // Global text color
      plugins: {
        legend: {
          display: activePeriod !== 'daily',
          position: 'top',
          labels: {
            color: textColor,
            font: {
              size: 12,
              weight: '500'
            },
            boxWidth: 15,
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          padding: 12,
          titleColor: '#fff',
          bodyColor: '#fff',
          displayColors: activePeriod !== 'daily',
          titleFont: {
            size: 13,
            weight: '500'
          },
          bodyFont: {
            size: 14,
            weight: '600'
          },
          callbacks: {
            title: (items) => {
              if (activePeriod === 'daily') return `Time: ${items[0].label}`;
              if (activePeriod === 'monthly') {
                const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
                return `${monthName} ${items[0].label}, ${selectedYear}`;
              }
              return `${items[0].label} ${selectedYear}`;
            },
            label: (item) => {
              return `${item.dataset.label}: ${Math.round(item.raw)}%`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: {
            color: gridColor,
            drawBorder: false
          },
          border: {
            display: false
          },
          ticks: {
            color: textColor, // Y-axis labels
            font: {
              size: 12,
              weight: '500'
            },
            padding: 10,
            stepSize: 20
          },
          title: {
            display: true,
            text: 'Posture Score (%)',
            color: titleColor, // Y-axis title
            font: {
              size: 14,
              weight: '600'
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
            color: textColor, // X-axis labels
            font: {
              size: 12,
              weight: '500'
            },
            padding: 10,
            autoSkip: true,
            maxTicksLimit: activePeriod === 'monthly' ? 31 : (activePeriod === 'yearly' ? 12 : 8)
          },
          title: {
            display: true,
            text: activePeriod === 'daily' ? 'Time' : 
                  activePeriod === 'monthly' ? 'Day of Month' : 
                  'Month',
            color: titleColor, // X-axis title
            font: {
              size: 14,
              weight: '600'
            },
            padding: { top: 15 }
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuad'
      }
    };
  };

  const getStats = () => {
    if (activePeriod === 'daily') {
      // Filter out any invalid entries just in case
      const validSessions = dailySessions.filter(session => session && typeof session.score === 'number');
      
      return {
        avgScore: validSessions.length 
          ? Math.round(validSessions.reduce((sum, s) => sum + s.score, 0) / validSessions.length) 
          : 0,
        totalSessions: validSessions.length,
        periodLabel: 'Today'
      };
    } else if (activePeriod === 'monthly') {
      // Get stats from monthly daily data - only include valid data (non-null)
      const validData = monthlyDailyData.filter(day => day && day.averageScore !== null && typeof day.averageScore === 'number');
      
      const avgScore = validData.length 
        ? Math.round(validData.reduce((sum, day) => sum + day.averageScore, 0) / validData.length)
        : 0;
      
      const totalSessions = validData.reduce((sum, day) => sum + (day.sessionCount || 0), 0);
      
      const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
      
      return {
        avgScore,
        totalSessions,
        periodLabel: `${monthName} ${selectedYear}`
      };
    } else if (activePeriod === 'yearly') {
      // Get stats from yearly monthly data - only include valid data (non-null)
      const validData = yearlyMonthlyData.filter(m => m && m.averageScore !== null && typeof m.averageScore === 'number');
      
      const avgScore = validData.length 
        ? Math.round(validData.reduce((sum, month) => sum + month.averageScore, 0) / validData.length)
        : 0;
      
      const totalSessions = validData.reduce((sum, month) => sum + (month.sessionCount || 0), 0);
      
      return {
        avgScore,
        totalSessions,
        periodLabel: selectedYear.toString()
      };
    }
    
    return {
      avgScore: 0,
      totalSessions: 0,
      periodLabel: 'Unknown Period'
    };
  };

  // Get years for which we have data (for the year selector)
  const getAvailableYears = () => {
    const yearsSet = new Set();
    const currentYear = new Date().getFullYear();
    
    // Add years from monthly data
    Object.keys(monthlyStats).forEach(key => {
      const year = monthlyStats[key].year;
      if (year && year <= currentYear) yearsSet.add(year);
    });
    
    // Add years from yearly data
    Object.keys(yearlyStats).forEach(year => {
      const yearNum = parseInt(year);
      if (yearNum <= currentYear) yearsSet.add(yearNum);
    });
    
    // Always include current year
    yearsSet.add(currentYear);
    
    // Sort years in descending order (newest first)
    return Array.from(yearsSet).sort((a, b) => b - a);
  };

  const handleYearChange = async (year) => {
    setSelectedYear(year);
    setLoading(true);
    try {
      // Reload monthly data for selected year
      const response = await window.api.getMonthlyStats(year);
      setMonthlyStats(response.monthlyStats || {});
      
      // Process yearly monthly data
      processYearlyMonthlyData();
      
      // Load daily data for selected month
      loadMonthlyDailyData();
    } catch (err) {
      console.error('Failed to load stats for year:', year, err);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = async (month) => {
    setSelectedMonth(month);
    setLoading(true);
    try {
      // Load daily data for the new month
      loadMonthlyDailyData();
    } catch (err) {
      console.error('Failed to load daily data for month:', month, err);
    } finally {
      setLoading(false);
    }
  };

  // Additional function to check if a date is in the future
  const isFutureDate = (year, month = null) => {
    const rightNow = new Date();
    const presentYear = rightNow.getFullYear();
    const presentMonth = rightNow.getMonth() + 1; // 0-indexed to 1-indexed
    
    if (month === null) {
      // Check only the year
      return year > presentYear;
    }
    
    // Check year and month
    return year > presentYear || (year === presentYear && month > presentMonth);
  };

  // Get available months for the selected year
  const getAvailableMonths = () => {
    const presentDate = new Date();
    const presentYear = presentDate.getFullYear();
    const presentMonth = presentDate.getMonth() + 1; // 0-indexed to 1-indexed
    
    // If selected year is future, return empty array
    if (selectedYear > presentYear) {
      return [];
    }
    
    // If current year, only show months up to current month
    const maxMonth = selectedYear === presentYear ? presentMonth : 12;
    
    return Array.from({ length: maxMonth }, (_, i) => i + 1);
  };

  const stats = getStats();
  const chartData = getChartData();
  const chartOptions = getChartOptions();

  if (loading) {
    return <div className="statistics-container">Loading...</div>
  }

  return (
    <div className="statistics-container">
      <div className="about-header">
        <h1>Posture Analytics</h1>
        <p className="about-subtitle">Track your posture performance over time</p>
        
        {/* API Error Notice */}
        {apiError && (
          <div className="api-error-notice">
            <h3>Connection Issue</h3>
            <p>Unable to connect to the server. Some data may not be available.</p>
            <p>The application will continue to work with local and simulated data.</p>
          </div>
        )}
        
        {/* Period Selector */}
        <div className="period-selector">
          <button
            className={`period-btn ${activePeriod === 'daily' ? 'active' : ''}`}
            onClick={() => setActivePeriod('daily')}
          >
            <BiTimeFive /> Daily
          </button>
          <button
            className={`period-btn ${activePeriod === 'monthly' ? 'active' : ''}`}
            onClick={() => setActivePeriod('monthly')}
          >
            <BiCalendar /> Monthly
          </button>
          <button
            className={`period-btn ${activePeriod === 'yearly' ? 'active' : ''}`}
            onClick={() => setActivePeriod('yearly')}
          >
            <BiCalendarCheck /> Yearly
          </button>
        </div>
        
        {/* Date Selectors */}
        <div className="date-selectors">
          {/* Year Selector (shown for monthly and yearly views) */}
          {(activePeriod === 'monthly' || activePeriod === 'yearly') && (
            <div className="selector-container">
              <label>Select Year:</label>
              <select 
                value={selectedYear} 
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
              >
                {getAvailableYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Month Selector (only shown for monthly view) */}
          {activePeriod === 'monthly' && (
            <div className="selector-container">
              <label>Select Month:</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              >
                {getAvailableMonths().map(month => (
                  <option key={month} value={month}>
                    {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Show Future Data Notice or Progression Data */}
      {isFutureDate(selectedYear, activePeriod === 'monthly' ? selectedMonth : null) ? (
        <div className="feature-card future-date-notice">
          <div className="feature-icon">
            <BiCalendar />
          </div>
          <h3>Future Date Selected</h3>
          <p>Data for this {activePeriod === 'monthly' ? 'month' : 'year'} is not available yet.</p>
          <p>Please select a current or past {activePeriod === 'monthly' ? 'month' : 'year'} to view posture data.</p>
        </div>
      ) : (
        <>
          {/* Posture Progression Section */}
          <div className="progression-section">
            <div className="feature-card progression-card">
              <div className={`progression-icon ${progressionMetrics.trend}`}>
                {progressionMetrics.trend === 'improving' && <FiArrowUp />}
                {progressionMetrics.trend === 'deteriorating' && <FiArrowDown />}
                {progressionMetrics.trend === 'stable' && <BiLineChart />}
              </div>
              <h3>Posture Progression</h3>
              <div className={`progression-value ${progressionMetrics.trend}`}>
                {progressionMetrics.percentChange > 0 && '+'}
                {progressionMetrics.percentChange}%
              </div>
              <p>{progressionMetrics.description}</p>
            </div>
      </div>

      <div className="features-grid">
        {/* Chart Card */}
        <div className="feature-card">
          <div className="feature-icon">
            <BiTrendingUp />
          </div>
          <h3>Average Score</h3>
          <div className="stat-value">{stats.avgScore}%</div>
              <p>{stats.periodLabel}'s average posture score</p>
        </div>

        {/* Sessions Card */}
        <div className="feature-card">
          <div className="feature-icon">
            <BiBody />
          </div>
          <h3>Total Sessions</h3>
          <div className="stat-value">{stats.totalSessions}</div>
              <p>Number of sessions in {stats.periodLabel.toLowerCase()}</p>
        </div>
      </div>

      {/* Chart Section Below */}
      <div className="about-section">
        <div className="feature-card">
              <h2>
                {activePeriod === 'daily' ? 'Today\'s Timeline' : 
                 activePeriod === 'monthly' ? `${new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear} Daily Averages` : 
                 `${selectedYear} Monthly Averages`}
              </h2>
          <div className="chart-container">
                {chartData.labels.length > 0 ? (
            <Line 
              data={chartData} 
              options={chartOptions}
              key={`chart-${refreshKey}-${document.documentElement.classList.contains('light-theme') ? 'light' : 'dark'}`}
              ref={chartRef}
            />
                ) : (
                  <div className="no-data-message">
                    <p>No data available for this period.</p>
                  </div>
                )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  )
}

export default Statistics 