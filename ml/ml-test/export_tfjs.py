# export_tfjs.py
import tensorflow as tf
import tensorflowjs as tfjs

# 1) Load your Keras model
model = tf.keras.models.load_model("model.h5")

# 2) Export to TF.js format
#    This creates a folder "tfjs_posture_model" with model.json + .bin shards
tfjs.converters.save_keras_model(model, "tfjs_posture_model")
print("Exported to tfjs_posture_model/")
