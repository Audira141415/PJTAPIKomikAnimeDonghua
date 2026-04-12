/**
 * Test Utilities - Helper functions for testing
 */
const mongoose = require('mongoose');

class TestUtils {
  /**
   * Connect to test database
   */
  static async connectTestDB() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/audira-test';
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set for testing');
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  /**
   * Disconnect from test database
   */
  static async disconnectTestDB() {
    await mongoose.disconnect();
  }

  /**
   * Clear all collections from database
   */
  static async clearDatabase() {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }

  /**
   * Clear specific collections
   */
  static async clearCollections(collectionNames = []) {
    for (const name of collectionNames) {
      await mongoose.connection.collection(name).deleteMany({});
    }
  }

  /**
   * Seed database with initial data
   */
  static async seedDatabase(User, seedData = {}) {
    const users = seedData.users || [];
    const createdUsers = [];

    for (const userData of users) {
      const hashedPassword = await require('bcrypt').hash(userData.password, 10);
      const user = await User.create({
        ...userData,
        password: hashedPassword,
      });
      createdUsers.push(user);
    }

    return createdUsers;
  }

  /**
   * Validate error response structure
   */
  static validateErrorResponse(response, expectedStatus = 400) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('error');
  }

  /**
   * Validate success response structure
   */
  static validateSuccessResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  }

  /**
   * Generate valid JWT token for testing
   */
  static generateTestToken(userId, role = 'user') {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '24h' }
    );
  }

  /**
   * Wait for async operations
   */
  static async wait(ms = 100) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create mock request object
   */
  static createMockRequest(overrides = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      ...overrides,
    };
  }

  /**
   * Create mock response object
   */
  static createMockResponse() {
    const res = {
      statusCode: 200,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.data = data;
      },
      send(data) {
        this.data = data;
      },
    };
    return res;
  }

  /**
   * Validate pagination structure
   */
  static validatePaginationStructure(response) {
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('pagination');
    expect(response.pagination).toHaveProperty('total');
    expect(response.pagination).toHaveProperty('page');
    expect(response.pagination).toHaveProperty('limit');
    expect(response.pagination).toHaveProperty('pages');
  }

  /**
   * Assert that function was called with specific arguments
   */
  static assertFunctionCalled(mockFn, expectedTimes = 1) {
    expect(mockFn).toHaveBeenCalledTimes(expectedTimes);
  }

  /**
   * Create valid pagination query
   */
  static createPaginationQuery(page = 1, limit = 10) {
    return {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
    };
  }
}

module.exports = TestUtils;
