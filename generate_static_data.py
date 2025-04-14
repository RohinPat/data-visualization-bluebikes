import pandas as pd
import json
from datetime import datetime
import os

def process_station_data(df):
    # Group by station to get total trips
    station_stats = df.groupby(['start_station_name', 'start_lat', 'start_lng']).size().reset_index(name='total_trips')
    station_stats = station_stats.sort_values('total_trips', ascending=False)
    
    # Convert to list of dictionaries
    stations = []
    for _, row in station_stats.iterrows():
        stations.append({
            'name': row['start_station_name'],
            'latitude': row['start_lat'],
            'longitude': row['start_lng'],
            'total_trips': int(row['total_trips'])
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
    
    return duration_stats.to_dict('records')

def process_hourly_usage(df):
    # Get hourly counts by user type
    df['hour'] = df['started_at'].dt.hour
    df['day_type'] = df['started_at'].dt.dayofweek.apply(lambda x: 'weekend' if x >= 5 else 'weekday')
    
    hourly_usage = df.groupby(['member_casual', 'day_type', 'hour']).size().reset_index(name='count')
    return hourly_usage.to_dict('records')

def process_daily_usage(df):
    # Get daily counts by user type
    df['day_of_week'] = df['started_at'].dt.day_name()
    daily_usage = df.groupby(['member_casual', 'day_of_week']).size().reset_index(name='count')
    return daily_usage.to_dict('records')

def main():
    # Read the CSV file
    print("Reading data file...")
    df = pd.read_csv('202501-bluebikes-tripdata.csv')
    
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
    
    print("Data processing complete!")

if __name__ == '__main__':
    main() 