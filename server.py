
from bottle import Bottle, run, static_file, request, response
import client as feeder   # assumes ComNet_Proj.py defines read_food_level() and dispense_food()

app = Bottle()

latest_food_level = {'value': 20.0}

# 1) Serve static files
@app.route('/')
def index():
    return static_file('index.html', root='./public')

@app.route('/<filename>')
def assets(filename):
    return static_file(filename, root='./public')

# 2) API: get current food level
@app.get('/api/status')
def status():
    return {'food_level': latest_food_level['value']}

@app.post('/api/set-level')
def set_food_level():
    data = request.json
    if not data or 'level' not in data:
        response.status = 400
        return {'error': 'Missing field "level"'}

    try:
        level = float(data['level'])
        latest_food_level['value'] = level
        return {'status': 'ok', 'received_level': level}
    except ValueError:
        response.status = 400
        return {'error': 'Invalid level format (must be a number)'}
    
# 3) API: manual dispense
@app.post('/api/dispense')
def dispense():
    data = request.json or {}
    portion = data.get('portion')
    if portion is not None:
        feeder.dispense_food(portion)
    else:
        feeder.dispense_food()
    response.status = 204
    return

if __name__ == '__main__':
    run(app, host='10.132.58.22', port=8080, debug=True)
