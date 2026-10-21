const pixEducation = Object.freeze({
    version: 'justec-education/1.0.0',
    tips: Object.freeze({
        recipient: 'Confira o nome e a instituição do destinatário por um canal que você já conhece.',
        urgency: 'Pressa é motivo para parar. Confirme o pedido por um contato independente.',
        identity: 'Fotos e nomes podem ser copiados. Confirme a identidade antes de transferir.',
        bank: 'Não transfira para uma suposta conta segura por orientação de uma ligação.',
        sale: 'Confira a loja e as condições da compra fora do anúncio recebido.',
        advance: 'Desconfie de um Pix antecipado para liberar prêmio, empréstimo ou recuperar valores.',
        general: 'Leia o valor e o destinatário com calma. Na dúvida, reconsidere antes de autorizar.'
    })
});
function selectPixTip(evidence) {
    const active = id => evidence?.indicators.some(item => item.code === id && item.available && item.value === true);
    const category = active('ADVANCE_PAYMENT') ? 'advance' : active('IDENTITY_DOUBT') ? 'identity' : active('URGENCY') ? 'urgency' : active('NEW_RECIPIENT') ? 'recipient' : 'general';
    return { version: pixEducation.version, category, text: pixEducation.tips[category] };
}
