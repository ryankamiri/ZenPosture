import React, { useState, useEffect, useRef, useCallback } from 'react'
import { IoNotifications, IoNotificationsOff } from 'react-icons/io5'
import { BiBody } from 'react-icons/bi'
import { FiActivity, FiClock, FiCheckCircle, FiPlus, FiPlusCircle } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import Webcam from 'react-webcam'
import { BiCamera, BiReset } from 'react-icons/bi'

function Home() {

  const [isMinimized, setIsMinimized] = useState(false)

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const lastNotificationTimeRef = useRef(0);
  const postureScoreRef = useRef(100);


  const [tfModel, setTfModel] = useState(null);

  const [detector, setDetector] = useState(null);
  const [postureScore, setPostureScore] = useState(100);

  const model = poseDetection.SupportedModels.BlazePose;

  // Initialize state from localStorage or default to true
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [showStats, setShowStats] = useState(false)
  const navigate = useNavigate()

  // Initialize threshold state from localStorage or default to 70
  const [postureThreshold, setPostureThreshold] = useState(() => {
    const saved = localStorage.getItem('postureThreshold')
    return saved !== null ? parseInt(saved) : 70
  })

  const drawKeypoints = useCallback(async(keypoints, ctx) => {
      const keypointIndices = poseDetection.util.getKeypointIndexBySide(model);
      const radius = 5;
      ctx.lineWidth = 2;
  
      // Middle (nose, etc.)
      ctx.fillStyle = "Red";
      ctx.strokeStyle = "White";
      keypointIndices.middle.forEach((i) => {
        const kp = keypoints[i];
        if (kp.score > 0.5) drawCircle(ctx, kp.x, kp.y, radius);
      });
  
      // Left side (eyes, shoulder, etc.)
      ctx.fillStyle = "Green";
      ctx.strokeStyle = "White";
      keypointIndices.left.forEach((i) => {
        const kp = keypoints[i];
        if (kp.score > 0.5) drawCircle(ctx, kp.x, kp.y, radius);
      });
  
      // Right side
      ctx.fillStyle = "Orange";
      ctx.strokeStyle = "White";
      keypointIndices.right.forEach((i) => {
        const kp = keypoints[i];
        if (kp.score > 0.5) drawCircle(ctx, kp.x, kp.y, radius);
      });
    }, [model]);
  
    const drawSkeleton = useCallback(async(keypoints, ctx) => {
      const adjacency = poseDetection.util.getAdjacentPairs(
        model
      );
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
  
      adjacency.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];
        if (kp1.score > 0.5 && kp2.score > 0.5) {
          ctx.beginPath();
          ctx.moveTo(kp1.x, kp1.y);
          ctx.lineTo(kp2.x, kp2.y);
          ctx.stroke();
        }
      });
    }, [model]);
  
    const drawPose = useCallback(async(keypoints, video) => {
      const ctx = canvasRef.current.getContext("2d");
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
  
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;
  
      ctx.clearRect(0, 0, videoWidth, videoHeight);
  
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-videoWidth, 0);
  
      await drawSkeleton(keypoints, ctx);
      await drawKeypoints(keypoints, ctx);
  
      ctx.restore();
    }, [drawKeypoints, drawSkeleton]);
  
    const calculatePostureScore = useCallback(async(keypoints, videoWidth, videoHeight) => {
      if (!tfModel) {
        return postureScore;
      }
  
      const kpMap = {};
      keypoints.forEach(kp => {
        kpMap[kp.name] = kp;
      });
  
      const required = ["nose", "left_shoulder", "right_shoulder", "left_ear", "right_ear"];
      for (const name of required) {
        if (!kpMap[name] || kpMap[name].score < 0.5) {
          return postureScore;
        }
      }
  
      function norm(name) {
        return {
          x: kpMap[name].x / videoWidth,
          y: kpMap[name].y / videoHeight
        };
      }
      const nose = norm("nose");
      const lsho = norm("left_shoulder");
      const rsho = norm("right_shoulder");
      const lear = norm("left_ear");
      const rear = norm("right_ear");
    
      const msho = {
        x: (lsho.x + rsho.x) / 2,
        y: (lsho.y + rsho.y) / 2
      };
    
      const distNoseShoulders = distance2D(nose.x, nose.y, msho.x, msho.y);
      const distShoulders     = distance2D(lsho.x, lsho.y, rsho.x, rsho.y);
      const ratioNoseShoulders = distShoulders > 0 
        ? distNoseShoulders / distShoulders 
        : 0;
    
      const neckTiltAngle = angleABC(lear.x, lear.y, nose.x, nose.y, rear.x, rear.y);
      const distLeftEarNose  = distance2D(lear.x, lear.y, nose.x, nose.y);
      const distRightEarNose = distance2D(rear.x, rear.y, nose.x, nose.y);
      const angleLeftShoulder  = angleABC(lear.x, lear.y, lsho.x, lsho.y, nose.x, nose.y);
      const angleRightShoulder = angleABC(rear.x, rear.y, rsho.x, rsho.y, nose.x, nose.y);
    
      const featVec = [
        distNoseShoulders,
        ratioNoseShoulders,
        neckTiltAngle,
        distLeftEarNose,
        distRightEarNose,
        angleLeftShoulder,
        angleRightShoulder
      ];
    
      const xs = tf.tensor2d([featVec], [1, 7]);
      const output = tfModel.predict(xs);
      const rawVal = output.dataSync()[0]
      const intVal = Math.round(rawVal * 100, 0)
      xs.dispose();
      output.dispose();
      return intVal;
    }, [postureScore, tfModel]);
  
  const detectPosture = useCallback(async() => {
    if (
      !webcamRef.current ||
      !webcamRef.current.video ||
      webcamRef.current.video.readyState !== 4
    ) {
      return;
    }

    const video = webcamRef.current.video;
    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;
    video.width = videoWidth;
    video.height = videoHeight;

    const poses = await detector.estimatePoses(video);
    if (poses.length > 0) {
      const keypoints = poses[0].keypoints;
      await drawPose(keypoints, video);
      const score = await calculatePostureScore(keypoints, videoWidth, videoHeight);
      setPostureScore(score);
      
      // Check if 5 seconds have passed since last notification and score is below threshold
      const now = Date.now();
      if (score < postureThreshold && notificationsEnabled && now - lastNotificationTimeRef.current >= 1000 * 5) {
        new Notification("Poor Posture Detected!", {
          body: "Your posture score is low. Please adjust your sitting position 🪑",
          silent: false,
          icon: './officiallogo.png'
        });

        lastNotificationTimeRef.current = now;
      }
    }
  }, [detector, calculatePostureScore, drawPose]);

  function distance2D(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
  
  function angleABC(Ax, Ay, Bx, By, Cx, Cy) {
    // Angle at B formed by A->B->C, range [0..180].
    const ABx = Ax - Bx;
    const ABy = Ay - By;
    const CBx = Cx - Bx;
    const CBy = Cy - By;
  
    const dot = ABx * CBx + ABy * CBy;
    const magAB = Math.sqrt(ABx ** 2 + ABy ** 2);
    const magCB = Math.sqrt(CBx ** 2 + CBy ** 2);
    if (magAB === 0 || magCB === 0) {
      return 180.0; 
    }
    let cosTheta = dot / (magAB * magCB);
    cosTheta = Math.max(-1, Math.min(1, cosTheta));
    return (Math.acos(cosTheta) * 180) / Math.PI;
  }

  const drawCircle = (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };

  useEffect(() => {
    let newDetector;
    const initialize = async() => {
      await tf.setBackend("webgl");
      await tf.ready();

      const detectorConfig = {
        runtime: "mediapipe",
        modelType: "full",
        enableSmoothing: true,
        upperBodyOnly: true,
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/"
      };
      newDetector = await poseDetection.createDetector(model, detectorConfig);
      setDetector(newDetector);

      const modelJsonResp = await fetch("/model/model.json");
      const modelJson = await modelJsonResp.json();

      const newModel = tf.sequential();
      
      const firstLayerConfig = modelJson.config.layers[0].config;
      firstLayerConfig.inputShape = firstLayerConfig.batch_input_shape.slice(1);
      newModel.add(tf.layers.dense(firstLayerConfig));

      modelJson.config.layers.slice(1).forEach(layer => {
        newModel.add(tf.layers.dense(layer.config));
      });

      // Load weights
      const weightsData = await fetch("/model/model_weights.json").then(res => res.json());
      const modelWeights = newModel.getWeights();

      // Map loaded weights to tensors
      const newWeights = modelWeights.map((w, i) => {
        const data = Object.values(weightsData[i]);
        return tf.tensor(data, w.shape);
      });
      newModel.setWeights(newWeights);

      setTfModel(newModel);
      console.log("Model successfully loaded with weights!");
    };
    initialize();

    return () => {
      if (newDetector) {
        newDetector.dispose();
      }
      tf.dispose();
    };
  }, [model]);

  useEffect(() => {
    let id;
    if (detector) {
      id = setInterval(() => {
        detectPosture();
      }, 100);
    }

    return () => {
      if (id) {
        clearInterval(id);
      }
    }
  }, [detector, detectPosture]);

  useEffect(() => {
    // Send exercise reminder every min
    const exerciseInterval = setInterval(sendExerciseReminder, 1000 * 60)

    return () => {
      if (exerciseInterval) {
        clearInterval(exerciseInterval);
      }
    }
  }, []);

  useEffect(() => {
    postureScoreRef.current = postureScore;
  }, [postureScore]);
  
  // Separate useEffect for running the interval
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await window.api.addPostureSession({
          score: postureScoreRef.current, // Always gets latest value
        });
      } catch (error) {
        console.error("Failed to add posture session:", error);
      }
    }, 1000 * 5); // Runs every 5 seconds
  
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    }
  }, []);

  // Update localStorage when notifications state changes
  useEffect(() => {
    localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled))
  }, [notificationsEnabled])

  // Add useEffect for threshold persistence
  useEffect(() => {
    localStorage.setItem('postureThreshold', postureThreshold.toString())
  }, [postureThreshold])

  // Function to generate random score between 40 and 100
  const generateRandomScore = () => {
    return Math.floor(Math.random() * (100 - 40 + 1)) + 40;
  }

  // Function to send exercise reminder notification
  const sendExerciseReminder = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications")
      return
    }

    if (notificationsEnabled) {
      const notification = new Notification("Time for Posture Exercises!", {
        body: "Let's do some stretches to maintain good posture 🧘‍♂️",
        silent: false,
        icon: './officiallogo.png'
      })

      notification.onclick = () => {
        navigate('/exercises')
        window.focus()
      }
    }
  }

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled)
  }

  const toggleStats = () => {
    setShowStats(!showStats)
  }

  const addRandomSession = async () => {
    try {
      // Generate random score between 60 and 100
      const randomScore = Math.floor(Math.random() * (100 - 60 + 1)) + 60
      
      console.log('Adding random session with score:', randomScore)
      
      await window.api.addPostureSession({
        score: randomScore
      })
      
      console.log('Successfully added session')
    } catch (error) {
      console.error('Failed to add random session:', error)
    }
  }

  // Function to add multiple random sessions
  const addMultipleRandomSessions = async (count = 5) => {
    try {
      console.log(`Adding ${count} random sessions...`)
      
      for (let i = 0; i < count; i++) {
        // Add some random delay between sessions (0-2 seconds)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000))
        
        await addRandomSession()
      }
      
      console.log('Successfully added multiple sessions')
    } catch (error) {
      console.error('Failed to add multiple sessions:', error)
    }
  }

  return (
    <div className="home-container">
      <div className="welcome-section">
        <BiBody className="welcome-icon" />
        <h1>Welcome to Zen Posture</h1>
        <p>Your personal posture companion for a healthier workday</p>
      </div>

      <div className="content-grid">
        <div className="main-content-area">
          <div className="posture-score-display">
            <h2>Current Posture Score</h2>
            <div className={`score-value ${postureScore < postureThreshold ? 'poor' : 'good'}`}>
              {postureScore}%
            </div>
          </div>
          <div className={`webcam-container ${isMinimized ? 'minimized' : ''}`}>
            <div className="webcam-header">
              <h3>Posture View</h3>
              <button className="webcam-toggle" onClick={toggleMinimize}>
                {isMinimized ? <BiCamera /> : <BiReset />}
              </button>
            </div>
            <div className="webcam-content">
              <Webcam
                ref={webcamRef}
                mirrored={true}
                className="webcam-view"
              />
              <canvas
                ref={canvasRef} 
                className="webcam-view" 
              />
              <div className="webcam-overlay">
              </div>
            </div>
          </div>
        </div>

        <div className="side-content-area">
          <div className="threshold-section">
            <div className="threshold-header">
              <h3>Posture Alert Threshold</h3>
              <span className="threshold-value">{postureThreshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={postureThreshold}
              className="threshold-slider"
              onChange={(e) => setPostureThreshold(parseInt(e.target.value))}
            />
            <p className="threshold-description">
              You will receive alerts when your posture score falls below this threshold
            </p>
          </div>

          <div className="notification-section">
            <div className="notification-toggle" onClick={toggleNotifications}>
              <div className={`toggle-track ${notificationsEnabled ? 'enabled' : ''}`}>
                <div className="toggle-thumb" />
              </div>
            </div>
            <p className="notification-status">
              Reminders are currently {notificationsEnabled ? 'enabled' : 'disabled'}
            </p>
            <p className="notification-description">
              You will receive alerts when your posture needs attention
            </p>
          </div>

          <div className="stats-section">
            <button 
              className="stats-toggle-btn"
              onClick={toggleStats}
            >
              <FiActivity className="btn-icon" />
              {showStats ? 'Hide Today\'s Progress' : 'Show Today\'s Progress'}
            </button>

            {showStats && (
              <div className="stats-popup">
                <div className="stats-card">
                  <h3>Today's Progress</h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <FiCheckCircle className="stat-icon" />
                      <span className="stat-value">6</span>
                      <span className="stat-label">Exercises Completed</span>
                    </div>
                    <div className="stat-item">
                      <FiActivity className="stat-icon" />
                      <span className="stat-value">75%</span>
                      <span className="stat-label">Compliance Rate</span>
                    </div>
                    <div className="stat-item">
                      <FiClock className="stat-icon" />
                      <span className="stat-value">4h</span>
                      <span className="stat-label">Time Active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home 