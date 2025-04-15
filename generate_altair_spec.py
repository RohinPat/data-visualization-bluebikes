import altair as alt
import pandas as pd
import json

# Read the existing data from daily_usage.json
with open('static/daily_usage.json', 'r') as f:
    existing_data = json.load(f)

# Create DataFrame from the existing data
df = pd.DataFrame(existing_data['data'])

# Create Altair chart
chart = alt.Chart(df).mark_bar().encode(
    x=alt.X('day_of_week:N', 
            sort=['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            axis=alt.Axis(title='Day of Week', labelAngle=0)),
    y=alt.Y('count:Q',
            axis=alt.Axis(title='Number of Trips'),
            stack=True),
    color=alt.Color('type:N',
                   scale=alt.Scale(domain=['Member', 'Casual'],
                                 range=['#1f77b4', '#ff7f0e'])),
    tooltip=[
        alt.Tooltip('day_of_week:N', title='Day'),
        alt.Tooltip('type:N', title='User Type'),
        alt.Tooltip('count:Q', title='Number of Trips', format=',')
    ]
).properties(
    width='container',
    height=400,
    title={
        'text': 'Daily Trip Distribution by User Type',
        'fontSize': 20,
        'anchor': 'middle'
    }
).configure_view(
    strokeWidth=0
).configure_axis(
    labelFontSize=12,
    titleFontSize=14
).configure_legend(
    titleFontSize=14,
    labelFontSize=12
)

# Save the chart specification and data
output = {
    'data': df.to_dict(orient='records'),
    'spec': chart.to_dict()
}

with open('static/daily_usage.json', 'w') as f:
    json.dump(output, f, indent=2) 