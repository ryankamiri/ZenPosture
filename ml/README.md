# ZenPosture ML Model

This directory contains the machine learning components of the ZenPosture application.

## Directory Structure

- `ml-train/`: Scripts and data for training the posture detection model
- `ml-test/`: React application for testing the model in a web environment

## Posture Detection Model

The posture detection model uses TensorFlow.js to analyze body keypoints detected by MediaPipe and predict a posture score from 0-100.

### Features

The model uses 7 key features derived from body keypoints:
1. Distance between nose and shoulders midpoint
2. Ratio of nose-shoulders distance to shoulder width
3. Neck tilt angle
4. Distance between left ear and nose
5. Distance between right ear and nose
6. Angle at left shoulder
7. Angle at right shoulder

### Training

To train the model:

```bash
cd ml-train
npm install
npm run all  # Runs visualization, training, and testing
```

Individual steps can be run with:
- `npm run visualize`: Analyze the data distribution
- `npm run train`: Train the model
- `npm run test`: Test the model with sample data

### Testing

The test application demonstrates the model in action:

```bash
cd ml-test
npm install
npm start
```

This will start a React application that:
1. Accesses your webcam
2. Detects body keypoints using MediaPipe
3. Feeds the keypoints to the trained model
4. Displays your posture score in real-time

## Model Performance

The model is trained on labeled posture data with scores from 0-100:
- 80-100: Good posture
- 50-80: Medium posture
- 0-50: Poor posture

## Integration

To integrate the model into the main application:
1. Train the model using the scripts in `ml-train/`
2. Copy the model files (`model.json` and `model_weights.json`) to the appropriate public directory
3. Use the code in `ml-test/src/App.js` as a reference for implementation 