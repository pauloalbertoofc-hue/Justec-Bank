// Preview-only presentation; never mutates banking state.
function renderHomeRecent() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;
    list.replaceChildren();
    const items = [...bankState.transactions].sort((a,b) => Date.parse(b.date)-Date.parse(a.date)).slice(0,3);
    if (!items.length) list.textContent = 'Nenhuma movimentação fictícia.';
    for (const item of items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'home-recent-item';
        const icon = document.createElement('i');
        icon.className = 'fa-solid ' + (item.amount > 0 ? 'fa-arrow-down' : 'fa-arrow-up');
        icon.setAttribute('aria-hidden','true');
        const info = document.createElement('span');
        const title = document.createElement('strong');
        title.textContent = item.participant.name;
        const caption = document.createElement('small');
        caption.textContent = item.description + ' · ' + transactionStatus(item.status);
        info.append(title,caption);
        const amount = document.createElement('b');
        amount.className = item.amount > 0 ? 'recent-incoming' : '';
        amount.textContent = formatMoney(item.amount);
        button.append(icon,info,amount);
        button.addEventListener('click', () => showTransactionDetails(item.id));
        list.append(button);
    }
}
renderHomeRecent();
const homePreviewScreen = document.getElementById('screen-home');
new MutationObserver(() => {
    if (!homePreviewScreen.classList.contains('hidden')) renderHomeRecent();
}).observe(homePreviewScreen,{attributes:true,attributeFilter:['class']});
