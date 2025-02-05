import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  vus: 10, // Number of virtual users
  duration: '1m', // Duration of the test
};

export default function () {
  const res = http.post('http://your-api-endpoint/api/your-endpoint', JSON.stringify({ data: 'test data' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  console.log(`Response time: ${res.timings.duration} ms`);
  sleep(1); // Wait for 1 second before the next request
}
