import axios from 'axios';

async function testEndpoint() {
  try {
    // We need a login session or a valid token.
    // For now, let's just see if we can trigger the 500 error and see the message.
    // If the server is running on localhost:5000.
    const res = await axios.get('http://localhost:5000/api/v1/faculty/skills/nonexistent/students');
    console.log(res.data);
  } catch (e: any) {
    if (e.response) {
      console.log('Status:', e.response.status);
      console.log('Data:', JSON.stringify(e.response.data, null, 2));
    } else {
      console.log('Error:', e.message);
    }
  }
}

testEndpoint();
