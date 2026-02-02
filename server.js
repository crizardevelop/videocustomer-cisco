const express = require('express');
const app = express();
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

if (process.env.NODE_ENV !== 'production'){
  require('dotenv').config()
}

var refreshToken = process.env.REFRESH_TOKEN;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const port = process.env.PORT || 3000;
let guestIssuerServiceAppToken = '';

async function refreshAccessToken() {
  const data = 
    new URLSearchParams({
    'grant_type': 'refresh_token',
    'refresh_token': refreshToken,
    'client_id': clientId,
    'client_secret': clientSecret
    });
  const config = {
    method: 'post',
    url: 'https://webexapis.com/v1/access_token',
    headers: { 
      'Content-type': 'application/x-www-form-urlencoded'
    },
    data : data.toString()
  }
  try {
    const response = await axios.request(config);
    console.log('Access token response data:', response.data);
    guestIssuerServiceAppToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    console.log('Access token refreshed successfully');
    console.log('Refresh Access Token API status code:', response.status);
  } catch (error) {
    console.error('Error refreshing the access token:', error);
    throw (error);
    // alternative: remove the console.log and build a New Error object that includes error received:
    // throw new Error ('Error refreshing the access token:', {cause: error } )
  }  
}

// Enable CORS for all routes
app.use(cors()); 
// Parse URL-encoded and JSON bodies for POST requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Initial token refresh
(async () => {
  try {
    await refreshAccessToken();
  }
  catch (error) {
    console.error('Initial token refresh failed',  error );
  }
})();

// Schedule token refresh daily at 1 PM
cron.schedule('0 13 * * *', async () => {
  try {
    await refreshAccessToken();
  }
  catch (error) {
    console.error ('Scheduled token refresh failed', error );
  }
});

app.get('/get-access-token', async (req, res) => {
  let data = JSON.stringify({
    "subject": "ExternalGuestIdentifier-4",
    "displayName": "Johny Doe"
  });
  const config = {
    method: 'post',
    url: 'https://webexapis.com/v1/guests/token',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Bearer ' + guestIssuerServiceAppToken
    },
    data : data
  };

  try {
    const response = await axios.request(config)
    const accessToken = response.data.accessToken
    console.log('Guest token refreshed successfully');
    console.log('Create guest token API status code:', response.status);
    res.status(200).json({ accessToken }); // Send access token and status code in one line
  } catch (error) {
    console.error('Error creating the guest token:', error);
    res.status(500).json({ error: 'Failed to create the guest token' }); // Send error response
  }
});

app.listen(port, () => {
  console.log(`Server is running at port: ${port}`);
});

// Ruta para solicitar acceso con formulario
app.get('/request-access', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'requestAccess.html'));
});

// Manejar POST desde el formulario
app.post('/request-access', async (req, res) => {
  const { fullname, email, idNumber, idType, requestType } = req.body || {};
  // Ejemplo de console.log para acceder a los parámetros enviados por POST
  console.log('Request Access POST received:');
  console.log('fullname:', fullname);
  console.log('email:', email);
  console.log('idNumber:', idNumber);
  console.log('idType:', idType);
  console.log('requestType:', requestType);

  // Preparar CSV
  const csvPath = path.join(__dirname, 'generatedData', 'requests.csv');
  const timestamp = new Date().toISOString();

  function csvEscape(value) {
    if (value === null || value === undefined) return '""';
    return '"' + String(value).replace(/"/g, '""') + '"';
  }

  const row = [timestamp, fullname, email, idNumber, idType, requestType]
    .map(csvEscape)
    .join(',') + '\n';

  try {
    // Si no existe, crear con header
    if (!fs.existsSync(csvPath)) {
      const header = 'timestamp,fullname,email,idNumber,idType,requestType\n';
      await fs.promises.writeFile(csvPath, header + row, { encoding: 'utf8' });
    } else {
      await fs.promises.appendFile(csvPath, row, { encoding: 'utf8' });
    }

    console.log('Solicitud guardada en', csvPath);

    // Esperar ~3 segundos en el servidor y luego enviar instrucción de redirección
    setTimeout(() => {
      res.status(200).json({ redirect: '/' });
    }, 3000);

  } catch (err) {
    console.error('Error escribiendo CSV:', err);
    res.status(500).json({ status: 'error', error: String(err) });
  }
});
