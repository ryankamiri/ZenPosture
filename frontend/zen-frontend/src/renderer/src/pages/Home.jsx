import React, { useState, useEffect, useRef, useCallback } from 'react'
import { IoNotifications, IoNotificationsOff } from 'react-icons/io5'
import { BiBody } from 'react-icons/bi'
import { FiActivity, FiClock, FiCheckCircle, FiPlus, FiPlusCircle } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'

import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
// import * as mpPose from '@mediapipe/pose';
import "@tensorflow/tfjs-backend-webgl";
import Webcam from 'react-webcam'
import { BiCamera, BiReset } from 'react-icons/bi'

function Home() {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const lastNotificationTimeRef = useRef(0);
  const postureScoreRef = useRef(100);
  const postureThresholdRef = useRef(70);

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
  
    const drawSkeleton = useCallback((keypoints, ctx) => {
      if (!keypoints || keypoints.length === 0) return;
      
      // Create a map for quick keypoint lookup
      const keypointMap = {};
      for (const kp of keypoints) {
        if (kp.score > 0.3) {
          keypointMap[kp.name] = kp;
        }
      }
      
      // Define connections between keypoints
      const connections = [
        // Face
        ['nose', 'left_eye_inner'],
        ['left_eye_inner', 'left_eye'],
        ['left_eye', 'left_eye_outer'],
        ['left_eye_outer', 'left_ear'],
        ['nose', 'right_eye_inner'],
        ['right_eye_inner', 'right_eye'],
        ['right_eye', 'right_eye_outer'],
        ['right_eye_outer', 'right_ear'],
        
        // Upper body
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'],
        ['right_shoulder', 'right_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_elbow', 'right_wrist'],
        
        // Torso
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip']
      ];
      
      // Draw connections
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';
      
      for (const [p1Name, p2Name] of connections) {
        const p1 = keypointMap[p1Name];
        const p2 = keypointMap[p2Name];
        
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }, []);
  
    const drawPose = useCallback((pose, ctx, videoWidth, videoHeight) => {
      if (!pose || !pose.keypoints) return;
      
      // Draw keypoints
      ctx.fillStyle = 'red';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      
      // Draw all keypoints
      for (const kp of pose.keypoints) {
        if (kp.score > 0.3) {
          drawCircle(ctx, kp.x, kp.y, 5);
        }
      }
      
      // Draw skeleton
      drawSkeleton(pose.keypoints, ctx);
    }, [drawSkeleton]);
  
    const calculatePostureScore = useCallback((pose, videoWidth, videoHeight) => {
      if (!pose || !pose.keypoints) {
        console.log("No pose detected or keypoints missing");
        return postureScoreRef.current; // Return previous score
      }
      
      if (!tfModel) {
        console.log("TensorFlow model not loaded yet");
        return postureScoreRef.current; // Return previous score
      }
  
      try {
        // Create a map of keypoints for easier access (similar to the sample code)
      const kpMap = {};
        
        for (const kp of pose.keypoints) {
          if (kp.score > 0.3) { // Only use keypoints with good confidence
        kpMap[kp.name] = kp;
          }
        }
        
        // Check if we have all the required keypoints - same as sample code
        const requiredKeypoints = [
          "nose", "left_shoulder", "right_shoulder", 
          "left_ear", "right_ear"
        ];
        
        for (const kp of requiredKeypoints) {
          if (!kpMap[kp]) {
            if (Math.random() < 0.05) { // Log occasionally to avoid flooding console
              console.log(`Missing required keypoint: ${kp}`);
            }
            return postureScoreRef.current; // Return previous score
          }
        }
    
        // Normalize function - same as sample code
      function norm(name) {
        return {
          x: kpMap[name].x / videoWidth,
          y: kpMap[name].y / videoHeight
        };
      }
        
        // Extract normalized keypoints - identical to sample code
      const nose = norm("nose");
      const lsho = norm("left_shoulder");
      const rsho = norm("right_shoulder");
      const lear = norm("left_ear");
      const rear = norm("right_ear");
    
        // Calculate midpoint between shoulders - identical to sample code
      const msho = {
        x: (lsho.x + rsho.x) / 2,
        y: (lsho.y + rsho.y) / 2
      };
    
        // Calculate features exactly like in the sample code
      const distNoseShoulders = distance2D(nose.x, nose.y, msho.x, msho.y);
        const distShoulders = distance2D(lsho.x, lsho.y, rsho.x, rsho.y);
      const ratioNoseShoulders = distShoulders > 0 
        ? distNoseShoulders / distShoulders 
        : 0;
    
      const neckTiltAngle = angleABC(lear.x, lear.y, nose.x, nose.y, rear.x, rear.y);
        const distLeftEarNose = distance2D(lear.x, lear.y, nose.x, nose.y);
      const distRightEarNose = distance2D(rear.x, rear.y, nose.x, nose.y);
        const angleLeftShoulder = angleABC(lear.x, lear.y, lsho.x, lsho.y, nose.x, nose.y);
      const angleRightShoulder = angleABC(rear.x, rear.y, rsho.x, rsho.y, nose.x, nose.y);
    
        // Create feature vector like in the sample code
      const featVec = [
        distNoseShoulders,
        ratioNoseShoulders,
        neckTiltAngle,
        distLeftEarNose,
        distRightEarNose,
        angleLeftShoulder,
        angleRightShoulder
      ];
    
        // Log features occasionally for debugging
        if (Math.random() < 0.01) {
          console.log("Feature vector:", featVec);
        }
      
        // Make prediction using the model - simplified like in the sample code
      try {
        const xs = tf.tensor2d([featVec], [1, 7]);
          
          // Make prediction
        const output = tfModel.predict(xs);
          
          // Get prediction value
        const rawVal = output.dataSync()[0];
          
          // More straightforward calculation like in sample code
          const intVal = Math.round(rawVal * 100);
          
          // Clean up tensors
        xs.dispose();
        output.dispose();
          
          // Apply adaptive smoothing to allow more fluctuation while preventing wild jumps
          const prevScore = postureScoreRef.current;
          let smoothedScore = intVal;
          
          if (prevScore !== null) {
            // Adjust smoothing factor based on score range and change magnitude
            let smoothingFactor = 0.3; // Default smoothing
            
            const scoreDiff = Math.abs(intVal - prevScore);
            
            // Less smoothing for bad posture to allow scores to drop quickly
            if (intVal < 50) {
              smoothingFactor = 0.2;
            }
            
            // Even less smoothing for very bad posture
            if (intVal < 30) {
              smoothingFactor = 0.1;
            }
            
            // More smoothing for big jumps to prevent wild fluctuations
            if (scoreDiff > 15) {
              smoothingFactor = Math.min(0.5, smoothingFactor + 0.2);
            }
            
            // Apply smoothing
            smoothedScore = Math.round((prevScore * smoothingFactor) + (intVal * (1 - smoothingFactor)));
            
            // Log occasionally for debugging
            if (Math.random() < 0.02) {
              console.log(`Score smoothing: raw=${intVal}, prev=${prevScore}, smoothed=${smoothedScore}, factor=${smoothingFactor}`);
            }
          }
          
          // Ensure the score is in the 0-100 range
          return Math.max(0, Math.min(100, smoothedScore));
        } catch (predictionError) {
          console.error("Error making prediction:", predictionError);
          return postureScoreRef.current;
        }
      } catch (error) {
        console.error("Error calculating posture score:", error);
        return postureScoreRef.current;
      }
    }, [tfModel]);
  
  const detectPose = useCallback(async () => {
    if (!detector) {
      console.log("Pose detector not initialized yet");
      return;
    }

    if (!webcamRef.current) {
      console.warn("Webcam reference not available");
      return;
    }
    
    if (!canvasRef.current) {
      console.warn("Canvas reference not available");
      return;
    }

    try {
      const video = webcamRef.current.video;
      if (!video) {
        console.warn("Video element not available");
        return;
      }
      
      if (video.readyState !== 4) {
        // Video not ready yet
        if (Math.random() < 0.01) { // Log occasionally to avoid flooding console
          console.log("Video not ready yet, readyState =", video.readyState);
        }
        return;
      }

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      if (videoWidth === 0 || videoHeight === 0) {
        console.warn("Video dimensions are zero, width:", videoWidth, "height:", videoHeight);
        return;
      }

      // Set video width and height
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Set canvas width and height
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Get canvas context
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) {
        console.warn("Could not get canvas context");
        return;
      }
      
      // Clear the canvas before drawing
      ctx.clearRect(0, 0, videoWidth, videoHeight);

      // Detect poses
      const poses = await detector.estimatePoses(video, {
        flipHorizontal: false
      });
      
      if (poses && poses.length > 0) {
        // KEYPOINT VISUALIZATION - DISABLED FOR PRODUCTION
        // Uncomment the line below to show body mapping points
        // drawPose(poses[0], ctx, videoWidth, videoHeight);
        
        // Calculate posture score
        const score = calculatePostureScore(poses[0], videoWidth, videoHeight);
        
        // Update score only if it's a valid number
        if (typeof score === 'number' && !isNaN(score)) {
          setPostureScore(score);
          postureScoreRef.current = score;
          
          // Log score occasionally
          if (Math.random() < 0.01) {
            console.log("Current posture score:", score);
          }
          
          // Check if we need to send a notification
          if (notificationsEnabled && score < postureThreshold) {
            const now = Date.now();
            if (now - lastNotificationTimeRef.current > 60000) { // Only notify once per minute
            lastNotificationTimeRef.current = now;
              new Notification('Posture Alert', {
                body: `Your posture score is ${score}. Please correct your posture.`,
                icon: '/logo.png'
              });
            }
          }
        } else {
          console.warn("Invalid posture score:", score);
        }
      } else {
        if (Math.random() < 0.01) { // Log occasionally
          console.log("No poses detected");
        }
      }
    } catch (error) {
      console.error("Error detecting pose:", error);
      // Don't set error state here to avoid disrupting the UI
      // Just log the error and continue trying
    }
  }, [detector, calculatePostureScore, drawPose, notificationsEnabled, postureThreshold]);

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
      try {
        setIsLoading(true);
        setError(null);
        
          // Initialize TensorFlow.js
        console.log("Initializing TensorFlow.js...");
          await tf.ready();
        console.log("TensorFlow.js initialized");
          
        // Set backend to WebGL for better performance
          try {
          await tf.setBackend('webgl');
          console.log("Using WebGL backend");
          } catch (e) {
            console.warn("WebGL backend failed, falling back to CPU:", e);
          await tf.setBackend('cpu');
          console.log("Using CPU backend");
        }
        
        // Load the posture detection model
        console.log("Loading posture detection model...");
        
        // Try different detector configurations
        let detector = null;
        let detectorError = null;
        
        // First try with tfjs runtime
        try {
          const detectorConfig = {
            runtime: 'tfjs',
            modelType: 'lite',
            enableSmoothing: true
          };
          
          detector = await poseDetection.createDetector(model, detectorConfig);
          console.log("Pose detector loaded successfully with tfjs runtime");
        } catch (e) {
          console.warn("Failed to load detector with tfjs runtime:", e);
          detectorError = e;
          
          // Try with MediaPipe runtime
          try {
            const detectorConfig = {
              runtime: 'mediapipe',
              modelType: 'lite',
              solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose',
              enableSmoothing: true
            };
            
            detector = await poseDetection.createDetector(model, detectorConfig);
            console.log("Pose detector loaded successfully with mediapipe runtime");
            detectorError = null;
          } catch (e2) {
            console.error("Failed to load detector with mediapipe runtime:", e2);
            detectorError = e2;
          }
        }
        
        if (!detector) {
          throw new Error("Could not initialize pose detector: " + (detectorError ? detectorError.message : "Unknown error"));
        }
        
        setDetector(detector);
        
        // SIMPLIFIED MODEL LOADING APPROACH
        console.log("Loading posture scoring model...");
        
        // Create fallback model in case we can't load the real one
        const fallbackModel = createFallbackModel();
        
        try {
          // For Electron, we need to use the right path pattern
          // In dev mode, public files are directly in the renderer folder
          const modelPaths = [
            './model/model.json', 
            '../model/model.json',
            '../../model/model.json'
          ];
          
          // Try each potential path
          let loadedModel = null;
          let successPath = null;
          
          for (const path of modelPaths) {
            try {
              console.log(`Attempting to load model from: ${path}`);
              
              // First check if the file exists
              const response = await fetch(path, { method: 'HEAD' });
              if (!response.ok) {
                console.log(`File not found at ${path}, skipping`);
                continue;
              }
              
              // Try to load the model
              loadedModel = await tf.loadLayersModel(path);
              if (loadedModel) {
                successPath = path;
                console.log(`✅ Model successfully loaded from ${path}!`);
                break;
              }
            } catch (err) {
              console.warn(`Error loading from ${path}:`, err);
            }
          }
          
          // If we couldn't load the model through tf.loadLayersModel, try our manual approach
          if (!loadedModel) {
            console.log("Standard loading failed, trying manual model creation...");
            
            // Create a simple model that matches our expected architecture
            const manualModel = tf.sequential();
            
            // Add input layer (7 features)
            manualModel.add(tf.layers.dense({
              units: 16,
              activation: 'relu',
              inputShape: [7],
              name: 'dense_1'
            }));
            
            // Add hidden layer
            manualModel.add(tf.layers.dense({
              units: 16, 
              activation: 'relu',
              name: 'dense_2'
            }));
            
            // Add output layer (1 output - the posture score)
            manualModel.add(tf.layers.dense({
              units: 1,
              activation: 'sigmoid',
              name: 'dense_3'
            }));
            
            console.log("Manual model structure created");
            
            // Try to load weights from the weights file
            try {
              const weightsPath = './model/model_weights.json';
              const weightsResponse = await fetch(weightsPath);
              
              if (weightsResponse.ok) {
                const weightsData = await weightsResponse.json();
                console.log("Weights file loaded successfully");
                
                // Convert the weights data to tensors and set to model
                // This assumes the weights are in the correct format with shapes that match our model
                if (Array.isArray(weightsData)) {
                  try {
                    // Prepare tensors from the weights data
                    const tensors = [];
                    let currentIndex = 0;
                    
                    // First dense layer weights (kernel and bias)
                    // Kernel shape should be [7, 16]
                    const kernel1Values = Object.values(weightsData[0]);
                    const kernel1 = tf.tensor2d(kernel1Values, [7, 16]);
                    tensors.push(kernel1);
                    
                    // Bias shape should be [16]
                    const bias1Values = Object.values(weightsData[1]);
                    const bias1 = tf.tensor1d(bias1Values);
                    tensors.push(bias1);
                    
                    // Second dense layer weights (kernel and bias)
                    // Kernel shape should be [16, 16]
                    const kernel2Values = Object.values(weightsData[2]);
                    const kernel2 = tf.tensor2d(kernel2Values, [16, 16]);
                    tensors.push(kernel2);
                    
                    // Bias shape should be [16]
                    const bias2Values = Object.values(weightsData[3]);
                    const bias2 = tf.tensor1d(bias2Values);
                    tensors.push(bias2);
                    
                    // Output layer weights (kernel and bias)
                    // Kernel shape should be [16, 1]
                    const kernel3Values = Object.values(weightsData[4]);
                    const kernel3 = tf.tensor2d(kernel3Values, [16, 1]);
                    tensors.push(kernel3);
                    
                    // Bias shape should be [1]
                    const bias3Values = Object.values(weightsData[5]);
                    const bias3 = tf.tensor1d(bias3Values);
                    tensors.push(bias3);
                    
                    // Set weights to the model
                    manualModel.setWeights(tensors);
                    console.log("Weights set successfully to manual model");
                    
                    // Clean up tensors
                    tensors.forEach(t => t.dispose());
                    
                    // Use this model
                    loadedModel = manualModel;
                    console.log("Manual model with weights created successfully");
                  } catch (weightSetError) {
                    console.error("Error setting weights to manual model:", weightSetError);
                  }
                } else {
                  console.warn("Weights data is not an array:", weightsData);
                }
              } else {
                console.warn("Could not load weights file from", weightsPath);
              }
            } catch (weightsError) {
              console.error("Error loading or applying weights:", weightsError);
            }
          }
          
          // If we have successfully loaded a model, use it
          if (loadedModel) {
            console.log("Using loaded model");
            loadedModel.name = "trained_model";
            loadedModel.isTrainedModel = true;
            setTfModel(loadedModel);
          } else {
            console.warn("Could not load trained model, using fallback");
            setTfModel(fallbackModel);
            setError("Using fallback model: Trained model could not be loaded");
          }
        } catch (modelError) {
          console.error("Error in model loading process:", modelError);
          console.warn("Using fallback model due to error");
          setTfModel(fallbackModel);
          setError(`Error loading model: ${modelError.message}. Using fallback.`);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Initialization error:", error);
        setError(`Failed to initialize: ${error.message}`);
        setIsLoading(false);
      }
    };

    // Function to create the fallback model
    const createFallbackModel = () => {
      console.log("Creating a fallback model - WARNING: Using heuristic approach instead of trained model");
      
      // Create a simple fallback model that maps features to scores
      const fallbackModel = {
        name: "fallback_heuristic_model",
        isTrainedModel: false,
        predict: function(tensor) {
          // Get the features from the tensor
          const features = tensor.arraySync()[0];
          
          // Extract key features
          const distNoseShoulders = features[0];
          const ratioNoseShoulders = features[1];
          const neckTiltAngle = features[2];
          const distLeftEarNose = features[3];
          const distRightEarNose = features[4];
          const angleLeftShoulder = features[5];
          const angleRightShoulder = features[6];
          
          // Log features more frequently for debugging
          if (Math.random() < 0.05) {
            console.log("Raw posture features:", {
              distNoseShoulders,
              ratioNoseShoulders,
              neckTiltAngle,
              distLeftEarNose,
              distRightEarNose,
              angleLeftShoulder,
              angleRightShoulder
            });
          }
          
          // Enhanced scoring logic to better differentiate between good and bad posture
          
          // 1. Neck tilt score - good posture has neck tilt angle closer to 180
          // Normalize to 0-100 scale with more sensitivity
          const neckTiltScore = Math.pow(neckTiltAngle / 180, 1.2) * 100;
          
          // 2. Distance score - measures how far nose is from shoulders (hunching)
          let distanceScore = 0;
          if (distNoseShoulders < 0.08) {
            // Very hunched - severe penalty (0-30)
            distanceScore = 0;
          } else if (distNoseShoulders < 0.12) {
            // Hunched - low score (30-45)
            distanceScore = 30 + ((distNoseShoulders - 0.08) * 375);
          } else if (distNoseShoulders < 0.16) {
            // Slightly hunched - moderate score (45-65)
            distanceScore = 45 + ((distNoseShoulders - 0.12) * 500);
          } else if (distNoseShoulders < 0.22) {
            // Good range - high score (65-90)
            distanceScore = 65 + ((distNoseShoulders - 0.16) * 417);
          } else {
            // Too far back - slight penalty
            distanceScore = Math.max(50, 90 - ((distNoseShoulders - 0.22) * 250));
          }
          
          // 3. Ratio score - nose-to-shoulders ratio
          let ratioScore = 0;
          if (ratioNoseShoulders < 0.4) {
            // Excellent ratio (85-100)
            ratioScore = 85 + ((0.4 - ratioNoseShoulders) * 37.5);
          } else if (ratioNoseShoulders < 0.5) {
            // Good ratio (65-85)
            ratioScore = 65 + ((0.5 - ratioNoseShoulders) * 200);
          } else if (ratioNoseShoulders < 0.65) {
            // Average ratio (45-65)
            ratioScore = 45 + ((0.65 - ratioNoseShoulders) * 133);
          } else if (ratioNoseShoulders < 0.8) {
            // Poor ratio (20-45)
            ratioScore = 20 + ((0.8 - ratioNoseShoulders) * 167);
          } else {
            // Very poor ratio (0-20)
            ratioScore = Math.max(0, 20 - ((ratioNoseShoulders - 0.8) * 60));
          }
          
          // 4. Ear position score - measures head tilt and rotation
          const earAsymmetry = Math.abs(distLeftEarNose - distRightEarNose);
          const earAvgDist = (distLeftEarNose + distRightEarNose) / 2;
          
          // Penalize asymmetry and large distances
          const earScore = Math.max(0, 100 - (earAsymmetry * 300) - (earAvgDist * 150));
          
          // 5. Shoulder angle score - higher values are better for good posture
          const shoulderAngleAvg = (angleLeftShoulder + angleRightShoulder) / 2;
          const shoulderAsymmetry = Math.abs(angleLeftShoulder - angleRightShoulder);
          
          // Score based on shoulder angle and symmetry
          const shoulderScore = Math.min(100, Math.max(0, 
            20 + (shoulderAngleAvg * 1.2) - (shoulderAsymmetry * 1.5)
          ));
          
          // Combine all scores with adjusted weights
          // Head position (distance + ratio) is most important
          const combinedScore = (
            (neckTiltScore * 0.25) +
            (distanceScore * 0.3) +
            (ratioScore * 0.25) +
            (earScore * 0.1) +
            (shoulderScore * 0.1)
          );
          
          // Adjust the final score to ensure good range (65-100) and bad range (<50)
          let finalScore = combinedScore;
          
          // Boost good postures and penalize bad postures to widen the range
          if (finalScore > 65) {
            // Boost good posture scores to ensure they reach higher values
            finalScore = 65 + ((finalScore - 65) * 1.15);
          } else if (finalScore < 50) {
            // Make bad posture scores even lower
            finalScore = finalScore * 0.9;
          }
          
          // Ensure score is in 0-100 range
          finalScore = Math.min(100, Math.max(0, Math.round(finalScore)));
          
          // Log calculations occasionally for debugging
          if (Math.random() < 0.05) {
            console.log("Score calculation:", {
              neckTiltScore,
              distanceScore,
              ratioScore,
              earScore,
              shoulderScore,
              combinedScore,
              finalScore
            });
          }
          
          // Return as tensor like the real model would
          return tf.tensor2d([[finalScore / 100]]);
        },
        
        // Add a dispose method to match the TensorFlow model API
        dispose: function() {
          console.log("Disposing fallback model");
        }
      };
      
      // Test the model with different posture examples
      const testPostures = [
        // Good posture examples
        [0.17, 0.4, 170, 0.15, 0.15, 50, 50],  // Excellent posture
        [0.16, 0.5, 160, 0.18, 0.18, 45, 45],  // Good posture
        
        // Average posture examples  
        [0.14, 0.6, 150, 0.2, 0.2, 40, 40],    // Slightly above average
        [0.12, 0.65, 140, 0.22, 0.22, 35, 35], // Average posture
        
        // Bad posture examples
        [0.1, 0.7, 130, 0.25, 0.25, 30, 30],   // Bad posture
        [0.08, 0.85, 120, 0.3, 0.3, 25, 25]    // Very bad posture
      ];
      
      // Test each posture and log the scores
      console.log("Testing fallback model with different posture examples:");
      testPostures.forEach((features, i) => {
        const testTensor = tf.tensor2d([features], [1, 7]);
        const prediction = fallbackModel.predict(testTensor);
        const score = Math.round(prediction.dataSync()[0] * 100);
        
        let quality = "";
        if (score >= 65) quality = "GOOD";
        else if (score >= 50) quality = "AVERAGE";
        else quality = "BAD";
        
        console.log(`Posture example ${i+1}: Score = ${score}% (${quality})`);
        
        // Clean up test tensor
        testTensor.dispose();
        prediction.dispose();
      });
      
      return fallbackModel;
    };

    // Call initialize function
    initialize();

    return () => {
      if (newDetector) {
        newDetector.dispose();
      }
      if (tfModel) {
        tfModel.dispose();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  useEffect(() => {
    // Save notification settings to localStorage
    localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled))
    
    // Update the ref value to match the state
    postureThresholdRef.current = postureThreshold;
    
    // Save threshold to localStorage
    localStorage.setItem('postureThreshold', postureThreshold.toString())
  }, [notificationsEnabled, postureThreshold])

  useEffect(() => {
    // Request notification permission if enabled
    if (notificationsEnabled && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    
    // Cleanup function
    return () => {
      // Dispose of TensorFlow resources when component unmounts
      if (tfModel) {
        try {
          tfModel.dispose();
        } catch (e) {
          console.error("Error disposing model:", e);
        }
      }
    };
  }, []);

  useEffect(() => {
    let id;
    if (detector && !isLoading && !error) {
      id = setInterval(() => {
        detectPose();
      }, 100);
    }

    return () => {
      if (id) {
        clearInterval(id);
      }
    };
  }, [detector, detectPose, isLoading, error]);

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
          score: postureScoreRef.current
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

  // Add a useEffect to ensure webcam and canvas are properly initialized
  useEffect(() => {
    // Check if webcam and canvas are available
    if (webcamRef.current && canvasRef.current) {
      console.log("Webcam and canvas references are available");
    } else {
      console.warn("Webcam or canvas references are not available");
      
      // Force a re-render after a short delay to try to get the references
      const timer = setTimeout(() => {
        console.log("Attempting to re-initialize webcam and canvas...");
        // This will trigger a re-render
        setIsLoading(prev => {
          console.log("Re-rendering component to initialize webcam and canvas");
          return prev;
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [webcamRef.current, canvasRef.current]);

  // Add a useEffect to verify model loading and show a clear indicator
  useEffect(() => {
    if (tfModel) {
      const isUsingTrainedModel = tfModel.isTrainedModel === true;
      
      console.log(`Current model: ${isUsingTrainedModel ? 'TRAINED ML MODEL ✓' : 'FALLBACK HEURISTIC MODEL ⚠️'}`);
      console.log(`Model name: ${tfModel.name || 'unnamed'}`);
      
      // Verify model by making a test prediction
      try {
        // Create a test tensor with sample data
        const goodPostureData = [0.17, 0.4, 170, 0.15, 0.15, 50, 50];  // Excellent posture
        const mediumPostureData = [0.13, 0.6, 150, 0.22, 0.22, 40, 40]; // Medium posture
        const badPostureData = [0.08, 0.85, 120, 0.3, 0.3, 25, 25];     // Very bad posture
        
        // Create test tensors
        const testTensor = tf.tensor2d([
          goodPostureData,
          mediumPostureData, 
          badPostureData
        ], [3, 7]);
        
        // Make a test prediction
        const testOutput = tfModel.predict(testTensor);
        const testValues = testOutput.dataSync();
        
        // Log the predictions
        console.log("Model verification test predictions:");
        console.log("- Good posture sample score:", Math.round(testValues[0] * 100));
        console.log("- Medium posture sample score:", Math.round(testValues[1] * 100));
        console.log("- Bad posture sample score:", Math.round(testValues[2] * 100));
        
        // Check if predictions are reasonable
        const allSame = testValues[0] === testValues[1] && testValues[1] === testValues[2];
        const allZeros = testValues[0] === 0 && testValues[1] === 0 && testValues[2] === 0;
        
        if (allZeros) {
          console.warn("Model verification warning: All predictions are zero");
          setError(prevError => 
            prevError ? 
              prevError + " Model produces all zeros." : 
              "Model verification warning: All predictions are zero."
          );
        } else if (allSame) {
          console.warn("Model verification warning: All predictions have the same value");
          setError(prevError => 
            prevError ? 
              prevError + " Model produces identical values for different postures." : 
              "Model verification warning: Predictions are identical for different postures."
          );
        } else {
          console.log("Model verification successful: Predictions show variation as expected");
          
          // Only clear the error if it's about model verification
          if (isUsingTrainedModel) {
            setError(prevError => 
              prevError && prevError.includes("verification") ? 
                null : 
                prevError
            );
          }
        }
        
        // Clean up test tensors
        testTensor.dispose();
        testOutput.dispose();
      } catch (e) {
        console.error("Model verification failed:", e);
        setError(`Model verification failed: ${e.message}`);
      }
    }
  }, [tfModel]);

  return (
    <div className="home-container">
      <div className="welcome-section">
        <BiBody className="welcome-icon" />
        <h1>Welcome to Zen Posture</h1>
        <p>Your personal posture companion for a healthier workday</p>
      </div>

      {error && (
        <div className="error-message" style={{ color: 'red', textAlign: 'center', margin: '1rem 0' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="loading-message" style={{ textAlign: 'center', margin: '2rem 0' }}>
          Loading pose detection model...
        </div>
      ) : (
        <div className="content-grid">
          <div className="main-content-area">
            <div className="posture-score-display">
              <h2>Current Posture Score</h2>
              <div className={`score-value ${postureScore < postureThreshold ? 'poor' : 'good'}`}>
                {isLoading ? 'Loading...' : `${postureScore}%`}
              </div>
              {error && <div className="error-message">{error}</div>}
            </div>
            <div className={`webcam-container ${isMinimized ? 'minimized' : ''}`}>
              <div className="webcam-header">
                <h3>Posture View{isLoading ? ' (Loading...)' : ''}</h3>
                <button className="webcam-toggle" onClick={toggleMinimize}>
                  {isMinimized ? <BiCamera /> : <BiReset />}
                </button>
              </div>
              <div className="webcam-content">
                <Webcam
                  ref={webcamRef}
                  mirrored={true}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="webcam-view"
                  width={640}
                  height={480}
                  videoConstraints={{
                    width: 640,
                    height: 480,
                    facingMode: "user"
                  }}
                  onUserMedia={() => {
                    console.log("Webcam access granted and video stream started");
                  }}
                  onUserMediaError={(error) => {
                    console.error("Webcam access error:", error);
                    setError(`Webcam access error: ${error.message || 'Unknown error'}`);
                  }}
                />
                <canvas
                  ref={canvasRef} 
                  className="webcam-view" 
                  width={640}
                  height={480}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                />
                <div className="webcam-overlay">
                  <div className="posture-tracking-indicator">
                    <div className="tracking-status-dot"></div>
                    <span>Analyzing posture</span>
                  </div>
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
                min="0"
                max="100"
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
      )}
    </div>
  )
}

export default Home 