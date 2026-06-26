import { Contract } from "@stellar/stellar-sdk";

const contractId =
  "CCZI2TFXGPQGXKNYSKGHYJWONJINEAXINEO7W3EQBYSFNVU5TB5EVZA7";

const contract = new Contract(contractId);

document.getElementById("app").innerHTML = `
  <h1>Thesis Oracle</h1>

  <button id="voteCountBtn">Get Vote Count</button>
  <input id="thesisId" placeholder="Thesis ID" />

  <button id="resultBtn">Get Result</button>

  <pre id="output"></pre>
`;

async function callReadOnly(fnName) {
  const thesisId = Number(document.getElementById("thesisId").value);

  try {
    const tx = contract.call(fnName, thesisId);

    document.getElementById("output").textContent =
      JSON.stringify(tx, null, 2);
  } catch (e) {
    document.getElementById("output").textContent = e.message;
  }
}

document
  .getElementById("voteCountBtn")
  .addEventListener("click", () => callReadOnly("vote_count"));

document
  .getElementById("resultBtn")
  .addEventListener("click", () => callReadOnly("result"));