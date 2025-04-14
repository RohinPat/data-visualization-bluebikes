from flask import Flask, render_template, jsonify, send_from_directory
from app.models.data_processor import DataProcessor
from app.utils.visualization_generator import VisualizationGenerator
import os

app = Flask(__name__, 
    static_folder='static',
    template_folder='templates')

# Initialize data processor and visualization generator
data_processor = None
viz_generator = None

def init_app():
    global data_processor, viz_generator
    data_processor = DataProcessor()
    viz_generator = VisualizationGenerator(data_processor)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/index.html')
def index_html():
    return render_template('index.html')

@app.route('/data')
def get_data():
    try:
        return jsonify(viz_generator.get_all_visualizations())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# Initialize the app before running
init_app()

if __name__ == '__main__':
    app.run(debug=True) 