const express = require('express');
const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();  // Umgebungsvariablen aus .env laden

const app = express();
const port = process.env.PORT || 8080;

// SQL-Datenbank-Konfiguration
const sqlConfig = {
    server: process.env.SQL_SERVER || "mywebappserver-rb.database.windows.net",
    database: process.env.SQL_DATABASE || "MyWebAppDB",
    user: process.env.SQL_USER || "serversqlrb",
    password: process.env.SQL_PASSWORD,  // Sicherstellen, dass die Umgebungsvariable definiert ist
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

// Azure Blob Storage Konfiguration
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.STORAGE_CONNECTION_STRING);

// Standard-Blob-Container-Name
const containerName = 'myblobcontainer';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root-Endpunkt (Daten aus SQL-Datenbank)
app.get('/', async (req, res) => {
    try {
        const pool = await sql.connect(sqlConfig);
        const result = await pool.request().query('SELECT * FROM Users');

        const users = result.recordset;
        let htmlResponse = '<h1>Users from Database:</h1><ul>';
        users.forEach(user => {
            htmlResponse += `<li>${user.name} - ${user.email}</li>`;
        });
        htmlResponse += '</ul>';
        res.send(htmlResponse);
    } catch (error) {
        console.error('SQL Database Error:', error.message);
        res.status(500).send('<h1>Error connecting to the database</h1>');
    }
});

// Hochladen von Dateien in Azure Blob Storage
app.post('/upload', async (req, res) => {
    try {
        const { fileName, fileContent } = req.body;

        if (!fileName || !fileContent) {
            return res.status(400).send('<h1>Invalid request: fileName and fileContent are required</h1>');
        }

        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        // Datei hochladen
        await blockBlobClient.upload(fileContent, Buffer.byteLength(fileContent));
        res.send(`<h1>Datei "${fileName}" erfolgreich hochgeladen in Blob Storage.</h1>`);
    } catch (error) {
        console.error('Blob Storage Upload Error:', error.message);
        res.status(500).send('<h1>Error uploading file to Blob Storage</h1>');
    }
});

// Liste von Dateien im Azure Blob Storage
app.get('/blobs', async (req, res) => {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);

        let htmlResponse = '<h1>Files in Blob Storage:</h1><ul>';
        for await (const blob of containerClient.listBlobsFlat()) {
            htmlResponse += `<li>${blob.name}</li>`;
        }
        htmlResponse += '</ul>';
        res.send(htmlResponse);
    } catch (error) {
        console.error('Blob Storage Fetch Error:', error.message);
        res.status(500).send('<h1>Error fetching blobs from Blob Storage</h1>');
    }
});

// Einfaches Formular für Datei-Uploads
app.get('/upload', (req, res) => {
    res.send(`
        <h1>Upload a File</h1>
        <form action="/upload" method="POST">
            <label>File Name: <input type="text" name="fileName" required></label><br>
            <label>File Content: <textarea name="fileContent" required></textarea></label><br>
            <button type="submit">Upload</button>
        </form>
    `);
});

// Server starten
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
