import './App.css';

import React, { useRef, useEffect, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import Webcam from "react-webcam";


function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [detector, setDetector] = useState(null);
  const [intervalId, setIntervalId] = useState(null);
  const [postureScore, setPostureScore] = useState(100);

  const model = poseDetection.SupportedModels.BlazePose;
    const detectorConfig = {
      runtime: "mediapipe",
      modelType: "full",
      enableSmoothing: true,
      upperBodyOnly: true,
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/"
    };

  useEffect(() => {
    const runBlazePose = async() => {
      const newDetector = await poseDetection.createDetector(model, detectorConfig);
      setDetector(newDetector);
    };
    runBlazePose();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (detector) {
        detector.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (detector) {
      const id = setInterval(() => {
        detectPosture();
      }, 100);
      setIntervalId(id);
    }
  }, [detector]);

  const detectPosture = async() => {
    if (
      !webcamRef.current ||
      !webcamRef.current.video ||
      webcamRef.current.video.readyState !== 4
    ) {
      return;
    }

    const video = webcamRef.current.video;
    const videoWidth = webcamRef.current.videoWidth;
    const videoHeight = webcamRef.current.videoHeight;
    video.width = videoWidth;
    video.height = videoHeight;

    const poses = await detector.estimatePoses(video);
    if (poses.length > 0) {
      console.log(poses);
      const keypoints = poses[0].keypoints;
      drawPose(keypoints, video);
      const score = calculatePostureScore(keypoints);
      setPostureScore(score);
    }
  };

  const calculatePostureScore = (keypoints) => {
    const leftShoulder = keypoints.find(p => p.name === "left_shoulder");
    const rightShoulder = keypoints.find(p => p.name === "right_shoulder");
    const nose = keypoints.find(p => p.name === "nose");
    const leftEar = keypoints.find(p => p.name === "left_ear");
    const rightEar = keypoints.find(p => p.name === "right_ear");

    let score = 100;

    // Forward Head Posture
    if (nose && leftShoulder && nose.x > leftShoulder.x + 50) {
      score -= 25;
    }

    // Shoulder Misalignment
    if (leftShoulder && rightShoulder && Math.abs(leftShoulder.y - rightShoulder.y) > 20) {
      score -= 15;
    }

    // Head Tilt
    if (leftEar && rightEar && Math.abs(leftEar.y - rightEar.y) > 20) {
      score -= 20;
    }

    return Math.max(score, 0);
  };

  const drawPose = (keypoints, video) => {
    const ctx = canvasRef.current.getContext("2d");
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Match canvas to video size
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    // Clear any previous render
    ctx.clearRect(0, 0, videoWidth, videoHeight);

    // **Mirror the drawing** so it matches the mirrored webcam
    // We'll flip horizontally around the center:
    ctx.save(); // save current state
    ctx.scale(-1, 1); // flip horizontally
    ctx.translate(-videoWidth, 0); // shift back so we can draw in the correct place

    // Draw the skeleton
    drawSkeleton(keypoints, ctx);
    // Draw the keypoints
    drawKeypoints(keypoints, ctx);

    // Restore so future draws aren't flipped
    ctx.restore();
  };

  // Color-coded keypoints (like TF examples)
  const drawKeypoints = (keypoints, ctx) => {
    // BlazePose indices by "side" (left, right, center)
    const keypointIndices = poseDetection.util.getKeypointIndexBySide(
      poseDetection.SupportedModels.BlazePose
    );
    // We'll choose a radius & line width
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
  };

  const drawSkeleton = (keypoints, ctx) => {
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
  };

  const drawCircle = (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>ZenPosture - Upper Body Posture Score: {postureScore}</h1>
        <div style={{ position: "relative", width: 640, height: 480 }}>
          <Webcam 
            mirrored={true}
            ref={webcamRef}
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 0,
              right: 0,
              textAlign: "center",
              zindex: 9,
              width: 640,
              height: 480
            }}
          />

          <canvas
            ref={canvasRef} 
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 0,
              right: 0,
              textAlign: "center",
              zindex: 9,
              width: 640,
              height: 480
            }}
          />
        </div>
      </header>
    </div>
  );
}

export default App;
