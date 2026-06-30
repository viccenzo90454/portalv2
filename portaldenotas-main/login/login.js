let bd;
let modoCadastro = false;

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
    verificarUsuariosExistentes();
};

requisicaoBD.onerror = function() {
    document.getElementById("subtituloPortal").innerText = "Erro ao conectar ao banco de dados.";
};

function verificarUsuariosExistentes() {
    const transacao = bd.transaction(["usuarios"], "readonly");
    const armazem = transacao.objectStore("usuarios");
    const requisicaoContar = armazem.count();

    requisicaoContar.onsuccess = function() {
        const total = requisicaoContar.result;
        const subtitulo = document.getElementById("subtituloPortal");
        const btn = document.getElementById("btnAcao");

        if (total === 0) {
            modoCadastro = true;
            subtitulo.innerText = "Nenhum usuário detectado. Cadastre o administrador:";
            subtitulo.style.color = "#a80000";
            btn.innerText = "Cadastrar e Entrar";
            btn.style.backgroundColor = "#2b579a";
        } else {
            modoCadastro = false;
            subtitulo.innerText = "Acesse o painel de lançamento de notas";
            subtitulo.style.color = "#666";
            btn.innerText = "Entrar no Sistema";
            btn.style.backgroundColor = "#107c41";
        }
    };
}

function processarFormulario(event) {
    event.preventDefault();
    
    const usuarioDigitado = document.getElementById("usuario").value.trim();
    const senhaDigitada = document.getElementById("senha").value;
    const mensagemStatus = document.getElementById("mensagemStatus");

    if (!bd || usuarioDigitado === "") return;

    if (modoCadastro) {
        const transacaoEscrita = bd.transaction(["usuarios"], "readwrite");
        const armazemEscrita = transacaoEscrita.objectStore("usuarios");
        
        const novoUsuario = { usuario: usuarioDigitado, senha: senhaDigitada };
        const requisicaoAdicionar = armazemEscrita.add(novoUsuario);

        requisicaoAdicionar.onsuccess = function() {
            sessionStorage.setItem("logado", "true");
            window.location.href = "../lancamento/lancamento.html";
        };
        
        requisicaoAdicionar.onerror = function() {
            mensagemStatus.style.color = "#a80000";
            mensagemStatus.innerText = "Erro ao criar usuário.";
        };
    } else {
        const transacaoLeitura = bd.transaction(["usuarios"], "readonly");
        const armazemLeitura = transacaoLeitura.objectStore("usuarios");
        const requisicaoBuscar = armazemLeitura.get(usuarioDigitado);

        requisicaoBuscar.onsuccess = function() {
            const dadosUsuario = requisicaoBuscar.result;
            
            if (dadosUsuario && dadosUsuario.senha === senhaDigitada) {
                sessionStorage.setItem("logado", "true");
                window.location.href = "../lancamento/lancamento.html";
            } else {
                mensagemStatus.style.color = "#a80000";
                mensagemStatus.innerText = "Usuário ou senha incorretos.";
            }
        };
    }
}