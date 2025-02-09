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

  const [collectedData, setCollectedData] = useState([]);
  const [currentLabel, setCurrentLabel] = useState(100);

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
      // const id = setInterval(() => {
      //   detectPosture();
      // }, 100);
      // setIntervalId(id);
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
      // const keypoints = poses[0].keypoints;
      const keypoints = poses[0].keypoints.filter(kp => kp.score > 0.5);
      const record = {
        label: currentLabel,
        timestamp: Date.now(),
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        keypoints: keypoints.map(kp => ({
          name: kp.name,
          x: kp.x,
          y: kp.y,
          score: kp.score
        }))
      };
      setCollectedData(prev => [...prev, record]);

      // drawPose(keypoints, video);
      // const score = calculatePostureScore(keypoints);
      // setPostureScore(score);
    }
  };

  const handleExportCSV = () => {
    if (collectedData.length === 0) return;

    // 3A) Convert each record to a row of CSV
    // Example: We'll store the label, video dims, plus each keypoint x,y
    // [name_x, name_y ... repeated for each known keypoint? Or do it dynamically?]
    // This can be as simple or advanced as you want.

    // 3B) First, define all possible keypoint names we care about:
    const keypointNames = [
      "nose", "left_eye_inner", "left_eye", "left_eye_outer",
      "right_eye_inner", "right_eye", "right_eye_outer",
      "left_ear", "right_ear", "mouth_left", "mouth_right",
      "left_shoulder", "right_shoulder"
    ];

    // 3C) Write a header row
    // We'll do: label, videoWidth, videoHeight, then for each kpName => [x,y]
    let header = ["label", "videoWidth", "videoHeight"];
    keypointNames.forEach(kp => {
      header.push(`${kp}_x`, `${kp}_y`);
    });

    const rows = [];
    rows.push(header.join(",")); // CSV header

    // 3D) For each record, build a row of data
    collectedData.forEach(record => {
      const row = [];
      // Start with label, video dims
      row.push(record.label);
      row.push(record.videoWidth);
      row.push(record.videoHeight);

      // Build a map of name->(x,y)
      const kpMap = {};
      record.keypoints.forEach(kp => {
        kpMap[kp.name] = { x: kp.x, y: kp.y };
      });

      // For each keypoint name in the official list, push x,y or blank
      keypointNames.forEach(kpName => {
        if (kpMap[kpName]) {
          row.push(kpMap[kpName].x.toFixed(2));
          row.push(kpMap[kpName].y.toFixed(2));
        } else {
          row.push(""); // blank
          row.push("");
        }
      });

      rows.push(row.join(","));
    });

    // 3E) Create a blob and download
    const csvString = rows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "posture_data.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  

  const drawPose = (keypoints, video) => {
    const ctx = canvasRef.current.getContext("2d");
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-videoWidth, 0);

    drawSkeleton(keypoints, ctx);
    drawKeypoints(keypoints, ctx);

    ctx.restore();
  };

  const drawKeypoints = (keypoints, ctx) => {
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
        <div>
          <input
            type="text"
            value={currentLabel}
            onChange={(e) => setCurrentLabel(e.target.value)}
            style={{ width: 200, padding: 5 }}
          />
            <button onClick={detectPosture}>Capture Pose</button>
            <button onClick={handleExportCSV}>Export CSV</button>
          </div>

          <p>Collected: {collectedData.length} samples</p>
      </header>
    </div>
  );
}

export default App;
