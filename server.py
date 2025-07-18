
from bottle import Bottle, run, static_file, request, response
# import ComNet_Proj as feeder   # assumes ComNet_Proj.py defines read_food_level() and dispense_food()

app = Bottle()

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
    lvl = feeder.read_food_level()
    return {'food_level': lvl}

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
    run(app, host='localhost', port=8080, debug=True)
