from app import load_and_process_data, generate_visualizations
import json
import os
import sys

def generate_static_data():
    try:
        # Create static directory if it doesn't exist
        os.makedirs('static', exist_ok=True)
        
        # Load and process data
        data_processor = load_and_process_data()
        
        # Generate visualizations
        viz_generator = generate_visualizations(data_processor)
        
        # Get all visualizations using the cached version
        visualization_data = viz_generator.get_all_visualizations()
        
        # Remove station_data as it's written to a separate file
        visualization_data.pop('station_data', None)
        
        # Write to static/data.js
        with open('static/data.js', 'w') as f:
            f.write('const visualizationData = ')
            json.dump(visualization_data, f, indent=2)
            f.write(';')
        
        print("Successfully generated static data")
        return True
    except Exception as e:
        print(f"Error generating static data: {str(e)}", file=sys.stderr)
        return False

if __name__ == '__main__':
    success = generate_static_data()
    sys.exit(0 if success else 1) 