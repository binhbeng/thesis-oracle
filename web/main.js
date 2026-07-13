import { 
  Contract, 
  rpc as StellarRpc, 
  TransactionBuilder, 
  Networks, 
  Account, 
  xdr, 
  Address, 
  scValToNative,
  Transaction
} from "@stellar/stellar-sdk";

import { 
  isConnected, 
  getPublicKey, 
  signTransaction 
} from "@stellar/freighter-api";

// Config
const contractId = "CCZI2TFXGPQGXKNYSKGHYJWONJINEAXINEO7W3EQBYSFNVU5TB5EVZA7";
const rpcUrl = "https://soroban-testnet.stellar.org";
const server = new StellarRpc.Server(rpcUrl);
const networkPassphrase = Networks.TESTNET;
const contract = new Contract(contractId);

// App State
let userAddress = "";
let voteDecision = true; // true = approve, false = reject

// UI elements
const walletDot = document.getElementById("walletDot");
const walletStatusText = document.getElementById("walletStatusText");
const connectBtn = document.getElementById("connectBtn");
const addressArea = document.getElementById("addressArea");
const userAddressSpan = document.getElementById("userAddress");
const disconnectBtn = document.getElementById("disconnectBtn");
const copyAddressBtn = document.getElementById("copyAddressBtn");

const terminalLogs = document.getElementById("terminalLogs");
const clearLogsBtn = document.getElementById("clearLogsBtn");

// Display contract ID
document.getElementById("contractIdText").textContent = `${contractId.slice(0, 8)}...${contractId.slice(-8)}`;

// Helper: Print log to terminal
function log(msg, type = "system") {
  const line = document.createElement("div");
  line.className = `log-line ${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  terminalLogs.appendChild(line);
  terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// Helper: Print tx link to terminal
function logTx(hash) {
  const line = document.createElement("div");
  line.className = `log-line tx-hash`;
  
  const span = document.createElement("span");
  span.textContent = `Transaction submitted: `;
  line.appendChild(span);
  
  const link = document.createElement("a");
  link.href = `https://stellar.expert/explorer/testnet/tx/${hash}`;
  link.target = "_blank";
  link.textContent = hash;
  line.appendChild(link);
  
  terminalLogs.appendChild(line);
  terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// Tabs switching logic
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanes = document.querySelectorAll(".tab-pane");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    tabPanes.forEach(p => p.classList.remove("active"));
    
    btn.classList.add("active");
    const tabId = btn.getAttribute("data-tab");
    document.getElementById(tabId).classList.add("active");
  });
});

// Vote decision buttons
const voteApproveBtn = document.getElementById("voteApproveBtn");
const voteRejectBtn = document.getElementById("voteRejectBtn");

voteApproveBtn.addEventListener("click", () => {
  voteDecision = true;
  voteApproveBtn.classList.add("active");
  voteRejectBtn.classList.remove("active");
});

voteRejectBtn.addEventListener("click", () => {
  voteDecision = false;
  voteRejectBtn.classList.add("active");
  voteApproveBtn.classList.remove("active");
});

// Clear console
clearLogsBtn.addEventListener("click", () => {
  terminalLogs.innerHTML = `<div class="log-line system">Console cleared.</div>`;
});

// Update UI on wallet connect
function updateWalletUI(address) {
  userAddress = address;
  if (address) {
    walletDot.className = "status-dot connected";
    walletStatusText.textContent = "Freighter Connected";
    connectBtn.classList.add("hidden");
    addressArea.classList.remove("hidden");
    userAddressSpan.textContent = `${address.slice(0, 6)}...${address.slice(-6)}`;
    
    // Autofill addresses for user convenience
    document.getElementById("candidateAddress").value = address;
    document.getElementById("committeeAddress").value = address;
    document.getElementById("chairAddressInit").value = address;
    document.getElementById("chairAddressFinalize").value = address;
    
    log(`Wallet connected successfully: ${address}`, "success");
  } else {
    walletDot.className = "status-dot disconnected";
    walletStatusText.textContent = "Freighter Disconnected";
    connectBtn.classList.remove("hidden");
    addressArea.classList.add("hidden");
    userAddressSpan.textContent = "";
    
    log("Wallet disconnected", "warn");
  }
}

// Connect Wallet handler
async function handleConnect() {
  log("Connecting to Freighter...", "system");
  try {
    if (!await isConnected()) {
      log("Freighter extension is not installed. Please install Freighter to proceed.", "error");
      alert("Freighter Wallet extension is not installed. Please download it at freighter.app");
      return;
    }
    const pubKey = await getPublicKey();
    updateWalletUI(pubKey);
  } catch (err) {
    log(`Failed to connect wallet: ${err.message}`, "error");
  }
}

// Disconnect Wallet handler
function handleDisconnect() {
  updateWalletUI("");
}

// Copy address handler
copyAddressBtn.addEventListener("click", () => {
  if (userAddress) {
    navigator.clipboard.writeText(userAddress);
    log("Address copied to clipboard", "system");
    const prevText = copyAddressBtn.textContent;
    copyAddressBtn.textContent = "✓";
    setTimeout(() => {
      copyAddressBtn.textContent = prevText;
    }, 1500);
  }
});

connectBtn.addEventListener("click", handleConnect);
disconnectBtn.addEventListener("click", handleDisconnect);

// Common read-only query helper
async function callReadOnly(fnName, ...args) {
  // Use connected user address, or a dummy address if not connected
  const dummyPublicKey = "GCWY3M4VRW4NXJRI7IVAU3CC7XOPN6PRBG6I5M7TAOQNKZXLT3KAH362";
  const sourcePubKey = userAddress || dummyPublicKey;
  
  try {
    // Build transaction with sequence number "0" for simulation
    const tx = new TransactionBuilder(
      new Account(sourcePubKey, "0"),
      {
        fee: "100",
        networkPassphrase,
      }
    )
      .addOperation(contract.call(fnName, ...args))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (StellarRpc.Api.isSimulationSuccess(sim)) {
      const retval = sim.result.retval;
      return scValToNative(retval);
    } else {
      throw new Error(`Simulation failed for ${fnName}`);
    }
  } catch (e) {
    throw e;
  }
}

// Query Thesis Status Handler
const queryBtn = document.getElementById("queryBtn");
const queryThesisIdInput = document.getElementById("queryThesisId");
const queryResultCard = document.getElementById("queryResult");

const resIdSpan = document.getElementById("resId");
const resBadge = document.getElementById("resBadge");
const resVoteCountSpan = document.getElementById("resVoteCount");

queryBtn.addEventListener("click", async () => {
  const idVal = queryThesisIdInput.value;
  if (!idVal) {
    alert("Please enter a valid Thesis ID.");
    return;
  }
  
  const thesisId = Number(idVal);
  queryBtn.disabled = true;
  log(`Querying contract state for Thesis ID: ${thesisId}...`, "system");
  
  try {
    const voteCount = await callReadOnly("vote_count", xdr.ScVal.scvU32(thesisId));
    const resultSymbol = await callReadOnly("result", xdr.ScVal.scvU32(thesisId));
    
    // Update UI
    resIdSpan.textContent = thesisId;
    resVoteCountSpan.textContent = voteCount;
    resBadge.textContent = resultSymbol;
    resBadge.className = `badge ${resultSymbol.toLowerCase()}`;
    
    queryResultCard.classList.remove("hidden");
    log(`Query success! Thesis ${thesisId} has ${voteCount} votes and result is "${resultSymbol}".`, "success");
  } catch (err) {
    log(`Query failed: ${err.message}`, "error");
    alert("Failed to query contract state. Check console logs for details.");
  } finally {
    queryBtn.disabled = false;
  }
});

// Transaction Submission Flow Helper (Write operations)
async function executeWriteTx(operation) {
  if (!userAddress) {
    log("Error: Wallet not connected. Please connect Freighter first.", "error");
    alert("Please connect your Freighter wallet to execute write transactions.");
    return null;
  }
  
  log("Starting transaction pipeline...", "system");
  try {
    // 1. Fetch account sequence
    log("Fetching source account sequence number...", "system");
    const account = await server.getAccount(userAddress);
    
    // 2. Build initial transaction
    log("Building initial transaction...", "system");
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
      
    // 3. Simulate to calculate resources/footprint
    log("Simulating transaction resources...", "system");
    const sim = await server.simulateTransaction(tx);
    if (!StellarRpc.Api.isSimulationSuccess(sim)) {
      log("Simulation failed! Check if contract rules are satisfied (e.g. unique ID, only chair permissions, etc.)", "error");
      if (sim.error) {
        log(`Simulation error: ${sim.error}`, "error");
      }
      throw new Error("Transaction simulation failed");
    }
    
    // 4. Assemble resources into transaction
    log("Assembling footprint and resource fees into transaction...", "system");
    const assembledBuilder = server.assembleTransaction(tx, sim);
    const finalTx = assembledBuilder.build();
    
    // 5. Sign transaction via Freighter
    log("Requesting signature from Freighter wallet...", "system");
    const signedXdr = await signTransaction(finalTx.toXDR(), {
      networkPassphrase,
    });
    
    // 6. Submit transaction
    log("Submitting signed transaction on-chain...", "system");
    const submission = await server.sendTransaction(new Transaction(signedXdr, networkPassphrase));
    
    if (submission.status === "ERROR") {
      throw new Error(`RPC submission error: ${JSON.stringify(submission.errorResult)}`);
    }
    
    const txHash = submission.hash;
    logTx(txHash);
    log("Transaction sent! Waiting for network ledger consensus...", "system");
    
    // 7. Poll status until complete
    let status = submission.status;
    let txStatus = null;
    let retries = 0;
    const maxRetries = 15;
    
    while (status === "PENDING" && retries < maxRetries) {
      await new Promise(r => setTimeout(r, 2000));
      txStatus = await server.getTransaction(txHash);
      status = txStatus.status;
      retries++;
      log(`Transaction status: ${status}...`, "system");
    }
    
    if (status === "SUCCESS") {
      log("Transaction finalized successfully in a ledger!", "success");
      return txStatus;
    } else if (status === "FAILED") {
      log("Transaction execution failed on-chain.", "error");
      throw new Error("On-chain execution failed");
    } else {
      log("Transaction is taking longer than expected. Please check explorer status.", "warn");
      throw new Error("Transaction polling timeout");
    }
  } catch (err) {
    log(`Transaction pipeline failed: ${err.message}`, "error");
    alert(`Transaction failed: ${err.message}`);
    throw err;
  }
}

// 1. Propose Thesis Handler
const proposeBtn = document.getElementById("proposeBtn");
proposeBtn.addEventListener("click", async () => {
  const candidateInput = document.getElementById("candidateAddress").value;
  const thesisIdInput = document.getElementById("proposeThesisId").value;
  const titleHashInput = document.getElementById("proposeTitleHash").value;
  
  if (!candidateInput || !thesisIdInput || !titleHashInput) {
    alert("Please fill in all the proposal fields.");
    return;
  }
  
  try {
    proposeBtn.disabled = true;
    const thesisId = Number(thesisIdInput);
    const candidateAddress = Address.fromString(candidateInput);
    
    log(`Submitting proposal for Thesis ID: ${thesisId}...`, "system");
    
    const operation = contract.call(
      "propose_thesis",
      candidateAddress.toScVal(),
      xdr.ScVal.scvU32(thesisId),
      xdr.ScVal.scvSymbol(titleHashInput)
    );
    
    const receipt = await executeWriteTx(operation);
    if (receipt) {
      log(`Thesis proposal ${thesisId} recorded!`, "success");
      alert(`Thesis Proposal ${thesisId} registered successfully!`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    proposeBtn.disabled = false;
  }
});

// 2. Cast Vote Handler
const voteBtn = document.getElementById("voteBtn");
voteBtn.addEventListener("click", async () => {
  const committeeInput = document.getElementById("committeeAddress").value;
  const thesisIdInput = document.getElementById("voteThesisId").value;
  
  if (!committeeInput || !thesisIdInput) {
    alert("Please fill in all the vote fields.");
    return;
  }
  
  try {
    voteBtn.disabled = true;
    const thesisId = Number(thesisIdInput);
    const committeeAddress = Address.fromString(committeeInput);
    
    log(`Casting vote for Thesis ID ${thesisId}: ${voteDecision ? 'Approve' : 'Reject'}...`, "system");
    
    const operation = contract.call(
      "cast_vote",
      committeeAddress.toScVal(),
      xdr.ScVal.scvU32(thesisId),
      xdr.ScVal.scvBool(voteDecision)
    );
    
    const receipt = await executeWriteTx(operation);
    if (receipt) {
      log(`Vote recorded successfully for Thesis ID: ${thesisId}!`, "success");
      alert("Vote cast successfully!");
    }
  } catch (err) {
    console.error(err);
  } finally {
    voteBtn.disabled = false;
  }
});

// 3. Initialize Contract Handler
const initBtn = document.getElementById("initBtn");
initBtn.addEventListener("click", async () => {
  const chairInput = document.getElementById("chairAddressInit").value;
  
  if (!chairInput) {
    alert("Please fill in the chair address.");
    return;
  }
  
  try {
    initBtn.disabled = true;
    const chairAddress = Address.fromString(chairInput);
    
    log(`Initializing contract with chair: ${chairInput}...`, "system");
    
    const operation = contract.call(
      "init",
      chairAddress.toScVal()
    );
    
    const receipt = await executeWriteTx(operation);
    if (receipt) {
      log("Contract initialized successfully!", "success");
      alert("Contract initialized successfully!");
    }
  } catch (err) {
    console.error(err);
  } finally {
    initBtn.disabled = false;
  }
});

// 4. Finalize Defense Handler
const finalizeBtn = document.getElementById("finalizeBtn");
finalizeBtn.addEventListener("click", async () => {
  const chairInput = document.getElementById("chairAddressFinalize").value;
  const thesisIdInput = document.getElementById("finalizeThesisId").value;
  
  if (!chairInput || !thesisIdInput) {
    alert("Please fill in all the finalization fields.");
    return;
  }
  
  try {
    finalizeBtn.disabled = true;
    const thesisId = Number(thesisIdInput);
    const chairAddress = Address.fromString(chairInput);
    
    log(`Finalizing defense for Thesis ID ${thesisId}...`, "system");
    
    const operation = contract.call(
      "finalize",
      chairAddress.toScVal(),
      xdr.ScVal.scvU32(thesisId)
    );
    
    const receipt = await executeWriteTx(operation);
    if (receipt) {
      // Decode result from receipt to display what the result was
      try {
        const xdrResult = receipt.resultXdr;
        const txResult = xdr.TransactionResult.fromXDR(xdrResult, "base64");
        // Result is in operations results
        const opResults = txResult.result().results();
        const mainResult = opResults[0].tr().invokeHostFunctionResult().success();
        const outcome = scValToNative(mainResult);
        
        log(`Defense outcome finalized on-chain: "${outcome}"`, "success");
        alert(`Defense finalized successfully! Result: ${outcome}`);
      } catch (e) {
        log("Defense finalized, but failed to parse outcome from receipt. Please query status manually.", "warn");
        alert("Defense finalized successfully!");
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    finalizeBtn.disabled = false;
  }
});

// Check wallet status initially
(async () => {
  try {
    if (await isConnected()) {
      const pubKey = await getPublicKey();
      if (pubKey) {
        updateWalletUI(pubKey);
      }
    }
  } catch (e) {
    console.log("Freighter not detected or initial check failed.");
  }
})();