const request = require('supertest');
const mongoose = require('mongoose'); // Assuming you use Mongoose
const app = require('../app');

describe('GET /test', () => {
    it('should return a JSON object with a server status of "ok"', async () => {
        const response = await request(app).get('/test');
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ server: 'ok' });
    });

    // Add this afterAll hook to close the database connection
    afterAll(async () => {
        await mongoose.connection.close();
    });
});
