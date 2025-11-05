import { Router } from 'express';
import { listFeatures } from '../services/featureService.js';
const router = Router();
router.get('/', async (_req, res) => {
    const features = await listFeatures();
    res.json({ features });
});
export default router;
//# sourceMappingURL=featureRoutes.js.map