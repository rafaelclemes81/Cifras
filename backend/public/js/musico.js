const sidebar =
    document.getElementById(
        "sidebarMusico"
    );

const btnToggleControles =
    document.getElementById(
        "btnToggleControles"
    );

const btnMobileMenu =
    document.getElementById(
        "btnMobileMenu"
    );

const socket = io();

window.onerror = function (
    msg,
    url,
    line,
    col,
    error
) {

    console.error(
        "ERRO JS:",
        msg,
        "linha:",
        line
    );

    return false;
};

/* ==========================================
   ELEMENTOS
========================================== */

const nomeMusica =
    document.getElementById(
        "nomeMusica"
    );

const tomMusica =
    document.getElementById(
        "tomMusica"
    );

const conteudoMusica =
    document.getElementById(
        "conteudoMusica"
    );


const barraControles =
    document.getElementById(
        "barraControles"
    );

const scrollRange =
    document.getElementById(
        "scrollRange"
    );

/* ==========================================
   CONFIGURAÇÕES
========================================== */

const CONFIG_KEY =
    "musico-config";

let scrollTimer = null;

let config = {

    scroll: 0,

    modoPalco: false
};

/* ==========================================
   STORAGE
========================================== */

function salvarConfig() {

    localStorage.setItem(

        CONFIG_KEY,

        JSON.stringify(config)
    );
}

function carregarConfig() {

    const salvo =

        localStorage.getItem(
            CONFIG_KEY
        );

    if (!salvo) return;

    try {

        config =
            JSON.parse(salvo);

    } catch {

        console.log(
            "Config inválida"
        );
    }
}

/* ==========================================
   APLICAR CONFIG
========================================== */

function aplicarConfig() {

    scrollRange.value =
        config.scroll;


    if (
        config.modoPalco
    ) {

        document.body
            .classList.add(
                "modo-palco"
            );

    } else {

        document.body
            .classList.remove(
                "modo-palco"
            );
    }

    atualizarScroll();
}

/* ==========================================
   RENDER
========================================== */

function pararScroll() {

    if (scrollTimer) {

        clearInterval(
            scrollTimer
        );

        scrollTimer = null;
    }

    window.scrollTo({

        top: 0,

        behavior: "auto"
    });
}

function renderizarSessao(sessao) {

    if (
        !sessao ||
        !sessao.musicaId
    ) {

        nomeMusica.textContent =
            "Aguardando sessão...";

        tomMusica.textContent =
            "-";

        conteudoMusica.innerHTML =
            "";
        pararScroll();

        config.scroll = 0;

        scrollRange.value = 0;

        salvarConfig();

        return;
    }

    nomeMusica.textContent =
        sessao.titulo || "";

    tomMusica.textContent =
        `Tom: ${sessao.tomAtual}`;

    let conteudo =
    sessao.conteudo || "";

    console.log(
        "ORIGINAL:",
        sessao.tomOriginal
    );

    console.log(
        "ATUAL:",
        sessao.tomAtual
);

    /*
       TRANSPÕE A CIFRA
       DO TOM ORIGINAL
       PARA O TOM ATUAL
    */

    if (

        typeof transpor ===
        "function"

        &&

        sessao.tomOriginal

        &&

        sessao.tomAtual

        &&

        sessao.tomOriginal !==
        sessao.tomAtual

    ) {

        try {

            conteudo =

                transpor(

                    conteudo,

                    sessao.tomOriginal,

                    sessao.tomAtual
                );

                console.log(
                    "CONTEÚDO TRANSPOSTO:",
                    conteudo
                );

        } catch (erro) {

            console.error(
                "Erro ao transpor:",
                erro
            );
        }
    }

    /*
       RENDERIZA CIFRA
    */

    if (

        typeof renderizarCifraClub ===
        "function"

    ) {

        conteudoMusica.innerHTML =

            renderizarCifraClub(
                conteudo
            );

    } else {

        conteudoMusica.innerHTML =

            `<pre>${conteudo}</pre>`;
    }

    /*
       REAPLICA TAMANHO
       DA FONTE
    */

    /* const cifra =

        document.querySelector(
            ".cifra-club"
        );

    if (cifra) {

        cifra.style.fontSize =
            `${config.fonte}px`;
    } */
}

/* ==========================================
   SOCKET
========================================== */

socket.on(
    "sessaoAtualizada",

    sessao => {

        renderizarSessao(
            sessao
        );

        nomeMusica.classList.add(
                "mudou-musica"
            );

            setTimeout(

                () => {

                    nomeMusica.classList.remove(
                        "mudou-musica"
                    );

                },

                1000
            );
    }
);

/* ==========================================
   CARGA INICIAL
========================================== */

async function carregarSessaoAtual() {

    try {

        const resposta =
            await fetch(
                "/api/sessao"
            );

        const sessao =
            await resposta.json();

        renderizarSessao(
            sessao
        );

    } catch (erro) {

        console.error(
            erro
        );
    }
}

btnToggleControles
.addEventListener(

    "click",

    () => {

        const oculto =

            barraControles
            .classList.toggle(
                "oculto"
            );

        btnToggleControles
            .textContent =

            oculto

            ? "☰ Mostrar"

            : "☰ Ocultar";
    }
);
function atualizarScroll() {

    if (
        scrollTimer
    ) {

        clearInterval(
            scrollTimer
        );

        scrollTimer = null;
    }

    const velocidade =

        Number(
            config.scroll
        );

    if (
        velocidade <= 0
    ) return;

    scrollTimer =

        setInterval(

            () => {

            window.scrollBy({

                top: 1,

                behavior: "smooth"
            });

            },

            150 -
            (
                velocidade * 12
            )
        );
}

scrollRange.addEventListener(

    "input",

    () => {

        config.scroll =
            Number(
                scrollRange.value
            );

        salvarConfig();

        atualizarScroll();
    }
);

carregarConfig();

aplicarConfig();

carregarSessaoAtual();

if (
    btnMobileMenu &&
    barraControles
){

    btnMobileMenu.addEventListener(

        "click",

        () => {

            barraControles
                .classList
                .toggle(
                    "mobile-aberto"
                );
        }
    );
}

window.addEventListener(

    "DOMContentLoaded",

    () => {

        const btnMobileMenu =
            document.getElementById(
                "btnMobileMenu"
            );

        const barraControles =
            document.getElementById(
                "barraControles"
            );

        if (
            !btnMobileMenu ||
            !barraControles
        ) {

            console.error(
                "Elementos não encontrados"
            );

            return;
        }

        btnMobileMenu
            .addEventListener(

                "click",

                () => {

                    console.log(
                        "Menu mobile clicado"
                    );

                    barraControles
                        .classList
                        .toggle(
                            "mobile-aberto"
                        );
                }
            );
    }
);

btnToggleControles
.addEventListener(

    "click",

    () => {

        sidebar.classList.add(
            "sidebar-oculta"
        );

        btnMobileMenu.style.display =
            "flex";
    }
);

btnMobileMenu
.addEventListener(

    "click",

    () => {

        sidebar.classList.remove(
            "sidebar-oculta"
        );

        btnMobileMenu.style.display =
            "none";
    }
);

btnMobileMenu.style.display =
    "none";