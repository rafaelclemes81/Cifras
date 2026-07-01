const NOTAS_SUSTENIDO = [
    "C","C#","D","D#","E","F",
    "F#","G","G#","A","A#","B"
];

const BEMOIS = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#"
};

const SUSTENIDOS_PARA_BEMOIS = {
    "C#": "Db",
    "D#": "Eb",
    "F#": "Gb",
    "G#": "Ab",
    "A#": "Bb"
};

function normalizarNota(nota) {
    return BEMOIS[nota] || nota;
}

function transporNota(nota, semitons) {

    const normalizada = normalizarNota(nota);

    let indice =
        NOTAS_SUSTENIDO.indexOf(
            normalizada
        );

    if (indice < 0)
        return nota;

    indice =
        (indice + semitons + 12) % 12;

    return NOTAS_SUSTENIDO[indice];
}

function transporAcorde(acorde, semitons) {

    const regex =
        /^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/;

    const match =
        acorde.match(regex);

    if (!match)
        return acorde;

    const raiz = match[1];
    const complemento = match[2] || "";
    const baixo = match[3];

    const novaRaiz =
        transporNota(
            raiz,
            semitons
        );

    let resultado =
        novaRaiz +
        complemento;

    if (baixo) {

        resultado +=
            "/" +
            transporNota(
                baixo,
                semitons
            );
    }

    return resultado;
}

function calcularSemitons(
    tomOrigem,
    tomDestino
) {

    const origem =
        NOTAS_SUSTENIDO.indexOf(
            normalizarNota(
                tomOrigem
            )
        );

    const destino =
        NOTAS_SUSTENIDO.indexOf(
            normalizarNota(
                tomDestino
            )
        );

    return destino - origem;
}

function transpor(
    texto,
    tomOrigem,
    tomDestino
) {

    const semitons =
        calcularSemitons(
            tomOrigem,
            tomDestino
        );

    const regexAcorde =
        /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:\d+)?(?:M)?(?:\/[A-G](?:#|b)?)?$/;

    return texto
        .split("\n")
        .map(linha => {

            const textoLimpo =
                linha.trim();

            if (

                textoLimpo.startsWith("[")

                ||

                textoLimpo.startsWith("(")

            ) {

                return transporLinhaEspecial(
                    linha,
                    semitons
                );
            }

            if (
                !isLinhaDeAcordes(
                    linha
                )
            ) {

                return linha;
            }

            return linha.replace(

                /\S+/g,

                token => {

                    if (
                        regexAcorde.test(
                            token
                        )
                    ) {

                        return transporAcorde(
                            token,
                            semitons
                        );
                    }

                    return token;
                }
            );

        })
        .join("\n");
}

function renderizarCifraClub(texto) {

    if (!texto) return "";

    const linhas =
        texto.split("\n");

    let html =
        '<pre class="cifra-club">';

    linhas.forEach(linha => {

        html += linha
            .replace(

                /\[([^\]]+)\]/g,

                '<span class="acorde">$1</span>'
            )

            + "\n";
    });

    html += "</pre>";

    return html;
}

function isLinhaDeAcordes(linha) {

    const texto = linha.trim();

    if (!texto) return false;

    if (
        texto.startsWith("[")
        || texto.startsWith("(")
    ) {
        return false;
    }

    const tokens = texto.split(/\s+/);

    if (tokens.length === 0) {
        return false;
    }

    const regexAcorde =
        /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:\d+)?(?:M)?(?:\/[A-G](?:#|b)?)?$/;

    let acordes = 0;

    tokens.forEach(token => {

        if (
            regexAcorde.test(token)
        ) {
            acordes++;
        }
    });

    return (
        acordes > 0
        &&
        acordes / tokens.length >= 0.8
    );
}

function transporLinhaEspecial(
    linha,
    semitons
) {

    const regexAcorde =
        /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:\d+)?(?:M)?(?:\/[A-G](?:#|b)?)?$/;

    // [Intro] G Em7 C

    const matchSecao =
        linha.match(
            /^(\[[^\]]+\])\s*(.*)$/
        );

    if (matchSecao) {

        const prefixo =
            matchSecao[1];

        const restante =
            matchSecao[2];

        const acordes =
            restante
                .split(/\s+/)
                .map(token => {

                    if (
                        regexAcorde.test(
                            token
                        )
                    ) {

                        return transporAcorde(
                            token,
                            semitons
                        );
                    }

                    return token;
                })
                .join(" ");

        return `${prefixo} ${acordes}`;
    }

    // ( G4 G Em7 )

    const matchParenteses =
        linha.trim().match(
            /^\((.*?)\)$/
        );

    if (matchParenteses) {

            const conteudo =
                matchParenteses[1];

            const textoTransposto =
                conteudo.replace(

                    /\b[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:\d+)?(?:M)?(?:\/[A-G](?:#|b)?)?\b/g,

                    acorde =>

                        transporAcorde(
                            acorde,
                            semitons
                        )
                );

            return `(${textoTransposto})`;
        }

    return linha;
}