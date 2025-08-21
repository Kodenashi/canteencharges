import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBK_nTo7Oj6-feszqu8F4unrX_oD6rVPxI",
  authDomain: "canteentracker-409ca.firebaseapp.com",
  projectId: "canteentracker-409ca",
  storageBucket: "canteentracker-409ca.firebasestorage.app",
  messagingSenderId: "666105150836",
  appId: "1:666105150836:web:34d08e1cfddf87ff1bc021",
  measurementId: "G-ZCZFYWKNSX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM
const form = document.getElementById('chargeForm');
const purchaseDateInput = document.getElementById('purchaseDate');
const itemNameInput = document.getElementById('itemName');
const itemCostInput = document.getElementById('itemCost');
const itemQtyInput = document.getElementById('itemQty');
const chargesList = document.getElementById('chargesList');
const totalOwedDisplay = document.getElementById('totalOwed');
const deductedAmountInput = document.getElementById('deductedAmount');
const differenceText = document.getElementById('differenceText');
const removeAllBtn = document.getElementById('removeAllBtn');

// Modal elements
const confirmModal = document.getElementById('confirmModal');
const cancelBtn = document.getElementById('cancelBtn');
const confirmBtn = document.getElementById('confirmBtn');

let charges = [];

function formatCurrency(num) {
  return '₱' + num.toFixed(2);
}

function renderCharges() {
  chargesList.innerHTML = '';
  charges.forEach((charge, index) => {
    const tr = document.createElement('tr');
    const total = charge.cost * charge.qty;
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${charge.date}</td>
      <td>${charge.name}</td>
      <td>${formatCurrency(charge.cost)}</td>
      <td>${charge.qty}</td>
      <td>${formatCurrency(total)}</td>
      <td><button class="removeBtn" data-id="${charge.id || ''}" data-local-index="${index}">Remove</button></td>
    `;
    chargesList.appendChild(tr);
  });

  document.querySelectorAll('.removeBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const localIndex = e.target.dataset.localIndex;
      const id = e.target.dataset.id;
      charges.splice(localIndex, 1);
      renderCharges();
      calculateTotal();
      updateDifference();
      if (id) {
        await deleteDoc(doc(db, "changes", id));
      }
    });
  });
}

function calculateTotal() {
  const total = charges.reduce((acc, c) => acc + (c.cost * c.qty), 0);
  totalOwedDisplay.textContent = `Total Owed: ${formatCurrency(total)}`;
  return total;
}

function updateDifference() {
  const total = calculateTotal();
  const deducted = parseFloat(deductedAmountInput.value);
  if (!isNaN(deducted)) {
    const diff = total - deducted;
    differenceText.textContent = diff === 0
      ? 'Perfect match! Your deduction matches your charges.'
      : `Difference: ${formatCurrency(diff)} (${diff > 0 ? 'You owe more' : 'You were deducted more'})`;
    differenceText.className = 'difference ' + (diff >= 0 ? 'positive' : 'negative');
  } else {
    differenceText.textContent = '';
  }
}

async function loadCharges() {
  const snapshot = await getDocs(collection(db, "changes"));
  charges = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
  renderCharges();
  calculateTotal();
  updateDifference();
}

// Add charge
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const date = purchaseDateInput.value;
  const name = itemNameInput.value.trim();
  const cost = parseFloat(itemCostInput.value);
  const qty = parseInt(itemQtyInput.value);

  if (date && name && !isNaN(cost) && cost > 0 && qty > 0) {
    const tempCharge = { date, name, cost, qty };
    charges.push(tempCharge);
    renderCharges();
    calculateTotal();
    updateDifference();
    form.reset();
    purchaseDateInput.focus();

    try {
      const docRef = await addDoc(collection(db, "changes"), tempCharge);
      tempCharge.id = docRef.id;
    } catch (err) {
      alert("⚠️ Failed to save to Firebase, but item is still shown locally.");
      console.error(err);
    }
  }
});

deductedAmountInput.addEventListener('input', updateDifference);

// Show modal
removeAllBtn.addEventListener('click', () => {
  confirmModal.style.display = 'flex';
});

// Cancel
cancelBtn.addEventListener('click', () => {
  confirmModal.style.display = 'none';
});

// Confirm delete all
confirmBtn.addEventListener('click', async () => {
  confirmModal.style.display = 'none';

  // Clear local
  charges = [];
  renderCharges();
  calculateTotal();
  updateDifference();

  // Clear Firestore
  const snapshot = await getDocs(collection(db, "changes"));
  const deletions = snapshot.docs.map(docSnap => deleteDoc(doc(db, "changes", docSnap.id)));
  await Promise.all(deletions);
});

loadCharges();
