// ==========================================
// CONFIGURATION: DEPLOYED TOKEN CONTRACT (CA)
// ==========================================
const DEPLOYED_COOKED_CA = "0x0000000000000000000000000000000000000000";

const SoundSystem = {
    audioCtx: null,
    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    playOrganTone() {
        this.init();
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
    },
    playCoinTone() {
        this.init();
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
    }
};

let provider;
let signer;

const ApplicationState = {
    points: 0,
    totalLossETH: 0.0000,
    userWallet: null,
    isVerified: false,
    poolCurrentETH: 0.015,
    poolTargetETH: 0.100,
    fcfsSpotsLeft: 500,
    loggedAddresses: new Set(),
    submittedQuestLinks: new Set(),
    graveyardRecords: [
        { address: "0x71C...89A1", type: "Failed Uniswap Swap", loss: "0.142 ETH", respects: 84 },
        { address: "0x3A2...91B4", type: "High Gwei Mint", loss: "0.089 ETH", respects: 39 }
    ]
};

const UnhingedEpitaphs = [
    "Put entire savings into a zero-liquidity dog memecoin.",
    "Bought the absolute top, panic-sold the bottom.",
    "Trusted a dev with 3 followers and an anime PFP on X.",
    "Slipped on 99% slippage and got completely liquidated.",
    "Chased a green candle straight into the abyss."
];

// MODAL CONTROLLERS
function openWalletModal() {
    const modal = document.getElementById('wallet-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeWalletModal() {
    const modal = document.getElementById('wallet-modal');
    if (modal) modal.classList.add('hidden');
}

// CONNECT TO SELECTED WALLET PROVIDER
async function executeWalletConnect(walletType) {
    closeWalletModal();
    
    try {
        let rawProvider = null;

        if (walletType === 'phantom' && window.phantom && window.phantom.ethereum) {
            rawProvider = window.phantom.ethereum;
        } else if (walletType === 'coinbase' && window.coinbaseWalletExtension) {
            rawProvider = window.coinbaseWalletExtension;
        } else if (window.ethereum) {
            rawProvider = window.ethereum;
        }

        if (!rawProvider) {
            alert(`Could not detect ${walletType.toUpperCase()} wallet extension! Make sure your wallet extension is enabled.`);
            return;
        }

        provider = new ethers.providers.Web3Provider(rawProvider);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        const account = await signer.getAddress();

        const message = `COOKED.ETH Verification\n\nConfirming ownership for Rewards Queue.\nAddress: ${account}`;
        await signer.signMessage(message);

        if (!ApplicationState.isVerified) {
            ApplicationState.userWallet = account;
            ApplicationState.isVerified = true;
            ApplicationState.points += 250;
        }

        try {
            const balanceWei = await provider.getBalance(account);
            const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei));
            const txCount = await provider.getTransactionCount(account);
            ApplicationState.totalLossETH = txCount > 0 ? (txCount * 0.0018) + (balanceEth * 0.05) : 0.0000;
        } catch (e) {
            ApplicationState.totalLossETH = 0.0000;
        }

        const pointsDisplay = document.getElementById('user-points');
        const lossDisplay = document.getElementById('user-total-loss');
        const walletStatusIndicator = document.getElementById('wallet-status-indicator');
        const btnHeaderConnect = document.getElementById('btn-header-connect');

        if (walletStatusIndicator) {
            walletStatusIndicator.innerText = `${account.substring(0, 6)}... (VERIFIED)`;
            walletStatusIndicator.classList.replace('bg-paper', 'bg-mint');
        }
        if (btnHeaderConnect) {
            btnHeaderConnect.innerText = `${account.substring(0, 6)}...`;
            btnHeaderConnect.classList.replace('bg-mustard', 'bg-mint');
        }
        if (pointsDisplay) pointsDisplay.innerText = `${ApplicationState.points.toLocaleString()} PTS`;
        if (lossDisplay) lossDisplay.innerText = `${ApplicationState.totalLossETH.toFixed(4)} ETH`;

        SoundSystem.playCoinTone();
        alert(`Successfully connected via ${walletType.toUpperCase()}! +500 Points added.`);

    } catch (err) {
        console.error("Wallet Connection Error:", err);
        if (err.code === 4001) {
            alert("Connection request was rejected.");
        } else {
            alert("Failed to connect wallet. Ensure your wallet extension is unlocked.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnTabMourn = document.getElementById('btn-tab-mourn');
    const btnTabEarn = document.getElementById('btn-tab-earn');
    const tabMourn = document.getElementById('tab-mourn');
    const tabEarn = document.getElementById('tab-earn');
    const btnSubmitCA = document.getElementById('btn-submit-ca');
    const inputCA = document.getElementById('ca-input');
    const graveyardFeed = document.getElementById('graveyard-feed');
    const pointsDisplay = document.getElementById('user-points');
    const lossDisplay = document.getElementById('user-total-loss');
    const tombstoneContainer = document.getElementById('tombstone-card-container');
    const tombTargetName = document.getElementById('tomb-target-name');
    const tombEpitaph = document.getElementById('tomb-epitaph');
    const tombLossVal = document.getElementById('tomb-loss-val');
    const btnDownloadCard = document.getElementById('btn-download-card');
    const poolProgressBar = document.getElementById('pool-progress-bar');
    const poolCurrentDisplay = document.getElementById('pool-current-eth');
    const fcfsSlotsBadge = document.getElementById('fcfs-slots-badge');
    const btnFcfsClaim = document.getElementById('btn-fcfs-claim');
    const btnConnectHeader = document.getElementById('btn-header-connect');
    const btnCloseModal = document.getElementById('btn-close-modal');

    // Attach Wallet Modal Trigger Listeners
    if (btnConnectHeader) btnConnectHeader.addEventListener('click', openWalletModal);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeWalletModal);

    document.querySelectorAll('.btn-wallet-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wallet = e.currentTarget.getAttribute('data-wallet');
            executeWalletConnect(wallet);
        });
    });

    function updateProgressBar() {
        if (poolProgressBar && poolCurrentDisplay && fcfsSlotsBadge) {
            const percentage = Math.min((ApplicationState.poolCurrentETH / ApplicationState.poolTargetETH) * 100, 100);
            poolProgressBar.style.width = `${percentage}%`;
            poolCurrentDisplay.innerText = `${ApplicationState.poolCurrentETH.toFixed(2)} ETH`;
            fcfsSlotsBadge.innerText = `${ApplicationState.fcfsSpotsLeft} / 500 LEFT`;
        }
    }
    updateProgressBar();

    function validateEthAddress(input) {
        return /^0x[a-fA-F0-9]{40}$/.test(input) \vert{}\vert{} /^0x[a-fA-F0-9]{66}$/.test(input);
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
                    SoundSystem.playOrganTone();
                    renderFeed();
                }
            });
        });
    }

    if (btnTabMourn && btnTabEarn && tabMourn && tabEarn) {
        btnTabMourn.addEventListener('click', () => {
            tabMourn.classList.remove('hidden');
            tabEarn.classList.add('hidden');
            btnTabMourn.classList.replace('bg-white', 'bg-mustard');
            btnTabEarn.classList.replace('bg-mustard', 'bg-white');
        });

        btnTabEarn.addEventListener('click', () => {
            tabEarn.classList.remove('hidden');
            tabMourn.classList.add('hidden');
            btnTabEarn.classList.replace('bg-white', 'bg-mustard');
            btnTabEarn.classList.replace('bg-mustard', 'bg-white');
        });
    }

    if (btnSubmitCA && inputCA && pointsDisplay && lossDisplay) {
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
            ApplicationState.points += 1000;
            const certLoss = ApplicationState.totalLossETH > 0 ? ApplicationState.totalLossETH : 0.0350;

            const shortAddr = `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
            ApplicationState.graveyardRecords.unshift({
                address: shortAddr,
                type: "Logged Trench CA",
                loss: `${certLoss.toFixed(4)} ETH`,
                respects: 1
            });

            pointsDisplay.innerText = `${ApplicationState.points.toLocaleString()} PTS`;
            
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
        btnDownloadCard.addEventListener('click', () => {
            const addr = ApplicationState.userWallet || "0x0000...0000";
            const loss = ApplicationState.totalLossETH > 0 ? ApplicationState.totalLossETH.toFixed(4) : "0.0350";
            const epitaph = document.getElementById('tomb-epitaph') ? document.getElementById('tomb-epitaph').innerText : "";

            const certContent = `====================================\n🔥 OFFICIAL COOKED CERTIFICATE OF PAIN 🔥\n====================================\n\nTarget Wallet: ${addr}\nEpitaph: ${epitaph}\nVerified Loss Metric: ${loss} ETH\nStatus: FRIED\n\nIssued by COOKED.ETH\nClaim your share: https://cooked.eth\n====================================`;

            navigator.clipboard.writeText(certContent).then(() => {
                alert('Certificate text copied to clipboard! Preparing text file download...');
            }).catch(() => {});

            const blob = new Blob([certContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Cooked_Certificate_${addr.substring(0, 6)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        });
    }

    document.querySelectorAll('.btn-submit-quest').forEach(button => {
        button.addEventListener('click', (e) => {
            const questId = e.currentTarget.getAttribute('data-quest');
            
            const tweetText = encodeURIComponent(`I'm officially certified COOKED on COOKED.ETH! Turning my trench losses into rewards. Join the raid: https://cooked.eth #COOKED`);
            window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');

            const handle = window.prompt('Enter your X username (without @):');
            if (!handle) return;

            const cleanHandle = handle.trim().replace('@', '').toLowerCase();
            if (!cleanHandle) return;

            const link = window.prompt(`Paste your direct X post URL for Campaign #${questId}:`);
            if (!link) return;

            const cleanLink = link.trim().toLowerCase();
            const xStatusRegex = /^https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+$/;

            if (!xStatusRegex.test(cleanLink)) {
                alert('Invalid URL format! Must be a direct tweet status link.');
                return;
            }

            if (!cleanLink.includes(`x.com/${cleanHandle}/`) && !cleanLink.includes(`twitter.com/${cleanHandle}/`)) {
                alert(`Security Rejection: This tweet link does NOT belong to @${cleanHandle}.`);
                return;
            }

            if (ApplicationState.submittedQuestLinks.has(cleanLink)) {
                alert('Error: This exact tweet URL has already been claimed.');
                return;
            }

            ApplicationState.submittedQuestLinks.add(cleanLink);
            ApplicationState.points += 1500;
            pointsDisplay.innerText = `${ApplicationState.points.toLocaleString()} PTS`;
            
            SoundSystem.playCoinTone();
            alert(`Verified Campaign #${questId} for @${cleanHandle}! +1,500 Points Added.`);
        });
    });

    if (btnFcfsClaim) {
        btnFcfsClaim.addEventListener('click', async () => {
            if (ApplicationState.points < 5000) {
                alert(`Insufficient points! You have ${ApplicationState.points.toLocaleString()} PTS. You need at least 5,000 PTS to claim.`);
                return;
            }

            if (!ApplicationState.isVerified || !ApplicationState.userWallet) {
                openWalletModal();
                return;
            }

            if (ApplicationState.fcfsSpotsLeft <= 0) {
                alert('Rewards Pool is fully exhausted! All 500 spots have been claimed.');
                return;
            }

            try {
                if (DEPLOYED_COOKED_CA === "0x0000000000000000000000000000000000000000") {
                    console.warn("CA is set to placeholder. Bypassing live ERC-20 check.");
                } else {
                    const minABI = ["function balanceOf(address owner) view returns (uint256)"];
                    const tokenContract = new ethers.Contract(DEPLOYED_COOKED_CA, minABI, provider);
                    const balance = await tokenContract.balanceOf(ApplicationState.userWallet);
                    
                    if (balance.eq(0)) {
                        alert("Token Gate Rejection: Insufficient COOKED token balance in wallet.");
                        return;
                    }
                }

                ApplicationState.fcfsSpotsLeft--;
                ApplicationState.points -= 5000;
                pointsDisplay.innerText = `${ApplicationState.points.toLocaleString()} PTS`;
                updateProgressBar();

                SoundSystem.playCoinTone();
                alert(`SUCCESS! Slot secured in Rewards Queue (${ApplicationState.fcfsSpotsLeft} spots remaining).`);
            } catch (err) {
                console.error(err);
                alert("Token verification failed.");
            }
        });
    }

    renderFeed();
});