# This file makes the app directory a Python package 

from app.models.data_processor import DataProcessor
from app.utils.visualization_generator import VisualizationGenerator

def load_and_process_data():
    data_processor = DataProcessor()
    return data_processor

def generate_visualizations(data_processor):
    viz_generator = VisualizationGenerator(data_processor)
    return viz_generator 