const express = require('express');
const sql = require('mssql');
require('dotenv').config();  // Umgebungsvariablen aus .env laden

const app = express();
const port = process.env.PORT || 3000;

// Holen des Connection Strings aus der Umgebungsvariable
const connectionString = process.env.MY_DB_CONNECTION;

// Konfiguriere die SQL-Verbindung mit dem Connection String
const config = {
    connectionString: connectionString,
    options: {
        encrypt: true,  // Wählt Verschlüsselung
        trustServerCertificate: true  // Vertrau Serverzertifikat, wenn du SSL verwendest
    }
};

// SQL-Verbindung
sql.connect(config).then(pool => {
    return pool.request().query('SELECT * FROM Users');  // Beispielabfrage
}).then(result => {
    console.log(result);
}).catch(err => {
    console.error('Error connecting to the database:', err);
});

// Starte den Server
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});

