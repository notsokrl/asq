/**
 * Adaptive Simpson Quadrature - Logic
 */

async function runCalculation() {
    const btn = document.getElementById('calcBtn');
    const loader = document.getElementById('loader');
    const resultsPanel = document.getElementById('results');
    
    // Get values from inputs
    const func = document.getElementById('func').value;
    const a = document.getElementById('lower').value;
    const b = document.getElementById('upper').value;
    const tol = document.getElementById('tol').value;

    // 1. Basic Validation
    if (!func || a === "" || b === "" || !tol) {
        alert("Please fill in all fields correctly.");
        return;
    }

    const data = {
        func: func,
        a: parseFloat(a),
        b: parseFloat(b),
        tol: parseFloat(tol)
    };

    // 2. UI State: Start Calculation
    resultsPanel.classList.add('hidden'); 
    btn.disabled = true;
    loader.classList.remove('hidden');

    try {
        const response = await fetch('/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            // --- 3. GENERATE TEXTBOOK SOLUTION BREAKDOWN ---
            const solutionDiv = document.getElementById('solution-breakdown');
            const init = result.initial_data;
            
            let solutionHTML = `
                <h3>Step 1: Setup and Initial Evaluation</h3>
                <p>We approximate the integral of \\( f(x) = ${func} \\) from \\( a = ${data.a} \\) to \\( b = ${data.b} \\).</p>
                <p>The total interval width is \\( w = ${Math.abs(data.b - data.a)} \\), making the step size \\( h = \\frac{b-a}{2} = ${init.h} \\).</p>
                <ul>
                    <li>\\( f(a) = f(${data.a}) = ${init.fa} \\)</li>
                    <li>\\( f(m) = f(${init.m}) = ${init.fm} \\)</li>
                    <li>\\( f(b) = f(${data.b}) = ${init.fb} \\)</li>
                </ul>

                <h3>Step 2: Apply Simpson's 1/3 Rule</h3>
                <p>Plug the values into the formula: \\( S = \\frac{h}{3} [f(a) + 4f(m) + f(b)] \\)</p>
                <p>\\[ S = \\frac{${init.h}}{3} [${init.fa} + 4(${init.fm}) + ${init.fb}] \\]</p>
                <p>First rough estimate: <strong>${result.steps[0].s_whole}</strong></p>

                <h3>Step 3: Recursive Refinement</h3>
                <p>The algorithm recursively subdivided the intervals to meet the tolerance of \\( \\epsilon = ${data.tol} \\). 
                After <strong>${result.count}</strong> recursive calls, the error threshold was satisfied.</p>
            `;
            solutionDiv.innerHTML = solutionHTML;

            // Trigger MathJax to render the new LaTeX
            if (window.MathJax) {
                MathJax.typesetPromise([solutionDiv]);
            }

            // --- 4. POPULATE RECURSION LOG TABLE ---
            const stepsBody = document.getElementById('steps-body');
            stepsBody.innerHTML = ''; 
            result.steps.forEach(step => {
                const row = `
                    <tr>
                        <td>${step.depth}</td>
                        <td>${step.interval}</td>
                        <td>${step.error}</td>
                        <td><span class="badge ${step.status.toLowerCase()}">${step.status}</span></td>
                    </tr>
                `;
                stepsBody.insertAdjacentHTML('beforeend', row);
            });

            // --- 5. POPULATE NUMERICAL SUMMARY ---
            document.getElementById('res-val').innerText = result.result;
            document.getElementById('res-count').innerText = result.count;
            
            // --- 6. REVEAL RESULTS & RENDER GRAPH ---
            loader.classList.add('hidden');
            resultsPanel.classList.remove('hidden');

            if (result.graph_x && result.graph_y) {
                renderPlotly(result.graph_x, result.graph_y, data.func);
            }
            
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } else {
            loader.classList.add('hidden');
            alert("Calculation Error: " + result.error);
        }
    } catch (e) {
        console.error(e);
        loader.classList.add('hidden');
        alert("Server connection failed. Please ensure the Flask app is running.");
    } finally {
        btn.disabled = false;
        loader.classList.add('hidden');
    }
}

/**
 * Renders high-quality visualization using Plotly.js
 */
function renderPlotly(x, y, funcName) {
    const trace = {
        x: x, y: y,
        type: 'scatter', mode: 'lines',
        name: `f(x) = ${funcName}`,
        fill: 'tozeroy', 
        line: { color: '#ff8fb1', width: 3, shape: 'spline' },
        fillcolor: 'rgba(255, 143, 177, 0.2)'
    };

    const layout = {
        autosize: true, height: 350,
        margin: { t: 30, b: 40, l: 50, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(255, 255, 255, 0.5)',
        xaxis: { title: 'x', gridcolor: '#fff0f6' },
        yaxis: { title: 'f(x)', gridcolor: '#fff0f6' },
        font: { family: 'Segoe UI, sans-serif', color: '#444' }
    };

    Plotly.newPlot('graph-div', [trace], layout, { responsive: true, displayModeBar: false });
}

/**
 * Copies the numerical result to the clipboard
 */
function copyResult() {
    const val = document.getElementById('res-val').innerText;
    if (!val) return;

    navigator.clipboard.writeText(val).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "Copied!";
        copyBtn.style.background = "#4CAF50"; 
        setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style.background = "#ff8fb1";
        }, 2000);
    });
}

/**
 * PDF GENERATION LOGIC
 */
async function downloadPDF() {
    if (typeof html2canvas === "undefined" || !window.jspdf) {
        alert("PDF libraries not loaded. Please check your internet connection.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const element = document.getElementById('results');
    const downloadBtn = document.querySelector('.download-btn');
    const originalText = downloadBtn.innerText;

    downloadBtn.innerText = "Generating PDF...";
    downloadBtn.disabled = true;

    try {
        // Capture the results section as an image
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            // Ignore buttons in the PDF output
            ignoreElements: (el) => el.classList.contains('button-group')
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Header Title
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.setTextColor(255, 143, 177);
        pdf.text("Adaptive Simpson Quadrature Report", 10, 15);

        // Sub-Header (Date)
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 22);

        // Add the Image
        pdf.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight);

        pdf.save(`Numerical_Report_${Date.now()}.pdf`);

    } catch (error) {
        console.error("PDF Error:", error);
        alert("Failed to generate PDF. Check console for details.");
    } finally {
        downloadBtn.innerText = originalText;
        downloadBtn.disabled = false;
    }
}

/**
 * Reset UI state
 */
function resetCalc() {
    document.getElementById('func').value = '';
    document.getElementById('lower').value = '0';
    document.getElementById('upper').value = '1';
    document.getElementById('results').classList.add('hidden');
    document.getElementById('loader').classList.add('hidden');
    
    if (document.getElementById('graph-div').data) {
        Plotly.purge('graph-div');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Ensure results are hidden on load
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('results').classList.add('hidden');
});