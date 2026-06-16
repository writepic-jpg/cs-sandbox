/**
 * OCR CS Parsons Sandbox - Master Core Runtime Engine
 * Architecture Version: 2.1.0 (Production Hardened)
 */

let activeDraggedElement = null;
let hasScoredThisSession = false;
let userScore = parseInt(localStorage.getItem('parsons_streak_score') || '0', 10);

let activeTouchElement = null;
let touchStartY = 0;

// ==========================================
// 1. WEB AUDIO SYNTHESIZER ENGINE
// ==========================================
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
        o.start(ctx.currentTime + s); 
        o.stop(ctx.currentTime + s + d); 
    } catch(e){} 
}

function playNudgeSound() { playAudioTone(587.33, 0.08, 'triangle'); }
function playCashSplurgeSound() { [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => playAudioTone(freq, 0.15, 'square', idx * 0.06)); }

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

// ==========================================
// 2. WORKSPACE LIFE-CYCLE BOOTSTRAPPER
// ==========================================
function initWorkspace() { 
    if (typeof challengeData === 'undefined') {
        console.error("No challengeData matrix object discovered on active layout context page.");
        return;
    }

    updateScoreDisplay(); 
    
    if (document.getElementById('script-title-tag')) document.getElementById('script-title-tag').innerText = challengeData.fileName;
    if (document.getElementById('tier-tag')) document.getElementById('tier-tag').innerText = challengeData.tier;
    if (document.getElementById('puzzle-heading')) document.getElementById('puzzle-heading').innerText = challengeData.title;
    if (document.getElementById('puzzle-desc')) document.getElementById('puzzle-desc').innerText = challengeData.description;

    // PREMIUM INTEGRATION GATEKEEPER
    const isPremiumUnlocked = localStorage.getItem('_p_sig_o_cs_') !== null;
    const currentChallengeNum = parseInt(challengeData.id.replace('challenge-', ''), 10);
    
    // Lock challenges above index 10 if premium signature verification token is missing
    if (currentChallengeNum > 10 && !isPremiumUnlocked) {
        const ws = document.getElementById('parsons-workspace'); 
        if (ws) {
            ws.className = "bg-[#1e1e1e] border border-neutral-800 rounded-xl p-6 text-center flex flex-col items-center justify-center gap-4 min-h-[300px]";
            ws.innerHTML = `
                <span class="text-3xl">🔒</span>
                <h3 class="text-sm font-bold text-amber-500 uppercase tracking-wider">Premium Workspace Challenge</h3>
                <p class="text-xs text-neutral-400 max-w-sm leading-relaxed">Challenges 11-40 require structured revision access. Unlock the entire premium sandbox library instantly below.</p>
                <div id="paypal-button-container" class="w-full max-w-xs mt-2"></div>
            `;
            renderPaypalCheckout();
            
            const actionBtn = document.getElementById('action-btn');
            if (actionBtn) {
                actionBtn.disabled = true;
                actionBtn.innerText = "Challenge Workspace Locked";
                actionBtn.className = "w-full sm:w-auto px-6 py-3 bg-neutral-800 text-neutral-500 font-bold rounded-xl text-xs uppercase tracking-wide cursor-not-allowed";
            }
            return; 
        }
    }

    const actionBtn = document.getElementById('action-btn'); 
    if (actionBtn) {
        actionBtn.disabled = false;
        actionBtn.innerText = "Verify Code Alignment"; 
        actionBtn.onclick = checkAnswer; 
        actionBtn.className = "w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-neutral-900 font-bold rounded-xl text-xs uppercase tracking-wide cursor-pointer"; 
    }
    
    const ws = document.getElementById('parsons-workspace'); 
    if (ws) {
        const parentSection = ws.parentNode;
        document.getElementById('parsons-bin-deck-wrapper')?.remove();
        
        ws.innerHTML = '';
        ws.className = "bg-[#1e1e1e] border border-neutral-800 rounded-xl p-4 min-h-[180px] flex flex-col gap-2 shadow-inner drop-zone-tray";
        ws.setAttribute("data-tray-type", "solution");

        // DYNAMIC INVENTORY CONTAINER DECK ASSEMBLY
        const binDeckWrapper = document.createElement('div');
        binDeckWrapper.id = "parsons-bin-deck-wrapper";
        binDeckWrapper.className = "mt-4";
        binDeckWrapper.innerHTML = `
            <div class="bg-[#212121] border border-neutral-800 rounded-t-xl px-4 py-2.5 flex justify-between items-center shadow-sm">
                <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">🗑️ Distractor Deck & Inventory Pool</span>
                <span class="text-[10px] text-neutral-500 font-mono">Leave incorrect blocks here</span>
            </div>
            <div id="parsons-bin-deck" class="bg-[#1a1a1a] border-x border-b border-neutral-800 rounded-b-xl p-4 min-h-[120px] flex flex-col gap-2 shadow-inner drop-zone-tray" data-tray-type="pool"></div>
        `;
        
        parentSection.insertBefore(binDeckWrapper, document.getElementById('feedback-panel') || (actionBtn ? actionBtn.parentNode : null));
        
        const binDeck = document.getElementById('parsons-bin-deck');
        challengeData.scrambledLines.forEach(line => {
            binDeck.appendChild(createCodeBlockNode(line.id, line.text));
        }); 
        
        setupDragAndDropContext(ws); 
        setupDragAndDropContext(binDeck);
    }
}

function createCodeBlockNode(id, text) { 
    const row = document.createElement('div'); 
    row.id = id; 
    row.className = "parsons-row-container flex items-center gap-3 p-1 rounded-lg group transition-all duration-150 touch-none select-none"; 
    row.setAttribute("data-indent", "0"); 
    row.innerHTML = `
        <div class="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
            <button onclick="changeIndentation('${id}', -1)" class="w-5 h-5 flex items-center justify-center bg-neutral-800 text-neutral-400 rounded text-xs font-bold hover:bg-neutral-700 cursor-pointer">&lsaquo;</button>
            <button onclick="changeIndentation('${id}', 1)" class="w-5 h-5 flex items-center justify-center bg-neutral-800 text-neutral-400 rounded text-xs font-bold hover:bg-neutral-700 cursor-pointer">&rsaquo;</button>
        </div>
        <div draggable="true" class="flex-grow flex items-center bg-[#262626] border border-neutral-800 text-amber-100 rounded-lg py-2.5 px-4 cursor-grab active:cursor-grabbing border-l-4 border-l-amber-600/20 hover:border-l-amber-500 select-none">
            <span class="text-neutral-600 select-none mr-3 text-xs">☰</span>
            <span class="code-font text-xs whitespace-pre select-none">${text}</span>
        </div>`; 
    
    setupTouchContext(row);
    return row; 
}

function changeIndentation(id, dir) { 
    const el = document.getElementById(id); 
    if (!el) return;
    
    if (el.parentNode && el.parentNode.getAttribute('data-tray-type') === 'pool') return;

    let current = Math.max(0, Math.min(4, parseInt(el.getAttribute('data-indent'), 10) + dir)); 
    el.setAttribute('data-indent', current); 
    el.style.paddingLeft = `${current * 1.5}rem`; 
}

// ==========================================
// 3. CROSS-DECK DRAG & DROP PIPELINE (DESKTOP)
// ==========================================
function setupDragAndDropContext(container) { 
    container.addEventListener('dragstart', (e) => { 
        activeDraggedElement = e.target.closest('.parsons-row-container'); 
        activeDraggedElement?.classList.add('opacity-30'); 
    }); 
    container.addEventListener('dragend', () => { 
        if(!activeDraggedElement) return; 
        activeDraggedElement.classList.remove('opacity-30'); 
        
        if (activeDraggedElement.parentNode && activeDraggedElement.parentNode.getAttribute('data-tray-type') === 'pool') {
            activeDraggedElement.setAttribute('data-indent', '0');
            activeDraggedElement.style.paddingLeft = '0px';
        } else {
            playNudgeSound(); 
        }
        activeDraggedElement = null; 
    }); 
    container.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        const targetTray = container.closest('.drop-zone-tray');
        if (!targetTray || !activeDraggedElement) return;

        const targetRow = e.target.closest('.parsons-row-container'); 
        if (targetRow && targetRow !== activeDraggedElement) {
            const box = targetRow.getBoundingClientRect(); 
            if (e.clientY - box.top - box.height / 2 > 0) {
                targetRow.after(activeDraggedElement); 
            } else {
                targetRow.before(activeDraggedElement); 
            }
        } else if (!targetRow) {
            container.appendChild(activeDraggedElement);
        }
    }); 
}

// ==========================================
// 4. MULTI-TRAY INTERACTION MODULE (MOBILE)
// ==========================================
function setupTouchContext(rowElement) {
    rowElement.addEventListener('touchstart', (e) => {
        const row = e.target.closest('.parsons-row-container');
        if (!row) return;
        
        activeTouchElement = row;
        touchStartY = e.touches[0].clientY;
        
        const dragCard = row.querySelector('div[draggable="true"]');
        if (dragCard) {
            dragCard.classList.remove('border-neutral-800');
            dragCard.classList.add('border-amber-500', 'bg-neutral-800', 'scale-[1.01]', 'shadow-2xl');
        }
    }, { passive: true });

    rowElement.addEventListener('touchmove', (e) => {
        if (!activeTouchElement) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        e.preventDefault(); 
        
        const elementsAtPoint = document.elementsFromPoint(currentX, currentY);
        const targetTrayContainer = elementsAtPoint.find(el => el.classList.contains('drop-zone-tray'));
        
        if (targetTrayContainer) {
            const siblingRows = Array.from(targetTrayContainer.querySelectorAll('.parsons-row-container'))
                                    .filter(item => item !== activeTouchElement);
                                    
            const targetRow = siblingRows.find(item => {
                const box = item.getBoundingClientRect();
                return currentY >= box.top && currentY <= box.bottom;
            });

            if (targetRow) {
                const box = targetRow.getBoundingClientRect();
                if (currentY < (box.top + box.height / 2)) {
                    targetRow.before(activeTouchElement);
                } else {
                    targetRow.after(activeTouchElement);
                }
            } else if (siblingRows.length === 0 || currentY > targetTrayContainer.getBoundingClientRect().bottom - 40) {
                targetTrayContainer.appendChild(activeTouchElement);
            }
        }
    }, { passive: false });

    rowElement.addEventListener('touchend', () => {
        if (!activeTouchElement) return;
        
        const dragCard = activeTouchElement.querySelector('div[draggable="true"]');
        if (dragCard) {
            dragCard.classList.remove('border-amber-500', 'bg-neutral-800', 'scale-[1.01]', 'shadow-2xl');
            dragCard.classList.add('border-neutral-800');
        }
        
        if (activeTouchElement.parentNode && activeTouchElement.parentNode.getAttribute('data-tray-type') === 'pool') {
            activeTouchElement.setAttribute('data-indent', '0');
            activeTouchElement.style.paddingLeft = '0px';
        } else {
            playNudgeSound();
        }
        activeTouchElement = null;
    });
}

// ==========================================
// 5. EVALUATION COMPILER CORE (SEMANTIC FIX)
// ==========================================
function checkAnswer() { 
    const workspace = document.getElementById('parsons-workspace');
    if (!workspace) return;
    
    const rows = Array.from(workspace.children); 
    let isPerfect = true; 
    
    if (rows.length !== challengeData.correctOrder.length) {
        isPerfect = false;
    }

    rows.forEach((row, idx) => { 
        const codeFontEl = row.querySelector('.code-font');
        const inner = row.querySelector('div[draggable="true"]');
        if (!codeFontEl || !inner) return;

        const text = codeFontEl.innerText.trim();
        const indent = parseInt(row.getAttribute('data-indent'), 10);
        const expectedMatch = challengeData.correctOrder[idx]; 
        
        const normalizedText = text.replace(/"/g, "'");
        const normalizedMatch = expectedMatch ? expectedMatch.text.trim().replace(/"/g, "'") : "";
        
        if (expectedMatch && normalizedMatch === normalizedText && expectedMatch.indent === indent) {
            inner.classList.remove('border-neutral-800', 'border-red-600', 'bg-red-950/10');
            inner.classList.add('border-green-600', 'bg-green-950/10'); 
        } else { 
            isPerfect = false; 
            inner.classList.remove('border-neutral-800', 'border-green-600', 'bg-green-950/10');
            inner.classList.add('border-red-600', 'bg-red-950/10'); 
        } 
    }); 
    
    const panel = document.getElementById('feedback-panel'); 
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
            panel.className = "rounded-xl p-4 border border-green-800 bg-green-950/20 text-green-400 text-xs font-semibold"; 
            panel.innerHTML = `🎉 Perfect Sequence Execution! All code components compiled flawlessly.`; 
        }
    } else { 
        userScore = 0; 
        hasScoredThisSession = false; 
        updateScoreDisplay(); 
        playAudioTone(220, 0.35, 'sawtooth'); 
        
        if (panel) {
            panel.className = "rounded-xl p-4 border border-red-900/60 bg-red-950/20 text-red-400 text-xs"; 
            panel.innerHTML = `<strong>Logic Compilation Mismatch.</strong> Check row sequence bounds, remove distractors to the tray container below, and assert correct alignment depths.`; 
        }
    } 
}

// ==========================================
// 6. PRODUCTION PAYPAL CHECKOUT ENGINE
// ==========================================
function renderPaypalCheckout() {
    const btnContainer = document.getElementById('paypal-button-container');
    if (!btnContainer) return;
    
    btnContainer.innerHTML = '';
    btnContainer.classList.remove('hidden');
    
    if (typeof paypal === 'undefined') {
        btnContainer.innerHTML = `<div class="text-xs text-amber-500 bg-neutral-900/40 p-3 rounded-lg border border-neutral-800 font-mono">PayPal engine offline. To connect live processing, ensure the SDK script tag is active in your layout head template.</div>`;
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
                if (typeof playCashSplurgeSound === 'function') playCashSplurgeSound();
                if (typeof triggerCoinSplash === 'function') triggerCoinSplash();
                
                const secureToken = btoa(`unlocked_ocr_cs_revision_${details.orderID || 'verified'}`);
                localStorage.setItem('_p_sig_o_cs_', secureToken);
                
                btnContainer.innerHTML = `<div class="text-xs text-green-400 bg-green-950/20 p-4 rounded-xl border border-green-800 text-center font-semibold">🎉 Premium Access Unlocked successfully! Reloading workspace...</div>`;
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            });
        },
        onCancel: function (data) {
            btnContainer.insertAdjacentHTML('beforebegin', `
                <div id="paypal-status-msg" class="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 p-3 rounded-lg mb-3 transition-all duration-200">
                    ⚠️ Transaction canceled. No charges were processed.
                </div>
            `);
            setTimeout(() => document.getElementById('paypal-status-msg')?.remove(), 4000);
        },
        onError: function (err) {
            console.error("PayPal Pipeline Exception:", err);
            btnContainer.insertAdjacentHTML('beforebegin', `
                <div id="paypal-status-msg" class="text-xs text-red-400 bg-red-950/20 border border-red-900 p-3 rounded-lg mb-3 transition-all duration-200">
                    ❌ Payment processing error. Please verify your connection status.
                </div>
            `);
            setTimeout(() => document.getElementById('paypal-status-msg')?.remove(), 6000);
        }
    }).render('#paypal-button-container');
}

// ==========================================
// 7. RESPONSIVE LAYOUT ELEMENT LISTENERS
// ==========================================
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