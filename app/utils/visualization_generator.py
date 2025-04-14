import plotly.express as px
import altair as alt
import pandas as pd
import json
import os

class VisualizationGenerator:
    def __init__(self, data_processor):
        self.data_processor = data_processor
        self._cached_visualizations = None

    def _generate_hourly_trips(self):
        """Generate hourly trips visualization using Altair."""
        df = self.data_processor.data
        hourly_data = (df.groupby(['hour'], observed=True)
                      .agg(trips=('hour', 'count'))
                      .reset_index()
                      .sort_values('hour'))
        
        # Convert to lists for JSON serialization
        data = {
            'data': [{
                'x': hourly_data['hour'].tolist(),
                'y': hourly_data['trips'].tolist(),
                'type': 'scatter',
                'mode': 'lines+markers',
                'line': {'shape': 'spline', 'width': 3, 'color': '#4C78A8'},
                'marker': {'size': 8, 'opacity': 0.5, 'color': '#4C78A8'}
            }],
            'layout': {
                'title': {
                    'text': 'Total Bike Trips by Hour of Day',
                    'font': {'size': 20}
                },
                'xaxis': {
                    'title': 'Hour of Day',
                    'range': [0, 23]
                },
                'yaxis': {
                    'title': 'Total Number of Trips'
                },
                'width': 800,
                'height': 400,
                'margin': {'t': 50, 'r': 30, 'b': 50, 'l': 60},
                'plot_bgcolor': '#ffffff',
                'paper_bgcolor': '#ffffff'
            }
        }
        return data

    def _generate_daily_usage(self):
        """Generate daily usage visualization using Altair."""
        df = self.data_processor.data
        daily_hourly_trips = (df.groupby(
            ['day_of_week', 'hour', 'member_casual'], 
            observed=True
        ).agg(trips=('hour', 'count')).reset_index())
        
        # Ensure proper day order
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        # Create a list to store traces for each user type
        traces = []
        for user_type in ['member', 'casual']:
            user_data = daily_hourly_trips[daily_hourly_trips['member_casual'] == user_type]
            for day in day_order:
                day_data = user_data[user_data['day_of_week'] == day]
                traces.append({
                    'x': day_data['hour'].tolist(),
                    'y': day_data['trips'].tolist(),
                    'type': 'scatter',
                    'mode': 'lines+markers',
                    'name': user_type.title(),
                    'showlegend': day == day_order[0],  # Show legend only for the first day
                    'line': {
                        'color': '#4C78A8' if user_type == 'member' else '#F58518',
                        'width': 2
                    },
                    'marker': {
                        'size': 6,
                        'opacity': 0.5,
                        'color': '#4C78A8' if user_type == 'member' else '#F58518'
                    },
                    'xaxis': f'x{day_order.index(day) + 1}',
                    'yaxis': f'y{day_order.index(day) + 1}'
                })
        
        # Create layout with subplots
        layout = {
            'title': {
                'text': 'Hourly Trip Distribution by Day and User Type',
                'font': {'size': 20}
            },
            'grid': {
                'rows': 1,
                'columns': 7,
                'pattern': 'independent'
            },
            'showlegend': True,
            'legend': {
                'orientation': 'h',
                'y': 1.1
            },
            'height': 300,
            'margin': {'t': 100, 'r': 10, 'b': 50, 'l': 50}
        }
        
        # Add axis titles and ranges for each subplot
        for i, day in enumerate(day_order, 1):
            layout[f'xaxis{i}'] = {
                'title': day,
                'range': [0, 23]
            }
            if i == 1:
                layout[f'yaxis{i}'] = {'title': 'Number of Trips'}
            else:
                layout[f'yaxis{i}'] = {'showticklabels': False}
        
        return {'data': traces, 'layout': layout}

    def _generate_heatmap(self):
        """Generate trip distribution heatmap using Plotly."""
        df = self.data_processor.data
        
        # Create pivot table for heatmap
        pivot_trips = df.pivot_table(
            index='day_of_week',
            columns='hour',
            values='duration_minutes',
            aggfunc='count',
            observed=True
        ).fillna(0)

        # Ensure proper day order
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        pivot_trips = pivot_trips.reindex(day_order)

        # Convert numpy array to list for JSON serialization
        z_values = pivot_trips.values.tolist()

        # Create the heatmap data structure
        heatmap_data = {
            'data': [{
                'z': z_values,
                'x': list(range(24)),
                'y': day_order,
                'type': 'heatmap',
                'colorscale': 'YlOrRd',
                'hoverongaps': False,
                'hovertemplate': 'Hour: %{x}:00<br>Day: %{y}<br>Trips: %{z}<extra></extra>'
            }],
            'layout': {
                'title': {
                    'text': 'Trip Distribution by Day and Hour',
                    'font': {'size': 20}
                },
                'height': 500,
                'margin': {'t': 50, 'r': 30, 'b': 80, 'l': 120},
                'xaxis': {
                    'title': 'Hour of Day',
                    'tickmode': 'linear',
                    'tick0': 0,
                    'dtick': 1,
                    'ticktext': list(range(24)),
                    'tickvals': list(range(24))
                },
                'yaxis': {
                    'title': 'Day of Week',
                    'tickmode': 'array',
                    'ticktext': day_order,
                    'tickvals': list(range(len(day_order))),
                    'autorange': 'reversed'
                },
                'coloraxis': {
                    'colorbar': {
                        'title': 'Number of Trips',
                        'tickformat': 'd'
                    }
                }
            }
        }
        
        return heatmap_data

    def _generate_station_rankings(self):
        """Generate station rankings visualization using Plotly."""
        df = self.data_processor.data
        station_counts = (df.groupby('start_station_name', observed=True)
                        .agg(count=('start_station_name', 'count'))
                        .reset_index())
        
        top_stations = station_counts.nlargest(10, 'count')
        top_stations['start_station_name'] = top_stations['start_station_name'].apply(self.data_processor.clean_station_name)
        
        # Convert to lists for JSON serialization
        data = {
            'data': [{
                'x': top_stations['count'].tolist(),
                'y': top_stations['start_station_name'].tolist(),
                'type': 'bar',
                'orientation': 'h'
            }],
            'layout': {
                'title': 'Top 10 Most Popular Starting Stations',
                'xaxis': {'title': 'Number of Trips'},
                'yaxis': {
                    'title': 'Station Name',
                    'autorange': 'reversed'
                }
            }
        }
        return data

    def _generate_route_rankings(self):
        """Generate route rankings visualization using Plotly."""
        df = self.data_processor.data
        route_counts = (df.groupby(['start_station_name', 'end_station_name'], observed=True)
                      .agg(count=('start_station_name', 'count'))
                      .reset_index())
        
        top_routes = route_counts.nlargest(10, 'count')
        
        top_routes['start_station_name'] = top_routes['start_station_name'].apply(self.data_processor.clean_station_name)
        top_routes['end_station_name'] = top_routes['end_station_name'].apply(self.data_processor.clean_station_name)
        top_routes['route'] = top_routes['start_station_name'] + ' → ' + top_routes['end_station_name']
        
        # Convert to lists for JSON serialization
        data = {
            'data': [{
                'x': top_routes['count'].tolist(),
                'y': top_routes['route'].tolist(),
                'type': 'bar',
                'orientation': 'h',
                'marker': {
                    'color': top_routes['count'].tolist(),
                    'colorscale': [[0, '#cfe8fc'], [1, '#1e88e5']]
                }
            }],
            'layout': {
                'title': 'Most Popular Bike Routes',
                'xaxis': {'title': 'Number of Trips'},
                'yaxis': {
                    'title': 'Route',
                    'autorange': 'reversed'
                },
                'showlegend': False
            }
        }
        return data

    def _generate_violin_data(self):
        """Generate violin plot for trip durations by user type."""
        df = self.data_processor.data
        
        # Create violin plot data for each user type
        data = []
        colors = {'member': '#4C78A8', 'casual': '#F58518'}
        
        for user_type in ['member', 'casual']:
            user_data = df[df['member_casual'] == user_type]
            
            # Calculate violin plot data
            durations = user_data['duration_minutes'].clip(0, 60)  # Cap at 60 minutes for better visualization
            
            data.append({
                'type': 'violin',
                'x': [user_type.title()] * len(durations),
                'y': durations.tolist(),
                'name': user_type.title(),
                'box': {
                    'visible': True,
                    'width': 0.1
                },
                'line': {
                    'color': colors[user_type],
                },
                'meanline': {
                    'visible': True
                },
                'fillcolor': colors[user_type],
                'opacity': 0.6,
                'points': False,
                'side': 'positive',
                'width': 2,
                'jitter': 0
            })
        
        layout = {
            'title': {
                'text': 'Trip Duration Distribution by User Type',
                'font': {'size': 20}
            },
            'xaxis': {
                'title': 'User Type'
            },
            'yaxis': {
                'title': 'Trip Duration (minutes)',
                'range': [0, 60]
            },
            'height': 500,
            'margin': {'t': 50, 'r': 30, 'b': 50, 'l': 60},
            'showlegend': False,
            'violingap': 0.2,
            'violinmode': 'overlay'
        }
        
        return {'data': data, 'layout': layout}

    def get_all_visualizations(self):
        """Generate and return all visualizations."""
        if self._cached_visualizations is None:
            self._cached_visualizations = {
                'hourly_trips': self._generate_hourly_trips(),
                'daily_usage': self._generate_daily_usage(),
                'heatmap': self._generate_heatmap(),
                'station_rankings': self._generate_station_rankings(),
                'route_rankings': self._generate_route_rankings(),
                'violin_data': self._generate_violin_data(),
                'station_data': self.data_processor.get_station_data()
            }
            
            # Write station data to a separate JSON file for the map
            os.makedirs('static', exist_ok=True)
            with open('static/data.json', 'w') as f:
                json.dump(self._cached_visualizations['station_data'], f)
                
        return self._cached_visualizations 