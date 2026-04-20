// --- Dashboard State ---
let isPhysicsActive = false;
let isSimMode = false;
let chartInstance = null;
let currentCurrency = 'USD';
let rawCostSaved = 0; // Store unformatted USD value from API

const exchangeRates = {
    'USD': { rate: 1, symbol: '$' },
    'EUR': { rate: 0.92, symbol: '€' },
    'INR': { rate: 83.5, symbol: '₹' }
};

// --- Chart setup ---
function initChart() {
    const canvasElement = document.getElementById('demandChart');
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [{
                label: 'Forecast',
                data: [120, 135, 125, 140, 180, 200, 150],
                borderColor: '#00f0ff',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#7000ff',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(7, 9, 15, 0.9)',
                    titleFont: { family: 'Outfit', size: 13 },
                    bodyFont: { family: 'Outfit', size: 14, weight: 'bold' },
                    padding: 12,
                    borderColor: 'rgba(0, 240, 255, 0.3)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: { label: function(context) { return context.parsed.y + ' Portions'; } }
                }
            },
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9499ab', font: { family: 'Outfit' } } },
                x: { grid: { display: false }, ticks: { color: '#9499ab', font: { family: 'Outfit' } } }
            }
        }
    });
}
initChart();

// --- Controls & Toggles ---
const simToggle = document.getElementById('sim-toggle');
const currencySelect = document.getElementById('currency');

simToggle.addEventListener('change', (e) => {
    isSimMode = e.target.checked;
    if(isSimMode) {
        document.body.classList.add('sim-mode');
        document.getElementById('predict-btn').querySelector('.btn-text').innerText = 'Run Simulation';
    } else {
        document.body.classList.remove('sim-mode');
        document.getElementById('predict-btn').querySelector('.btn-text').innerText = 'Execute Model';
    }
});

currencySelect.addEventListener('change', (e) => {
    currentCurrency = e.target.value;
    updateCurrencyDisplay();
});

function updateCurrencyDisplay() {
    const config = exchangeRates[currentCurrency];
    document.getElementById('sym-cost').innerText = config.symbol;
    if(rawCostSaved > 0) {
        let converted = rawCostSaved * config.rate;
        document.getElementById('val-cost').innerText = converted.toFixed(2);
    }
}

document.body.classList.add('physics-off');

// --- UI Utilities ---
function animateCounter(id, start, end, duration) {
    let obj = document.getElementById(id);
    if(!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = (progress * (end - start) + start);
        obj.innerHTML = current % 1 !== 0 && end % 1 !== 0 ? current.toFixed(1) : Math.floor(current);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// Init Landing Page Stats
if (document.getElementById('landing-stat-1')) {
    setTimeout(() => {
        animateCounter('landing-stat-1', 0, 1.2, 2500);
        animateCounter('landing-stat-2', 0, 89, 2500);
        animateCounter('landing-stat-3', 0, 14.5, 2500);
        animateCounter('landing-stat-4', 0, 94, 2500);
    }, 500);
}

// --- Dashboard Extra Features ---
// AI Chat
const chatToggle = document.getElementById('chat-toggle');
if (chatToggle) {
    chatToggle.addEventListener('click', () => {
        const w = document.getElementById('chat-window');
        w.style.display = w.style.display === 'none' ? 'flex' : 'none';
    });
}
const chatSend = document.getElementById('chat-send');
if (chatSend) {
    chatSend.addEventListener('click', async () => {
        const input = document.getElementById('chat-input');
        if (input.value.trim()) {
            const chatBody = document.getElementById('chat-body');
            const userMsg = input.value;
            chatBody.innerHTML += `<div class="msg user" style="background:var(--accent-primary); color:#000; align-self:flex-end; padding:10px 15px; border-radius:10px; font-size:0.9rem;">${userMsg}</div>`;
            input.value = '';
            chatBody.scrollTop = chatBody.scrollHeight;
            
            const typingId = 'typing-' + Date.now();
            chatBody.innerHTML += `<div id="${typingId}" class="msg ai" style="opacity: 0.6;">SAVORA is thinking...</div>`;
            chatBody.scrollTop = chatBody.scrollHeight;
            
            try {
                const res = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: userMsg })
                });
                const data = await res.json();
                
                const typingEl = document.getElementById(typingId);
                if(typingEl) typingEl.remove();
                
                chatBody.innerHTML += `<div class="msg ai">${data.reply}</div>`;
                chatBody.scrollTop = chatBody.scrollHeight;
            } catch (err) {
                const typingEl = document.getElementById(typingId);
                if(typingEl) typingEl.remove();
                chatBody.innerHTML += `<div class="msg ai" style="color:#ff0055;">Communication with the neural core failed.</div>`;
            }
        }
    });
}

// PDF Export
const exportBtn = document.getElementById('export-pdf-btn');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const element = document.getElementById('main-export-area');
        exportBtn.innerText = "Exporting...";
        const opt = {
            margin:       0.5,
            filename:     'SAVORA_Report.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
        };
        html2pdf().from(element).set(opt).save().then(() => {
            exportBtn.innerText = "Export PDF";
        });
    });
}

// --- API Logic ---
const predictBtn = document.getElementById('predict-btn');
if (predictBtn) {
    predictBtn.addEventListener('click', async () => {
        const btn = document.getElementById('predict-btn');
        const textSpan = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loader');
        
        // Physics interaction removed

    try {
        textSpan.style.display = 'none';
        loader.style.display = 'block';
        btn.style.opacity = "0.8";
        btn.style.pointerEvents = "none";
        
        const payload = {
            rest_type: document.getElementById('rest_type') ? document.getElementById('rest_type').value : 'Casual Dining',
            day: document.getElementById('day').value,
            weather: document.getElementById('weather').value,
            holiday: document.getElementById('holiday').value,
            events: document.getElementById('events').value,
            simulation: isSimMode
        };
        
        const response = await fetch('/predict', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        setTimeout(() => {
            if(data.error) {
                alert("Error: " + data.error);
            } else {
                // Number Animations
                animateCounter('prediction-value', 0, data.prediction, 1200);
                setTimeout(() => { animateCounter('val-waste', 0, data.impact.waste_reduction, 800); }, 300);
                setTimeout(() => { animateCounter('val-eff', 0, data.impact.efficiency, 800); }, 600);
                
                // Keep raw USD cost updated, then trigger frontend display logic
                rawCostSaved = data.impact.cost_savings;
                updateCurrencyDisplay();
                
                // Alert Banner
                const alertBn = document.getElementById('alert-banner');
                if(data.alert) {
                    alertBn.style.display = 'block';
                    alertBn.innerText = data.alert;
                } else {
                    alertBn.style.display = 'none';
                }
                
                // Confidence & Trend Updates
                document.getElementById('confidence-val').innerText = data.confidence + "%";
                document.getElementById('confidence-bar').style.width = data.confidence + "%";
                
                const trendBox = document.getElementById('trend-box');
                trendBox.style.display = "flex";
                trendBox.className = "trend-indicator " + data.trend.direction;
                document.getElementById('trend-val').innerText = data.trend.percentage + "%";
                
                // Breakdown B/L/D
                document.getElementById('pct-brk').innerText = data.breakdown.breakfast + '%';
                document.getElementById('bar-brk').style.width = data.breakdown.breakfast + '%';
                document.getElementById('pct-lun').innerText = data.breakdown.lunch + '%';
                document.getElementById('bar-lun').style.width = data.breakdown.lunch + '%';
                document.getElementById('pct-din').innerText = data.breakdown.dinner + '%';
                document.getElementById('bar-din').style.width = data.breakdown.dinner + '%';
                
                // Factors
                let factorsHtml = '';
                data.factors.forEach(fac => {
                    const sign = fac.impact_val > 0 ? '+' : '';
                    factorsHtml += `<div class="fac-row ${fac.type}">
                        <span class="fac-name">${fac.name}</span>
                        <span class="fac-eff">${sign}${fac.effect}</span>
                    </div>`;
                });
                document.getElementById('factors-container').innerHTML = factorsHtml;
                
                // Ingredients
                let invHtml = '';
                data.ingredients.forEach(inv => {
                    invHtml += `<li class="inv-item"><span>${inv.name}</span><span>${inv.qty}</span></li>`;
                });
                document.getElementById('inventory-ul').innerHTML = invHtml;

                // Update Chart (Future 7 Days)
                if(chartInstance && data.future_data) {
                    chartInstance.data.labels = data.future_data.labels;
                    chartInstance.data.datasets[0].data = data.future_data.values;
                    
                    // Style specific to sim mode
                    if(isSimMode) {
                        chartInstance.data.datasets[0].borderColor = '#ff9900';
                        chartInstance.data.datasets[0].pointBackgroundColor = '#ff9900';
                    } else {
                        chartInstance.data.datasets[0].borderColor = '#00f0ff';
                        chartInstance.data.datasets[0].pointBackgroundColor = '#7000ff';
                    }
                    chartInstance.update();
                }

                // --------- NEW: Chatbot Audio & Explanation Auto-Run ---------
                const chatWin = document.getElementById('chat-window');
                if (chatWin) chatWin.style.display = 'flex';
                const chatBody = document.getElementById('chat-body');
                
                if (window.speechSynthesis) window.speechSynthesis.cancel(); 
                
                const expCost = rawCostSaved ? (rawCostSaved * exchangeRates[currentCurrency].rate).toFixed(2) : 0;
                const explanation = `I predict a demand of ${Math.round(data.prediction)} portions. The trend is moving ${data.trend.direction}. With optimal inventory handling, we can reduce waste by ${data.impact.waste_reduction} percent, saving ${expCost} ${currentCurrency} overall.`;
                
                const btnHTML = `<button onclick="window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance('${explanation}'));" style="margin-left:8px; background:none; border:none; cursor:pointer;" title="Replay Audio">🔊</button>`;
                
                chatBody.innerHTML += `<div class="msg ai" style="border: 1px solid var(--accent-primary); box-shadow: 0 0 10px rgba(0,240,255,0.2);">${explanation} ${btnHTML}</div>`;
                chatBody.scrollTop = chatBody.scrollHeight;
                
                if (window.speechSynthesis) {
                    window.speechSynthesis.speak(new SpeechSynthesisUtterance(explanation));
                }
            }
            textSpan.style.display = 'inline-block';
            loader.style.display = 'none';
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
        }, 800);
        
    } catch (err) {
            textSpan.style.display = 'inline-block';
            loader.style.display = 'none';
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
            console.error(err);
        }
    });
}
