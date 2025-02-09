# train_posture_tf.py
import pandas as pd
import numpy as np
import math

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

############################
# 1) Helper Functions
############################

def distance2D(x1, y1, x2, y2):
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)

def angleABC(Ax, Ay, Bx, By, Cx, Cy):
    ABx = Ax - Bx
    ABy = Ay - By
    CBx = Cx - Bx
    CBy = Cy - By
    dot = ABx * CBx + ABy * CBy
    magAB = math.sqrt(ABx**2 + ABy**2)
    magCB = math.sqrt(CBx**2 + CBy**2)
    if magAB == 0 or magCB == 0:
        return 180.0
    cosTheta = dot / (magAB * magCB)
    cosTheta = max(-1, min(1, cosTheta))
    return math.degrees(math.acos(cosTheta))

def safeFloat(val):
    try:
        return float(val)
    except:
        return np.nan

def extract_features(row):
    """Replicate the 7 geometry features from your prior workflow."""
    vw = safeFloat(row["videoWidth"])
    vh = safeFloat(row["videoHeight"])
    if vw <= 0 or vh <= 0:
        return pd.Series({
            "dist_nose_shoulders": np.nan,
            "ratio_noseShoulders": np.nan,
            "neck_tilt_angle": np.nan,
            "dist_leftEar_nose": np.nan,
            "dist_rightEar_nose": np.nan,
            "angle_leftShoulder": np.nan,
            "angle_rightShoulder": np.nan
        })

    def normX(col): return safeFloat(row[col]) / vw
    def normY(col): return safeFloat(row[col]) / vh

    # Key landmarks
    nose_x = normX("nose_x");              nose_y = normY("nose_y")
    lsho_x = normX("left_shoulder_x");     lsho_y = normY("left_shoulder_y")
    rsho_x = normX("right_shoulder_x");    rsho_y = normY("right_shoulder_y")
    lear_x = normX("left_ear_x");          lear_y = normY("left_ear_y")
    rear_x = normX("right_ear_x");         rear_y = normY("right_ear_y")

    msho_x = (lsho_x + rsho_x) / 2.0
    msho_y = (lsho_y + rsho_y) / 2.0

    dist_nose_shoulders = distance2D(nose_x, nose_y, msho_x, msho_y)
    shoulder_width = distance2D(lsho_x, lsho_y, rsho_x, rsho_y)
    ratio_noseShoulders = dist_nose_shoulders / shoulder_width if shoulder_width>0 else np.nan

    neck_tilt_angle = angleABC(lear_x, lear_y, nose_x, nose_y, rear_x, rear_y)
    dist_leftEar_nose = distance2D(lear_x, lear_y, nose_x, nose_y)
    dist_rightEar_nose = distance2D(rear_x, rear_y, nose_x, nose_y)
    angle_leftShoulder = angleABC(lear_x, lear_y, lsho_x, lsho_y, nose_x, nose_y)
    angle_rightShoulder= angleABC(rear_x, rear_y, rsho_x, rsho_y, nose_x, nose_y)

    return pd.Series({
        "dist_nose_shoulders": dist_nose_shoulders,
        "ratio_noseShoulders": ratio_noseShoulders,
        "neck_tilt_angle": neck_tilt_angle,
        "dist_leftEar_nose": dist_leftEar_nose,
        "dist_rightEar_nose": dist_rightEar_nose,
        "angle_leftShoulder": angle_leftShoulder,
        "angle_rightShoulder": angle_rightShoulder
    })

############################
# 2) Main Training Logic
############################
def main():
    # 1) Load your posture data
    df = pd.read_csv("posture_data.csv")
    df["label"] = pd.to_numeric(df["label"], errors="coerce")
    df.dropna(subset=["label"], inplace=True)

    # 2) Extract geometry features
    feat_df = df.apply(extract_features, axis=1)
    df = pd.concat([df, feat_df], axis=1)

    feature_cols = [
        "dist_nose_shoulders", "ratio_noseShoulders", "neck_tilt_angle",
        "dist_leftEar_nose", "dist_rightEar_nose", "angle_leftShoulder",
        "angle_rightShoulder"
    ]
    df.dropna(subset=feature_cols, inplace=True)

    X = df[feature_cols].values
    y = df["label"].values

    # 3) Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # 4) Define a small MLP in Keras
    model = keras.Sequential([
        layers.Input(shape=(7,)),          # 7 features
        layers.Dense(16, activation='relu'),
        layers.Dense(16, activation='relu'),
        layers.Dense(1, activation='linear')  # outputs a single posture score
    ])
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse'
    )

    # 5) Train the model
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=100,
        batch_size=8,
        verbose=1
    )

    # 6) Evaluate
    preds = model.predict(X_test).flatten()
    mse = mean_squared_error(y_test, preds)
    rmse = math.sqrt(mse)
    r2 = r2_score(y_test, preds)

    print(f"Test MSE:  {mse:.2f}")
    print(f"Test RMSE: {rmse:.2f}")
    print(f"Test R^2:  {r2:.3f}")

    # 7) Save the final Keras model
    model.save("model.h5")
    print("Saved model to model.h5")

if __name__ == "__main__":
    main()
