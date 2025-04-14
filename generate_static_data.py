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
        
        # Get the visualization data
        visualization_data = {
            'hourly_trips': viz_generator._generate_hourly_trips(),
            'daily_usage': viz_generator._generate_daily_usage(),
            'heatmap': viz_generator._generate_heatmap(),
            'station_rankings': viz_generator._generate_station_rankings(),
            'route_rankings': viz_generator._generate_route_rankings(),
            'violin_data': viz_generator._generate_violin_data()
        }
        
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