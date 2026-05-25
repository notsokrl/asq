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
        func = data.get('func')
        a = float(data.get('a'))
        b = float(data.get('b'))
        tol = float(data.get('tol'))

        res, count, gx, gy = adaptive_simpson_calc(func, a, b, tol)
        
        return jsonify({
            'success': True,
            'result': f"{res:.8f}",
            'count': count,
            'graph_x': gx,
            'graph_y': gy
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)