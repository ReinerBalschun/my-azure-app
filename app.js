const express = require('express');
const sql = require('mssql');
const { BlobServiceClient } = require('@azure/storage-blob');
const { QueueServiceClient } = require('@azure/storage-queue');
require('dotenv').config(); // Umgebungsvariablen aus .env laden

const app = express();
const port = process.env.PORT || 8080;

// SQL-Datenbank-Konfiguration
const sqlConfig = {
    server: process.env.SQL_SERVER || "mywebappserver-rb.database.windows.net",
    database: process.env.SQL_DATABASE || "MyWebAppDB",
    user: process.env.SQL_USER || "serversqlrb",
    password: process.env.SQL_PASSWORD, // Sicherstellen, dass die Umgebungsvariable definiert ist
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

// Azure Blob Storage und Queue Storage Konfiguration
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.STORAGE_CONNECTION_STRING);
const queueServiceClient = QueueServiceClient.fromConnectionString(process.env.STORAGE_CONNECTION_STRING);

// Standard-Blob-Container-Name
const containerName = 'myblobcontainer';

// Standard-Queue-Name
const queueName = 'myqueue';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Startseite
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Welcome to My Web App</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f9;
                    color: #333;
                }
                h1 {
                    text-align: center;
                    padding: 20px 0;
                }
                .container {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 20px;
                    padding: 20px;
                }
                .box {
                    background: #ffffff;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    width: 300px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .box h2 {
                    margin-bottom: 10px;
                }
                .box a {
                    text-decoration: none;
                    color: #007bff;
                    font-weight: bold;
                }
                .box a:hover {
                    color: #0056b3;
                }
                .button {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 10px 20px;
                    background-color: #007bff;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                }
                .button:hover {
                    background-color: #0056b3;
                }
            </style>
        </head>
        <body>
            <h1>Welcome to My Web App</h1>
            <div class="container">
                <div class="box">
                    <h2>View Users</h2>
                    <p>Check the list of all users from the SQL Database.</p>
                    <a href="/users">Go to Users</a>
                </div>
                <div class="box">
                    <h2>Upload File</h2>
                    <p>Upload a file to the Azure Blob Storage.</p>
                    <a href="/upload">Go to Upload</a>
                </div>
                <div class="box">
                    <h2>View Blobs</h2>
                    <p>View all files uploaded to the Blob Storage.</p>
                    <a href="/blobs">Go to Blobs</a>
                </div>
                <div class="box">
                    <h2>Queue Messages</h2>
                    <p>Send and retrieve messages from the Azure Queue Storage.</p>
                    <a href="/queue">Go to Queue</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Seite: Benutzer aus der SQL-Datenbank anzeigen
app.get('/users', async (req, res) => {
    try {
        const pool = await sql.connect(sqlConfig);
        const result = await pool.request().query('SELECT * FROM Users');

        const users = result.recordset;
        let htmlResponse = '<h1>Users from Database:</h1><ul>';
        users.forEach(user => {
            htmlResponse += `<li>${user.name} - ${user.email}</li>`;
        });
        htmlResponse += '</ul>';
        htmlResponse += '<button onclick="location.href=\'/\'">Return to Home</button>';
        res.send(htmlResponse);
    } catch (error) {
        console.error('SQL Database Error:', error.message);
        res.status(500).send('<h1>Error connecting to the database</h1>');
    }
});

// Seite: Datei-Upload in Azure Blob Storage
app.post('/upload', async (req, res) => {
    try {
        const { fileName, fileContent } = req.body;

        if (!fileName || !fileContent) {
            return res.status(400).send('<h1>Invalid request: fileName and fileContent are required</h1>');
        }

        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        await blockBlobClient.upload(fileContent, Buffer.byteLength(fileContent));
        res.send(`
            <h1>File "${fileName}" uploaded successfully to Blob Storage.</h1>
            <button onclick="location.href='/blobs'">View Blob Files</button>
            <button onclick="location.href='/'">Return to Home</button>
        `);
    } catch (error) {
        console.error('Blob Storage Upload Error:', error.message);
        res.status(500).send('<h1>Error uploading file to Blob Storage</h1>');
    }
});

// Seite: Dateien in Azure Blob Storage anzeigen
app.get('/blobs', async (req, res) => {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);

        let htmlResponse = '<h1>Files in Blob Storage:</h1><ul>';
        for await (const blob of containerClient.listBlobsFlat()) {
            htmlResponse += `<li>${blob.name}</li>`;
        }
        htmlResponse += '</ul>';
        htmlResponse += '<button onclick="location.href=\'/\'">Return to Home</button>';
        res.send(htmlResponse);
    } catch (error) {
        console.error('Blob Storage Fetch Error:', error.message);
        res.status(500).send('<h1>Error fetching blobs from Blob Storage</h1>');
    }
});

// Seite: Einfaches Formular für Datei-Uploads
app.get('/upload', (req, res) => {
    res.send(`
        <h1>Upload a File</h1>
        <form action="/upload" method="POST">
            <label>File Name: <input type="text" name="fileName" required></label><br>
            <label>File Content: <textarea name="fileContent" required></textarea></label><br>
            <button type="submit">Upload</button>
        </form>
        <button onclick="location.href='/'">Return to Home</button>
    `);
});

app.get('/queue', (req, res) => {
    res.send(`
        <h1>Azure Queue Storage</h1>
        <p>Welcome to the Azure Queue Storage page. Here you can send and view messages in the queue.</p>
        <button onclick="location.href='/queue/send'">Send Message</button>
        <button onclick="location.href='/queue/view'">View Messages</button>
        <button onclick="location.href='/'">Return to Home</button>
    `);
});

// Nachricht in die Azure Queue senden
app.post('/queue/send', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).send('<h1>Error: Message content is required</h1>');
        }

        const queueClient = queueServiceClient.getQueueClient(queueName);
        await queueClient.sendMessage(message);

        res.send(`
            <h1>Message successfully sent to the queue.</h1>
            <p><strong>Message:</strong> ${message}</p>
            <button onclick="location.href='/queue'">Return to Queue</button>
            <button onclick="location.href='/queue/view'">View Messages</button>
            <button onclick="location.href='/'">Return to Home</button>
        `);
    } catch (error) {
        console.error('Queue Send Error:', error.message);
        res.status(500).send('<h1>Error sending message to the queue</h1>');
    }
});

// Seite: Azure Queue Storage Nachrichten anzeigen
app.get('/queue/view', async (req, res) => {
    try {
        const queueClient = queueServiceClient.getQueueClient(queueName);

        // Retrieve all messages in the queue
        const messages = await queueClient.receiveMessages({ numberOfMessages: 32 }); // Get up to 32 messages
        let htmlResponse = '<h1>Messages in Queue:</h1><ul>';

        // Loop through and display all messages
        messages.receivedMessageItems.forEach(msg => {
            htmlResponse += `<li>${msg.messageText}</li>`;
        });

        htmlResponse += '</ul>';
        htmlResponse += `
            <button onclick="location.href='/queue'">Return to Queue</button>
            <button onclick="location.href='/'">Return to Home</button>
        `;
        res.send(htmlResponse);
    } catch (error) {
        console.error('Queue View Error:', error.message);
        res.status(500).send('<h1>Error fetching messages from the queue</h1>');
    }
});

// Seite: Einfaches Formular zum Senden von Nachrichten
app.get('/queue/send', (req, res) => {
    res.send(`
        <h1>Send a Message to the Queue</h1>
        <form action="/queue/send" method="POST">
            <label>Message: <input type="text" name="message" required></label><br>
            <button type="submit">Send Message</button>
        </form>
        <button onclick="location.href='/queue'">Return to Queue</button>
        <button onclick="location.href='/queue/view'">View Messages</button>
        <button onclick="location.href='/'">Return to Home</button>
    `);
});

// Server starten
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
