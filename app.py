import os
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# Use your actual Jibble keys here or in a .env file
CLIENT_ID = os.getenv("JIBBLE_CLIENT_ID", "YOUR_CLIENT_ID")
CLIENT_SECRET = os.getenv("JIBBLE_CLIENT_SECRET", "YOUR_CLIENT_SECRET")
    
break_start_times = {}

def get_token():
    url = "https://identity.jibble.io/connect/token"
    data = {
        'grant_type': 'client_credentials',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'scope': 'jibble.time-attendance'
    }
    res = requests.post(url, data=data)
    return res.json().get('access_token')

@app.route('/track', methods=['POST'])
def track_break():
    student_id = request.json.get('student_id')
    is_starting = request.json.get('is_starting')

    if not student_id or is_starting is None:
        return jsonify({"status": "error", "message": "student_id and is_starting are required"}), 400

    token = get_token()
    if not token:
        return jsonify({"status": "error", "message": "unable to get auth token"}), 500

    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    url = "https://time-attendance-api.jibble.io/v1/entries"
    payload = {
        "personId": student_id,
        "type": "Break" if is_starting else "Resume",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

    response = requests.post(url, json=payload, headers=headers)
    response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {'raw': response.text}

    if is_starting:
        break_start_times[student_id] = datetime.utcnow()
        return jsonify({
            "status": "success",
            "data": {
                "message": "break started",
                "started_at": break_start_times[student_id].isoformat() + 'Z',
                "jibble": response_data
            }
        })

    started_at = break_start_times.pop(student_id, None)
    duration_seconds = None
    duration_human = None

    if started_at:
        duration_seconds = int((datetime.utcnow() - started_at).total_seconds())
        duration_human = f"{duration_seconds // 60}:{str(duration_seconds % 60).zfill(2)}"

    return jsonify({
        "status": "success",
        "data": {
            "message": "break ended",
            "duration_seconds": duration_seconds,
            "duration_human": duration_human,
            "jibble": response_data
        }
    })

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != '' and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(port=5000, debug=True)
