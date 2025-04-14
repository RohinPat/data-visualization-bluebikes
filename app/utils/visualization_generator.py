import plotly.express as px
import altair as alt
import pandas as pd

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
        
        base = alt.Chart(hourly_data).encode(
            x=alt.X('hour:Q', 
                    axis=alt.Axis(title='Hour of Day'),
                    scale=alt.Scale(domain=[0, 23])),
            y=alt.Y('trips:Q',
                    axis=alt.Axis(title='Total Number of Trips')),
            tooltip=['hour:Q', 'trips:Q']
        ).properties(
            width=800,
            height=400,
            title=alt.TitleParams(
                'Total Bike Trips by Hour of Day',
                fontSize=20,
                anchor='middle'
            )
        )

        return alt.layer(
            base.mark_line(interpolate='monotone', size=3, color='#4C78A8'),
            base.mark_circle(size=50, opacity=0.5, color='#4C78A8')
        ).configure_view(
            strokeWidth=0
        ).configure_axis(
            grid=True,
            gridColor='#EEEEEE'
        ).configure_title(
            offset=20
        ).to_dict()

    def _generate_daily_usage(self):
        """Generate daily usage visualization using Altair."""
        df = self.data_processor.data
        daily_hourly_trips = (df.groupby(
            ['day_of_week', 'hour', 'member_casual'], 
            observed=True
        ).agg(trips=('hour', 'count')).reset_index())
        
        highlight = alt.selection_point(fields=['member_casual'])
        
        base = alt.Chart(daily_hourly_trips).encode(
            x=alt.X('hour:Q', axis=alt.Axis(title='Hour of Day'), scale=alt.Scale(domain=[0, 23])),
            y=alt.Y('trips:Q', axis=alt.Axis(title='Number of Trips')),
            color=alt.Color('member_casual:N',
                          scale=alt.Scale(domain=['member', 'casual'],
                                        range=['#4C78A8', '#F58518']),
                          title='User Type'),
            opacity=alt.condition(highlight, alt.value(1), alt.value(0.2)),
            tooltip=['hour:Q', 'trips:Q', 'member_casual:N', 'day_of_week:N']
        ).properties(width=140, height=300).add_params(highlight)

        layered = alt.layer(
            base.mark_line(size=2),
            base.mark_circle(size=30, opacity=0.5)
        )

        return layered.facet(
            column=alt.Column('day_of_week:N',
                            sort=['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                            header=alt.Header(labelOrient='top', title=None,
                                           labelPadding=10, labelFontSize=12,
                                           labelColor='#333333'))
        ).properties(
            title=alt.TitleParams('Hourly Trip Distribution by Day and User Type',
                                fontSize=20, fontWeight='normal',
                                color='#333333', anchor='middle', dy=10),
            padding={'left': 50, 'right': 50, 'top': 50, 'bottom': 50}
        ).configure_view(
            strokeWidth=0,
            fill='#ffffff',
            continuousHeight=300,
            continuousWidth=1000
        ).configure_legend(
            titleFontSize=12,
            labelFontSize=11,
            padding=10,
            cornerRadius=5,
            orient='top',
            offset=0
        ).configure_header(
            labelOrient='bottom',
            labelPadding=10
        ).configure_facet(
            spacing=10
        ).to_dict()

    def _generate_heatmap(self):
        """Generate trip distribution heatmap using Plotly."""
        df = self.data_processor.data
        pivot_trips = df.pivot_table(
            index='day_of_week',
            columns='hour',
            values='duration_minutes',
            aggfunc='count',
            observed=True
        ).fillna(0)

        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        pivot_trips = pivot_trips.reindex(day_order)

        heatmap = px.imshow(
            pivot_trips,
            labels=dict(x='Hour of Day', y='Day of Week', color='Number of Trips'),
            title='Trip Distribution by Day and Hour',
            color_continuous_scale='YlOrRd',
            aspect='auto'
        )
        
        heatmap.update_layout(
            height=500,
            margin=dict(t=50, r=30, b=80, l=120),
            xaxis=dict(
                title='Hour of Day',
                tickmode='linear',
                tick0=0,
                dtick=1,
                ticktext=list(range(24)),
                tickvals=list(range(24))
            ),
            yaxis=dict(
                title='Day of Week',
                tickmode='array',
                ticktext=day_order,
                tickvals=list(range(len(day_order))),
                autorange='reversed'
            ),
            coloraxis_colorbar=dict(
                title='Number of Trips',
                tickformat='d'
            )
        )
        
        return heatmap.to_dict()

    def _generate_station_rankings(self):
        """Generate station rankings visualization using Plotly."""
        df = self.data_processor.data
        station_counts = (df.groupby('start_station_name', observed=True)
                        .agg(count=('start_station_name', 'count'))
                        .reset_index())
        
        top_stations = station_counts.nlargest(10, 'count')
        top_stations['start_station_name'] = top_stations['start_station_name'].apply(self.data_processor.clean_station_name)
        
        return px.bar(
            x=top_stations['count'],
            y=top_stations['start_station_name'],
            orientation='h',
            title='Top 10 Most Popular Starting Stations',
            labels={'x': 'Number of Trips', 'y': 'Station Name'}
        ).update_layout(
            xaxis=dict(constrain='domain', scaleanchor=None),
            yaxis=dict(
                constrain='domain',
                scaleanchor=None,
                autorange='reversed'
            )
        ).to_dict()

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
        
        return px.bar(
            top_routes,
            x='count',
            y='route',
            orientation='h',
            title='Most Popular Bike Routes',
            labels={'count': 'Number of Trips', 'route': 'Route'},
            color='count',
            color_continuous_scale=['#cfe8fc', '#1e88e5']
        ).update_layout(
            xaxis=dict(constrain='domain', scaleanchor=None),
            yaxis=dict(
                constrain='domain',
                scaleanchor=None,
                autorange='reversed'
            ),
            coloraxis_showscale=False
        ).to_dict()

    def _generate_violin_data(self):
        """Generate violin plot data."""
        df = self.data_processor.data
        
        # Create a new column for time period
        df['period'] = pd.cut(
            df['hour'],
            bins=[0, 5, 12, 17, 22, 24],
            labels=['Night', 'Morning', 'Afternoon', 'Evening', 'Night'],
            right=False,
            ordered=False  # Allow duplicate labels since we have two 'Night' periods
        )
        
        # Group by period and user type, then aggregate durations
        violin_data = {}
        for period in ['Morning', 'Afternoon', 'Evening', 'Night']:
            period_data = df[df['period'] == period]
            violin_data[period] = {
                'member': period_data[period_data['member_casual'] == 'member']['duration_minutes'].tolist(),
                'casual': period_data[period_data['member_casual'] == 'casual']['duration_minutes'].tolist()
            }

        return violin_data

    def get_all_visualizations(self):
        """Get all visualizations, using cache if available."""
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
        return self._cached_visualizations 