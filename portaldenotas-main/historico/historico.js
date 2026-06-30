if (sessionStorage.getItem("logado") !== "true") {
    window.location.href = "../login/login.html";
}

function carregarDadosNoHistorial() {
    const requisicaoHistorial = indexedDB.open("BancoEscolar", 2);
    
    requisicaoHistorial.onsuccess = function(evento) {
        let banco = evento.target.result;
        const transacao = banco.transaction(["alunos"], "readonly");
        const armazem = transacao.objectStore("alunos");
        const requisicaoCursor = armazem.openCursor();
        
        const corpoHistorico = document.getElementById('corpoHistorico');
        const mensagemVazia = document.getElementById('mensagemVazia');
        let temDados = false;

        corpoHistorico.innerHTML = '';

        requisicaoCursor.onsuccess = function(e) {
            let cursor = e.target.result;
            if (cursor) {
                temDados = true;
                mensagemVazia.style.display = 'none';
                
                const tr = document.createElement('tr');
                let classeFinal = cursor.value.situacao === 'Aprovado' ? 'aprovado' : 'recuperacao';
                
                tr.innerHTML = `
                    <td><strong>${cursor.value.nome}</strong></td>
                    <td>${cursor.value.periodo}</td>
                    <td>${cursor.value.notas}</td>
                    <td>${cursor.value.media}</td>
                    <td class="${classeFinal}">${cursor.value.situacao}</td>
                `;
                corpoHistorico.appendChild(tr);
                cursor.continue();
            }
            
            if (!temDados) {
                mensagemVazia.style.display = 'block';
            }
        };
    };
}

function limparBancoDados() {
    if (!confirm("Tem certeza que deseja apagar todo o histórico de alunos publicado no Portal?")) return;
    
    const requisicaoLimpar = indexedDB.open("BancoEscolar", 2);
    requisicaoLimpar.onsuccess = function(evento) {
        let banco = evento.target.result;
        const transacao = banco.transaction(["alunos"], "readwrite");
        const armazem = transacao.objectStore("alunos");
        const limpar = armazem.clear();

        limpar.onsuccess = function() {
            carregarDadosNoHistorial();
        };
    };
}