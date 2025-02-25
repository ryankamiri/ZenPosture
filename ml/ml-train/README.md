# Posture Detection Model Training

This directory contains scripts to train a TensorFlow.js model for posture detection based on pose keypoints.

## Data Format

The training data is stored in `posture_data.csv` with the following format:
- `label`: Posture score (0-100, where 100 is perfect posture)
- `videoWidth`, `videoHeight`: Dimensions of the video frame
- Keypoint coordinates: `nose_x`, `nose_y`, `left_eye_inner_x`, etc.

## Features Used

The model uses the following features derived from the keypoints:
1. Distance between nose and shoulders midpoint
2. Ratio of nose-shoulders distance to shoulder width
3. Neck tilt angle
4. Distance between left ear and nose
5. Distance between right ear and nose
6. Angle at left shoulder
7. Angle at right shoulder

## Training the Model

To train the model:

```bash
npm install
node train_node_tfjs.js
```

This will:
1. Read the CSV data
2. Extract features
3. Train a neural network model
4. Save the model in two formats:
   - Locally as `model.json` and `model_weights.json`
   - In the test app directory at `../ml-test/public/model/`

## Testing the Model

To test the model with sample data:

```bash
node test_model.js
```

This will load the trained model and test it with sample posture data.

## Model Architecture

The model is a simple neural network with:
- Input layer: 7 features
- Hidden layer 1: 16 units, ReLU activation
- Hidden layer 2: 16 units, ReLU activation
- Output layer: 1 unit, Sigmoid activation (outputs a value between 0-1)

## Using the Model in the Web App

The model is automatically saved to the test app's public directory. To use it:

1. Start the test app: `cd ../ml-test && npm start`
2. The app will load the model from the `/model/` directory
3. The app uses MediaPipe for pose detection and then feeds the extracted features to the model

## Interpreting the Output

The model outputs a value between 0 and 1, which is then multiplied by 100 to get a posture score:
- 80-100: Good posture
- 50-80: Medium posture
- 0-50: Poor posture

## Retraining

If you want to collect more data or retrain the model:
1. Modify the `posture_data.csv` file with new data
2. Run the training script again 