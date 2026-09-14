const state = { verified: false, asset: 'USDT', balance: 25, dailySpent: 0, perPayment: .25, dailyCap: 5 };
const $ = (id) => document.getElementById(id);
const money = (n) => `$${Number(n).toFixed(2)}`;
function render() {
  $('balance').textContent = state.balance.toFixed(2); $('asset').textContent = state.asset;
  $('perPaymentOut').textContent = money(state.perPayment); $('dailyOut').textContent = money(state.dailyCap);
  $('payBtn').disabled = !state.verified || state.balance < .08 || state.dailySpent + .08 > state.dailyCap || .08 > state.perPayment;
  $('paymentHint').textContent = state.verified ? `Policy remaining today: ${money(state.dailyCap - state.dailySpent)} · private execution enabled` : 'Requires an active Self payment passport.';
  document.querySelectorAll('[data-asset]').forEach(b => b.classList.toggle('active', b.dataset.asset === state.asset));
}
function verify() {
  if (state.verified) return;
  $('verifyBtn').textContent = 'Creating Self payment passport…';
  $('selfButton').textContent = 'Verifying…';
  setTimeout(() => {
    state.verified = true;
    $('verifyBtn').textContent = '✓ Operator verified with Self';
    $('selfButton').textContent = '✓ Self verified';
    $('identityState').textContent = 'verified'; $('identityState').className = 'pill verified';
    $('proofLines').innerHTML = '<div><span>Human-backed</span><b>valid ✓</b></div><div><span>Proof freshness</span><b>364 days</b></div><div><span>Self Agent ID</span><b>#48291 · Celo</b></div>';
    render();
  }, 950);
}
function pay() {
  const amount = .08; if (!state.verified) return; state.balance -= amount; state.dailySpent += amount;
  $('paymentState').textContent = 'proving…';
  setTimeout(() => {
    $('paymentState').textContent = 'settled in Zeko';
    $('activityEmpty').style.display = 'none';
    const row = document.createElement('div'); row.className = 'activity-row';
    row.innerHTML = `<i></i><span><strong>Atlas Inference</strong> — model call completed</span><small>policy receipt #${Math.floor(Math.random()*9000+1000)}</small><b>−${money(amount)} ${state.asset}</b>`;
    $('activityList').prepend(row); render();
  }, 650);
}
$('verifyBtn').onclick = verify; $('selfButton').onclick = verify; $('payBtn').onclick = pay;
$('perPayment').oninput = (e) => { state.perPayment = +e.target.value; render(); };
$('daily').oninput = (e) => { state.dailyCap = +e.target.value; render(); };
document.querySelectorAll('[data-asset]').forEach(b => b.onclick = () => { state.asset = b.dataset.asset; render(); });
$('openDocs').onclick = () => $('docsDialog').showModal(); $('closeDocs').onclick = () => $('docsDialog').close();
$('tourBtn').onclick = () => { verify(); setTimeout(pay, 1150); };
render();
