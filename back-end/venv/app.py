from flask import Flask, request, send_file, jsonify
import os
import io
import shutil
from werkzeug.utils import secure_filename
from flask_cors import CORS
from PIL import Image

import cv2
import os
import pickle
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
from sentence_transformers import SentenceTransformer, util

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Ensure the upload folders exist
UPLOAD_FOLDER = 'uploads'
MODELS_FOLDER = 'captioning_model_files'
FINAL_FOLDER = 'final'
video_path = ''
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(FINAL_FOLDER, exist_ok=True)


# Load the SentenceTransformer model for generating text embeddings
sent_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

def load_models_and_processors(directory):
    with open(os.path.join(directory, "model_raw.pkl"), "rb") as f:
        model = pickle.load(f)
    with open(os.path.join(directory, "image_processor.pkl"), "rb") as f:
        image_processor = pickle.load(f)
    with open(os.path.join(directory, "tokenizer.pkl"), "rb") as f:
        tokenizer = pickle.load(f)
    return model, image_processor, tokenizer

def show_n_generate_offline(frame, greedy, model, image_processor, tokenizer):
    pixel_values = image_processor(frame, return_tensors="pt").pixel_values
    # plt.imshow(np.asarray(frame))
    # plt.show()

    if greedy:
        generated_ids = model.generate(pixel_values, max_new_tokens=30)
    else:
        generated_ids = model.generate(
            pixel_values,
            do_sample=True,
            max_new_tokens=30,
            top_k=5
        )
    generated_text = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return generated_text

model, image_processor, tokenizer = load_models_and_processors(MODELS_FOLDER)

def extract_frames(video_path):
    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    prev_embedding = None
    VideoCaption = ""

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        generated_caption = show_n_generate_offline(frame, False, model, image_processor, tokenizer)
        cap_embedding = sent_model.encode(generated_caption, convert_to_tensor=True)
        generated_caption = generated_caption[0].upper() + generated_caption[1:-1]
        if prev_embedding is not None:
            similarity = util.pytorch_cos_sim(cap_embedding, prev_embedding)[0][0].item()
            if similarity < 0.4:
                VideoCaption += generated_caption + ". "
                print(generated_caption)
        else:
            VideoCaption += generated_caption + ". "
            print(generated_caption)
        
        frame_count += 1
        prev_embedding = cap_embedding

    cap.release()
    return VideoCaption

@app.route('/', methods=['GET'])
def check_health():
    return jsonify({"message": "Good health"}), 200

@app.route('/process-frame', methods=['POST'])
def process_frame():
    if 'frame' not in request.files:
        return jsonify({"message": "No frame part"}), 400
    frame = request.files['frame']
    if frame.filename == '':
        return jsonify({"message": "No selected frame"}), 400

    # Save frame
    frame_path = os.path.join(UPLOAD_FOLDER, 'frame.jpg')
    frame.save(frame_path)

    # Process frame (for demonstration, we just convert it to grayscale)
    image = Image.open(frame_path).convert('L')
    byte_arr = io.BytesIO()
    image.save(byte_arr, format='JPEG')
    byte_arr.seek(0)

    return send_file(byte_arr, mimetype='image/jpeg')

@app.route('/upload-chunk', methods=['POST'])
def upload_chunk():
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    chunk_index = request.form.get('index')
    filename = secure_filename(request.form.get('filename'))
    chunk_filename = f"{filename}.part{chunk_index}"
    chunk_filepath = os.path.join(UPLOAD_FOLDER, chunk_filename)
    file.save(chunk_filepath)

    print(f"Received chunk {chunk_index} of file: {filename}")

    return jsonify({"message": f"Chunk {chunk_index} upload successful"}), 200

@app.route('/reassemble-video', methods=['POST'])
def reassemble_video():
    filename = secure_filename(request.json.get('filename', ''))
    if not filename:
        return jsonify({"message": "No filename provided"}), 400

    chunk_files = sorted([f for f in os.listdir(UPLOAD_FOLDER) if f.startswith(filename)], key=lambda x: int(x.split('part')[-1]))
    if not chunk_files:
        return jsonify({"message": f"No chunks found for filename: {filename}"}), 400

    final_filepath = os.path.join(FINAL_FOLDER, filename)
    with open(final_filepath, 'wb') as final_file:
        for chunk_file in chunk_files:
            chunk_filepath = os.path.join(UPLOAD_FOLDER, chunk_file)
            with open(chunk_filepath, 'rb') as f:
                shutil.copyfileobj(f, final_file, length=16*1024*1024)  # 16MB buffer size to ensure smooth copying

    # Optionally clean up chunk files
    for chunk_file in chunk_files:
        os.remove(os.path.join(UPLOAD_FOLDER, chunk_file))

    print(f"Reassembled video file: {filename} at {final_filepath}")
    global video_path
    video_path = final_filepath
    return jsonify({"message": "Reassemble successful", "filename": filename}), 200

@app.route('/get-big-text', methods=['GET'])
def get_big_text():
    # Return the text you want to display
    vidCap = extract_frames(video_path)
    # big_text = "This is a big text from the Flask backend!"
    return jsonify({"bigText": vidCap})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
