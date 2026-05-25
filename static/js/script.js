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
    // We explicitly hide the results panel immediately so old values aren't seen
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
            // 3. Populate Numerical Results
            document.getElementById('res-val').innerText = result.result;
            document.getElementById('res-count').innerText = result.count;
            
            // 4. Reveal Results Only Now
            // This ensures the result card only appears when there is a value
            loader.classList.add('hidden');
            resultsPanel.classList.remove('hidden');

            // 5. Render Plotly Graph
            if (result.graph_x && result.graph_y) {
                renderPlotly(result.graph_x, result.graph_y, data.func);
            }
            
            // 6. Smooth scroll to results
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        } else {
            // If backend fails, keep results hidden
            loader.classList.add('hidden');
            alert("Calculation Error: " + result.error);
        }
    } catch (e) {
        // If network fails, keep results hidden
        console.error(e);
        loader.classList.add('hidden');
        alert("Server connection failed. Please ensure the Flask app is running.");
    } finally {
        btn.disabled = false;
        // Safety: ensure loader is hidden if not already handled
        loader.classList.add('hidden');
    }
}

/**
 * Renders a high-quality graph using Plotly.js
 */
function renderPlotly(x, y, funcName) {
    const trace = {
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        name: `f(x) = ${funcName}`,
        fill: 'tozeroy', 
        line: {
            color: '#ff8fb1',
            width: 3,
            shape: 'spline' 
        },
        fillcolor: 'rgba(255, 143, 177, 0.2)'
    };

    const layout = {
        autosize: true,
        height: 350,
        margin: { t: 30, b: 40, l: 50, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(255, 255, 255, 0.5)',
        xaxis: {
            title: 'x',
            gridcolor: '#fff0f6',
            zerolinecolor: '#ffb6d5'
        },
        yaxis: {
            title: 'f(x)',
            gridcolor: '#fff0f6',
            zerolinecolor: '#ffb6d5'
        },
        font: {
            family: 'Segoe UI, sans-serif',
            color: '#444'
        }
    };

    const config = { responsive: true, displayModeBar: false };

    Plotly.newPlot('graph-div', [trace], layout, config);
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
        copyBtn.style.background = "#4CAF50"; // Green success feedback
        
        setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style.background = "#ff8fb1"; // Reset to pink
        }, 2000);
    });
}

/**
 * Resets the calculator form and hides all result/loading panels
 */
function resetCalc() {
    // 1. Clear text inputs
    document.getElementById('func').value = '';
    document.getElementById('lower').value = '0';
    document.getElementById('upper').value = '1';
    document.getElementById('tol').value = '0.001';
    
    // 2. Hide results and loader
    document.getElementById('results').classList.add('hidden');
    document.getElementById('loader').classList.add('hidden');
    
    // 3. Clear numerical displays
    document.getElementById('res-val').innerText = '';
    document.getElementById('res-count').innerText = '';
    
    // 4. Purge the Plotly graph
    const graphDiv = document.getElementById('graph-div');
    if (graphDiv && graphDiv.data) {
        Plotly.purge('graph-div');
    }

    // 5. Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Ensure results are hidden on page load
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('results').classList.add('hidden');
    console.log("Adaptive Simpson Calculator Ready.");
});

async function downloadPDF() {

    // CHECK LIBRARIES
    if (typeof html2canvas === "undefined") {
        alert("html2canvas failed to load.");
        return;
    }

    if (!window.jspdf) {
        alert("jsPDF failed to load.");
        return;
    }

    // GET PDF CLASS
    const { jsPDF } = window.jspdf;

    // GET ELEMENTS
    const element = document.getElementById('results');
    const downloadBtn = document.querySelector('.print-btn');

    // SAFETY CHECK
    if (!element) {
        alert("Results section not found.");
        return;
    }

    // BUTTON FEEDBACK
    const originalText = downloadBtn.innerText;

    downloadBtn.innerText = "Generating PDF...";
    downloadBtn.disabled = true;

    try {

        // WAIT FOR PLOTLY GRAPH TO FINISH RENDERING
        await new Promise(resolve => setTimeout(resolve, 800));

        // CAPTURE RESULTS SECTION
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false
        });

        // CONVERT TO IMAGE
        const imgData = canvas.toDataURL('image/png');

        // CREATE PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // PDF DIMENSIONS
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // IMAGE DIMENSIONS
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // HEADER
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        pdf.setTextColor(255, 105, 180);

        pdf.text(
            "Adaptive Simpson Quadrature Report",
            10,
            15
        );

        // DATE
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(80);

        pdf.text(
            `Generated: ${new Date().toLocaleString()}`,
            10,
            22
        );

        // ADD IMAGE
        pdf.addImage(
            imgData,
            'PNG',
            10,
            30,
            imgWidth,
            imgHeight
        );

        // FORCE DOWNLOAD
        pdf.save(`Adaptive_Simpson_Report_${Date.now()}.pdf`);

        console.log("PDF Download Success");

    } catch (error) {

        console.error("PDF ERROR:", error);

        alert(
            "PDF generation failed. Check browser console."
        );

    } finally {

        downloadBtn.innerText = originalText;
        downloadBtn.disabled = false;

    }
}