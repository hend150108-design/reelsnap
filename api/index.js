/**
 * Vercel Serverless Function Handler
 * Wraps the Express application for deployment on Vercel.
 */

const app = require('../server/server');

module.exports = app;
