// Simple test script to check if backend is running
console.log('Testing backend connection...');

fetch('http://localhost:5000/health')
  .then(response => {
    console.log('✅ Backend is running!');
    return response.json();
  })
  .then(data => {
    console.log('Response:', data);
  })
  .catch(error => {
    console.log('❌ Backend connection failed:', error.message);
    console.log('Make sure the backend server is running on port 5000');
  });
