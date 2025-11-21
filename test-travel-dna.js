// Quick test script to verify Travel DNA creation
const testTravelDNA = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found. Please login first.');
    return;
  }

  const testData = {
    adventure: 0.75,
    culture: 0.60,
    foodie: 0.80,
    budget: 'mid-range',
    pace: 'moderate'
  };

  try {
    console.log('Testing Travel DNA creation...');
    
    // Test creation
    const createResponse = await fetch('http://localhost:5000/api/travel-dna/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });

    const createResult = await createResponse.json();
    console.log('Create result:', createResult);

    // Test retrieval
    const getResponse = await fetch('http://localhost:5000/api/travel-dna/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const getResult = await getResponse.json();
    console.log('Get result:', getResult);

  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testTravelDNA();