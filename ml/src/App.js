import './App.css';

import React, { useRef, useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import '@tensorflow/tfjs-backend-webgl';
import Webcam from "react-webcam";


function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [detector, setDetector] = useState(null);
  const [intervalId, setIntervalId] = useState(null);
  const [postureScore, setPostureScore] = useState(100);

  const model = poseDetection.SupportedModels.BlazePose;
    const detectorConfig = {
      runtime: 'tfjs',
      enableSmoothing: true,
      modelType: 'full'
    };

  useEffect(() => {
    const runBlazePose = async() => {
      await tf.setBackend("webgl");
      await tf.ready();
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
      tf.dispose();
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
      drawResult(keypoints, video);
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

  const drawResult = (keypoints, video) => {
    const ctx = canvasRef.current.getContext("2d");
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    ctx.clearRect(0, 0, videoWidth, videoHeight);

    keypoints.forEach((kp) => {
      // If a keypoint has a low confidence score, skip drawing it
      if (kp.score > 0.4) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
      }
    });
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
