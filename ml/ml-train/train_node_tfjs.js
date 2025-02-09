import * as tf from "@tensorflow/tfjs";
import * as fs from "fs";
import Papa from "papaparse";

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

function safeFloat(val) {
  const f = parseFloat(val);
  return isNaN(f) ? null : f;
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

async function train() {
  console.log("Reading CSV...");
  const csvData = fs.readFileSync("posture_data.csv", "utf8");

  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true
  });

  console.log(`Parsed ${parsed.data.length} rows from CSV.`);

  const XData = [];
  const YData = [];

  parsed.data.forEach((row) => {
    const item = extractFeatures(row);
    if (item) {
      XData.push(item.features);
      YData.push(item.label);
    }
  });

  console.log(`After cleaning: ${XData.length} samples.`);

  if (XData.length < 5) {
    console.error("Not enough data to train!");
    return;
  }

  const xs = tf.tensor2d(XData, [XData.length, 7]);
  const ys = tf.tensor1d(YData);

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 16, activation: "relu", inputShape: [7] }));
  model.add(tf.layers.dense({ units: 16, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "linear" }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "meanSquaredError"
  });

  console.log("Fitting model...");
  await model.fit(xs, ys, {
    epochs: 100,
    batchSize: 8,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch}, Loss = ${logs.loss.toFixed(4)}`);
      }
    }
  });

  const modelJson = await model.toJSON();
  fs.writeFileSync("my_tfjs_model.json", JSON.stringify(modelJson));
  console.log("Model JSON saved to my_tfjs_model.json");

  const weights = await model.getWeights();
  const weightData = await Promise.all(weights.map(w => w.data()));
  fs.writeFileSync("my_tfjs_model_weights.json", JSON.stringify(weightData));
  console.log("Model weights saved to my_tfjs_model_weights.json");
}

// Run it
train().then(() => {
  console.log("Done training!");
}).catch((err) => {
  console.error("Error:", err);
});
