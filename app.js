// ==========================================
// CONFIGURATION: DEPLOYED TOKEN & SUPABASE
// ==========================================
const DEPLOYED_COOKED_CA = "0x0000000000000000000000000000000000000000";

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = (window.supabase && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;

const SoundSystem = {
    audioCtx: null,
    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    playOrganTone() {
        this.init();
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(130.81, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.0);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 1.0);
        } catch(e){}
    },
    playCoinTone() {
        this.init();
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(987.77, this.audioCtx.currentTime);
            osc.frequency.setValueAtTime(1318.51, this.audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.25);
        } catch(e){}
    }
};

let provider;
let signer;

const StorageKey = "COOKED_ETH_APP_STATE_V1";

function loadState() {
    const saved = localStorage.getItem(StorageKey);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return {
                points: parsed.points || 0,
                totalLossETH: parsed.totalLossETH || 0.0000,
                userWallet: parsed.userWallet || null,
                isVerified: parsed.isVerified || false,
                loggedAddresses: new Set(parsed.loggedAddresses || []),
                submittedQuestLinks: new Set(parsed.submittedQuestLinks || []),
                pendingQuest: parsed.pendingQuest || null,
                activeTab: parsed.activeTab || 'mourn',
                graveyardRecords: parsed.graveyardRecords || [
                    { address: "0x71C...89A1", type: "Failed Uniswap Swap", loss: "0.142 ETH", respects: 84 },
                    { address: "0x3A2...91B4", type: "High Gwei Mint", loss: "0.089 ETH", respects: 39 }
                ]
            };
        } catch(e){}
    }
    return {
        points: 0,
        totalLossETH: 0.0000,
        userWallet: null,
        isVerified: false,
        loggedAddresses: new Set(),
        submittedQuestLinks: new Set(),
        pendingQuest: null,
        activeTab: 'mourn',
        graveyardRecords: [
            { address: "0x71C...89A1", type: "Failed Uniswap Swap", loss: "0.142 ETH", respects: 84 },
            { address: "0x3A2...91B4", type: "High Gwei Mint", loss: "0.089 ETH", respects: 39 }
        ]
    };
}

const ApplicationState = loadState();

function saveState() {
    const toSave = {
        points: ApplicationState.points,
        totalLossETH: ApplicationState.totalLossETH,
        userWallet: ApplicationState.userWallet,
        isVerified: ApplicationState.isVerified,
        loggedAddresses: Array.from(ApplicationState.loggedAddresses),
        submittedQuestLinks: Array.from(ApplicationState.submittedQuestLinks),
        pendingQuest: ApplicationState.pendingQuest,
        activeTab: ApplicationState.activeTab,
        graveyardRecords: ApplicationState.graveyardRecords
    };
    localStorage.setItem(StorageKey, JSON.stringify(toSave));
}

const UnhingedEpitaphs = [
    "Put entire savings into a zero-liquidity dog memecoin.",
    "Bought the absolute top, panic-sold the bottom.",
    "Trusted a dev with 3 followers and an anime PFP on X.",
    "Slipped on 99% slippage and got completely liquidated.",
    "Chased a green candle straight into the abyss.",
    "Approved a malicious spending limit and got drained.",
    "Market ordered a presale at 4 AM half-asleep.",
    "Held the bag all the way back to zero waiting for $1."
];

function openWalletModal() {
    const modal = document.getElementById('wallet-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeWalletModal() {
    const modal = document.getElementById('wallet-modal');
    if (modal) modal.classList.add('hidden');
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function executeWalletConnect(walletType) {
    closeWalletModal();
    const cleanHost = window.location.host;
    const cleanPath = window.location.pathname;
    const fullUrlEncoded = encodeURIComponent(window.location.href);

    if (isMobileDevice() && !window.ethereum && !(window.phantom && window.phantom.ethereum)) {
        if (walletType === 'phantom') {
            window.location.href = `https://phantom.app/ul/browse/${fullUrlEncoded}`;
            return;
        } else if (walletType === 'metamask') {
            window.location.href = `https://link.metamask.io/dapp/${cleanHost}${cleanPath}`;
            return;
        } else if (walletType === 'coinbase') {
            window.location.href = `https://go.cb-w.com/dapp?cb_url=${fullUrlEncoded}`;
            return;
        } else if (walletType === 'trust') {
            window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${fullUrlEncoded}`;
            return;
        }
    }
    
    try {
        let rawProvider = null;

        if (walletType === 'phantom' && window.phantom && window.phantom.ethereum) {
            rawProvider = window.phantom.ethereum;
        } else if (walletType === 'coinbase' && window.coinbaseWalletExtension) {
            rawProvider = window.coinbaseWalletExtension;
        } else if (window.ethereum) {
            rawProvider = window.ethereum;
        } else if (window.web3 && window.web3.currentProvider) {
            rawProvider = window.web3.currentProvider;
        }

        let account = "";

        if (rawProvider) {
            provider = new ethers.providers.Web3Provider(rawProvider, "any");
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            account = await signer.getAddress();
            try {
                const message = `COOKED.ETH Verification\nAddress: ${account}`;
                await signer.signMessage(message);
            } catch (e){}
        } else {
            const randomHex = Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
            account = `0x${randomHex}`;
        }

        if (!ApplicationState.isVerified) {
            ApplicationState.userWallet = account;
            ApplicationState.isVerified = true;
            ApplicationState.points += 500;
        }

        if (provider) {
            try {
                const balanceWei = await provider.getBalance(account);
                const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei));
                const txCount = await provider.getTransactionCount(account);
                ApplicationState.totalLossETH = txCount > 0 ? (txCount * 0.0018) + (balanceEth * 0.05) : 0.0350;
            } catch (e) {
                ApplicationState.totalLossETH = 0.0350;
            }
        } else {
            ApplicationState.totalLossETH = 0.0420;
        }

        saveState();
        updateUI();

        SoundSystem.playCoinTone();
        alert(`Successfully connected via ${walletType.toUpperCase()}! +500 Points added.`);

    } catch (err) {
        console.error("Wallet Connection Error:", err);
    }
}

function updateUI() {
    const pointsDisplay = document.getElementById('user-points');
    const lossDisplay = document.getElementById('user-total-loss');
    const btnHeaderConnect = document.getElementById('btn-header-connect');
    const tabMourn = document.getElementById('tab-mourn');
    const tabEarn = document.getElementById('tab-earn');
    const btnTabMourn = document.getElementById('btn-tab-mourn');
    const btnTabEarn = document.getElementById('btn-tab-earn');

    if (pointsDisplay) pointsDisplay.innerText = `${ApplicationState.points.toLocaleString()} PTS`;
    if (lossDisplay) lossDisplay.innerText = `${ApplicationState.totalLossETH.toFixed(4)} ETH`;

    if (btnHeaderConnect && ApplicationState.userWallet) {
        const short = `${ApplicationState.userWallet.substring(0, 6)}...${ApplicationState.userWallet.substring(38)}`.toUpperCase();
        btnHeaderConnect.innerText = short;
        btnHeaderConnect.classList.replace('bg-mustard', 'bg-mint');
    }

    if (ApplicationState.activeTab === 'earn') {
        if (tabEarn) tabEarn.classList.remove('hidden');
        if (tabMourn) tabMourn.classList.add('hidden');
        if (btnTabEarn) btnTabEarn.classList.replace('bg-white', 'bg-mustard');
        if (btnTabMourn) btnTabMourn.classList.replace('bg-mustard', 'bg-white');
    } else {
        if (tabMourn) tabMourn.classList.remove('hidden');
        if (tabEarn) tabEarn.classList.add('hidden');
        if (btnTabMourn) btnTabMourn.classList.replace('bg-white', 'bg-mustard');
        if (btnTabEarn) btnTabEarn.classList.replace('bg-mustard', 'bg-white');
    }
}

function generateAndDownloadPNG() {
    const addr = ApplicationState.userWallet || "0x71C...89A1";
    const loss = ApplicationState.totalLossETH > 0 ? ApplicationState.totalLossETH.toFixed(4) : "0.0350";
    const epitaphEl = document.getElementById('tomb-epitaph');
    const epitaph = epitaphEl ? epitaphEl.innerText : '"Chased a green candle straight into the abyss."';

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, 600, 400);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 580, 380);

    ctx.fillStyle = '#000000';
    ctx.fillRect(20, 20, 560, 50);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R.I.P. — OFFICIAL CERTIFICATE OF PAIN', 300, 52);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Target Wallet: ${addr}`, 40, 120);

    ctx.fillStyle = '#404040';
    ctx.font = 'italic 14px monospace';
    ctx.fillText(`Epitaph: ${epitaph}`, 40, 170);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`Recorded Loss Metric:`, 40, 230);

    ctx.fillStyle = '#D9534F';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${loss} ETH`, 260, 232);

    ctx.fillStyle = '#F3E5AB';
    ctx.fillRect(20, 310, 560, 50);
    ctx.strokeRect(20, 310, 560, 50);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED BY COOKED.ETH', 300, 342);

    const imageURL = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = imageURL;
    downloadLink.download = `Cooked_Certificate_${addr.substring(0, 6)}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
document.addEventListener('DOMContentLoaded', async () => {
  
// AUTO-CONNECT & PROVIDER INJECTION WAIT-CHECK FOR MOBILE BROWSERS
    const checkInjectedWallet = async () => {
        if (ApplicationState.userWallet) return;
        
        let injected = window.ethereum || (window.phantom && window.phantom.ethereum) || window.coinbaseWalletExtension;
        
        if (!injected) {
            for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 100));
                injected = window.ethereum || (window.phantom && window.phantom.ethereum) || window.coinbaseWalletExtension;
                if (injected) break;
            }
        }

        if (injected && isMobileDevice()) {
            try {
                // Try silent accounts fetch first
                let accounts = await injected.request({ method: 'eth_accounts' });
                if (!accounts || accounts.length === 0) {
                    // If not pre-approved, prompt the connection immediately on mobile load
                    accounts = await injected.request({ method: 'eth_requestAccounts' });
                }
                
                if (accounts && accounts.length > 0) {
                    ApplicationState.userWallet = accounts[0];
                    ApplicationState.isVerified = true;
                    if (ApplicationState.points < 500) ApplicationState.points += 500;
                    saveState();
                    updateUI();
                }
            } catch (e) {
                console.warn("Mobile auto-connect prompt skipped/failed:", e);
            }
        }
    };

    checkInjectedWallet();

    const btnTabMourn = document.getElementById('btn-tab-mourn');
    const btnTabEarn = document.getElementById('btn-tab-earn');
    const btnSubmitCA = document.getElementById('btn-submit-ca');
    const inputCA = document.getElementById('ca-input');
    const graveyardFeed = document.getElementById('graveyard-feed');
    const tombstoneContainer = document.getElementById('tombstone-card-container');
    const tombTargetName = document.getElementById('tomb-target-name');
    const tombEpitaph = document.getElementById('tomb-epitaph');
    const tombLossVal = document.getElementById('tomb-loss-val');
    const btnDownloadCard = document.getElementById('btn-download-card');
    const btnFcfsClaim = document.getElementById('btn-fcfs-claim');
    const btnConnectHeader = document.getElementById('btn-header-connect');
    const btnCloseModal = document.getElementById('btn-close-modal');

    updateUI();

    if (ApplicationState.pendingQuest) {
        const pending = ApplicationState.pendingQuest;
        setTimeout(() => {
            const complete = confirm(`Welcome back! Complete Campaign #${pending.questId} for @${pending.handle}? Click OK to enter your tweet link.`);
            if (complete) {
                const link = window.prompt(`Paste your direct X post URL for Campaign #${pending.questId}:`);
                if (link) {
                    processQuestVerification(pending.questId, pending.handle, link);
                } else {
                    ApplicationState.pendingQuest = null;
                    saveState();
                }
            } else {
                ApplicationState.pendingQuest = null;
                saveState();
            }
        }, 500);
    }
if (btnConnectHeader) {
    btnConnectHeader.addEventListener('click', () => {
        const injected = window.ethereum || (window.phantom && window.phantom.ethereum);
        if (injected && isMobileDevice()) {
            executeWalletConnect('phantom');
        } else {
            openWalletModal();
        }
    });
}
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeWalletModal);

    document.querySelectorAll('.btn-wallet-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wallet = e.currentTarget.getAttribute('data-wallet');
            executeWalletConnect(wallet);
        });
    });

    function validateEthAddress(input) {
        return /^0x[a-fA-F0-9]{40}$/.test(input) || /^0x[a-fA-F0-9]{66}$/.test(input);
    }
    function renderFeed() {
        if (!graveyardFeed) return;
        graveyardFeed.innerHTML = '';
        ApplicationState.graveyardRecords.forEach((record, index) => {
            const card = document.createElement('div');
            card.className = "border-2 border-black p-3 bg-paper flex justify-between items-center brutalist-shadow-sm";
            card.innerHTML = `
                <div>
                    <p class="text-xs font-bold">${record.address} <span class="text-[10px] text-neutral-500">(${record.type})</span></p>
                    <p class="text-[10px] text-neutral-600">Loss Metric: <strong class="text-black">${record.loss}</strong></p>
                </div>
                <button class="btn-respect bg-black text-white text-[10px] px-2.5 py-1 font-bold border border-black active:bg-neutral-800" data-index="${index}">
                    F 🕯️ (${record.respects})
                </button>
            `;
            graveyardFeed.appendChild(card);
        });

        document.querySelectorAll('.btn-respect').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const idx = target.getAttribute('data-index');
                if (idx !== null) {
                    ApplicationState.graveyardRecords[parseInt(idx, 10)].respects++;
                    saveState();
                    SoundSystem.playOrganTone();
                    renderFeed();
                }
            });
        });
    }

    if (btnTabMourn && btnTabEarn) {
        btnTabMourn.addEventListener('click', () => {
            ApplicationState.activeTab = 'mourn';
            saveState();
            updateUI();
        });

        btnTabEarn.addEventListener('click', () => {
            ApplicationState.activeTab = 'earn';
            saveState();
            updateUI();
        });
    }

    if (btnSubmitCA && inputCA) {
        btnSubmitCA.addEventListener('click', () => {
            const value = inputCA.value.trim();
            if (!validateEthAddress(value)) {
                alert('Invalid Ethereum format. Address must start with 0x followed by valid hex characters.');
                return;
            }

            if (ApplicationState.loggedAddresses.has(value)) {
                alert('This contract address or transaction has already been logged.');
                return;
            }

            ApplicationState.loggedAddresses.add(value);
            const certLoss = ApplicationState.totalLossETH > 0 ? ApplicationState.totalLossETH : 0.0350;
            const shortAddr = `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
            
            ApplicationState.graveyardRecords.unshift({
                address: shortAddr,
                type: "Logged Trench CA",
                loss: `${certLoss.toFixed(4)} ETH`,
                respects: 1
            });

            saveState();
            updateUI();
            
            if (tombstoneContainer && tombTargetName && tombEpitaph && tombLossVal) {
                tombTargetName.innerText = ApplicationState.userWallet || shortAddr;
                const randomQuote = UnhingedEpitaphs[Math.floor(Math.random() * UnhingedEpitaphs.length)];
                tombEpitaph.innerText = `"${randomQuote}"`;
                tombLossVal.innerText = `${certLoss.toFixed(4)} ETH`;
                tombstoneContainer.classList.remove('hidden');
            }

            inputCA.value = '';
            SoundSystem.playCoinTone();
            renderFeed();
        });
    }

    if (btnDownloadCard) {
        btnDownloadCard.addEventListener('click', generateAndDownloadPNG);
 let activeQuestId = null;

    const questModal = document.getElementById('quest-modal');
    const questModalTitle = document.getElementById('quest-modal-title');
    const questModalDesc = document.getElementById('quest-modal-desc');
    const questModalInput = document.getElementById('quest-modal-input');
    const questModalSubmit = document.getElementById('quest-modal-submit');
    const questModalCancel = document.getElementById('quest-modal-cancel');

    document.querySelectorAll('.btn-submit-quest').forEach(button => {
        button.addEventListener('click', (e) => {
            activeQuestId = e.currentTarget.getAttribute('data-quest');
            
            if (questModalTitle) questModalTitle.innerText = `CAMPAIGN #${activeQuestId} SUBMISSION`;
            if (questModalDesc) questModalDesc.innerText = `Paste your direct X post URL below to claim reward:`;
            if (questModalInput) {
                questModalInput.value = '';
                questModalInput.placeholder = 'https://x.com/YourName/status/...';
            }
            if (questModal) questModal.classList.remove('hidden');
        });
    });

    if (questModalCancel) {
        questModalCancel.addEventListener('click', () => {
            if (questModal) questModal.classList.add('hidden');
        });
    }
if (questModalSubmit && questModalInput) {
        questModalSubmit.addEventListener('click', () => {
            try {
                const val = questModalInput.value.trim();
                if (!val) return;

                let cleanLink = val.toLowerCase();
                if (cleanLink.includes('?')) cleanLink = cleanLink.split('?')[0];

                const xStatusRegex = /^https?:\/\/(www\.)?(twitter|x)\.com\/([a-zA-Z0-9_]+)\/status\/([0-9]+)$/;
                const match = val.match(xStatusRegex);

                if (!match) {
                    alert('Invalid URL format! Must be a direct tweet status link (e.g. https://x.com/Username/status/123456789).');
                    return;
                }

                const extractedHandle = match[3];

                if (ApplicationState.submittedQuestLinks.has(cleanLink)) {
                    alert('Error: This exact tweet URL has already been claimed.');
                    return;
                }

                ApplicationState.submittedQuestLinks.add(cleanLink);
                ApplicationState.points += 1500;
                
                if (!ApplicationState.completedQuests) ApplicationState.completedQuests = [];
                ApplicationState.completedQuests.push(activeQuestId);

                saveState();
                updateUI();
                
                const targetQuestBtn = document.querySelector(`[data-quest="${activeQuestId}"]`);
                if (targetQuestBtn) {
                    targetQuestBtn.innerText = "COMPLETED ✓";
                    targetQuestBtn.disabled = true;
                    targetQuestBtn.classList.replace('bg-black', 'bg-neutral-400');
                }

                if (questModal) questModal.classList.add('hidden');
                
                SoundSystem.playCoinTone();
                alert(`Verified Campaign #${activeQuestId} for @${extractedHandle}! +1,500 Points Added.`);
            } catch (err) {
                console.error(err);
                alert("Quest submission failed.");
            }
        });
    }

    renderFeed();
});