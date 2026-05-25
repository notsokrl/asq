import numpy as np
from sympy import symbols, lambdify, log, exp, sin, cos, tan, sqrt, pi, E, asin, acos, atan
from sympy.parsing.sympy_parser import (
    parse_expr, 
    standard_transformations, 
    implicit_multiplication_application,
    convert_xor
)

# 1. Define the names the parser should recognize immediately
MATH_NAMES = {
    'sin': sin, 'cos': cos, 'tan': tan, 
    'asin': asin, 'acos': acos, 'atan': atan,
    'exp': exp, 'log': log, 'ln': log, 
    'sqrt': sqrt, 'pi': pi, 
    'e': E, 'E': E  # Map both e and E to Euler's number
}

def adaptive_simpson_calc(func_str, a, b, tol):
    x = symbols('x')
    
    # 2. Setup transformations
    transformations = standard_transformations + (
        implicit_multiplication_application,
        convert_xor
    )

    try:
        # 3. Parse with local_dict so 'e' and functions are recognized correctly
        expr = parse_expr(func_str, local_dict=MATH_NAMES, transformations=transformations)
        
        # 4. Convert to a function that understands NumPy arrays
        f = lambdify(x, expr, modules=['numpy', MATH_NAMES])
        
        # Test the function with a single value to catch errors early
        f(a)
    except Exception as e:
        raise ValueError(f"Could not parse function. Try using 'exp(2x)' instead of 'e^2x'. Error: {str(e)}")

    recursive_count = 0

    def simpson_rule(a, b):
        try:
            # Note: We use float() to ensure we don't have SymPy objects in calculations
            fa = float(f(a))
            fb = float(f(b))
            mid = (a + b) / 2
            fm = float(f(mid))
            return (abs(b - a) / 6) * (fa + 4 * fm + fb)
        except Exception:
            raise ValueError("The function is undefined at some points in this interval.")

    def recursive_step(a, b, tol, whole):
        nonlocal recursive_count
        recursive_count += 1
        
        mid = (a + b) / 2
        left = simpson_rule(a, mid)
        right = simpson_rule(mid, b)
        
        if abs(left + right - whole) <= 15 * tol:
            return left + right + (left + right - whole) / 15.0
        
        # Safety break for infinite recursion
        if recursive_count > 1000:
            return left + right

        return recursive_step(a, mid, tol/2.0, left) + \
               recursive_step(mid, b, tol/2.0, right)

    # Calculate graph points
    graph_x = np.linspace(a, b, 100)
    try:
        # Evaluate function across the array for the graph
        graph_y = [float(f(val)) for val in graph_x]
        graph_x = graph_x.tolist()
    except:
        graph_x, graph_y = [], []

    initial_guess = simpson_rule(a, b)
    result = recursive_step(a, b, tol, initial_guess)
    
    return result, recursive_count, graph_x, graph_y