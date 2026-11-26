// Preview: persistência local das operações Pix; cartão mantém seu próprio registro.
const bankState = {
    isBalanceVisible: true,
    transactions: statementScenario.transactions,
    openingBalance: statementScenario.openingBalance,
    attempts: [], restrictions: [], sequence: 0,
    get balance() {
        return (Math.round(this.openingBalance * 100) + this.transactions.reduce((sum, tx) => sum + Math.round(tx.amount * 100), 0)) / 100;
    }
};
const previewBankKey='justec-preview-bank-v1';
function persistPreviewBank(){
    try {
        localStorage.setItem(previewBankKey,JSON.stringify({
            transactions:bankState.transactions.filter(t=>!t.id.startsWith('CARD-PAY-')&&!t.id.startsWith('CARD-REFUND-')),
            sequence:bankState.sequence,
            attempts:bankState.attempts,
            restrictions:bankState.restrictions
        }));
    } catch(e){}
}
try {
    const saved=JSON.parse(localStorage.getItem(previewBankKey));
    if(saved&&Array.isArray(saved.transactions)&&Number.isSafeInteger(saved.sequence)&&saved.sequence>=0&&
       saved.transactions.every(t=>t&&typeof t.id==='string'&&typeof t.date==='string'&&typeof t.description==='string'&&typeof t.type==='string'&&typeof t.status==='string'&&Number.isFinite(t.amount)&&Number.isSafeInteger(Math.round(t.amount*100))&&t.amount===Math.round(t.amount*100)/100&&typeof t.participant?.name==='string')&&
       new Set(saved.transactions.map(t=>t.id)).size===saved.transactions.length){
        bankState.transactions=saved.transactions;
        bankState.sequence=saved.sequence;
        const strings=a=>Array.isArray(a)&&a.every(x=>typeof x==='string');
        const base=x=>x&&typeof x.id==='string'&&typeof x.recipientId==='string'&&typeof x.date==='string'&&strings(x.reasons);
        if(Array.isArray(saved.attempts)&&saved.attempts.every(x=>base(x)&&Number.isFinite(x.amount))) bankState.attempts=saved.attempts;
        if(Array.isArray(saved.restrictions)&&saved.restrictions.every(x=>base(x)&&typeof x.status==='string'&&typeof x.reason==='string'&&strings(x.history)&&typeof x.falsePositive==='boolean')) bankState.restrictions=saved.restrictions;
    }
} catch(e){}
function demoId(prefix) { return `${prefix}-${++bankState.sequence}`; }
function demoDate() { return `${statementScenario.referenceDate}T12:00:00-03:00`; }
// Contrato monetário: number em BRL, canônico com até duas casas decimais.
// A conversão é validada, nunca arredonda silenciosamente frações de centavo.
function pixAmountInCents(amount, allowZero = false) {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        throw new TypeError('Valor Pix deve ser um número finito em reais.');
    }
    const cents = Math.round(amount * 100);
    if (!Number.isSafeInteger(cents) || amount !== cents / 100 ||
        amount < 0 || Object.is(amount, -0) || (!allowZero && cents === 0)) {
        throw new RangeError('Valor Pix deve ser positivo e representar centavos inteiros seguros.');
    }
    return cents;
}
function validateApprovedPix(draft) {
    const isRecord = value => value !== null && typeof value === 'object' &&
        [Object.prototype, null].includes(Object.getPrototypeOf(value));
    const read = (object, key) => {
        const property = Object.getOwnPropertyDescriptor(object, key);
        if (!property || !Object.hasOwn(property, 'value')) {
            throw new TypeError(`Campo obrigatório inválido no Pix: ${key}.`);
        }
        return property.value;
    };
    const nonEmptyText = value => typeof value === 'string' && value.trim().length > 0;
    if (!isRecord(draft)) throw new TypeError('Rascunho Pix deve ser um objeto de dados.');
    const id = read(draft, 'id');
    const amountCents = pixAmountInCents(read(draft, 'amount'));
    const recipient = read(draft, 'recipient');
    if (!nonEmptyText(id) || !isRecord(recipient)) throw new TypeError('Identificador ou destinatário Pix inválido.');
    const recipientId = read(recipient, 'id');
    const name = read(recipient, 'name');
    if (!nonEmptyText(recipientId) || !nonEmptyText(name)) {
        throw new TypeError('Destinatário Pix deve ter identificador e nome não vazios.');
    }
    return { id, amountCents, recipientId, name };
}
function recordApprovedPix(draft) {
    // Toda validação precede a mutação e também o retorno de idempotência.
    const { id, amountCents, recipientId, name } = validateApprovedPix(draft);
    const existing = bankState.transactions.find(tx => tx.id === id);
    if (existing) {
        if (existing.type === 'pix-out' && existing.status === 'completed' &&
            existing.amount === -amountCents / 100 && existing.participant?.id === recipientId &&
            existing.participant.name === name) return existing.id;
        throw new Error('Identificador Pix já utilizado com dados diferentes.');
    }
    const availableCents = pixAmountInCents(bankState.balance, true);
    if (amountCents > availableCents) throw new Error('Saldo insuficiente para a simulação.');
    const transaction = { id, date: demoDate(), type: 'pix-out', description: 'Pix enviado · simulação',
        amount: -amountCents / 100, status: 'completed',
        participant: { id: recipientId, name, institution: 'Instituição fictícia JUSTEC' } };
    bankState.transactions.unshift(transaction);
    persistPreviewBank();
    return id;
}
function recordInterruptedPix(draft, risk, createRestriction = true) {
    if (!bankState.attempts.some(item => item.id === draft.id)) bankState.attempts.unshift({ id: draft.id, recipientId: draft.recipient.id, date: demoDate(), amount: draft.amount, reasons: [...risk.reasons] });
    if (createRestriction && !bankState.restrictions.some(item => item.recipientId === draft.recipient.id && item.status !== 'Restrição retirada')) bankState.restrictions.push({ id: demoId('REV'), recipientId: draft.recipient.id, status: 'Restrição ativa', reasons: [...risk.reasons], date: demoDate(), reason: '', history: ['Restrição ativa'], falsePositive: draft.recipient.falsePositive === true });
    persistPreviewBank();
}
