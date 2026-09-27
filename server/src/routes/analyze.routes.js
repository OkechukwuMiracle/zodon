import { Router } from 'express';
import { createUpload, verifyImage } from '../middleware/upload.js';

export function createAnalyzeRouter({ controller, analyzeLimiter, env }) {
  const router = Router();
  const upload = createUpload({ maxUploadBytes: env.maxUploadBytes });

  router.get('/samples', controller.listSamples);
  router.post('/analyze/sample', controller.analyzeSample);
  router.post('/analyze/text', analyzeLimiter, controller.analyzeText);
  router.post('/analyze/url', analyzeLimiter, controller.analyzeUrl);
  router.post('/analyze/image', analyzeLimiter, upload, verifyImage, controller.analyzeImage);

  return router;
}
