// Mock NextAuth for testing
const nextAuth = {
  default: jest.fn(() => ({
    handlers: {
      GET: jest.fn(),
      POST: jest.fn(),
    },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
  NextAuthConfig: jest.fn(),
};

module.exports = nextAuth;
