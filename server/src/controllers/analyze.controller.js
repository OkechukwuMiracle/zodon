import { runInvestigation } from '../services/investigation.service.js';
import { makeTextSchema, UrlBodySchema, SampleBodySchema } from '../schemas/analyze.schema.js';
import { getSample, listSamples } from '../data/samples.js';
import { validateAiOutput } from '../services/ai/gemini.service.js';
import { AppError, ErrorCodes } from '../utils/AppError.js';

function parseBody(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const first = result.error.issues[0];
    const code = first?.path?.[0] === 'url' ? ErrorCodes.INVALID_URL : ErrorCodes.VALIDATION_ERROR;
    throw new AppError(code, first?.message ?? 'Invalid request.', 400, {
      fields: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}

export function createAnalyzeController({ ai, reputation, env }) {
  const textSchema = makeTextSchema(env.MAX_TEXT_CHARS);

  return {
    async analyzeText(req, res) {
      const { text } = parseBody(textSchema, req.body);
      const report = await runInvestigation({ inputType: 'text', text }, { ai, reputation });
      res.json({ report });
    },

    async analyzeUrl(req, res) {
      const { url } = parseBody(UrlBodySchema, req.body);
      const report = await runInvestigation({ inputType: 'url', url }, { ai, reputation });
      res.json({ report });
    },

    async analyzeImage(req, res) {
      const image = { buffer: req.file.buffer, mime: req.file.verifiedMime, size: req.file.size, name: req.file.originalname?.slice(0, 120) };
      try {
        const report = await runInvestigation({ inputType: 'image', image }, { ai, reputation });
        res.json({ report });
      } finally {
        // Drop the only reference to the image buffer as soon as processing ends.
        req.file.buffer = null;
      }
    },

    async analyzeSample(req, res) {
      const { sample_id } = parseBody(SampleBodySchema, req.body);
      const sample = getSample(sample_id);
      if (!sample) throw new AppError(ErrorCodes.NOT_FOUND, 'Unknown sample.', 404);
      const validated = validateAiOutput(sample.illustrativeAnalysis);
      if (!validated.ok) throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Sample data is invalid.', 500);
      // A stand-in "AI" that returns the pre-written, clearly-labelled illustrative analysis.
      const sampleAi = {
        configured: true,
        model: null,
        analyze: async () => ({ output: validated.data, model: null, attempts: 0 }),
      };
      const input = sample.input_type === 'url' ? { inputType: 'url', url: sample.content } : { inputType: 'text', text: sample.content };
      const report = await runInvestigation(input, {
        ai: sampleAi,
        reputation: { configured: false, check: async () => ({ checked: false, provider: null, reason: 'Not used for samples.', matches: [] }) },
        mode: 'sample',
        sample: { synthetic: true, id: sample.id, title: sample.title, note: 'Fictional content with a pre-written illustrative analysis. Not a live AI result.' },
      });
      res.json({ report });
    },

    listSamples(_req, res) {
      res.json({ samples: listSamples() });
    },
  };
}
