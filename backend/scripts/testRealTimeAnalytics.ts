import axios from 'axios';
const testRealTimeAnalytics = async () => {
    try {
        const response = await axios.post('http://localhost:3000/api/real-time-analytics', {
            userId: 'test-user',
            eventType: 'test_event',
            metadata: { key: 'value' }
        });
        console.log('Response:', response.data);
    }
    catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
};
testRealTimeAnalytics();
