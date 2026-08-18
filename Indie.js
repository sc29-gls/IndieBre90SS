const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
app.use(cors());

//////////////////////////////////////////////////////////////////////////////////////
// CARICAMENTO DATI 
//////////////////////////////////////////////////////////////////////////////////////
let array_giochi = [];

// Carica json contenente lista giochi coi relativi voti
try {
    const fileContent = fs.readFileSync('indie.json', 'utf8');
    array_giochi = JSON.parse(fileContent);
    
    console.log("✅ indie.json caricato correttamente");
} catch (err) {
    console.error("❌ Errore lettura JSON indie.json:", err);
}


//////////////////////////////////////////////////////////////////////////////////////
// CORPO DEL CODICE
//////////////////////////////////////////////////////////////////////////////////////

app.get('/indie', (req, res) => {
    const fullInput = req.query.input; // Riceve l'intero messaggio
    
    if (!fullInput) {
        console.log(`Errore: Input Mancante`);
        return res.send("Parametro input mancante.");
    }

    console.log(`Input message: ${fullInput}`);

    if (fullInput.trim().toUpperCase() === 'PING') {
        console.log('Input "PING" -> Fornire messaggio PONG per PING ricevuto');
        return res.send("PONG! Il server è online e risponde correttamente.");
    }

    const parti = fullInput.trim().split(/\s+/);
    const comando_twitch = parti[0] ? parti[0].toLowerCase() : "";
    const comando_bot = parti[1] ? parti[1].toLowerCase() : "";
    const dettagli_input = parti.length > 2 ? parti.slice(2).join(' ').toLowerCase() : null;

    // 1. Gestione "!indie lista"
    if (comando_bot === "lista") {
        console.log(`Richiesta: ${comando_twitch} ${comando_bot} -> fornire la lista dei giochi valutati`);
        
        // FIX: Corretto array_giochi.length() in array_giochi.length e ciclo per evitare errori fuori indice
        const lista_nomi_giochi = array_giochi.map(g => g.nome_gioco).join(' - ');
        let message = `ecco la lista dei giochi indie che abbiamo provato fin'ora: ${lista_nomi_giochi}`;
        return res.send(message);
    }

    // 2. Gestione "!indie info nome_gioco"
    if (comando_bot === 'info' && dettagli_input != null) {
        console.log(`Richiesta: ${comando_twitch} ${comando_bot} ${dettagli_input} -> fornire info sintetiche sul gioco ${dettagli_input}`);
        const nome_gioco_cercato = dettagli_input.trim().toLowerCase();
        const info_gioco = array_giochi.find(gioco => gioco.nome_gioco.trim().toLowerCase() === nome_gioco_cercato);

        if (info_gioco) {
            console.log(`-> info trovate per gioco ${nome_gioco_cercato}`);
            const giocato_quando = info_gioco.giocato_quando;
            const link_download = info_gioco.link_download;

            const calcolaMediaCategorie = (categorieObj) => {
                const valori = Object.values(categorieObj);
                const somma = valori.reduce((acc, val) => acc + val, 0);
                return valori.length > 0 ? somma / valori.length : 0;
            };

            const media_gioco = calcolaMediaCategorie(info_gioco.categorie);
            const medie_tutti_giochi = array_giochi.map(gioco => calcolaMediaCategorie(gioco.categorie));
            medie_tutti_giochi.sort((a, b) => b - a);

            const posizione = medie_tutti_giochi.findIndex(m => m === media_gioco) + 1;
            const totale_giochi = array_giochi.length;

            const stringa_posizione = `${posizione} su ${totale_giochi}`;
            
            let message = `💎Voto: ${media_gioco.toFixed(1)} su 5 // 💹Ranking: ${stringa_posizione} // 🌐Link per scaricarlo: ${link_download} // 🟣Recupera i vod dei giorni ${giocato_quando.join(', ')} per farti un'idea migliore❗`;
            return res.send(message);
        } else {
            console.log(`-> Nessun gioco trovato con il nome "${dettagli_input}".`);
            let message = `Socio hai sbagliato a scrivere il nome del gioco 😒😒, fai "${comando_twitch} lista" per sapere quali giochi sono stati valutati finora`;
            return res.send(message);
        }
    }

    // 3. Gestione "!indie categorie nome_gioco"
    if (comando_bot === 'categorie' && dettagli_input != null) {
        console.log(`Richiesta: ${comando_twitch} ${comando_bot} ${dettagli_input} -> fornire valutazioni singole categorie del gioco ${dettagli_input}`);
        const nome_gioco_cercato = dettagli_input.trim().toLowerCase();
        const info_gioco = array_giochi.find(gioco => gioco.nome_gioco.trim().toLowerCase() === nome_gioco_cercato);

        if (info_gioco) {
            console.log(`-> info trovate per gioco ${nome_gioco_cercato}`);
            const categorie = info_gioco.categorie;
            const array_emoji = ['🕹️', '🔊', '🖥️', '🎯', '🔄'];
            const lista_categorie = Object.entries(categorie).map(([chiave, valore], index) => `${array_emoji[index] || ''} ${chiave}: ${valore} su 5`.trim()).join(' // ');

            let message = `Valutazioni per ${dettagli_input} -> ${lista_categorie}`;
            return res.send(message);
        } else {
            console.log(`-> Nessun gioco trovato con il nome "${dettagli_input}".`);
            let message = `Socio hai sbagliato a scrivere il nome del gioco 😒😒, fai "${comando_twitch} lista" per sapere quali giochi sono stati valutati finora`;
            return res.send(message);
        }
    }

    // 4. Gestione "!indie top3"
    if (comando_bot === "top3") {
        console.log(`Richiesta: ${comando_twitch} ${comando_bot} -> fornire la top3 giochi valutati`);
        let giochi_medie = array_giochi.map(gioco => {
            const voti = Object.values(gioco.categorie);
            const media = voti.reduce((acc, val) => acc + val, 0) / voti.length;
            return { nome: gioco.nome_gioco, media };
        });

        giochi_medie.sort((a, b) => b.media - a.media);
        let message = `La top3 attuale è: 
        🥇 ${giochi_medie[0]?.nome || 'N/A'} (${Math.round((giochi_medie[0]?.media || 0)*10)/10} su 5) //
        🥈 ${giochi_medie[1]?.nome || 'N/A'} (${Math.round((giochi_medie[1]?.media || 0)*10)/10} su 5) //
        🥉 ${giochi_medie[2]?.nome || 'N/A'} (${Math.round((giochi_medie[2]?.media || 0)*10)/10} su 5) //`;
        return res.send(message);
    }

    // 5. Gestione "!indie flop3"
    if (comando_bot === "flop3") {
        console.log(`Richiesta: ${comando_twitch} ${comando_bot} -> fornire la flop3 giochi valutati`);
        let giochi_medie = array_giochi.map(gioco => {
            const voti = Object.values(gioco.categorie);
            const media = voti.reduce((acc, val) => acc + val, 0) / voti.length;
            return { nome: gioco.nome_gioco, media };
        });

        // FIX: Ordinamento crescente (dalla media più bassa a salire) per il flop3
        giochi_medie.sort((a, b) => a.media - b.media);
        let message = `La flop3 attuale è: 
        💩🥇 ${giochi_medie[0]?.nome || 'N/A'} (${Math.round((giochi_medie[0]?.media || 0)*10)/10} su 5) //
        💩🥈 ${giochi_medie[1]?.nome || 'N/A'} (${Math.round((giochi_medie[1]?.media || 0)*10)/10} su 5) //
        💩🥉 ${giochi_medie[2]?.nome || 'N/A'} (${Math.round((giochi_medie[2]?.media || 0)*10)/10} su 5) //`;
        return res.send(message);
    }

    // ==============================================================================
    // FALLBACK / PARACADUTE (Esegue anche per "!indie help" o qualsiasi comando sconosciuto)
    // ==============================================================================
    console.log(`Richiesta istruzioni comando o comando sconosciuto: "${comando_bot}"`);
    return res.send(`Istruzioni: 
        ▶ "${comando_twitch} lista" -> giochi indie che abbiamo provato, 
        ▶ "${comando_twitch} info nome_gioco" -> info rapide sul gioco, 
        ▶ "${comando_twitch} categorie nome_gioco" -> voti per le singole categorie, 
        ▶ "${comando_twitch} top3" -> attuale top3, 
        ▶ "${comando_twitch} flop3" -> attuale flop3`
    ); 
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server pronto sulla porta ${PORT}`));
