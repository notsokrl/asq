import numpy as np
from sympy import symbols, lambdify, log, exp, sin, cos, tan, sqrt, pi, E, asin, acos, atan
from sympy.parsing.sympy_parser import (
    parse_expr, 
    standard_transformations, 
    implicit_multiplication_application,
    convert_xor
)

MATH_NAMES = {
    'sin': sin, 'cos': cos, 'tan': tan, 
    'asin': asin, 'acos': acos, 'atan': atan,
    'exp': exp, 'log': log, 'ln': log, 
    'sqrt': sqrt, 'pi': pi, 
    'e': E, 'E': E 
}

def adaptive_simpson_calc(func_str, a, b, tol):
    x = symbols('x')
    transformations = standard_transformations + (implicit_multiplication_application, convert_xor)

    try:
        expr = parse_expr(func_str, local_dict=MATH_NAMES, transformations=transformations)
        f = lambdify(x, expr, modules=['numpy', MATH_NAMES])
        f(a) # Test evaluation
    except Exception as e:
        raise ValueError(f"Math Error: {str(e)}")

    steps_log = []
    recursive_count = 0

    # Initial values for the Textbook Step 1 breakdown
    m_initial = (a + b) / 2
    initial_values = {
        'fa': round(float(f(a)), 6),
        'fm': round(float(f(m_initial)), 6),
        'fb': round(float(f(b)), 6),
        'm': round(m_initial, 6),
        'h': round(abs(b - a) / 2, 6)
    }

    def simpson_rule(start, end):
        fa, fb = float(f(start)), float(f(end))
        mid = (start + end) / 2
        fm = float(f(mid))
        return (abs(end - start) / 6) * (fa + 4 * fm + fb)

    def recursive_step(a_in, b_in, tol_in, whole_in, depth):
        nonlocal recursive_count
        recursive_count += 1
        
        mid = (a_in + b_in) / 2
        left = simpson_rule(a_in, mid)
        right = simpson_rule(mid, b_in)
        error = abs(left + right - whole_in)
        threshold = 15 * tol_in
        
        # --- FIX START ---
        # Added 's_whole' so JavaScript can display the estimate in Step 2
        steps_log.append({
            'depth': depth,
            'interval': f"[{round(a_in, 4)}, {round(b_in, 4)}]",
            's_whole': round(whole_in, 6), 
            'error': f"{error:.8f}",
            'status': "Accepted" if error <= threshold else "Subdividing"
        })
        # --- FIX END ---

        if error <= threshold:
            return left + right + (left + right - whole_in) / 15.0
        
        if depth > 20: return left + right

        return recursive_step(a_in, mid, tol_in/2.0, left, depth + 1) + \
               recursive_step(mid, b_in, tol_in/2.0, right, depth + 1)

    initial_guess = simpson_rule(a, b)
    result = recursive_step(a, b, tol, initial_guess, 1)

    graph_x = np.linspace(a, b, 100)
    # Ensure graph_y is a list of floats
    graph_y = [float(f(val)) for val in graph_x]

    # Return as a tuple for app.py to unpack correctly
    return result, recursive_count, graph_x.tolist(), graph_y, steps_log, initial_values