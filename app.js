const express = require('express');
const sql = require('mssql');
require('dotenv').config();  // Umgebungsvariablen aus .env laden

const app = express();
const port = process.env.PORT || 3000;

// Holen des Connection Strings aus der Umgebungsvariablen
const connectionString = process.env.MY_DB_CONNECTION;

const config = {
    connectionString: connectionString,
    options: {
        encrypt: true,  // Wählt Verschlüsselung
        trustServerCertificate: true  // Vertrau Serverzertifikat, wenn du SSL verwendest
    }
};

// SQL-Verbindung und Abfrage
app.get('/', (req, res) => {
    sql.connect(config).then(pool => {
        return pool.request().query('SELECT * FROM Users');  // Beispielabfrage
    }).then(result => {
        const users = result.recordset;  // Daten aus der Abfrage

        // Gebe die Daten als HTML zurück
        let htmlResponse = '<h1>Users from Database:</h1><ul>';
        users.forEach(user => {
            htmlResponse += `<li>${user.name} - ${user.email}</li>`;
        });
        htmlResponse += '</ul>';

        res.send(htmlResponse);  // Sende die HTML-Seite mit den Daten zurück
    }).catch(err => {
        console.error('Error connecting to the database:', err);
        res.send('<h1>Error connecting to the database</h1>');
    });
});

// Starte den Server
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
