// Cenário acadêmico fixo: datas não dependem do relógio do dispositivo.
const statementScenario = {
    referenceDate: '2026-10-17',
    openingBalance: 1000,
    transactions: [
        ['01', '2026-10-17T09:10:00-03:00', 'pix-in', 'Pix recebido', 1800, 'completed', 'Empresa Escola Exemplo'],
        ['02', '2026-10-16T14:20:00-03:00', 'pix-out', 'Pix enviado', -150, 'completed', 'Pessoa Fictícia A'],
        ['03', '2026-10-15T12:30:00-03:00', 'debit', 'Compra no débito', -89.50, 'completed', 'Mercado Demonstrativo'],
        ['04', '2026-10-14T10:00:00-03:00', 'payment', 'Pagamento de energia', -180, 'completed', 'Energia Exemplo'],
        ['05', '2026-10-12T16:45:00-03:00', 'pix-in', 'Pix recebido', 400, 'completed', 'Pessoa Fictícia B'],
        ['06', '2026-10-11T18:05:00-03:00', 'pix-out', 'Pix enviado', -250, 'suspicious', 'Loja Fictícia Alerta'],
        ['07', '2026-10-08T08:30:00-03:00', 'debit', 'Compra no débito', -60, 'completed', 'Farmácia Demonstrativa'],
        ['08', '2026-10-02T11:15:00-03:00', 'pix-in', 'Pix recebido', 300, 'completed', 'Pessoa Fictícia C'],
        ['09', '2026-09-25T19:20:00-03:00', 'payment', 'Pagamento de internet', -120, 'completed', 'Internet Exemplo'],
        ['10', '2026-09-10T13:00:00-03:00', 'pix-out', 'Pix enviado', -200, 'review', 'Serviço Demonstrativo'],
        ['11', '2026-08-20T15:40:00-03:00', 'pix-in', 'Pix recebido', 150, 'completed', 'Pessoa Fictícia D'],
        ['12', '2026-08-01T09:00:00-03:00', 'debit', 'Compra no débito', -120, 'completed', 'Livraria Exemplo']
    ].map(([id, date, type, description, amount, status, name]) => ({
        id: `DEMO-${id}`, date, type, description, amount, status,
        participant: { name, institution: 'Instituição fictícia JUSTEC' }
    }))
};
