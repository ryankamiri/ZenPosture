import React, { useState, useEffect, useRef, useCallback } from 'react'
import { IoNotifications, IoNotificationsOff } from 'react-icons/io5'
import { BiBody } from 'react-icons/bi'
import { FiActivity, FiClock, FiCheckCircle, FiPlus, FiPlusCircle } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

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
        // Create a map of keypoints for easier access
        const kpMap = {};
        let validKeypoints = 0;
        
        for (const kp of pose.keypoints) {
          if (kp.score > 0.3) { // Only use keypoints with good confidence
            kpMap[kp.name] = kp;
            validKeypoints++;
          }
        }
        
        // Log how many valid keypoints we have
        if (Math.random() < 0.01) { // Log occasionally
          console.log(`Valid keypoints: ${validKeypoints}/${pose.keypoints.length}`);
        }

        // Check if we have all the required keypoints
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
    
        function norm(name) {
          return {
            x: kpMap[name].x / videoWidth,
            y: kpMap[name].y / videoHeight
          };
        }
        
        // Extract normalized keypoints
        const nose = norm("nose");
        const lsho = norm("left_shoulder");
        const rsho = norm("right_shoulder");
        const lear = norm("left_ear");
        const rear = norm("right_ear");
      
        // Calculate midpoint between shoulders
        const msho = {
          x: (lsho.x + rsho.x) / 2,
          y: (lsho.y + rsho.y) / 2
        };
      
        // Calculate features exactly as in the training code
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
      
        // Create feature vector in the same order as training
        const featVec = [
          distNoseShoulders,
          ratioNoseShoulders,
          neckTiltAngle,
          distLeftEarNose,
          distRightEarNose,
          angleLeftShoulder,
          angleRightShoulder
        ];
      
        // Log features for debugging
        if (Math.random() < 0.01) { // Log occasionally to avoid flooding console
          console.log("Feature vector:", featVec);
        }
      
        // Make prediction using the model
        try {
          const xs = tf.tensor2d([featVec], [1, 7]);
          
          // Check if tensor is valid
          if (!xs || xs.shape.length !== 2 || xs.shape[0] !== 1 || xs.shape[1] !== 7) {
            console.error("Invalid feature tensor shape:", xs ? xs.shape : "null");
            xs && xs.dispose();
            return postureScoreRef.current;
          }
          
          // Log tensor values occasionally for debugging
          if (Math.random() < 0.005) {
            console.log("Feature tensor:", xs.arraySync());
          }
          
          // Make prediction
          const output = tfModel.predict(xs);
          
          // Check if output is valid
          if (!output || output.shape.length !== 2 || output.shape[0] !== 1 || output.shape[1] !== 1) {
            console.error("Invalid output tensor shape:", output ? output.shape : "null");
            xs.dispose();
            output && output.dispose();
            return postureScoreRef.current;
          }
          
          // Get prediction value
          const rawVal = output.dataSync()[0];
          
          // Check if prediction is valid
          if (rawVal === undefined || isNaN(rawVal)) {
            console.error("Invalid prediction value:", rawVal);
            xs.dispose();
            output.dispose();
            return postureScoreRef.current;
          }
          
          // If the model is returning all zeros, use a heuristic approach
          if (rawVal === 0) {
            // Calculate a heuristic score based on the features
            // Using the same approach as our fallback model
            
            // 1. Neck tilt score - good posture has neck tilt angle closer to 180
            const neckTiltScore = Math.pow(neckTiltAngle / 180, 1.5) * 100;
            
            // 2. Head position score - based on ratio of nose to shoulders and distance
            // Calculate a baseline distance score - this will detect hunching
            // We want to penalize when distNoseShoulders gets too small (hunching forward)
            let distanceScore = 0;
            if (distNoseShoulders < 0.12) {
              // Very hunched - severe penalty
              distanceScore = Math.max(10, 30 - (distNoseShoulders * 200));
            } else if (distNoseShoulders < 0.18) {
              // Somewhat hunched - moderate penalty
              distanceScore = Math.max(40, 60 - (distNoseShoulders * 150));
            } else if (distNoseShoulders < 0.25) {
              // Good range
              distanceScore = 80 + ((distNoseShoulders - 0.18) * 200);
            } else {
              // Too far - slight penalty for leaning back too much
              distanceScore = Math.max(60, 100 - ((distNoseShoulders - 0.25) * 200));
            }
            
            // Now handle the ratio (which is related but captures different aspects of posture)
            let ratioScore = 0;
            if (ratioNoseShoulders < 0.5) {
              // Good posture range - high score
              ratioScore = 90 - (ratioNoseShoulders * 20);
            } else if (ratioNoseShoulders < 0.7) {
              // Medium posture range - medium score
              ratioScore = 80 - (ratioNoseShoulders * 40);
            } else {
              // Bad posture range - low score
              ratioScore = Math.max(10, 60 - (ratioNoseShoulders * 50));
            }
            
            // Combine distance and ratio scores, with more weight on the distance
            const headPositionScore = (distanceScore * 0.7) + (ratioScore * 0.3);
            
            // 3. Ear-nose distance score
            const earAsymmetry = Math.abs(distLeftEarNose - distRightEarNose);
            const earAvgDist = (distLeftEarNose + distRightEarNose) / 2;
            const earScore = Math.max(0, 100 - (earAsymmetry * 200) - (earAvgDist * 100));
            
            // 4. Shoulder angle score
            const shoulderAngleAvg = (angleLeftShoulder + angleRightShoulder) / 2;
            const shoulderScore = Math.min(100, shoulderAngleAvg * 1.5);
            
            // Combine all scores with weights
            const weightedScore = (
              (neckTiltScore * 0.35) +
              (headPositionScore * 0.45) +
              (earScore * 0.1) +
              (shoulderScore * 0.1)
            );
            
            // Apply stability adjustments
            let heuristicScore = weightedScore;
            if (heuristicScore > 80) {
              heuristicScore = 80 + (heuristicScore - 80) * 0.8;
            } else if (heuristicScore < 50) {
              // Make it easier to improve from bad posture
              heuristicScore = heuristicScore * 1.1;
            }
            
            // Round and clamp the score
            const finalScore = Math.max(10, Math.min(100, Math.round(heuristicScore)));
            
            // Apply smoothing to prevent score from changing too drastically between frames
            const prevScore = postureScoreRef.current;
            let smoothedScore = finalScore;
            
            if (prevScore !== null) {
              // Apply lighter smoothing for bad posture (making it easier to improve quickly)
              // and stronger smoothing for good posture (making it harder to deteriorate)
              const smoothingFactor = finalScore < 50 ? 0.7 : 0.85;
              smoothedScore = Math.round((prevScore * smoothingFactor) + (finalScore * (1 - smoothingFactor)));
            }
            
            // Log that we're using a heuristic
            if (Math.random() < 0.01) {
              console.log("Using heuristic score:", smoothedScore, "due to zero model output", {
                distNoseShoulders,
                ratioNoseShoulders,
                distanceScore,
                ratioScore,
                headPositionScore,
                neckTiltScore,
                earScore,
                shoulderScore,
                weightedScore,
                finalScore,
                smoothedScore
              });
            }
            
            // Clean up tensors
            xs.dispose();
            output.dispose();
            
            // Return the heuristic score
            return smoothedScore;
          }
          
          const intVal = Math.round(rawVal * 100);
          
          // Clamp value to 0-100 range
          const clampedVal = Math.max(0, Math.min(100, intVal));
          
          // Clean up tensors to prevent memory leaks
          xs.dispose();
          output.dispose();
          
          // Apply smoothing to prevent score from changing too drastically between frames
          const prevScore = postureScoreRef.current;
          let smoothedScore = clampedVal;
          
          if (prevScore !== null) {
            // Apply lighter smoothing for bad posture (making it easier to improve quickly)
            // and stronger smoothing for good posture (making it harder to deteriorate)
            const smoothingFactor = clampedVal < 50 ? 0.7 : 0.85;
            smoothedScore = Math.round((prevScore * smoothingFactor) + (clampedVal * (1 - smoothingFactor)));
            
            // Log smoothing occasionally
            if (Math.random() < 0.005) {
              console.log("Smoothing applied:", {
                prevScore,
                newScore: clampedVal,
                smoothingFactor,
                result: smoothedScore
              });
            }
          }
          
          return smoothedScore;
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
        // Draw the pose
        drawPose(poses[0], ctx, videoWidth, videoHeight);
        
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
        
        // Check if model files exist and provide guidance
        await checkModelFiles();
        
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
        
        // Load the posture scoring model
        console.log("Loading posture scoring model...");
        const postureModel = await loadPostureModel();
        if (!postureModel) {
          console.warn("Failed to load posture model, using fallback");
        } else {
          console.log("Posture model loaded successfully");
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Initialization error:", error);
        setError(`Failed to initialize: ${error.message}`);
        setIsLoading(false);
      }
    };

    // Function to check if model files exist and provide guidance
    const checkModelFiles = async () => {
      console.log("Checking for model files...");
      
      // Define paths to check - updated with the correct paths based on our findings
      const modelPaths = [
        '/model/model.json',
        './model/model.json',
        '../model/model.json',
        '../../model/model.json',
        '/public/model/model.json',
        './public/model/model.json',
        '/renderer/public/model/model.json',
        './renderer/public/model/model.json',
        '../renderer/public/model/model.json'
      ];
      
      // Check each path
      let modelFound = false;
      let foundPath = null;
      
      for (const path of modelPaths) {
        try {
          const response = await fetch(path, { method: 'HEAD' });
          if (response.ok) {
            console.log(`Model file found at ${path}`);
            modelFound = true;
            foundPath = path;
            break;
          }
        } catch (e) {
          // Ignore fetch errors
        }
      }
      
      if (!modelFound) {
        // Provide detailed guidance on where to place model files
        const message = `
MODEL FILES NOT FOUND! Please ensure model files are in the correct location:

1. For development mode:
   - Place model.json and model.weights.bin in:
     frontend/zen-frontend/src/renderer/public/model/

2. For production mode:
   - Place model.json and model.weights.bin in:
     frontend/zen-frontend/out/renderer/model/

3. Available model files in your project:
   - /Users/aadibiyani/ZenPosture/frontend/zen-frontend/out/renderer/model/model.json
   - /Users/aadibiyani/ZenPosture/frontend/zen-frontend/src/renderer/public/model/model.json
   - /Users/aadibiyani/ZenPosture/ml/ml-train/model.json
   - /Users/aadibiyani/ZenPosture/ml/ml-test/public/model/model.json

If you're seeing this message, the app will use a fallback model which may not be as accurate.
`;
        console.warn(message);
        setError("Model files not found in expected locations. Using fallback model.");
      } else {
        console.log(`Using model from: ${foundPath}`);
      }
      
      return modelFound;
    };

    const loadPostureModel = async() => {
      try {
        // Simplify model loading with a more direct approach
        console.log("Attempting to load posture model...");
        
        // Define model paths to try in order of preference - updated with the correct paths
        const modelPaths = [
          '/model/model.json',
          './model/model.json',
          '../model/model.json',
          '../../model/model.json',
          '/public/model/model.json',
          './public/model/model.json',
          '/renderer/public/model/model.json',
          './renderer/public/model/model.json',
          '../renderer/public/model/model.json'
        ];
        
        console.log("Will try these model paths:", modelPaths);
        
        // Try each path
        let loadedModel = null;
        let lastError = null;
        
        for (const modelPath of modelPaths) {
          try {
            console.log(`Trying to load model from: ${modelPath}`);
            
            // Attempt to load the model
            loadedModel = await tf.loadLayersModel(modelPath);
            
            if (loadedModel) {
              console.log(`Successfully loaded model from ${modelPath}`);
              setTfModel(loadedModel);
              return loadedModel;
            }
          } catch (e) {
            console.warn(`Failed to load model from ${modelPath}:`, e);
            lastError = e;
          }
        }
        
        // If all paths failed, create a fallback model
        console.warn("All model loading attempts failed, using fallback model");
        if (lastError) {
          console.error("Last error:", lastError);
        }
        
        // Create a simple fallback model with pre-initialized weights
        console.log("Creating a pre-trained fallback model");
        
        // Instead of a complex neural network, create a simple function that maps features to scores
        // This ensures we get reasonable scores even without the trained model
        const fallbackModel = {
          predict: function(tensor) {
            // Get the features from the tensor
            const features = tensor.arraySync()[0];
            
            // Extract key features
            const distNoseShoulders = features[0];  // Lower is better
            const ratioNoseShoulders = features[1]; // Lower is better
            const neckTiltAngle = features[2];      // Higher is better (closer to 180)
            const distLeftEarNose = features[3];    // Lower is better
            const distRightEarNose = features[4];   // Lower is better
            const angleLeftShoulder = features[5];  // Higher is better
            const angleRightShoulder = features[6]; // Higher is better
            
            // Create a more sophisticated scoring system that mimics the trained model
            
            // 1. Neck tilt score - good posture has neck tilt angle closer to 180
            // Scale from 0-100, but make it less sensitive to small changes
            const neckTiltScore = Math.pow(neckTiltAngle / 180, 1.5) * 100;
            
            // 2. Head position score - based on ratio of nose to shoulders
            // Lower ratio is better (head aligned with shoulders)
            // Make this more sensitive to hunching (decreased distance)
            let distanceScore = 0;
            if (distNoseShoulders < 0.12) {
              // Very hunched - severe penalty
              distanceScore = Math.max(10, 30 - (distNoseShoulders * 200));
            } else if (distNoseShoulders < 0.18) {
              // Somewhat hunched - moderate penalty
              distanceScore = Math.max(40, 60 - (distNoseShoulders * 150));
            } else if (distNoseShoulders < 0.25) {
              // Good range
              distanceScore = 80 + ((distNoseShoulders - 0.18) * 200);
            } else {
              // Too far - slight penalty for leaning back too much
              distanceScore = Math.max(60, 100 - ((distNoseShoulders - 0.25) * 200));
            }
            
            // Now handle the ratio (which is related but captures different aspects of posture)
            let ratioScore = 0;
            if (ratioNoseShoulders < 0.5) {
              // Good posture range - high score
              ratioScore = 90 - (ratioNoseShoulders * 20);
            } else if (ratioNoseShoulders < 0.7) {
              // Medium posture range - medium score
              ratioScore = 80 - (ratioNoseShoulders * 40);
            } else {
              // Bad posture range - low score
              ratioScore = Math.max(10, 60 - (ratioNoseShoulders * 50));
            }
            
            // Combine distance and ratio scores, with more weight on the distance
            const headPositionScore = (distanceScore * 0.7) + (ratioScore * 0.3);
            
            // 3. Ear-nose distance score - should be balanced and small
            // Calculate asymmetry and average distance
            const earAsymmetry = Math.abs(distLeftEarNose - distRightEarNose);
            const earAvgDist = (distLeftEarNose + distRightEarNose) / 2;
            
            // Penalize asymmetry and large distances
            const earScore = Math.max(0, 100 - (earAsymmetry * 200) - (earAvgDist * 100));
            
            // 4. Shoulder angle score - higher angles are better
            const shoulderAngleAvg = (angleLeftShoulder + angleRightShoulder) / 2;
            const shoulderScore = Math.min(100, shoulderAngleAvg * 1.5);
            
            // Combine all scores with weights that emphasize head position and neck tilt
            const weightedScore = (
              (neckTiltScore * 0.35) +
              (headPositionScore * 0.45) +
              (earScore * 0.1) +
              (shoulderScore * 0.1)
            );
            
            // Apply a non-linear transformation to make the score less sensitive to small changes
            // This will keep the score from changing too drastically with small posture changes
            let finalScore = weightedScore;
            
            // Add stability - if the score is good (above 80), make it more stable
            if (finalScore > 80) {
              // Good posture is more stable - small changes don't affect it much
              finalScore = 80 + (finalScore - 80) * 0.8;
            } else if (finalScore < 50) {
              // Bad posture is less stable - easier to improve with small changes
              // This makes it easier to recover from bad posture
              finalScore = finalScore * 1.1;
            }
            
            // Ensure the score is in the 0-100 range
            finalScore = Math.max(10, Math.min(100, Math.round(finalScore)));
            
            // Apply smoothing with previous score (this will be applied in calculatePostureScore)
            // The smoothing is handled in the calculatePostureScore function
            
            // Log the calculation occasionally for debugging
            if (Math.random() < 0.01) {
              console.log("Fallback model calculation:", {
                features,
                distNoseShoulders,
                ratioNoseShoulders,
                neckTiltScore,
                distanceScore,
                ratioScore,
                headPositionScore,
                earScore,
                shoulderScore,
                weightedScore,
                finalScore
              });
            }
            
            // Create a tensor with the result
            return tf.tensor2d([[finalScore / 100]]);
          },
          
          // Add a dummy dispose method to match the TensorFlow model API
          dispose: function() {
            console.log("Disposing fallback model");
          }
        };
        
        // Test the fallback model with a range of posture examples
        const testPostures = [
          // Good posture examples
          [0.15, 0.5, 160, 0.2, 0.2, 45, 45],    // Very good posture
          [0.16, 0.52, 155, 0.21, 0.21, 43, 43], // Good posture
          
          // Medium posture examples
          [0.18, 0.6, 140, 0.25, 0.25, 40, 40],  // Medium posture
          [0.20, 0.65, 130, 0.27, 0.27, 38, 38], // Medium-poor posture
          
          // Bad posture examples
          [0.25, 0.8, 120, 0.3, 0.3, 30, 30],    // Poor posture
          [0.28, 0.85, 110, 0.32, 0.32, 25, 25]  // Very poor posture
        ];
        
        // Create test tensors and make predictions
        console.log("Testing fallback model with various posture examples:");
        
        for (let i = 0; i < testPostures.length; i++) {
          const testTensor = tf.tensor2d([testPostures[i]], [1, 7]);
          const prediction = fallbackModel.predict(testTensor);
          const score = Math.round(prediction.dataSync()[0] * 100);
          
          let postureQuality;
          if (i < 2) postureQuality = "Good";
          else if (i < 4) postureQuality = "Medium";
          else postureQuality = "Bad";
          
          console.log(`- ${postureQuality} posture example ${i % 2 + 1}: Score = ${score}`);
          
          // Clean up tensors
          testTensor.dispose();
          prediction.dispose();
        }
        
        console.log("Fallback model created and tested");
        setTfModel(fallbackModel);
        return fallbackModel;
      } catch (error) {
        console.error("Error loading posture model:", error);
        setError(`Failed to load posture model: ${error.message}`);
        return null;
      }
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

  // Add a useEffect to verify model loading
  useEffect(() => {
    if (tfModel) {
      console.log("TensorFlow model is loaded and ready");
      
      // Verify model by making a test prediction
      try {
        // Create a test tensor with sample data that matches the expected format
        // These values represent typical posture features:
        // [distNoseShoulders, ratioNoseShoulders, neckTiltAngle, distLeftEarNose, distRightEarNose, angleLeftShoulder, angleRightShoulder]
        
        // Sample data for different posture qualities
        const goodPostureData = [0.15, 0.5, 160, 0.2, 0.2, 45, 45];   // Good posture example
        const mediumPostureData = [0.18, 0.6, 140, 0.25, 0.25, 40, 40]; // Medium posture example
        const badPostureData = [0.25, 0.8, 120, 0.3, 0.3, 30, 30];    // Bad posture example
        
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
        
        // Check if predictions are reasonable (not all zeros or all the same value)
        const allSame = testValues[0] === testValues[1] && testValues[1] === testValues[2];
        const allZeros = testValues[0] === 0 && testValues[1] === 0 && testValues[2] === 0;
        
        if (allZeros) {
          console.warn("Model verification warning: All predictions are zero");
          setError("Model verification warning: All predictions are zero. Using fallback scoring.");
        } else if (allSame) {
          console.warn("Model verification warning: All predictions have the same value");
          setError("Model verification warning: All predictions have the same value. Using fallback scoring.");
        } else {
          console.log("Model verification successful: Predictions show variation as expected");
          setError(null);
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
                  {/* Remove the duplicate posture score display */}
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