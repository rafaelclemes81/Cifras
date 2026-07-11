let repertorios = [];
let musicas = [];

let repertorioAtual = null;
let indiceArrastado = null;

/* =====================================
   ELEMENTOS
===================================== */

const listaRepertorios =
    document.getElementById(
        "listaRepertorios"
    );

const musicaSelect =
    document.getElementById(
        "musicaSelect"
    );

const listaMusicasRepertorio =
    document.getElementById(
        "listaMusicasRepertorio"
    );

/* =====================================
   CARREGAR MÚSICAS
===================================== */

async function carregarMusicas() {

    const response =
        await fetch(
            "/api/musicas"
        );

    musicas =
        await response.json();

    musicaSelect.innerHTML = "";

    musicas.forEach(m => {

        musicaSelect.innerHTML += `
            <option value="${m.id}">
                ${m.titulo}
            </option>
        `;
    });
}

/* =====================================
   CARREGAR REPERTÓRIOS
===================================== */

async function carregarRepertorios() {

    const response =
        await fetch(
            "/api/repertorios"
        );

    repertorios =
        await response.json();

    renderizarRepertorios();
}

/* =====================================
   RENDER REPERTÓRIOS
===================================== */

function renderizarRepertorios() {

    listaRepertorios.innerHTML = "";

    repertorios.forEach(r => {

        const div =
            document.createElement(
                "div"
            );

        div.className =
            "repertorio-item";

        div.innerHTML = `

            <div>

                <strong>
                    ${r.nome}
                </strong>

                <br>

                ${r.quantidadeMusicas || 0}
                músicas

            </div>

            <div>

                <button
                    class="btn-primary"
                    title="Editar"
                    onclick="editarRepertorio('${r.id}')">

                    ✏️
                </button>

                <button
                    class="btn-warning"
                    title="Duplicar"
                    onclick="duplicarRepertorio('${r.id}')">

                    📄
                </button>

                <button
                    class="btn-danger"
                    title="Excluir"
                    onclick="excluirRepertorio('${r.id}')">

                    🗑️
                </button>

            </div>

        `;

        listaRepertorios.appendChild(
            div
        );
    });
}

/* =====================================
   NOVO REPERTÓRIO
===================================== */

document
.getElementById(
    "btnNovo"
)
.addEventListener(
    "click",
    async () => {

        const nome =
            document
            .getElementById(
                "nomeRepertorio"
            )
            .value
            .trim();

        if (!nome) {

            alert(
                "Informe o nome do repertório"
            );

            return;
        }

        await fetch(

            "/api/repertorios",

            {

                method:"POST",

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:
                JSON.stringify({

                    nome,
                    musicas:[]
                })
            }
        );

        document
        .getElementById(
            "nomeRepertorio"
        )
        .value = "";

        carregarRepertorios();
    }
);

/* =====================================
   EDITAR
===================================== */

async function editarRepertorio(id) {

    const response =
        await fetch(
            `/api/repertorios/${id}`
        );

    repertorioAtual =
        await response.json();

    document
    .getElementById(
        "editorRepertorio"
    )
    .style.display =
        "block";

    document
    .getElementById(
        "tituloEditor"
    )
    .textContent =
        repertorioAtual.nome;

    renderizarMusicasRepertorio();
}

/* =====================================
   DUPLICAR
===================================== */

async function duplicarRepertorio(id) {

    await fetch(

        `/api/repertorios/${id}/duplicar`,

        {
            method:"POST"
        }
    );

    carregarRepertorios();
}

/* =====================================
   EXCLUIR
===================================== */

async function excluirRepertorio(id) {

    if (
        !confirm(
            "Excluir repertório?"
        )
    ) return;

    await fetch(

        `/api/repertorios/${id}`,

        {
            method:"DELETE"
        }
    );

    carregarRepertorios();
}

/* =====================================
   ADICIONAR MÚSICA
===================================== */

document
.getElementById(
    "btnAdicionar"
)
.addEventListener(
    "click",
    () => {

        if (
            !repertorioAtual
        ) return;

        repertorioAtual
            .musicas
            .push(
                musicaSelect.value
            );

        renderizarMusicasRepertorio();
    }
);

/* =====================================
   RENDER MÚSICAS
===================================== */

function renderizarMusicasRepertorio() {

    listaMusicasRepertorio
        .innerHTML = "";

    repertorioAtual
    .musicas
    .forEach(
        (id, indice) => {

            const musica =
                musicas.find(
                    m => m.id === id
                );

            const duracao =
                musica?.duracao || 5;

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "musica-repertorio";

            div.draggable = true;

            div.dataset.index =
                indice;

            div.innerHTML = `

                <div class="drag-handle">
                    ☰
                </div>

                <div class="musica-repertorio-info">

                    <strong>
                        ${indice + 1}.
                        ${musica
                            ? musica.titulo
                            : id}
                    </strong>

                    <br>

                    <small>
                        ${duracao} min
                    </small>

                </div>

                <div>

                    <button
                        onclick="visualizarMusica('${id}')">

                        👁

                    </button>

                    <button
                        onclick="removerMusica(${indice})">

                        ❌

                    </button>

                </div>
            `;

            adicionarEventosDrag(
                div
            );

            listaMusicasRepertorio
                .appendChild(div);
        }
    );

    atualizarDuracaoTotal();
}

/* =====================================
   REMOVER
===================================== */

function removerMusica(indice) {

    repertorioAtual
        .musicas
        .splice(
            indice,
            1
        );

    renderizarMusicasRepertorio();
}

/* =====================================
   DRAG & DROP
===================================== */

function adicionarEventosDrag(item) {

    item.addEventListener(
        "dragstart",
        () => {

            indiceArrastado =
                Number(
                    item.dataset.index
                );

            item.classList.add(
                "dragging"
            );
        }
    );

    item.addEventListener(
        "dragend",
        () => {

            item.classList.remove(
                "dragging"
            );
        }
    );

    item.addEventListener(
        "dragover",
        e => {

            e.preventDefault();
        }
    );

    item.addEventListener(
        "drop",
        e => {

            e.preventDefault();

            const destino =
                Number(
                    item.dataset.index
                );

            moverMusica(
                indiceArrastado,
                destino
            );
        }
    );
}

function moverMusica(
    origem,
    destino
) {

    if (
        origem === destino
    ) return;

    const item =

        repertorioAtual
        .musicas.splice(
            origem,
            1
        )[0];

    repertorioAtual
        .musicas.splice(
            destino,
            0,
            item
        );

    renderizarMusicasRepertorio();
}

/* =====================================
   DURAÇÃO TOTAL
===================================== */

function atualizarDuracaoTotal() {

    let total = 0;

    repertorioAtual
    ?.musicas
    ?.forEach(id => {

        const musica =
            musicas.find(
                m => m.id === id
            );

        total +=
            Number(
                musica?.duracao || 5
            );
    });

    document
    .getElementById(
        "duracaoTotal"
    )
    .textContent =
        total;
}

/* =====================================
   SALVAR
===================================== */

document
.getElementById(
    "btnSalvar"
)
.addEventListener(
    "click",
    async () => {

        if (
            !repertorioAtual
        ) return;

        await fetch(

            `/api/repertorios/${repertorioAtual.id}`,

            {

                method:"PUT",

                headers:{
                    "Content-Type":
                    "application/json"
                },

                body:
                JSON.stringify({

                    nome:
                        repertorioAtual.nome,

                    musicas:
                        repertorioAtual.musicas
                })
            }
        );

        alert(
            "Repertório salvo"
        );

        carregarRepertorios();
    }
);

/* =====================================
   VISUALIZAR MÚSICA
===================================== */

async function visualizarMusica(id) {

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
        `Autor: ${musica.autor || "-"}`;

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
   INIT
===================================== */

(async function() {

    await carregarMusicas();

    await carregarRepertorios();

})();