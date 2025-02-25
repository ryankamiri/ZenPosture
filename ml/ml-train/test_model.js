import * as tf from "@tensorflow/tfjs";
import * as fs from "fs";

function distance2D(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function angleABC(Ax, Ay, Bx, By, Cx, Cy) {
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

// Function to extract features from a CSV row
function extractFeatures(row) {
  const label = parseFloat(row["label"]);
  if (isNaN(label)) return null;

  const vw = parseFloat(row["videoWidth"]);
  const vh = parseFloat(row["videoHeight"]);
  if (!vw || !vh) return null;

  function normX(col) {
    const v = parseFloat(row[col]);
    return isNaN(v) ? null : v / vw;
  }
  function normY(col) {
    const v = parseFloat(row[col]);
    return isNaN(v) ? null : v / vh;
  }

  const noseX = normX("nose_x");
  const noseY = normY("nose_y");
  const lshoX = normX("left_shoulder_x");
  const lshoY = normY("left_shoulder_y");
  const rshoX = normX("right_shoulder_x");
  const rshoY = normY("right_shoulder_y");
  const learX = normX("left_ear_x");
  const learY = normY("left_ear_y");
  const rearX = normX("right_ear_x");
  const rearY = normY("right_ear_y");

  if (
    noseX == null || noseY == null ||
    lshoX == null || lshoY == null ||
    rshoX == null || rshoY == null ||
    learX == null || learY == null ||
    rearX == null || rearY == null
  ) {
    return null;
  }

  const mshoX = (lshoX + rshoX) / 2;
  const mshoY = (lshoY + rshoY) / 2;

  const dist_nose_shoulders = distance2D(noseX, noseY, mshoX, mshoY);
  const shoulderWidth = distance2D(lshoX, lshoY, rshoX, rshoY);
  const ratio_noseShoulders =
    shoulderWidth > 0 ? dist_nose_shoulders / shoulderWidth : 0;

  const neck_tilt_angle = angleABC(learX, learY, noseX, noseY, rearX, rearY);
  const dist_leftEar_nose = distance2D(learX, learY, noseX, noseY);
  const dist_rightEar_nose = distance2D(rearX, rearY, noseX, noseY);
  const angle_leftShoulder = angleABC(learX, learY, lshoX, lshoY, noseX, noseY);
  const angle_rightShoulder = angleABC(rearX, rearY, rshoX, rshoY, noseX, noseY);

  const features = [
    dist_nose_shoulders,
    ratio_noseShoulders,
    neck_tilt_angle,
    dist_leftEar_nose,
    dist_rightEar_nose,
    angle_leftShoulder,
    angle_rightShoulder
  ];

  return {
    label,
    features
  };
}

async function testModel() {
  console.log("Loading model...");
  
  try {
    // Create a new model with the same architecture as the trained model
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 16, activation: "relu", inputShape: [7] }));
    model.add(tf.layers.dense({ units: 16, activation: "relu" }));
    model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
    
    // Compile the model (required before loading weights)
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: "meanSquaredError"
    });
    
    // Load weights from the saved file
    console.log("Loading weights from model_weights.json...");
    const weightsData = JSON.parse(fs.readFileSync("model_weights.json", "utf8"));
    
    // Get the model's weights
    const modelWeights = model.getWeights();
    
    // Create new tensors with the loaded weights data
    const newWeights = modelWeights.map((w, i) => {
      const data = Array.from(Object.values(weightsData[i]));
      return tf.tensor(data, w.shape);
    });
    
    // Set the weights to the model
    model.setWeights(newWeights);
    console.log("Model weights loaded successfully!");
    
    // Read some sample data from the CSV to get realistic values
    console.log("\nReading sample data from CSV...");
    const csvData = fs.readFileSync("posture_data.csv", "utf8");
    const lines = csvData.split("\n");
    const headers = lines[0].split(",");
    
    // Find rows with different posture scores
    let goodPostureRow = null;
    let mediumPostureRow = null;
    let badPostureRow = null;
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      if (values.length !== headers.length) continue;
      
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j];
      }
      
      const label = parseFloat(row["label"]);
      if (isNaN(label)) continue;
      
      if (label >= 80 && !goodPostureRow) {
        goodPostureRow = row;
      } else if (label >= 50 && label < 80 && !mediumPostureRow) {
        mediumPostureRow = row;
      } else if (label < 50 && !badPostureRow) {
        badPostureRow = row;
      }
      
      if (goodPostureRow && mediumPostureRow && badPostureRow) break;
    }
    
    // Extract features from the sample rows
    const samples = [];
    const labels = [];
    
    if (goodPostureRow) {
      const extracted = extractFeatures(goodPostureRow);
      if (extracted) {
        samples.push(extracted.features);
        labels.push("Good posture (score: " + goodPostureRow.label + ")");
      }
    }
    
    if (mediumPostureRow) {
      const extracted = extractFeatures(mediumPostureRow);
      if (extracted) {
        samples.push(extracted.features);
        labels.push("Medium posture (score: " + mediumPostureRow.label + ")");
      }
    }
    
    if (badPostureRow) {
      const extracted = extractFeatures(badPostureRow);
      if (extracted) {
        samples.push(extracted.features);
        labels.push("Bad posture (score: " + badPostureRow.label + ")");
      }
    }
    
    // Print feature values for debugging
    console.log("Feature values for samples from CSV:");
    for (let i = 0; i < samples.length; i++) {
      console.log(`\n${labels[i]} features:`);
      const featureNames = [
        "dist_nose_shoulders",
        "ratio_noseShoulders",
        "neck_tilt_angle",
        "dist_leftEar_nose",
        "dist_rightEar_nose",
        "angle_leftShoulder",
        "angle_rightShoulder"
      ];
      
      for (let j = 0; j < samples[i].length; j++) {
        console.log(`  ${featureNames[j]}: ${samples[i][j]}`);
      }
    }
    
    // Make predictions
    console.log("\nPredictions:");
    for (let i = 0; i < samples.length; i++) {
      const xs = tf.tensor2d([samples[i]], [1, 7]);
      const prediction = model.predict(xs);
      const score = prediction.dataSync()[0] * 100;
      console.log(`${labels[i]}: Predicted score = ${score.toFixed(1)}`);
      xs.dispose();
      prediction.dispose();
    }
    
    // Clean up
    tf.dispose(model);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run it
testModel().then(() => {
  console.log("\nDone testing!");
}).catch((err) => {
  console.error("Error:", err);
}); 