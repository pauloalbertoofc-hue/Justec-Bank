// Máquina sem DOM/IO. Relógio injetável permite testar os limites da pausa.
function createPixJourney(now = () => Date.now()) {
    let stage='draft', revision=0, reviewed=null, deadline=null, left=false;
    const transitions={draft:['recipient'],recipient:['value','draft'],value:['confirmation','recipient'],confirmation:['evaluation','value'],evaluation:['verification','pause','interrupted'],verification:['evaluation','confirmation'],pause:['authentication','confirmation'],authentication:['completed','interrupted','confirmation'],interrupted:[],completed:[]};
    const signature = draft => JSON.stringify([draft.id,draft.recipient.id,draft.recipient.name,draft.recipient.institution,draft.recipient.maskedKey,draft.amount]);
    return {
        get stage(){return stage;}, get revision(){return revision;},
        move(next){if(!transitions[stage].includes(next)) throw new Error(`Transição Pix inválida: ${stage} → ${next}`);stage=next;return stage;},
        revise(){revision++;reviewed=null;deadline=null;stage='value';left=false;},
        review(draft){if(stage!=='confirmation') throw new Error('Conferência ausente.');reviewed=signature(draft);},
        assertReviewed(draft){if(left || reviewed!==signature(draft)) throw new Error('Os dados mudaram. Refaça a conferência e a pausa.');},
        pause(duration){if(stage!=='pause' || !Number.isFinite(duration)||duration<0) throw new Error('Pausa inválida.');deadline=now()+duration;},
        remaining(){return deadline===null?Infinity:Math.max(0,deadline-now());},
        authenticate(draft){this.assertReviewed(draft);if(stage!=='pause'||this.remaining()>0) throw new Error('Aguarde o intervalo educativo.');this.move('authentication');},
        reconsider(){if(['pause','authentication','verification'].includes(stage)){stage='confirmation';deadline=null;reviewed=null;revision++;}},
        leave(){if(!['completed','interrupted'].includes(stage)){left=true;reviewed=null;deadline=null;stage='confirmation';revision++;}},
        resume(){left=false;},
        authorize(draft, credential, record){this.assertReviewed(draft);if(stage!=='authentication'||deadline===null||this.remaining()>0) throw new Error('Autorização ainda indisponível.');if(credential!=='0000') throw new Error('Código demonstrativo incorreto. Use 0000, nunca uma senha real.');
            // O registro é síncrono e validado antes da transição para sucesso.
            const id=record(draft);if(id!==draft.id) throw new Error('Registro não confirmado.');this.move('completed');return id;}
    };
}
const pixConfig = {reflectionMs:5000};
