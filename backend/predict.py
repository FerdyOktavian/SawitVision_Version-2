import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.efficientnet_v2 import preprocess_input
from model_downloader import ensure_model_downloaded


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    ensure_model_downloaded()
)

CLASS_NAMES_PATH = os.path.join(BASE_DIR, "class_names.txt")


def load_class_names():
    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        class_names = [line.strip() for line in f.readlines() if line.strip()]
    return class_names


def load_sawit_model(model_path=None):
    if model_path is None:
        model_path = MODEL_PATH

    print("========== DEBUG MODEL PATH ==========")
    print("BASE_DIR:", BASE_DIR)
    print("MODEL_PATH:", MODEL_PATH)
    print("model_path yang dipakai:", model_path)
    print("MODEL EXISTS:", os.path.exists(model_path))
    print("ISI FOLDER BACKEND:", os.listdir(BASE_DIR))
    print("======================================")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model tidak ditemukan di path: {model_path}")

    model = tf.keras.models.load_model(model_path)
    return model


def predict_image(model, img_path, class_names):
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)

    predictions = model.predict(img_array, verbose=0)[0]

    predicted_index = int(np.argmax(predictions))
    predicted_class = class_names[predicted_index]
    confidence = float(predictions[predicted_index]) * 100

    all_probabilities = {
        class_names[i]: float(predictions[i]) * 100
        for i in range(len(class_names))
    }

    return predicted_class, confidence, all_probabilities