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
    # Get starting trip counts
    start_stats = df.groupby(['start_station_name', 'start_lat', 'start_lng']).size().reset_index(name='start_trips')
    
    # Get ending trip counts
    end_stats = df.groupby(['end_station_name', 'end_lat', 'end_lng']).size().reset_index(name='end_trips')
    
    # Merge start and end stats
    station_stats = start_stats.merge(
        end_stats,
        left_on=['start_station_name', 'start_lat', 'start_lng'],
        right_on=['end_station_name', 'end_lat', 'end_lng'],
        how='outer'
    ).fillna(0)
    
    # Calculate total trips and clean up columns
    station_stats['total_trips'] = station_stats['start_trips'] + station_stats['end_trips']
    station_stats = station_stats.sort_values('total_trips', ascending=False)
    
    # Convert to list of dictionaries
    stations = []
    for _, row in station_stats.iterrows():
        stations.append({
            'name': row['start_station_name'] or row['end_station_name'],
            'lat': float(row['start_lat'] or row['end_lat']),
            'lng': float(row['start_lng'] or row['end_lng']),
            'trips': int(row['total_trips']),
            'start_trips': int(row['start_trips']),
            'end_trips': int(row['end_trips'])
        })
    
    return stations

def process_trip_durations(df):
    # Convert duration to minutes
    df['started_at'] = pd.to_datetime(df['started_at'])
    df['ended_at'] = pd.to_datetime(df['ended_at'])
    df['duration_minutes'] = (df['ended_at'] - df['started_at']).dt.total_seconds() / 60
    
    # Remove trips that are likely data errors
    # - Trips longer than 24 hours
    # - Trips shorter than 1 minute (likely system errors)
    df = df[(df['duration_minutes'] <= 1440) & (df['duration_minutes'] >= 1)]
    
    # Group by user type and hour
    df['hour'] = df['started_at'].dt.hour
    
    # Calculate statistics
    duration_stats = df.groupby(['member_casual', 'hour'])['duration_minutes'].agg([
        'mean',
        'std',
        'count',
        'median',
        'min',
        'max',
        lambda x: x.quantile(0.25),  # Q1
        lambda x: x.quantile(0.75)   # Q3
    ]).reset_index()
    
    # Rename the lambda columns
    duration_stats.columns = ['member_casual', 'hour', 'mean', 'std', 'count', 'median', 'min', 'max', 'q1', 'q3']
    
    # Only include hours with sufficient data points (at least 10 trips)
    duration_stats = duration_stats[duration_stats['count'] >= 10]
    
    # Calculate the interquartile range (IQR)
    duration_stats['iqr'] = duration_stats['q3'] - duration_stats['q1']
    
    # Convert to Python types
    for col in ['mean', 'std', 'median', 'min', 'max', 'q1', 'q3', 'iqr']:
        duration_stats[col] = duration_stats[col].astype(float)
    
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
        index='day_of_week',
        columns='hour',
        values='ride_id',
        aggfunc='count',
        fill_value=0
    )
    
    # Order days from Monday to Sunday
    days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    heatmap_data = heatmap_data.reindex(index=days_order, fill_value=0)
    
    # Ensure all hours are present (0-23)
    all_hours = range(24)
    heatmap_data = heatmap_data.reindex(columns=all_hours, fill_value=0)
    
    # Convert to Python types
    z_data = heatmap_data.values.astype(int).tolist()
    
    return {
        'type': 'heatmap',
        'x': list(range(24)),
        'y': days_order,
        'z': z_data,
        'colorscale': 'Viridis',
        'hoverongaps': False,
        'hovertemplate': 'Hour: %{x}<br>Day: %{y}<br>Trips: %{z}<extra></extra>'
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

def generate_violin_data_raw(df):
    df['started_at'] = pd.to_datetime(df['started_at'])
    df['ended_at'] = pd.to_datetime(df['ended_at'])
    df['duration'] = (df['ended_at'] - df['started_at']).dt.total_seconds() / 60
    df['hour'] = df['started_at'].dt.hour
    # Filter outliers as before
    df = df[(df['duration'] <= 1440) & (df['duration'] >= 1)]
    return df[['member_casual', 'hour', 'duration']].to_dict('records')

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
    durations = generate_violin_data_raw(df)
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
                'title': 'Weekly Trip Patterns by Hour',
                'xaxis': {'title': 'Hour of Day'},
                'yaxis': {'title': 'Day of Week'}
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