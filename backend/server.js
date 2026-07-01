const iconv = require("iconv-lite");
const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

/* =====================================================
   DIRETÓRIOS
===================================================== */

const DATA_DIR =
    path.join(__dirname, "data");

const MUSICAS_DIR =
    path.join(DATA_DIR, "musicas");

const REPERTORIOS_DIR =
    path.join(DATA_DIR, "repertorios");

const SESSOES_DIR =
    path.join(DATA_DIR, "sessoes");

const UPLOADS_DIR =
    path.join(__dirname, "uploads");

/* =====================================================
   CRIAÇÃO DE PASTAS
===================================================== */

[
    DATA_DIR,
    MUSICAS_DIR,
    REPERTORIOS_DIR,
    SESSOES_DIR,
    UPLOADS_DIR
].forEach(dir => {

    if (!fs.existsSync(dir)) {

        fs.mkdirSync(
            dir,
            { recursive: true }
        );
    }
});

/* =====================================================
   MIDDLEWARES
===================================================== */

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

const upload = multer({
    dest: UPLOADS_DIR
});

/* =====================================================
   ESTADO DA SESSÃO
===================================================== */

let sessaoAtual =
    carregarSessao() || {

        ativa: false,

        repertorioId: null,

        indiceAtual: 0,

        musicaId: null,

        titulo: "",

        tomOriginal: "C",

        tomAtual: "C",

        conteudo: ""
    };

/* =====================================================
   FUNÇÕES AUXILIARES
===================================================== */

function gerarNomeArquivo(texto) {

    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function lerJson(arquivo) {

    return JSON.parse(
        fs.readFileSync(
            arquivo,
            "utf8"
        )
    );
}

function salvarJson(
    arquivo,
    objeto
) {

    fs.writeFileSync(

        arquivo,

        JSON.stringify(
            objeto,
            null,
            2
        )
    );
}

function caminhoMusica(id) {

    return path.join(
        MUSICAS_DIR,
        `${id}.json`
    );
}

function detectarTom(texto) {

    const regex =
        /\b([A-G](?:#|b)?(?:m|maj7|7|9|sus2|sus4|add9|dim|aug)?(?:\/[A-G](?:#|b)?)?)\b/;

    const match =
        texto.match(regex);

    if (!match)
        return "C";

    let acorde = match[1];

    const nota =
        acorde.match(
            /^([A-G](?:#|b)?)/
        );

    return nota
        ? nota[1]
        : "C";
}

function removerTabelaAcordes(texto) {

    const marcador =
        "----------------- Acordes -----------------";

    const indice =
        texto.indexOf(
            marcador
        );

    if (indice < 0)
        return texto;

    return texto.substring(
        0,
        indice
    );
}

function extrairTituloAutor(nomeArquivo) {

    const base =
        path.basename(
            nomeArquivo,
            ".txt"
        );

    if (
        base.includes(" - ")
    ) {

        const partes =
            base.split(
                " - "
            );

        return {

            autor:
                partes[0].trim(),

            titulo:
                partes
                .slice(1)
                .join(" - ")
                .trim()
        };
    }

    return {

        autor: "",

        titulo: base
    };
}

function caminhoRepertorio(id) {

    return path.join(
        REPERTORIOS_DIR,
        `${id}.json`
    );
}

function caminhoSessao() {

    return path.join(
        SESSOES_DIR,
        "sessao.json"
    );
}

function salvarSessao(sessao) {

    salvarJson(
        caminhoSessao(),
        sessao
    );
}

function carregarSessao() {

    const arquivo =
        caminhoSessao();

    if (!fs.existsSync(arquivo)) {

        return null;
    }

    return lerJson(
        arquivo
    );
}

/* =====================================================
   API - LISTAR MÚSICAS
===================================================== */

app.get(
    "/api/musicas",
    (req, res) => {

        try {

            const arquivos =
                fs.readdirSync(
                    MUSICAS_DIR
                );

            const musicas =
                arquivos

                .filter(
                    arquivo =>
                        arquivo.endsWith(
                            ".json"
                        )
                )

                .map(arquivo => {

                    const musica =
                        lerJson(

                            path.join(
                                MUSICAS_DIR,
                                arquivo
                            )
                        );

                    return {

                        id:
                            musica.id,

                        titulo:
                            musica.titulo,

                        autor:
                            musica.autor,

                        categoria:
                            musica.categoria,

                        duracao:
                            musica.duracao || 5,

                        tomOriginal:
                            musica.tomOriginal,

                        ultimoTom:
                            musica.ultimoTom
                    };
                });

            res.json(
                musicas
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao listar músicas"
                });
        }
    }
);

/* =====================================================
   API - BUSCAR MÚSICA
===================================================== */

app.get(
    "/api/musicas/:id",
    (req, res) => {

        try {

            const arquivo =
                caminhoMusica(
                    req.params.id
                );

            if (
                !fs.existsSync(
                    arquivo
                )
            ) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Música não encontrada"
                    });
            }

            res.json(
                lerJson(
                    arquivo
                )
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao carregar música"
                });
        }
    }
);

/* =====================================================
   IMPORTADOR INTELIGENTE V2
===================================================== */

app.post(

    "/api/musicas/importar",

    upload.single(
        "arquivo"
    ),

    (req, res) => {

        try {

            const buffer =
                fs.readFileSync(
                    req.file.path
                );

            let textoOriginal;

            try {

                textoOriginal =
                    iconv.decode(
                        buffer,
                        "utf8"
                    );

            } catch {

                textoOriginal =
                    iconv.decode(
                        buffer,
                        "latin1"
                    );
            }

            if (

                textoOriginal.includes("Ã")

                ||

                textoOriginal.includes("�")

            ) {

                textoOriginal =
                    iconv.decode(
                        buffer,
                        "latin1"
                    );
            }

            let texto =
                removerTabelaAcordes(
                    textoOriginal
                );

            const dadosArquivo =
                extrairTituloAutor(

                    req.file.originalname
                );

            const titulo =
                dadosArquivo.titulo;

            const autor =
                dadosArquivo.autor;

            const tomOriginal =
                detectarTom(
                    texto
                );

            const id =

                gerarNomeArquivo(
                    titulo
                )

                + "-"

                + Date.now();

            const musica = {

                id,

                titulo,

                autor,

                categoria: "Geral",

                duracao: 5,

                tomOriginal,

                ultimoTom: tomOriginal,

                conteudo: texto.trim(),

                criadoEm:
                    new Date()
                    .toISOString()
            };

            salvarJson(

                caminhoMusica(
                    id
                ),

                musica
            );

            fs.unlinkSync(
                req.file.path
            );

            res.json({

                sucesso: true,

                musica
            });

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({

                    erro:
                        "Erro ao importar música"
                });
        }
    }
);

/* =====================================================
   API - EXCLUIR MÚSICA
===================================================== */

app.delete(
    "/api/musicas/:id",
    (req, res) => {

        try {

            const arquivo =
                caminhoMusica(
                    req.params.id
                );

            if (
                !fs.existsSync(
                    arquivo
                )
            ) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Música não encontrada"
                    });
            }

            fs.unlinkSync(
                arquivo
            );

            res.json({
                sucesso: true
            });

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao excluir música"
                });
        }
    }
);

/* =====================================================
   API - ATUALIZAR ÚLTIMO TOM
===================================================== */

app.put(
    "/api/musicas/:id/tom",
    (req, res) => {

        try {

            const { tom } =
                req.body;

            const arquivo =
                caminhoMusica(
                    req.params.id
                );

            if (
                !fs.existsSync(
                    arquivo
                )
            ) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Música não encontrada"
                    });
            }

            const musica =
                lerJson(
                    arquivo
                );

            musica.ultimoTom =
                tom;

            salvarJson(
                arquivo,
                musica
            );

            res.json({

                sucesso: true,

                ultimoTom: tom
            });

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao atualizar tom"
                });
        }
    }
);

/* =====================================================
   ATUALIZAR DURAÇÃO
===================================================== */

app.put(
    "/api/musicas/:id/duracao",
    (req, res) => {

        try {

            const arquivo =
                caminhoMusica(
                    req.params.id
                );

            if (
                !fs.existsSync(
                    arquivo
                )
            ) {

                return res
                .status(404)
                .json({
                    erro:
                    "Música não encontrada"
                });
            }

            const musica =
                lerJson(
                    arquivo
                );

            musica.duracao =
                Number(
                    req.body.duracao
                );

            salvarJson(
                arquivo,
                musica
            );

            res.json({
                sucesso:true
            });

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
            .json({
                erro:
                "Erro ao atualizar duração"
            });
        }
    }
);

/* =====================================================
   API - CRIAR REPERTÓRIO
===================================================== */

app.post(
    "/api/repertorios",
    (req, res) => {

        try {

            const {
                nome,
                musicas
            } = req.body;

            if (!nome) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Nome do repertório é obrigatório"
                    });
            }

            const id =
                gerarNomeArquivo(
                    nome
                );

            const repertorio = {

                id,

                nome,

                dataCriacao:
                    new Date()
                    .toISOString(),

                musicas:
                    musicas || []
            };

            salvarJson(

                caminhoRepertorio(
                    id
                ),

                repertorio
            );

            res.json({

                sucesso: true,

                repertorio
            });

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao criar repertório"
                });
        }
    }
);

/* =====================================================
   API - LISTAR REPERTÓRIOS
===================================================== */

app.get(
    "/api/repertorios",
    (req, res) => {

        try {

            const arquivos =
                fs.readdirSync(
                    REPERTORIOS_DIR
                );

            const repertorios =
                arquivos

                .filter(
                    arquivo =>
                        arquivo.endsWith(
                            ".json"
                        )
                )

                .map(arquivo => {

                    const repertorio =
                        lerJson(

                            path.join(
                                REPERTORIOS_DIR,
                                arquivo
                            )
                        );

                    return {

                        id:
                            repertorio.id,

                        nome:
                            repertorio.nome,

                        dataCriacao:
                            repertorio.dataCriacao,

                        quantidadeMusicas:
                            repertorio.musicas.length
                    };
                });

            repertorios.sort(
                (a, b) =>
                    a.nome.localeCompare(
                        b.nome
                    )
            );

            res.json(
                repertorios
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao listar repertórios"
                });
        }
    }
);

/* =====================================================
   API - BUSCAR REPERTÓRIO
===================================================== */

app.get(
    "/api/repertorios/:id",
    (req, res) => {

        try {

            const arquivo =
                caminhoRepertorio(
                    req.params.id
                );

            if (
                !fs.existsSync(
                    arquivo
                )
            ) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Repertório não encontrado"
                    });
            }

            const repertorio =
                lerJson(
                    arquivo
                );

            res.json(
                repertorio
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao carregar repertório"
                });
        }
    }
);

function carregarRepertorio(id) {

    const arquivo =
        caminhoRepertorio(id);

    if (!fs.existsSync(arquivo)) {
        return null;
    }

    return lerJson(arquivo);
}

/* =====================================================
   API - ATUALIZAR REPERTÓRIO
===================================================== */

app.put(
    "/api/repertorios/:id",
    (req, res) => {

        try {

            const arquivo =
                caminhoRepertorio(
                    req.params.id
                );

            if (
                !fs.existsSync(
                    arquivo
                )
            ) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Repertório não encontrado"
                    });
            }

            const repertorio =
                lerJson(
                    arquivo
                );

            repertorio.nome =
                req.body.nome ||
                repertorio.nome;

            repertorio.musicas =
                req.body.musicas ||
                repertorio.musicas;

            salvarJson(
                arquivo,
                repertorio
            );

            res.json({

                sucesso: true,

                repertorio
            });

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao atualizar repertório"
                });
        }
    }
);

/* =====================================================
   API - EXCLUIR REPERTÓRIO
===================================================== */

app.delete(
    "/api/repertorios/:id",
    (req, res) => {

        try {

            const arquivo =
                caminhoRepertorio(
                    req.params.id
                );

            if (
                !fs.existsSync(
                    arquivo
                )
            ) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Repertório não encontrado"
                    });
            }

            fs.unlinkSync(
                arquivo
            );

            res.json({
                sucesso: true
            });

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao excluir repertório"
                });
        }
    }
);

/* =====================================================
   API - SESSÃO ATUAL
===================================================== */

app.get(
    "/api/sessao",
    (req, res) => {

        res.json(
            sessaoAtual
        );
    }
);

/* =====================================================
   API - ENCERRAR SESSÃO
===================================================== */

app.delete(
    "/api/sessao",
    (req, res) => {

        sessaoAtual = {

            ativa: false
        };

        salvarSessao(
            sessaoAtual
        );

        io.emit(
            "sessaoEncerrada"
        );

        res.json({
            sucesso: true
        });
    }
);

/* =====================================================
   API - INICIAR SESSÃO
===================================================== */

app.post(
    "/api/sessao/iniciar",
    (req, res) => {

        try {

            const {
                repertorioId
            } = req.body;

            const repertorioArquivo =
                caminhoRepertorio(
                    repertorioId
                );

            if (
                !fs.existsSync(
                    repertorioArquivo
                )
            ) {

                return res
                    .status(404)
                    .json({
                        erro:
                            "Repertório não encontrado"
                    });
            }

            const repertorio =
                lerJson(
                    repertorioArquivo
                );

            if (
                repertorio.musicas
                    .length === 0
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Repertório vazio"
                    });
            }

            const primeiraMusica =
                lerJson(

                    caminhoMusica(
                        repertorio.musicas[0]
                    )
                );

            sessaoAtual = {

                ativa: true,

                repertorioId,

                indiceAtual: 0,

                musicaId:
                    primeiraMusica.id,

                titulo:
                    primeiraMusica.titulo,

                tomOriginal:
                    primeiraMusica.tomOriginal,

                tomAtual:
                    primeiraMusica.ultimoTom,

                conteudo:
                    primeiraMusica.conteudo
            };

            salvarSessao(
                sessaoAtual
            );

            io.emit(
                "sessaoAtualizada",
                sessaoAtual
            );

            res.json(
                sessaoAtual
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao iniciar sessão"
                });
        }
    }
);

/* =====================================================
   API - PRÓXIMA MÚSICA
===================================================== */

app.post(
    "/api/sessao/proxima",
    (req, res) => {

        try {

            const repertorio =
                lerJson(

                    caminhoRepertorio(
                        sessaoAtual.repertorioId
                    )
                );

            if (

                sessaoAtual.indiceAtual >=
                repertorio.musicas.length - 1

            ) {

                return res.json(
                    sessaoAtual
                );
            }

            sessaoAtual.indiceAtual++;

            const musica =
                lerJson(

                    caminhoMusica(

                        repertorio.musicas[
                            sessaoAtual.indiceAtual
                        ]
                    )
                );

            sessaoAtual.musicaId =
                musica.id;

            sessaoAtual.titulo =
                musica.titulo;

            sessaoAtual.tomOriginal =
                musica.tomOriginal;

            sessaoAtual.tomAtual =
                musica.ultimoTom;

            sessaoAtual.conteudo =
                musica.conteudo;

            salvarSessao(
                sessaoAtual
            );

            io.emit(
                "sessaoAtualizada",
                sessaoAtual
            );

            res.json(
                sessaoAtual
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao avançar"
                });
        }
    }
);

/* =====================================================
   API - MÚSICA ANTERIOR
===================================================== */

app.post(
    "/api/sessao/anterior",
    (req, res) => {

        try {

            if (
                sessaoAtual.indiceAtual <= 0
            ) {

                return res.json(
                    sessaoAtual
                );
            }

            const repertorio =
                lerJson(

                    caminhoRepertorio(
                        sessaoAtual.repertorioId
                    )
                );

            sessaoAtual.indiceAtual--;

            const musica =
                lerJson(

                    caminhoMusica(

                        repertorio.musicas[
                            sessaoAtual.indiceAtual
                        ]
                    )
                );

            sessaoAtual.musicaId =
                musica.id;

            sessaoAtual.titulo =
                musica.titulo;

            sessaoAtual.tomOriginal =
                musica.tomOriginal;

            sessaoAtual.tomAtual =
                musica.ultimoTom;

            sessaoAtual.conteudo =
                musica.conteudo;

            salvarSessao(
                sessaoAtual
            );

            io.emit(
                "sessaoAtualizada",
                sessaoAtual
            );

            res.json(
                sessaoAtual
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({
                    erro:
                        "Erro ao voltar"
                });
        }
    }
);

/* =====================================================
   SOCKET.IO
===================================================== */

io.on(
    "connection",
    socket => {

        console.log(
            "Cliente conectado:",
            socket.id
        );

        socket.emit(
            "sessaoAtualizada",
            sessaoAtual
        );

        socket.on(
            "alterarTom",

            dados => {

                sessaoAtual.tomAtual =
                    dados.tomAtual;

                try {

                    const arquivo =
                        caminhoMusica(
                            sessaoAtual.musicaId
                        );

                    if (
                        fs.existsSync(
                            arquivo
                        )
                    ) {

                        const musica =
                            lerJson(
                                arquivo
                            );

                        musica.ultimoTom =
                            dados.tomAtual;

                        salvarJson(
                            arquivo,
                            musica
                        );
                    }

                } catch(err) {

                    console.error(err);
                }

                salvarSessao(
                    sessaoAtual
                );

                io.emit(
                    "sessaoAtualizada",
                    sessaoAtual
                );
            }
        );

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Cliente desconectado"
                );
            }
        );
    }
);

/* =====================================================
   DUPLICAR REPERTÓRIO
===================================================== */

app.post(
    "/api/repertorios/:id/duplicar",

    (req, res) => {

        try {

            const original =
                lerJson(

                    caminhoRepertorio(
                        req.params.id
                    )
                );

            const novoId =
                gerarNomeArquivo(

                    original.nome +
                    " copia"
                );

            const copia = {

                ...original,

                id: novoId,

                nome:
                    original.nome +
                    " (Cópia)",

                criadoEm:
                    new Date()
                    .toISOString()
            };

            salvarJson(

                caminhoRepertorio(
                    novoId
                ),

                copia
            );

            res.json(
                copia
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
                .json({

                    erro:
                    "Erro ao duplicar"
                });
        }
    }
);

app.post(
    "/api/sessao/repertorio",

    (req, res) => {

        try {

            const { repertorioId } =
                req.body;

            const repertorio =
                carregarRepertorio(
                    repertorioId
                );

            if (
                !repertorio ||
                !repertorio.musicas.length
            ) {

                return res
                .status(400)
                .json({
                    erro:
                    "Repertório vazio"
                });
            }

            const primeiraMusicaId =
                repertorio.musicas[0];

            const musica =
                lerJson(
                    caminhoMusica(
                        primeiraMusicaId
                    )
                );

            sessaoAtual = {

                repertorioId,

                indiceAtual: 0,

                musicaId:
                    primeiraMusicaId,

                tomAtual:
                    musica.ultimoTom ||
                    musica.tomOriginal
            };

            salvarSessao(
                sessaoAtual
            );

            io.emit(
                "sessaoAtualizada",
                sessaoAtual
            );

            res.json(
                sessaoAtual
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
            .json({
                erro:
                "Erro ao iniciar repertório"
            });
        }
    }
);

app.post(
    "/api/sessao/proxima",

    (req,res) => {

        try {

            if (
                !sessaoAtual.repertorioId
            ) {

                return res
                .status(400)
                .json({
                    erro:
                    "Nenhum repertório ativo"
                });
            }

            const repertorio =
                carregarRepertorio(
                    sessaoAtual.repertorioId
                );

            if (
                sessaoAtual.indiceAtual >=
                repertorio.musicas.length - 1
            ) {

                return res.json(
                    sessaoAtual
                );
            }

            sessaoAtual.indiceAtual++;

            const musicaId =

                repertorio.musicas[
                    sessaoAtual.indiceAtual
                ];

            const musica =
                lerJson(
                    caminhoMusica(
                        musicaId
                    )
                );

            sessaoAtual.musicaId =
                musicaId;

            sessaoAtual.tomAtual =
                musica.ultimoTom;

            salvarSessao(
                sessaoAtual
            );

            io.emit(
                "sessaoAtualizada",
                sessaoAtual
            );

            res.json(
                sessaoAtual
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
            .json({
                erro:
                "Erro ao avançar"
            });
        }
    }
);

app.post(
    "/api/sessao/anterior",

    (req,res) => {

        try {

            if (
                !sessaoAtual.repertorioId
            ) {

                return res
                .status(400)
                .json({
                    erro:
                    "Nenhum repertório ativo"
                });
            }

            const repertorio =
                carregarRepertorio(
                    sessaoAtual.repertorioId
                );

            if (
                sessaoAtual.indiceAtual <= 0
            ) {

                return res.json(
                    sessaoAtual
                );
            }

            sessaoAtual.indiceAtual--;

            const musicaId =

                repertorio.musicas[
                    sessaoAtual.indiceAtual
                ];

            const musica =
                lerJson(
                    caminhoMusica(
                        musicaId
                    )
                );

            sessaoAtual.musicaId =
                musicaId;

            sessaoAtual.tomAtual =
                musica.ultimoTom;

            salvarSessao(
                sessaoAtual
            );

            io.emit(
                "sessaoAtualizada",
                sessaoAtual
            );

            res.json(
                sessaoAtual
            );

        } catch (erro) {

            console.error(
                erro
            );

            res.status(500)
            .json({
                erro:
                "Erro ao voltar"
            });
        }
    }
);

server.listen(
    PORT,
    () => {

        console.log(
            `Servidor iniciado em http://localhost:${PORT}`
        );
    }
);

