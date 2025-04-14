import pandas as pd
import json
from datetime import datetime
import os
import numpy as np

def convert_to_python_types(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        # Convert NaN to None
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_to_python_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_python_types(item) for item in obj]
    return obj

def process_station_data(df):
    # Group by station to get total trips
    station_stats = df.groupby(['start_station_name', 'start_lat', 'start_lng']).size().reset_index(name='total_trips')
    station_stats = station_stats.sort_values('total_trips', ascending=False)
    
    # Convert to list of dictionaries
    stations = []
    for _, row in station_stats.iterrows():
        stations.append({
            'name': row['start_station_name'],
            'lat': float(row['start_lat']),
            'lng': float(row['start_lng']),
            'trips': int(row['total_trips'])
        })
    
    return stations

def process_trip_durations(df):
    # Convert duration to minutes
    df['started_at'] = pd.to_datetime(df['started_at'])
    df['ended_at'] = pd.to_datetime(df['ended_at'])
    df['duration_minutes'] = (df['ended_at'] - df['started_at']).dt.total_seconds() / 60
    
    # Group by user type and hour
    df['hour'] = df['started_at'].dt.hour
    duration_stats = df.groupby(['member_casual', 'hour'])['duration_minutes'].agg(['mean', 'std']).reset_index()
    
    # Fill NaN values with 0 for mean and std
    duration_stats['mean'] = duration_stats['mean'].fillna(0)
    duration_stats['std'] = duration_stats['std'].fillna(0)
    
    # Convert to Python types
    duration_stats['mean'] = duration_stats['mean'].astype(float)
    duration_stats['std'] = duration_stats['std'].astype(float)
    
    return duration_stats.to_dict('records')

def process_hourly_usage(df):
    # Get hourly counts by user type
    df['hour'] = df['started_at'].dt.hour
    df['day_type'] = df['started_at'].dt.dayofweek.apply(lambda x: 'weekend' if x >= 5 else 'weekday')
    
    hourly_usage = df.groupby(['member_casual', 'day_type', 'hour']).size().reset_index(name='count')
    hourly_usage['count'] = hourly_usage['count'].astype(int)
    return hourly_usage.to_dict('records')

def process_daily_usage(df):
    # Get daily counts by user type
    df['day_of_week'] = df['started_at'].dt.day_name()
    daily_usage = df.groupby(['member_casual', 'day_of_week']).size().reset_index(name='count')
    daily_usage['count'] = daily_usage['count'].astype(int)
    return daily_usage.to_dict('records')

def generate_heatmap_data(df):
    # Create a pivot table for the heatmap
    df['day_of_week'] = df['started_at'].dt.day_name()
    df['hour'] = df['started_at'].dt.hour
    
    # Create the pivot table with all hours
    heatmap_data = df.pivot_table(
        index='hour',
        columns='day_of_week',
        values='ride_id',
        aggfunc='count',
        fill_value=0
    )
    
    # Ensure all hours are present (0-23)
    all_hours = pd.DataFrame(index=range(24))
    heatmap_data = all_hours.join(heatmap_data).fillna(0)
    
    # Reorder columns to match the expected format
    days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    heatmap_data = heatmap_data.reindex(columns=days_order, fill_value=0)
    
    # Convert to Python types and transpose the data for proper visualization
    z_data = heatmap_data.values.astype(int).tolist()
    
    return {
        'type': 'heatmap',
        'x': days_order,
        'y': list(range(24)),
        'z': z_data,
        'colorscale': 'Viridis',
        'hoverongaps': False,
        'hovertemplate': 'Day: %{x}<br>Hour: %{y}<br>Trips: %{z}<extra></extra>'
    }

def generate_daily_usage_data(df):
    # Get daily counts
    daily_counts = df.groupby(df['started_at'].dt.day_name()).size()
    days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    # Convert to Python types
    y_data = [int(daily_counts.get(day, 0)) for day in days_order]
    
    return {
        'type': 'bar',
        'x': [day[:3] for day in days_order],
        'y': y_data,
        'marker': {'color': 'rgb(55, 83, 109)'}
    }

def generate_hourly_trips_data(df):
    # Get hourly counts
    hourly_counts = df.groupby(df['started_at'].dt.hour).size()
    
    # Convert to Python types
    y_data = [int(hourly_counts.get(hour, 0)) for hour in range(24)]
    
    return {
        'type': 'scatter',
        'mode': 'lines',
        'x': list(range(24)),
        'y': y_data,
        'line': {'color': 'rgb(55, 83, 109)'}
    }

def generate_violin_data(df):
    # Get duration data
    durations = (df['ended_at'] - df['started_at']).dt.total_seconds() / 60
    
    # Convert to Python types
    y_data = durations.astype(float).tolist()
    
    return {
        'type': 'violin',
        'y': y_data,
        'box': {'visible': True},
        'line': {'color': 'black'},
        'fillcolor': 'rgb(55, 83, 109)',
        'opacity': 0.6
    }

def main():
    # Read the CSV file
    print("Reading data file...")
    df = pd.read_csv('202501-bluebikes-tripdata.csv')
    
    # Randomly sample 10,000 cases while preserving the distribution of member_casual
    print("Sampling data...")
    df = df.groupby('member_casual', group_keys=False).apply(
        lambda x: x.sample(min(len(x), int(10000 * len(x) / len(df))))
    ).reset_index(drop=True)
    
    # Convert date columns to datetime
    df['started_at'] = pd.to_datetime(df['started_at'])
    df['ended_at'] = pd.to_datetime(df['ended_at'])
    
    # Create static directory if it doesn't exist
    if not os.path.exists('static'):
        os.makedirs('static')
    
    # Process and save station data
    print("Processing station data...")
    stations = process_station_data(df)
    with open('static/stations.json', 'w') as f:
        json.dump(stations, f)
    
    # Process and save trip duration data
    print("Processing trip duration data...")
    durations = process_trip_durations(df)
    with open('static/durations.json', 'w') as f:
        json.dump(durations, f)
    
    # Process and save hourly usage data
    print("Processing hourly usage data...")
    hourly_usage = process_hourly_usage(df)
    with open('static/hourly_usage.json', 'w') as f:
        json.dump(hourly_usage, f)
    
    # Process and save daily usage data
    print("Processing daily usage data...")
    daily_usage = process_daily_usage(df)
    with open('static/daily_usage.json', 'w') as f:
        json.dump(daily_usage, f)
    
    # Generate data.js file
    print("Generating data.js...")
    data = {
        'station_data': stations,
        'heatmap': {
            'data': [generate_heatmap_data(df)],
            'layout': {
                'title': 'Weekly Trip Patterns',
                'xaxis': {'title': 'Day of Week'},
                'yaxis': {'title': 'Hour of Day'}
            }
        },
        'daily_usage': {
            'data': [generate_daily_usage_data(df)],
            'layout': {
                'title': 'Daily Trip Distribution',
                'xaxis': {'title': 'Day of Week'},
                'yaxis': {'title': 'Number of Trips'}
            }
        },
        'hourly_trips': {
            'data': [generate_hourly_trips_data(df)],
            'layout': {
                'title': 'Hourly Trip Distribution',
                'xaxis': {'title': 'Hour of Day'},
                'yaxis': {'title': 'Number of Trips'}
            }
        },
        'violin_data': {
            'data': [generate_violin_data(df)],
            'layout': {
                'title': 'Trip Duration Distribution',
                'yaxis': {'title': 'Duration (minutes)'}
            }
        },
        'station_rankings': {
            'data': [{
                'type': 'bar',
                'x': [s['name'] for s in stations[:10]],
                'y': [s['trips'] for s in stations[:10]],
                'marker': {'color': 'rgb(55, 83, 109)'}
            }],
            'layout': {
                'title': 'Top 10 Most Used Stations',
                'xaxis': {'title': 'Station'},
                'yaxis': {'title': 'Number of Trips'}
            }
        }
    }
    
    # Convert all NumPy types to Python types
    data = convert_to_python_types(data)
    
    # Write data.js file
    with open('static/data.js', 'w') as f:
        f.write('const visualizationData = ')
        json.dump(data, f, indent=2)
        f.write(';')
    
    print("Data processing complete!")

if __name__ == '__main__':
    main() 