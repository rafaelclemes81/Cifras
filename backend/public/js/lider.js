let scrollTimerLider = null;

const preview =
    document.getElementById(
        "previewCifra"
    );

const btnTelaCheia =
    document.getElementById(
        "btnTelaCheia"
    );

const btnModoPalco =
    document.getElementById(
        "btnModoPalco"
    );

const valorScroll =
    document.getElementById(
        "valorScroll"
    );

const statusScroll =
    document.getElementById(
        "statusScroll"
    );

const socket = io();

const btnScrollPause =
    document.getElementById(
        "btnScrollPause"
    );

const btnScrollStop =
    document.getElementById(
        "btnScrollStop"
    );

const scrollRange =
    document.getElementById(
        "scrollRange"
    );

const sidebar =
    document.querySelector(
        ".sidebar"
    );

const btnMostrarControles =
    document.getElementById(
        "btnMostrarControles"
    );

let sessaoAtual = null;

const repertorioSelect =
    document.getElementById(
        "repertorioSelect"
    );

const tituloMusica =
    document.getElementById(
        "tituloMusica"
    );

const previewCifra =
    document.getElementById(
        "previewCifra"
    );

const btnScrollPlay =
    document.getElementById(
        "btnScrollPlay"
    );

const tomAtual =
    document.getElementById(
        "tomAtual"
    );

const infoSessao =
    document.getElementById(
        "infoSessao"
    );

const NOTAS = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
];

/* ===========================
   CARREGAR REPERTÓRIOS
=========================== */

async function carregarRepertorios() {

    console.log("Carregando repertórios...");
  

    const response =
        await fetch(
            "/api/repertorios"
        );

    const repertorios =
        await response.json();

    console.log(repertorios);

    /*const repertorios =
        await response.json();*/

    console.log(
        "TIPO:",
        typeof repertorioSelect
    );

    repertorioSelect.innerHTML =
        '<option value="">Selecione...</option>';

    repertorios.forEach(r => {

        repertorioSelect.innerHTML += `

            <option value="${r.id}">
                ${r.nome}
            </option>

        `;
    });
}

/* ===========================
   CARREGAR SESSÃO
=========================== */

async function carregarSessao() {

    const response =
        await fetch(
            "/api/sessao"
        );

    const sessao =
        await response.json();

    atualizarTela(sessao);
}

/* ===========================
   ATUALIZAR TELA
=========================== */

function atualizarTela(sessao) {

    pararScrollLider();

    sessaoAtual = sessao;

    if (!sessao.ativa) {

        tituloMusica.textContent =
            "Nenhuma música";

        previewCifra.innerHTML = "";

        infoSessao.innerHTML =
            "Nenhuma sessão ativa";

        return;
    }

    tituloMusica.textContent =
        sessao.titulo;

    tomAtual.textContent =
        sessao.tomAtual;

    infoSessao.innerHTML = `
        Repertório: ${sessao.repertorioId}
        <br>
        Música: ${sessao.indiceAtual + 1}
    `;

    const texto =
        transpor(

            sessao.conteudo,

            sessao.tomOriginal,

            sessao.tomAtual
        );

    previewCifra.innerHTML =
        renderizarCifraClub(
            texto
        );
}

function ocultarControles() {

    sidebar.classList.add(
        "sidebar-oculta"
    );

    btnMostrarControles
        .style.display =
        "flex";
}

function mostrarControles() {

    sidebar.classList.remove(
        "sidebar-oculta"
    );

    btnMostrarControles
        .style.display =
        "none";
}

/* ===========================
   INICIAR
=========================== */

document
.getElementById(
    "btnIniciar"
)
.addEventListener(
    "click",
    async () => {

        const repertorioId =
            repertorioSelect.value;

        if (!repertorioId) {

            alert(
                "Selecione um repertório"
            );

            return;
        }

        const response =
            await fetch(

                "/api/sessao/iniciar",

                {
                    method:"POST",

                    headers:{
                        "Content-Type":
                        "application/json"
                    },

                    body:
                    JSON.stringify({
                        repertorioId
                    })
                }
            );

        const sessao =
            await response.json();

        atualizarTela(
            sessao
        );
    }
);

/* ===========================
   ENCERRAR
=========================== */

document
.getElementById(
    "btnEncerrar"
)
.addEventListener(
    "click",
    async () => {

        await fetch(

            "/api/sessao",

            {
                method:"DELETE"
            }
        );
    }
);

btnMostrarControles
    .addEventListener(

        "click",

        mostrarControles
    );



document
.getElementById(
    "btnProxima"
)
.addEventListener(
    "click",
    async () => {

        await fetch(

            "/api/sessao/proxima",

            {
                method:"POST"
            }
        );
    }
);

/* ===========================
   ANTERIOR
=========================== */

document
.getElementById(
    "btnAnterior"
)
.addEventListener(
    "click",
    async () => {

        await fetch(

            "/api/sessao/anterior",

            {
                method:"POST"
            }
        );
    }
);

scrollRange.addEventListener(

    "input",

    () => {

        document.getElementById(
            "valorScroll"
        ).textContent =
            scrollRange.value;
    }
);

function alterarTom(
    direcao
) {

    if (!sessaoAtual)
        return;

    let indice =
        NOTAS.indexOf(
            sessaoAtual.tomAtual
        );

    indice =
        (indice + direcao + 12)
        % 12;

    sessaoAtual.tomAtual =
        NOTAS[indice];

    tomAtual.textContent =
        sessaoAtual.tomAtual;

    socket.emit(
        "alterarTom",
        {
            tomAtual:
                sessaoAtual.tomAtual
        }
    );

    fetch(

        `/api/musicas/${sessaoAtual.musicaId}/tom`,

        {
            method:"PUT",

            headers:{
                "Content-Type":
                "application/json"
            },

            body:
            JSON.stringify({

                tom:
                sessaoAtual.tomAtual
            })
        }
    );
}

document
.getElementById(
    "aumentarTom"
)
.addEventListener(
    "click",
    () => alterarTom(1)
);

document
.getElementById(
    "diminuirTom"
)
.addEventListener(
    "click",
    () => alterarTom(-1)
);

/* ===========================
   SOCKET
=========================== */

socket.on(
    "sessaoAtualizada",
    sessao => {

        atualizarTela(
            sessao
        );
    }
);

socket.on(
    "sessaoEncerrada",
    () => {

        atualizarTela({
            ativa:false
        });
    }
);

btnScrollPlay.addEventListener(

    "click",

    () => {

        const velocidade =

            Number(
                scrollRange.value
            );

        statusScroll.textContent =
            "🟢 Rodando";

        iniciarScrollLider(
            velocidade
        );
        
    }
);

btnScrollPause.addEventListener(

    "click",

    () => {

        statusScroll.textContent =
            "🟡 Pausado";

        pausarScrollLider();
        
    }
);

btnScrollStop.addEventListener(

    "click",

    () => {

        statusScroll.textContent =
            "🔴 Parado";

        pararScrollLider();
        
    }
);

function iniciarScrollLider(
    velocidade
) {

    pararScrollLider();

    ocultarControles();

    const preview =
        document.getElementById(
            "previewCifra"
        );

    scrollTimerLider =

        setInterval(

            () => {

                preview.scrollTop +=
                    velocidade;

            },

            50
        );
}

function pausarScrollLider() {

    if (
        scrollTimerLider
    ) {

        clearInterval(
            scrollTimerLider
        );

        scrollTimerLider = null;
    }

}

function pararScrollLider() {

    if (
        scrollTimerLider
    ) {

        clearInterval(
            scrollTimerLider
        );

        scrollTimerLider = null;
    }

    const preview =
        document.getElementById(
            "previewCifra"
        );

    preview.scrollTop = 0;

}

btnTelaCheia.addEventListener(

    "click",

    async () => {

        if (

            !document.fullscreenElement

        ) {

            await document
                .documentElement
                .requestFullscreen();

        } else {

            await document
                .exitFullscreen();
        }
    }
);

btnModoPalco.addEventListener(

    "click",

    () => {

        document.body
            .classList
            .toggle(
                "modo-palco"
            );
    }
);

/* ===========================
   INIT
=========================== */

carregarRepertorios();
carregarSessao();
