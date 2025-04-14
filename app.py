from flask import Flask, render_template, jsonify, send_from_directory
import os
import json

app = Flask(__name__, 
    static_folder='static',
    template_folder='templates')

@app.route('/')
@app.route('/index.html')
def index():
    return render_template('index.html')

@app.route('/data')
def get_data():
    try:
        with open(os.path.join(app.static_folder, 'data.json'), 'r') as f:
            data = json.load(f)
            return jsonify(data)
    except Exception as e:
        print(f"Error loading data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True) 