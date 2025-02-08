import './App.css';

import React, { useRef, useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import '@tensorflow/tfjs-backend-webgl';
import Webcam from "react-webcam";


function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const intervalRef = useRef(null);
  const [postureScore, setPostureScore] = useState(100);

  useEffect(() => {
    const runBlazePose = async() => {
      await tf.setBackend("webgl");
      await tf.ready();
      const model = poseDetection.SupportedModels.BlazePose;
      const detectorConfig = {
        runtime: 'tfjs',
        enableSmoothing: true,
        modelType: 'full',
        upperBodyOnly: true
      };
      detectorRef.current = await poseDetection.createDetector(model, detectorConfig);
      intervalRef.current = setInterval(detectPosture, 100);
    };
    runBlazePose();

    return () => {
      clearInterval(intervalRef.current);
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
      tf.dispose();
    };
  }, []);

  const detectPosture = async() => {
    if (typeof webcamRef.current !== "undefined" && webcamRef.current !== null && webcamRef.current.video.readyState === 4) {
      const video = webcamRef.current.video;
      const poses = await detectorRef.current.estimatePoses(video);
    }
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
