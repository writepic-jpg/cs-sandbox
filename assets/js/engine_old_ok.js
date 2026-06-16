let activeDraggedElement = null;
let hasScoredThisSession = false;
let userScore = parseInt(localStorage.getItem('parsons_streak_score') || '0', 10);

// Mobile Touch Tracking Variables
let activeTouchElement = null;
let touchStartY = 0;

// Web Audio Synthesizer Runtime Engine
function playAudioTone(f, d, t='sine', s=0) { 
    try { 
        const ctx = new(window.AudioContext || window.webkitAudioContext)(); 
        const o = ctx.createOscillator(); 
        const g = ctx.createGain(); 
        o.type = t; 
        o.frequency.setValueAtTime(f, ctx.currentTime + s); 
        g.gain.setValueAtTime(0.15, ctx.currentTime + s); 
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s + d); 
        o.connect(g); 
        g.connect(ctx.destination); 
        o.start(ctx.currentTime + s); 
        o.stop(ctx.currentTime + s + d); 
    } catch(e){} 
}

function playNudgeSound() { playAudioTone(587.33, 0.08, 'triangle'); }
function playCashSplurgeSound() { [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => playAudioTone(freq, 0.15, 'square', idx * 0.06)); }

// Particle FX Rendering Controller
function triggerCoinSplash() { 
    const container = document.body; 
    for (let i = 0; i < 30; i++) { 
        const coin = document.createElement('div'); 
        coin.className = 'coin-particle'; 
        coin.innerHTML = '🪙'; 
        coin.style.left = '50vw'; 
        coin.style.top = '40vh'; 
        const a = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 250;
        const x = Math.cos(a) * dist;
        const y = Math.sin(a) * dist - 60;
        const r = Math.random() * 360 + 180; 
        coin.style.setProperty('--tw-x', `${x}px`); 
        coin.style.setProperty('--tw-y', `${y}px`); 
        coin.style.setProperty('--tw-r', `${r}deg`); 
        container.appendChild(coin); 
        coin.addEventListener('animationend', () => coin.remove()); 
    } 
}

function updateScoreDisplay() { 
    const scoreEl = document.getElementById('score-display');
    if (scoreEl) {
        scoreEl.innerText = String(userScore).padStart(3, '0'); 
    }
    localStorage.setItem('parsons_streak_score', userScore); 
}

// Clears red/green validation styling upon user interaction
function resetHighlights() {
    document.querySelectorAll('.code-card').forEach(card => {
        card.classList.remove('border-green-600', 'bg-green-950/10', 'border-red-600', 'bg-red-950/10');
    });
    const panel = document.getElementById('feedback-panel');
    if(panel) panel.classList.add('hidden');
}

// Workspace DOM Assembly Engine
function initWorkspace() { 
    if (typeof challengeData === 'undefined') {
        console.error("No challengeData matrix object discovered on active layout context page.");
        return;
    }

    updateScoreDisplay(); 
    resetHighlights();
    
    if (document.getElementById('script-title-tag')) document.getElementById('script-title-tag').innerText = challengeData.fileName;
    if (document.getElementById('tier-tag')) document.getElementById('tier-tag').innerText = challengeData.tier;
    if (document.getElementById('puzzle-heading')) document.getElementById('puzzle-heading').innerText = challengeData.title;
    if (document.getElementById('puzzle-desc')) document.getElementById('puzzle-desc').innerText = challengeData.description;

    const actionBtn = document.getElementById('action-btn'); 
    if (actionBtn) {
        actionBtn.innerText = "Verify Code Alignment"; 
        actionBtn.onclick = checkAnswer; 
        actionBtn.className = "w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-neutral-900 font-bold rounded-xl text-xs uppercase tracking-wide cursor-pointer"; 
    }
    
    const ws = document.getElementById('parsons-workspace'); 
    if (ws) {
        ws.innerHTML = ''; 
        challengeData.scrambledLines.forEach(line => ws.appendChild(createCodeBlockNode(line.id, line.text))); 
        setupDragAndDropContext(ws); 
    }
}

function createCodeBlockNode(id, text) { 
    const row = document.createElement('div'); 
    row.id = id; 
    row.className = "parsons-row-container flex items-center gap-3 p-1 rounded-lg group transition-all duration-150 touch-none select-none"; 
    row.setAttribute("data-indent", "0"); 
    row.setAttribute("data-binned", "false"); 
    
    const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    row.innerHTML = `
        <div class="drag-controls flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
            <button onclick="changeIndentation('${id}', -1)" class="w-5 h-5 flex items-center justify-center bg-neutral-800 text-neutral-400 rounded text-xs font-bold hover:bg-neutral-700 cursor-pointer">&lsaquo;</button>
            <button onclick="changeIndentation('${id}', 1)" class="w-5 h-5 flex items-center justify-center bg-neutral-800 text-neutral-400 rounded text-xs font-bold hover:bg-neutral-700 cursor-pointer">&rsaquo;</button>
        </div>
        <div draggable="true" class="code-card flex-grow flex items-center justify-between bg-[#262626] border border-neutral-800 rounded-lg py-2.5 px-4 cursor-grab active:cursor-grabbing border-l-4 border-l-amber-600/20 hover:border-l-amber-500 select-none transition-all">
            <div class="flex items-center overflow-x-auto whitespace-nowrap mr-2">
                <span class="text-neutral-600 select-none mr-3 text-xs">☰</span>
                <span class="code-font text-amber-100 text-xs select-none tracking-wide">${safeText}</span>
            </div>
            <button onclick="toggleBin('${id}')" class="bin-btn flex-shrink-0 p-1.5 rounded text-xs transition-colors bg-neutral-800 text-neutral-400 hover:bg-red-950/50 hover:text-red-400 border border-transparent z-10 cursor-pointer" title="Send to Bin">
                🗑️
            </button>
        </div>`; 
    
    setupTouchContext(row);
    return row; 
}

function toggleBin(id) {
    const row = document.getElementById(id);
    if (!row) return;
    
    resetHighlights();
    const isBinned = row.getAttribute('data-binned') === 'true';
    
    const card = row.querySelector('.code-card');
    const textSpan = row.querySelector('.code-font');
    const dragControls = row.querySelector('.drag-controls');
    const binBtn = row.querySelector('.bin-btn');

    if (!isBinned) {
        // Bin the block
        row.setAttribute('data-binned', 'true');
        row.setAttribute('data-indent', '0');
        row.style.paddingLeft = '0rem';
        
        card.setAttribute('draggable', 'false');
        card.classList.remove('bg-[#262626]', 'border-l-amber-600/20', 'hover:border-l-amber-500', 'cursor-grab', 'active:cursor-grabbing');
        card.classList.add('opacity-40', 'bg-neutral-950/40');
        
        textSpan.classList.remove('text-amber-100');
        textSpan.classList.add('line-through', 'text-neutral-500');
        dragControls.classList.add('invisible');
        
        binBtn.innerHTML = '🔄';
        binBtn.title = "Restore Block";
        binBtn.classList.remove('bg-neutral-800', 'text-neutral-400', 'hover:bg-red-950/50', 'hover:text-red-400');
        binBtn.classList.add('bg-amber-900/40', 'text-amber-500', 'border-amber-700/50', 'hover:bg-amber-900/60');
    } else {
        // Restore the block
        row.setAttribute('data-binned', 'false');
        
        card.setAttribute('draggable', 'true');
        card.classList.remove('opacity-40', 'bg-neutral-950/40');
        card.classList.add('bg-[#262626]', 'border-l-amber-600/20', 'hover:border-l-amber-500', 'cursor-grab', 'active:cursor-grabbing');
        
        textSpan.classList.add('text-amber-100');
        textSpan.classList.remove('line-through', 'text-neutral-500');
        dragControls.classList.remove('invisible');
        
        binBtn.innerHTML = '🗑️';
        binBtn.title = "Send to Bin";
        binBtn.classList.add('bg-neutral-800', 'text-neutral-400', 'hover:bg-red-950/50', 'hover:text-red-400');
        binBtn.classList.remove('bg-amber-900/40', 'text-amber-500', 'border-amber-700/50', 'hover:bg-amber-900/60');
    }
}

function changeIndentation(id, dir) { 
    const el = document.getElementById(id); 
    if (!el || el.getAttribute('data-binned') === 'true') return;
    
    resetHighlights();
    let current = Math.max(0, Math.min(4, parseInt(el.getAttribute('data-indent'), 10) + dir)); 
    el.setAttribute('data-indent', current); 
    el.style.paddingLeft = `${current * 1.5}rem`; 
    checkDropPlacementMatch(el); 
}

function checkDropPlacementMatch(el) { 
    const workspace = document.getElementById('parsons-workspace');
    if (!workspace || el.getAttribute('data-binned') === 'true') return;
    
    // Only verify against active rows for sound effects
    const activeRows = Array.from(workspace.children).filter(r => r.getAttribute('data-binned') !== 'true');
    const idx = activeRows.indexOf(el); 
    
    if (challengeData.correctOrder[idx] && el.querySelector('.code-font')) {
        const currentText = el.querySelector('.code-font').innerText.trim().replace(/"/g, "'");
        const matchText = challengeData.correctOrder[idx].text.trim().replace(/"/g, "'");
        const currentIndent = parseInt(el.getAttribute('data-indent'), 10);
        
        if (matchText === currentText && challengeData.correctOrder[idx].indent === currentIndent) {
            playNudgeSound(); 
        }
    }
}

// Desktop Drag and Drop Engine
function setupDragAndDropContext(container) { 
    container.addEventListener('dragstart', (e) => { 
        activeDraggedElement = e.target.closest('.parsons-row-container');
        if (activeDraggedElement?.getAttribute('data-binned') === 'true') {
            e.preventDefault();
            return;
        }
        resetHighlights();
        activeDraggedElement?.classList.add('opacity-30'); 
    }); 
    container.addEventListener('dragend', () => { 
        if(!activeDraggedElement) return; 
        activeDraggedElement.classList.remove('opacity-30'); 
        checkDropPlacementMatch(activeDraggedElement); 
        activeDraggedElement = null; 
    }); 
    container.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        const target = e.target.closest('.parsons-row-container'); 
        if (!target || target === activeDraggedElement) return; 
        const box = target.getBoundingClientRect(); 
        if (e.clientY - box.top - box.height / 2 > 0) {
            target.after(activeDraggedElement); 
        } else {
            target.before(activeDraggedElement); 
        }
    }); 
}

// Mobile Touch Sorting Module Engine Extension
function setupTouchContext(rowElement) {
    rowElement.addEventListener('touchstart', (e) => {
        const row = e.target.closest('.parsons-row-container');
        if (!row || row.getAttribute('data-binned') === 'true') return;
        
        resetHighlights();
        activeTouchElement = row;
        touchStartY = e.touches[0].clientY;
        
        const dragCard = row.querySelector('.code-card');
        if (dragCard) {
            dragCard.classList.remove('border-neutral-800');
            dragCard.classList.add('border-amber-500', 'bg-neutral-800', 'scale-[1.01]', 'shadow-2xl');
        }
    }, { passive: true });

    rowElement.addEventListener('touchmove', (e) => {
        if (!activeTouchElement) return;
        e.preventDefault(); 
        
        const currentY = e.touches[0].clientY;
        const workspace = document.getElementById('parsons-workspace');
        if (!workspace) return;
        
        const siblingRows = Array.from(workspace.querySelectorAll('.parsons-row-container'))
                                .filter(item => item !== activeTouchElement);
                                
        const targetRow = siblingRows.find(item => {
            const box = item.getBoundingClientRect();
            return currentY >= box.top && currentY <= box.bottom;
        });

        if (targetRow) {
            const box = targetRow.getBoundingClientRect();
            const middle = box.top + box.height / 2;
            if (currentY < middle) {
                targetRow.before(activeTouchElement);
            } else {
                targetRow.after(activeTouchElement);
            }
        }
    }, { passive: false });

    rowElement.addEventListener('touchend', () => {
        if (!activeTouchElement) return;
        
        const dragCard = activeTouchElement.querySelector('.code-card');
        if (dragCard) {
            dragCard.classList.remove('border-amber-500', 'bg-neutral-800', 'scale-[1.01]', 'shadow-2xl');
            dragCard.classList.add('border-neutral-800');
        }
        
        checkDropPlacementMatch(activeTouchElement);
        activeTouchElement = null;
    });
}

// Sequence Validation Compiler Logic
function checkAnswer() { 
    const workspace = document.getElementById('parsons-workspace');
    if (!workspace) return;
    
    const allRows = Array.from(workspace.children); 
    const activeRows = allRows.filter(row => row.getAttribute('data-binned') !== 'true');
    const panel = document.getElementById('feedback-panel'); 
    
    // Check if the user binned the correct number of items
    if (activeRows.length !== challengeData.correctOrder.length) {
        userScore = 0; 
        updateScoreDisplay(); 
        playAudioTone(220, 0.35, 'sawtooth'); 
        
        if (panel) {
            panel.classList.remove('hidden');
            panel.className = "rounded-xl p-4 border border-red-900/60 bg-red-950/20 text-red-400 text-xs mt-2"; 
            panel.innerHTML = `<strong>❌ Incorrect block count.</strong> You either kept distractor blocks active or binned necessary lines!`; 
        }
        
        // Highlight active blocks in red to indicate error
        activeRows.forEach(row => {
            row.querySelector('.code-card').classList.add('border-red-600', 'bg-red-950/10');
        });
        return;
    }

    let isPerfect = true; 
    
    // Verify sequence & logic using normalized text matching
    activeRows.forEach((row, idx) => { 
        const codeFontEl = row.querySelector('.code-font');
        const inner = row.querySelector('.code-card');
        if (!codeFontEl || !inner) return;

        inner.classList.remove('border-green-600', 'bg-green-950/10', 'border-red-600', 'bg-red-950/10');

        const text = codeFontEl.innerText.trim();
        const indent = parseInt(row.getAttribute('data-indent'), 10);
        const match = challengeData.correctOrder[idx]; 
        
        const normalizedText = text.replace(/"/g, "'");
        const normalizedMatch = match ? match.text.trim().replace(/"/g, "'") : "";
        
        if (match && normalizedMatch === normalizedText && match.indent === indent) {
            inner.classList.add('border-green-600', 'bg-green-950/10'); 
        } else { 
            isPerfect = false; 
            inner.classList.add('border-red-600', 'bg-red-950/10'); 
        } 
    }); 
    
    if (panel) panel.classList.remove('hidden'); 
    
    if (isPerfect) { 
        if (!hasScoredThisSession) { 
            userScore += 100; 
            hasScoredThisSession = true; 
            updateScoreDisplay(); 
        } 
        playCashSplurgeSound(); 
        triggerCoinSplash(); 
        
        const btn = document.getElementById('action-btn'); 
        if (btn) {
            btn.innerText = "Return to Challenge Hub"; 
            btn.onclick = () => window.location.href = '../../challenges-hub.html'; 
            btn.className = "w-full sm:w-auto px-6 py-3 bg-green-600 text-neutral-900 font-bold rounded-xl text-xs uppercase tracking-wide cursor-pointer animate-bounce"; 
        }
        
        if (panel) {
            panel.className = "rounded-xl p-4 border border-green-800 bg-green-950/20 text-green-400 text-xs mt-2"; 
            panel.innerHTML = `<strong>🎉 Perfect Sequence Execution!</strong> The structure perfectly fulfills the logic parameters.`; 
        }
    } else { 
        userScore = 0; 
        hasScoredThisSession = false; 
        updateScoreDisplay(); 
        playAudioTone(220, 0.35, 'sawtooth'); 
        
        if (panel) {
            panel.className = "rounded-xl p-4 border border-red-900/60 bg-red-950/20 text-red-400 text-xs mt-2"; 
            panel.innerHTML = `<strong>❌ Logic Compilation Mismatch.</strong> Check your sequencing or functional nested block layouts.`; 
        }
    } 
}

// --- PAYPAL CHECKOUT ARCHITECTURE RUNTIME ---
function renderPaypalCheckout() {
    const btnContainer = document.getElementById('paypal-button-container');
    if (!btnContainer) return;
    btnContainer.classList.remove('hidden');
    
    if (typeof paypal === 'undefined') {
        btnContainer.innerHTML = `<div class="text-xs text-amber-500 bg-neutral-900/40 p-3 rounded-lg border border-neutral-800">PayPal engine active. To connect actual transactions, uncomment the initialization script tag in the HTML head document template.</div>`;
        return;
    }

    paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    amount: { value: '2.99', currency_code: 'GBP' },
                    description: 'OCR CS Parsons Premium Sandbox Access'
                }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(function(details) {
                alert('Transaction approved by ' + details.payer.name.given_name + '! Premium access unlocked.');
                localStorage.setItem('parsons_premium_unlocked', 'true');
            });
        }
    }).render('#paypal-button-container');
}

// --- NEW MOBILE BURGER MENU LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const burgerBtn = document.getElementById('burger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (burgerBtn && mobileMenu) {
        burgerBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            mobileMenu.classList.toggle('flex');
        });

        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                mobileMenu.classList.remove('flex');
            });
        });
    }
});

// Global bootstrap activation hook
document.addEventListener('DOMContentLoaded', initWorkspace);