// Quick test to verify the clear function works
console.log('Testing clear data function...');

// Simulate the API call
const testClearFunction = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found. Please login first.');
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/api/test/clear-all-data', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Clear function works!', result);
    } else {
      const error = await response.json();
      console.error('❌ Clear function failed:', error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

// Run the test
testClearFunction();