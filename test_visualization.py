import sys
from app.models.data_processor import DataProcessor
from app.utils.visualization_generator import VisualizationGenerator

def test_visualization_generation():
    try:
        print("Testing data processing...")
        data_processor = DataProcessor()
        print("Data processing successful")
        
        print("\nTesting visualization generation...")
        viz_generator = VisualizationGenerator(data_processor)
        
        print("\nTesting hourly trips visualization...")
        hourly_trips = viz_generator._generate_hourly_trips()
        print("Hourly trips successful")
        
        print("\nTesting daily usage visualization...")
        daily_usage = viz_generator._generate_daily_usage()
        print("Daily usage successful")
        
        print("\nTesting heatmap visualization...")
        heatmap = viz_generator._generate_heatmap()
        print("Heatmap successful")
        
        print("\nTesting station rankings visualization...")
        station_rankings = viz_generator._generate_station_rankings()
        print("Station rankings successful")
        
        print("\nTesting route rankings visualization...")
        route_rankings = viz_generator._generate_route_rankings()
        print("Route rankings successful")
        
        print("\nTesting violin data generation...")
        violin_data = viz_generator._generate_violin_data()
        print("Violin data successful")
        
        print("\nTesting station data generation...")
        station_data = data_processor.get_station_data()
        print("Station data successful")
        
        print("\nAll tests completed successfully!")
        return True
        
    except Exception as e:
        print(f"\nError during testing: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_visualization_generation()
    sys.exit(0 if success else 1) 