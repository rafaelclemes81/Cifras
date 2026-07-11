let musicas = [];

const listaMusicas =
    document.getElementById(
        "listaMusicas"
    );

const pesquisa =
    document.getElementById(
        "pesquisa"
    );

/* =====================================
   CARREGAR MÚSICAS
===================================== */

async function carregarMusicas() {

    try {

        const response =
            await fetch(
                "/api/musicas"
            );

        musicas =
            await response.json();

        renderizarLista();

    } catch (erro) {

        console.error(
            erro
        );

        alert(
            "Erro ao carregar músicas"
        );
    }
}

/* =====================================
   RENDER LISTA
===================================== */

function renderizarLista() {

    const filtro =
        pesquisa.value
        .toLowerCase();

    const resultado =
        musicas.filter(m => {

            const titulo =
                (m.titulo || "")
                .toLowerCase();

            const autor =
                (m.autor || "")
                .toLowerCase();

            return (

                titulo.includes(
                    filtro
                )

                ||

                autor.includes(
                    filtro
                )
            );
        });

    listaMusicas.innerHTML = "";

    if (
        resultado.length === 0
    ) {

        listaMusicas.innerHTML = `
            <p>
                Nenhuma música encontrada
            </p>
        `;

        return;
    }

    resultado.forEach(musica => {

        const div =
            document.createElement(
                "div"
            );

        div.className =
            "musica-card";

        div.innerHTML = `

            <div
                class="musica-info">

                <div
                    class="musica-titulo">

                    ${musica.titulo}

                </div>

                <div
                    class="musica-meta">

                    ${musica.autor || "-"}

                </div>

                <div
                    class="musica-meta">

                    Tom:
                    Tom:
                    ${musica.ultimoTom}

                    <br>

                    Duração:
                    ${musica.duracao || 5} min
                </div>

            </div>

            <div>

                <button
                    class="btn-primary"
                    onclick="visualizarMusica('${musica.id}')">

                    👁️
                </button>

                <button
                    class="btn-danger"
                    onclick="excluirMusica('${musica.id}')">

                    🗑️
                </button>

            </div>
        `;

        listaMusicas.appendChild(
            div
        );
    });
}

/* =====================================
   IMPORTAR
===================================== */

document
.getElementById(
    "btnImportar"
)
.addEventListener(
    "click",
    async () => {

        const arquivo =
            document
            .getElementById(
                "arquivoTxt"
            )
            .files[0];

        if (!arquivo) {

            alert(
                "Selecione um arquivo"
            );

            return;
        }

        const formData =
            new FormData();

        formData.append(
            "arquivo",
            arquivo
        );

        const response =
            await fetch(

                "/api/musicas/importar",

                {
                    method:"POST",

                    body:formData
                }
            );

        const resultado =
            await response.json();

        if (
            resultado.sucesso
        ) {

            alert(
                "Importada com sucesso"
            );

            carregarMusicas();

        } else {

            alert(
                resultado.erro
            );
        }
    }
);

/* =====================================
   VISUALIZAR
===================================== */

async function visualizarMusica(id) {

    try {

        const response =
            await fetch(
                `/api/musicas/${id}`
            );

        const musica =
            await response.json();

        document
        .getElementById(
            "modalTitulo"
        )
        .textContent =
            musica.titulo;

        document
        .getElementById(
            "modalAutor"
        )
        .textContent =
            `Autor: ${musica.autor}`;

        document
        .getElementById(
            "modalTom"
        )
        .textContent =
            `Tom: ${musica.ultimoTom}`;

        document
        .getElementById(
            "modalConteudo"
        )
        .innerHTML =

            renderizarCifraClub(
                musica.conteudo
            );

        document
        .getElementById(
            "modalMusica"
        )
        .style.display =
            "block";

    } catch (erro) {

        console.error(
            erro
        );
    }
}

/* =====================================
   EXCLUIR
===================================== */

async function excluirMusica(id) {

    const confirmar =
        confirm(
            "Excluir música?"
        );

    if (!confirmar)
        return;

    await fetch(

        `/api/musicas/${id}`,

        {
            method:"DELETE"
        }
    );

    carregarMusicas();
}

/* =====================================
   FECHAR MODAL
===================================== */

document
.getElementById(
    "fecharModal"
)
.addEventListener(
    "click",
    () => {

        document
        .getElementById(
            "modalMusica"
        )
        .style.display =
            "none";
    }
);

/* =====================================
   PESQUISA
===================================== */

pesquisa.addEventListener(
    "input",
    renderizarLista
);

/* =====================================
   INIT
===================================== */

carregarMusicas();