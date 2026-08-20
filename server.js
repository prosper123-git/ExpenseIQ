// server.js — ExpenseIQ backend
// Same rules as the original Group_23.js console app (balance check, running
// total, average, highest/lowest, search, save-to-file) exposed as a small
// JSON API so the static frontend in /public can talk to it.

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// Simple JSON-file "database" — plays the role that the in-memory
// expense[]/expenseName[] arrays played in the Java/Node console version,
// but persists across restarts.
// ---------------------------------------------------------------------------
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }
  return { balance: null, expenses: [] };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let data = loadData();

function summarize() {
  const count = data.expenses.length;
  const total = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const average = count ? total / count : 0;

  let highest = null;
  let lowest = null;
  if (count) {
    highest = data.expenses.reduce((a, b) => (b.amount > a.amount ? b : a));
    lowest = data.expenses.reduce((a, b) => (b.amount < a.amount ? b : a));
  }

  return { count, total, average, highest, lowest };
}

// --- GET current balance + expenses + summary (page load) ------------------
app.get("/api/state", (req, res) => {
  res.json({ balance: data.balance, expenses: data.expenses, summary: summarize() });
});

// --- POST set/reset the starting balance ------------------------------------
app.post("/api/balance", (req, res) => {
  const balance = Number(req.body.balance);
  if (!Number.isFinite(balance) || balance < 0) {
    return res.status(400).json({ error: "Enter a valid starting balance." });
  }
  data.balance = balance;
  saveData(data);
  res.json({ balance: data.balance });
});

// --- POST add a new expense (mirrors "case 1" in Group_23.js) --------------
app.post("/api/expenses", (req, res) => {
  const { title, amount, category, date, paymentMethod, notes } = req.body;
  const numAmount = Number(amount);

  if (data.balance === null) {
    return res.status(400).json({ error: "Set a starting balance first." });
  }
  if (!title || !Number.isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: "Title and a positive amount are required." });
  }
  if (numAmount > data.balance) {
    return res.status(400).json({ error: "Insufficient funds." });
  }

  const expense = {
    id: Date.now(),
    title,
    amount: numAmount,
    category: category || "Other",
    date: date || new Date().toISOString().slice(0, 10),
    paymentMethod: paymentMethod || "Cash",
    notes: notes || "",
  };

  data.expenses.unshift(expense);
  data.balance -= numAmount;
  saveData(data);

  res.json({ balance: data.balance, expense, summary: summarize() });
});

// --- GET search for an expense by exact amount (mirrors "case 6") ----------
app.get("/api/search", (req, res) => {
  const amount = Number(req.query.amount);
  const match = data.expenses.find((e) => e.amount === amount);
  res.json({ found: Boolean(match), expense: match || null });
});

// --- POST save a snapshot to 23.txt (mirrors "case 7") ---------------------
app.post("/api/save", (req, res) => {
  try {
    const s = summarize();
    let content = "----Expense Records----\n\n";
    data.expenses.forEach((e) => {
      content += `${e.title} = -${e.amount}\n`;
    });
    content += `Total expenses = ${s.total}`;
    content += `\nAverage = ${s.average}`;
    content += `\nRemaining balance is ${data.balance}`;

    fs.writeFileSync(path.join(__dirname, "23.txt"), content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Could not save file." });
  }
});

app.listen(PORT, () => {
  console.log(`ExpenseIQ server running at http://localhost:${PORT}`);
});