// script.js — connects the ExpenseIQ page to the Node/Express server in
// server.js. No frameworks: fetch() + plain DOM updates.

const money = (n) => `$${Number(n).toFixed(2)}`;

// --- Elements --------------------------------------------------------------
const balanceSetupForm = document.getElementById("balance-setup");
const startingBalanceInput = document.getElementById("starting-balance");
const balanceError = document.getElementById("balance-error");

const statBalance = document.getElementById("stat-balance");
const statTotalExpenses = document.getElementById("stat-total-expenses");
const statCount = document.getElementById("stat-count");
const statAverage = document.getElementById("stat-average");
const statHighest = document.getElementById("stat-highest");
const statHighestName = document.getElementById("stat-highest-name");

const transactionsBody = document.getElementById("transactions-body");
const transactionsEmptyRow = document.getElementById("transactions-empty");

const expenseForm = document.getElementById("add-expense-form");
const expenseMessage = document.getElementById("expense-form-message");

const saveFileBtn = document.getElementById("save-file-btn");

// --- Render helpers ----------------------------------------------------------
function renderState(state) {
  const { balance, expenses, summary } = state;

  // Balance-setup card only shows before a starting balance has been set
  balanceSetupForm.hidden = balance !== null;

  statBalance.textContent = balance === null ? "—" : money(balance);
  statTotalExpenses.textContent = money(summary.total);
  statCount.textContent = `${summary.count} expense${summary.count === 1 ? "" : "s"} logged`;
  statAverage.textContent = summary.count ? money(summary.average) : "—";

  if (summary.highest) {
    statHighest.textContent = money(summary.highest.amount);
    statHighestName.textContent = summary.highest.title;
  } else {
    statHighest.textContent = "—";
    statHighestName.textContent = "\u00A0";
  }

  renderTransactions(expenses);
}

function renderTransactions(expenses) {
  transactionsBody.innerHTML = "";

  if (!expenses.length) {
    transactionsBody.appendChild(transactionsEmptyRow);
    return;
  }

  expenses.forEach((e) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="cat-tag">${e.category}</span></td>
      <td>${e.title}${e.notes ? ` — <span class="muted">${e.notes}</span>` : ""}</td>
      <td class="amount-cell negative">-${money(e.amount)}</td>
      <td>${e.date}</td>
      <td><span class="status-pill completed">Completed</span></td>
    `;
    transactionsBody.appendChild(row);
  });
}

function showMessage(el, text) {
  el.textContent = text;
  el.hidden = !text;
}

// --- Load current state from the server on page load ------------------------
async function loadState() {
  const res = await fetch("/api/state");
  const state = await res.json();
  renderState(state);
}

// --- Set starting balance ---------------------------------------------------
balanceSetupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage(balanceError, "");

  const res = await fetch("/api/balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ balance: Number(startingBalanceInput.value) }),
  });
  const result = await res.json();

  if (!res.ok) {
    showMessage(balanceError, result.error);
    return;
  }
  await loadState();
});

// --- Add a new expense --------------------------------------------------------
expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage(expenseMessage, "");

  const payload = {
    title: document.getElementById("exp-title").value.trim(),
    amount: Number(document.getElementById("exp-amount").value),
    category: document.getElementById("exp-category").value,
    date: document.getElementById("exp-date").value,
    paymentMethod: document.getElementById("exp-method").value,
    notes: document.getElementById("exp-notes").value.trim(),
  };

  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await res.json();

  if (!res.ok) {
    showMessage(expenseMessage, result.error);
    return;
  }

  expenseForm.reset();
  await loadState();
});

// --- Save a snapshot to 23.txt on the server ----------------------------------
saveFileBtn.addEventListener("click", async () => {
  const originalLabel = saveFileBtn.innerHTML;
  saveFileBtn.disabled = true;

  const res = await fetch("/api/save", { method: "POST" });
  const result = await res.json();

  saveFileBtn.innerHTML = result.success
    ? '<span class="icon" aria-hidden="true">✅</span> Saved!'
    : '<span class="icon" aria-hidden="true">⚠️</span> Save failed';

  setTimeout(() => {
    saveFileBtn.innerHTML = originalLabel;
    saveFileBtn.disabled = false;
  }, 1800);
});

// --- Kick things off -----------------------------------------------------------
loadState();