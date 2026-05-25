from flask import Flask, render_template, request, jsonify
from methods.adaptive_simpson import adaptive_simpson_calc

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        data = request.json
        func_str = data.get('func')
        a = float(data.get('a'))
        b = float(data.get('b'))
        tol = float(data.get('tol'))

        # Unpacking the 6 values from the Tuple
        res, count, gx, gy, steps, init_data = adaptive_simpson_calc(func_str, a, b, tol)
        
        return jsonify({
            'success': True,
            'result': f"{res:.10f}", # res is now a float, so .10f works!
            'count': count,
            'graph_x': gx,
            'graph_y': gy,
            'steps': steps,
            'initial_data': init_data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)