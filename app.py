from flask import Flask, render_template, jsonify, send_from_directory
import os
import json
import pandas as pd
import altair as alt

app = Flask(__name__, 
    static_folder='static',
    template_folder='templates')

@app.route('/')
@app.route('/index.html')
def index():
    return render_template('index.html')

@app.route('/data')
def get_data():
    try:
        with open(os.path.join(app.static_folder, 'data.json'), 'r') as f:
            data = json.load(f)
            return jsonify(data)
    except Exception as e:
        print(f"Error loading data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/daily_usage_chart')
def daily_usage_chart():
    # Create sample data for the chart
    data = {
        'day': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        'trips': [1318, 1487, 1600, 1796, 1852, 863, 1083],
        'type': ['Member'] * 7 + ['Casual'] * 7,
        'trips_casual': [318, 387, 400, 496, 552, 463, 483]
    }
    
    # Create a pandas DataFrame
    df = pd.DataFrame({
        'Day': data['day'] * 2,
        'Trips': data['trips'] + data['trips_casual'],
        'Type': ['Member'] * 7 + ['Casual'] * 7
    })
    
    # Create the Altair chart
    chart = alt.Chart(df).mark_bar().encode(
        x=alt.X('Day:N', 
                sort=['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                axis=alt.Axis(title='Day of Week', labelAngle=0)),
        y=alt.Y('Trips:Q',
                axis=alt.Axis(title='Number of Trips'),
                stack=True),
        color=alt.Color('Type:N',
                       scale=alt.Scale(domain=['Member', 'Casual'],
                                     range=['#1f77b4', '#ff7f0e'])),
        tooltip=[
            alt.Tooltip('Day:N', title='Day'),
            alt.Tooltip('Type:N', title='User Type'),
            alt.Tooltip('Trips:Q', title='Number of Trips')
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
    
    return chart.to_json()

if __name__ == '__main__':
    app.run(debug=True) 