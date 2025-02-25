import * as fs from "fs";
import Papa from "papaparse";

function safeFloat(val) {
  const f = parseFloat(val);
  return isNaN(f) ? null : f;
}

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

function extractFeatures(row) {
  const label = safeFloat(row["label"]);
  if (label == null) return null;

  const vw = safeFloat(row["videoWidth"]);
  const vh = safeFloat(row["videoHeight"]);
  if (!vw || !vh) return null;

  function normX(col) {
    const v = safeFloat(row[col]);
    return v == null ? null : v / vw;
  }
  function normY(col) {
    const v = safeFloat(row[col]);
    return v == null ? null : v / vh;
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

function visualizeData() {
  console.log("Reading CSV...");
  const csvData = fs.readFileSync("posture_data.csv", "utf8");

  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true
  });

  console.log(`Parsed ${parsed.data.length} rows from CSV.`);

  // Extract features and labels
  const data = [];
  const labels = [];
  const featureNames = [
    "dist_nose_shoulders",
    "ratio_noseShoulders",
    "neck_tilt_angle",
    "dist_leftEar_nose",
    "dist_rightEar_nose",
    "angle_leftShoulder",
    "angle_rightShoulder"
  ];

  parsed.data.forEach((row) => {
    const item = extractFeatures(row);
    if (item) {
      data.push(item.features);
      labels.push(item.label);
    }
  });

  console.log(`After cleaning: ${data.length} samples.`);

  // Group data by label ranges
  const goodPosture = [];
  const mediumPosture = [];
  const badPosture = [];

  for (let i = 0; i < data.length; i++) {
    if (labels[i] >= 80) {
      goodPosture.push(data[i]);
    } else if (labels[i] >= 50) {
      mediumPosture.push(data[i]);
    } else {
      badPosture.push(data[i]);
    }
  }

  console.log("\nData Distribution:");
  console.log(`Good posture (80-100): ${goodPosture.length} samples`);
  console.log(`Medium posture (50-79): ${mediumPosture.length} samples`);
  console.log(`Bad posture (0-49): ${badPosture.length} samples`);

  // Calculate feature statistics
  console.log("\nFeature Statistics:");
  
  for (let i = 0; i < featureNames.length; i++) {
    const featureValues = data.map(d => d[i]);
    const min = Math.min(...featureValues);
    const max = Math.max(...featureValues);
    const avg = featureValues.reduce((a, b) => a + b, 0) / featureValues.length;
    
    console.log(`\n${featureNames[i]}:`);
    console.log(`  Range: ${min.toFixed(4)} to ${max.toFixed(4)}`);
    console.log(`  Average: ${avg.toFixed(4)}`);
    
    // Feature averages by posture category
    const goodAvg = goodPosture.length > 0 
      ? goodPosture.map(d => d[i]).reduce((a, b) => a + b, 0) / goodPosture.length 
      : 0;
    
    const mediumAvg = mediumPosture.length > 0 
      ? mediumPosture.map(d => d[i]).reduce((a, b) => a + b, 0) / mediumPosture.length 
      : 0;
    
    const badAvg = badPosture.length > 0 
      ? badPosture.map(d => d[i]).reduce((a, b) => a + b, 0) / badPosture.length 
      : 0;
    
    console.log(`  Good posture avg: ${goodAvg.toFixed(4)}`);
    console.log(`  Medium posture avg: ${mediumAvg.toFixed(4)}`);
    console.log(`  Bad posture avg: ${badAvg.toFixed(4)}`);
  }
}

// Run it
visualizeData(); 