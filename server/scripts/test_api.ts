import axios from 'axios';

async function testApi() {
  const baseURL = 'http://localhost:5000/api/v1';
  const skillId = '738e09fe-997a-45cf-8327-f4204e828748';
  const studentId = '59bb16f6-6090-4580-90ff-7c4805eff7e1';

  console.log(`--- Testing Student Profile API ---`);
  try {
    const res = await axios.get(`${baseURL}/faculty/skills/${skillId}/students/${studentId}`);
    console.log('Success!', res.status);
  } catch (err: any) {
    console.log('FAILED!');
    console.log('Status:', err.response?.status);
    console.log('Data:', JSON.stringify(err.response?.data, null, 2));
    if (!err.response) {
      console.log('Error Message:', err.message);
    }
  }

  console.log(`\n--- Testing System Time API ---`);
  try {
    const res = await axios.get(`${baseURL}/system/time`);
    console.log('Success!', res.status, res.data);
  } catch (err: any) {
    console.log('FAILED!');
    console.log('Status:', err.response?.status);
    console.log('Data:', JSON.stringify(err.response?.data, null, 2));
    if (!err.response) {
      console.log('Error Message:', err.message);
    }
  }
}

testApi();
