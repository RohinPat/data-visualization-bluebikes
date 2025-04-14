from flask import Flask, render_template, jsonify
from app.models.data_processor import DataProcessor
from app.utils.visualization_generator import VisualizationGenerator

app = Flask(__name__)

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

if __name__ == '__main__':
    init_app()
    app.run(debug=True) 