if (sessionStorage.getItem("logado") !== "true") {
    window.location.href = "../login/login.html";
}

let bd;
const requisicaoBD = indexedDB.open("BancoEscolar", 2);

requisicaoBD.onupgradeneeded = function(evento) {
    let banco = evento.target.result;
    if (!banco.objectStoreNames.contains("alunos")) {
        banco.createObjectStore("alunos", { keyPath: "id", autoIncrement: true });
    }
    if (!banco.objectStoreNames.contains("usuarios")) {
        banco.createObjectStore("usuarios", { keyPath: "usuario" });
    }
};

requisicaoBD.onsuccess = function(evento) {
    bd = evento.target.result;
    if (typeof actualizarEstruturaTabela === "function") {
        actualizarEstruturaTabela();
    }
};

function actualizarEstruturaTabela() {
    const quantidade = parseInt(document.getElementById('tipoPeriodo').value);
    const cabecalho = document.getElementById('cabecalhoTabela');
    const corpo = document.getElementById('corpoTabela');
    
    if (!corpo || !cabecalho) return;
    corpo.innerHTML = '';

    let htmlCabecalho = '<th>Nome do Aluno</th>';
    for (let i = 1; i <= quantidade; i++) {
        htmlCabecalho += `<th>Nota ${i}</th>`;
    }
    htmlCabecalho += '<th>Média</th><th>Situação</th>';
    cabecalho.innerHTML = htmlCabecalho;

    adicionarLinha();
}

function adicionarLinha() {
    const quantidade = parseInt(document.getElementById('tipoPeriodo').value);
    const corpo = document.getElementById('corpoTabela');
    if (!corpo) return;
    const tr = document.createElement('tr');

    let htmlLinha = '<td><input type="text" class="nome-aluno" placeholder="Nome do Aluno" oninput="validarNome(this)"></td>';
    for (let i = 0; i < quantidade; i++) {
        htmlLinha += `<td><input type="number" class="nota-campo" min="0" max="100" placeholder="0-100" oninput="validarECalcular(this)"></td>`;
    }
    htmlLinha += '<td class="media-resultado">-</td><td class="situacao-resultado">-</td>';
    
    tr.innerHTML = htmlLinha;
    corpo.appendChild(tr);
}

function validarNome(input) {
    let posicaoCursor = input.selectionStart;
    let valorOriginal = input.value;
    
    let valorFiltrado = valorOriginal.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]/g, '');
    
    let palavras = valorFiltrado.split(' ');
    for (let i = 0; i < palavras.length; i++) {
        if (palavras[i].length > 0) {
            palavras[i] = palavras[i].charAt(0).toUpperCase() + palavras[i].slice(1).toLowerCase();
        }
    }
    
    input.value = palavras.join(' ');
    
    if (valorOriginal !== input.value) {
        input.setSelectionRange(posicaoCursor, posicaoCursor);
    }
}

function validarECalcular(input) {
    let valor = parseFloat(input.value);
    if (valor > 100) input.value = 100;
    if (valor < 0) input.value = 0;

    const linha = input.closest('tr');
    const camposNota = linha.querySelectorAll('.nota-campo');
    const tdMedia = linha.querySelector('.media-resultado');
    const tdSituacao = linha.querySelector('.situacao-resultado');

    let soma = 0;
    let preenchidos = 0;

    camposNota.forEach(campo => {
        const v = parseFloat(campo.value);
        if (!isNaN(v)) {
            soma += v;
            preenchidos++;
        }
    });

    if (preenchidos === camposNota.length) {
        const media = soma / camposNota.length;
        tdMedia.innerText = media.toFixed(0);

        if (media >= 70) {
            tdSituacao.innerText = 'Aprovado';
            tdSituacao.style.color = '#107c41';
            tdSituacao.style.fontWeight = 'bold';
        } else {
            tdSituacao.innerText = 'Recuperação';
            tdSituacao.style.color = '#a80000';
            tdSituacao.style.fontWeight = 'bold';
        }
    } else {
        tdMedia.innerText = '-';
        tdSituacao.innerText = '-';
    }
}

function salvarNoBanco() {
    if (!bd) return;

    const status = document.getElementById('statusSalvamento');
    const lines = document.querySelectorAll('#corpoTabela tr');
    const tipoPeriodoTexto = document.getElementById('tipoPeriodo').options[document.getElementById('tipoPeriodo').selectedIndex].text;
    
    let nomesDigitados = [];
    let duplicadoNaPlanilha = false;

    lines.forEach(linha => {
        const nomeInput = linha.querySelector('.nome-aluno');
        if (nomeInput) {
            const nome = nomeInput.value.trim().toLowerCase();
            if (nome !== '') {
                if (nomesDigitados.includes(nome)) {
                    duplicadoNaPlanilha = true;
                }
                nomesDigitados.push(nome);
            }
        }
    });

    if (duplicadoNaPlanilha) {
        status.style.color = '#a80000';
        status.innerText = 'Erro: Existem alunos com o mesmo nome digitados na planilha.';
        return;
    }

    const transacaoLeitura = bd.transaction(["alunos"], "readonly");
    const armazemLeitura = transacaoLeitura.objectStore("alunos");
    const requisicaoCursor = armazemLeitura.openCursor();
    let nomesNoPortal = [];

    requisicaoCursor.onsuccess = function(evento) {
        let cursor = evento.target.result;
        if (cursor) {
            nomesNoPortal.push(cursor.value.nome.trim().toLowerCase());
            cursor.continue();
        } else {
            verificarEDirecionarSalvamento(nomesNoPortal, lines, tipoPeriodoTexto, status);
        }
    };
}

function verificarEDirecionarSalvamento(nomesNoPortal, lines, tipoPeriodoTexto, status) {
    let nomeDuplicadoPortal = false;

    lines.forEach(linha => {
        const nomeInput = linha.querySelector('.nome-aluno');
        if (nomeInput) {
            const nome = nomeInput.value.trim().toLowerCase();
            if (nome !== '' && nomesNoPortal.includes(nome)) {
                nomeDuplicadoPortal = true;
            }
        }
    });

    if (nomeDuplicadoPortal) {
        status.style.color = '#a80000';
        status.innerText = 'Erro: Um ou mais alunos já possuem notas publicadas no Portal.';
        return;
    }

    const transacaoEscrita = bd.transaction(["alunos"], "readwrite");
    const armazemEscrita = transacaoEscrita.objectStore("alunos");
    let dadosEnviados = 0;

    lines.forEach(linha => {
        const nomeInput = linha.querySelector('.nome-aluno');
        const mediaTd = linha.querySelector('.media-resultado');
        const situacaoTd = linha.querySelector('.situacao-resultado');
        const camposNota = inline = linha.querySelectorAll('.nota-campo');

        if (nomeInput && mediaTd && situacaoTd && mediaTd.innerText !== '-') {
            const nome = nomeInput.value.trim();
            if (nome === '') return;

            let notas = [];
            camposNota.forEach(campo => notas.push(parseFloat(campo.value).toFixed(0)));

            const registro = {
                nome: nome,
                periodo: tipoPeriodoTexto,
                notas: notas.join(' | '),
                media: mediaTd.innerText,
                situacao: situacaoTd.innerText
            };

            armazemEscrita.add(registro);
            dadosEnviados++;
        }
    });

    transacaoEscrita.oncomplete = function() {
        if (dadosEnviados > 0) {
            status.style.color = '#107c41';
            status.innerText = `Sucesso! ${dadosEnviados} registro(s) foram publicados no Portal Escolar.`;
            atualizarEstruturaTabela();
        } else {
            status.style.color = '#a80000';
            status.innerText = 'Preencha o nome e todas as notas de pelo menos um aluno.';
        }
    };
}