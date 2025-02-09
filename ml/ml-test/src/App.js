import './App.css';

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import Webcam from "react-webcam";


function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [tfModel, setTfModel] = useState(null);

  const [detector, setDetector] = useState(null);
  const [postureScore, setPostureScore] = useState(100);

  // const [collectedData, setCollectedData] = useState([]);
  // const [currentLabel, setCurrentLabel] = useState(100);

  const model = poseDetection.SupportedModels.BlazePose;

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
    // if (Math.abs(intVal - postureScore) > 15) {
    //   return intVal;
    // }
    // return postureScore;
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
      // const keypoints = poses[0].keypoints.filter(kp => kp.score > 0.5);
      // const record = {
      //   label: currentLabel,
      //   timestamp: Date.now(),
      //   videoWidth: video.videoWidth,
      //   videoHeight: video.videoHeight,
      //   keypoints: keypoints.map(kp => ({
      //     name: kp.name,
      //     x: kp.x,
      //     y: kp.y,
      //     score: kp.score
      //   }))
      // };
      // setCollectedData(prev => [...prev, record]);

      const keypoints = poses[0].keypoints;
      await drawPose(keypoints, video);
      const score = await calculatePostureScore(keypoints, videoWidth, videoHeight);
      setPostureScore(score);
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

  // const handleExportCSV = () => {
  //   if (collectedData.length === 0) return;

  //   // 3A) Convert each record to a row of CSV
  //   // Example: We'll store the label, video dims, plus each keypoint x,y
  //   // [name_x, name_y ... repeated for each known keypoint? Or do it dynamically?]
  //   // This can be as simple or advanced as you want.

  //   // 3B) First, define all possible keypoint names we care about:
  //   const keypointNames = [
  //     "nose", "left_eye_inner", "left_eye", "left_eye_outer",
  //     "right_eye_inner", "right_eye", "right_eye_outer",
  //     "left_ear", "right_ear", "mouth_left", "mouth_right",
  //     "left_shoulder", "right_shoulder"
  //   ];

  //   // 3C) Write a header row
  //   // We'll do: label, videoWidth, videoHeight, then for each kpName => [x,y]
  //   let header = ["label", "videoWidth", "videoHeight"];
  //   keypointNames.forEach(kp => {
  //     header.push(`${kp}_x`, `${kp}_y`);
  //   });

  //   const rows = [];
  //   rows.push(header.join(",")); // CSV header

  //   // 3D) For each record, build a row of data
  //   collectedData.forEach(record => {
  //     const row = [];
  //     // Start with label, video dims
  //     row.push(record.label);
  //     row.push(record.videoWidth);
  //     row.push(record.videoHeight);

  //     // Build a map of name->(x,y)
  //     const kpMap = {};
  //     record.keypoints.forEach(kp => {
  //       kpMap[kp.name] = { x: kp.x, y: kp.y };
  //     });

  //     // For each keypoint name in the official list, push x,y or blank
  //     keypointNames.forEach(kpName => {
  //       if (kpMap[kpName]) {
  //         row.push(kpMap[kpName].x.toFixed(2));
  //         row.push(kpMap[kpName].y.toFixed(2));
  //       } else {
  //         row.push(""); // blank
  //         row.push("");
  //       }
  //     });

  //     rows.push(row.join(","));
  //   });

  //   // 3E) Create a blob and download
  //   const csvString = rows.join("\n");
  //   const blob = new Blob([csvString], { type: "text/csv" });
  //   const url = window.URL.createObjectURL(blob);

  //   const link = document.createElement("a");
  //   link.href = url;
  //   link.download = "posture_data.csv";
  //   link.click();
  //   window.URL.revokeObjectURL(url);
  // };

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
        {/* <div>
          <input
            type="text"
            value={currentLabel}
            onChange={(e) => setCurrentLabel(e.target.value)}
            style={{ width: 200, padding: 5 }}
          />
            <button onClick={detectPosture}>Capture Pose</button>
            <button onClick={handleExportCSV}>Export CSV</button>
          </div>

          <p>Collected: {collectedData.length} samples</p> */}
      </header>
    </div>
  );
}

export default App;
