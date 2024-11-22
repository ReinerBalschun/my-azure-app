const express = require('express');
const sql = require('mssql');
require('dotenv').config();  // Umgebungsvariablen aus .env laden

const app = express();
const port = process.env.PORT || 3000;

// Holen der Umgebungsvariablen
const config = {
    server: "mywebappserver-rb.database.windows.net", // Dein SQL-Servername ohne "tcp:"
    database: "MyWebAppDB", // Name der Datenbank
    user: "serversqlrb", // Dein Benutzername
    password: process.env.SQL_PASSWORD, // Dein Passwort (aus .env oder Umgebungsvariable)
    options: {
        encrypt: true, // Verschlüsselung
        trustServerCertificate: false // Keine selbstsignierten Zertifikate
    }
};

// SQL-Verbindung und Abfrage
app.get('/', (req, res) => {
    sql.connect(config).then(pool => {
        return pool.request().query('SELECT * FROM Users');  // Beispielabfrage
    }).then(result => {
        const users = result.recordset;

        let htmlResponse = '<h1>Users from Database:</h1><ul>';
        users.forEach(user => {
            htmlResponse += `<li>${user.name} - ${user.email}</li>`;
        });
        htmlResponse += '</ul>';

        res.send(htmlResponse);
    }).catch(err => {
        console.error('Error connecting to the database:', err);
        res.send('<h1>Error connecting to the database</h1>');
    });
});

// Starte den Server
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
