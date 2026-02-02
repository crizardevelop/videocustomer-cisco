//const myServerUrl = 'https://video-customer-support-production.up.railway.app';
const myServerUrl = 'http://localhost:3000'; // Update this with your server URL
async function getAccessToken() {
    const url = myServerUrl + '/get-access-token';
    const requestOptions = {
        method: 'GET'
    };
    try {
        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            throw new Error (`Webex get access token request error. Status code: ${response.status},  Status message: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.accessToken) {
            throw new Error ('No access token received in the response');
        }
        const accessToken = data.accessToken;
        console.log('Access token sent to Front End');
        return accessToken;
    }   
    catch (error) {
        console.error('Error fetching Webex get access token API', error);
        throw error;
    }
} 
