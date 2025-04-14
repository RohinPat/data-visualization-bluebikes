import pandas as pd
import os

class DataProcessor:
    def __init__(self):
        self._data = None
        self._load_data()

    def _load_data(self):
        """Load and process the raw data."""
        data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                '202501-bluebikes-tripdata.csv')
        df = pd.read_csv(data_path)
        
        # Process timestamps
        df['started_at'] = pd.to_datetime(df['started_at'])
        df['ended_at'] = pd.to_datetime(df['ended_at'])
        df['duration_minutes'] = (df['ended_at'] - df['started_at']).dt.total_seconds() / 60
        
        # Clean and filter data
        df_clean = df[
            (df['duration_minutes'] >= 1) &
            (df['duration_minutes'] <= 180) &
            (df['member_casual'].isin(['member', 'casual'])) &
            (df['start_station_name'].notna()) &
            (df['end_station_name'].notna()) &
            (df['start_lat'].notna()) &
            (df['start_lng'].notna()) &
            (df['end_lat'].notna()) &
            (df['end_lng'].notna())
        ].copy()
        
        # Add time-based features
        df_clean['hour'] = df_clean['started_at'].dt.hour
        df_clean['day_of_week'] = df_clean['started_at'].dt.day_name()
        
        # Set day order
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        df_clean['day_of_week'] = pd.Categorical(df_clean['day_of_week'], categories=day_order, ordered=True)
        
        # Sample if dataset is too large
        if len(df_clean) > 10000:
            df_clean = df_clean.groupby(['day_of_week', 'member_casual'], observed=True, group_keys=False).apply(
                lambda x: x.sample(n=max(1, int(10000 * len(x) / len(df_clean))), random_state=42)
            )
        
        self._data = df_clean

    @property
    def data(self):
        """Get the processed DataFrame."""
        return self._data

    def clean_station_name(self, name):
        """Clean station names for better display."""
        replacements = {
            '- Cambridge St': '',
            'at Mass Ave': '@ Mass Ave',
            'at Amherst St': '@ Amherst',
            'at Main St': '@ Main',
            'at Vassar St': '@ Vassar',
            'Central Square at Mass Ave': 'Central Square',
            'MIT Stata Center at Vassar St / Main St': 'Stata Center',
            'Central Square at Mass Ave / Essex St': 'Central Square',
            'MIT at Mass Ave / Amherst St': 'MIT Mass Ave',
            'MIT Pacific St at Purrington St': 'MIT Pacific',
            'Linear Park - Mass. Ave. at Cameron Ave.': 'Linear Park',
            'Davis Square': 'Davis Sq',
            'MIT Vassar St': 'Vassar St',
            'Ames St at Main': 'Ames @ Main'
        }
        for old, new in replacements.items():
            name = name.replace(old, new)
        return name.strip()

    def get_station_data(self):
        """Get processed station data for visualization."""
        station_data = (self._data[['start_station_name', 'start_lat', 'start_lng']]
            .dropna(subset=['start_lat', 'start_lng'])
            .groupby('start_station_name')
            .agg({
                'start_lat': 'first',
                'start_lng': 'first',
                'start_station_name': 'count'
            })
            .rename(columns={'start_station_name': 'trips'})
            .reset_index()
        )
        
        station_data = station_data.rename(columns={
            'start_station_name': 'name',
            'start_lat': 'lat',
            'start_lng': 'lng'
        })
        
        station_data['lat'] = station_data['lat'].round(4)
        station_data['lng'] = station_data['lng'].round(4)
        station_data['trips'] = station_data['trips'].astype(int)
        
        return [
            {
                'name': self.clean_station_name(row['name']),
                'lat': row['lat'],
                'lng': row['lng'],
                'trips': row['trips']
            }
            for _, row in station_data.iterrows()
        ] 