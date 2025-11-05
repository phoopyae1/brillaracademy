import { Router } from 'express';
import { z } from 'zod';
import { requireStaff } from '../middleware/requireStaff.js';
import { createAnnouncement, listAnnouncements, deleteAnnouncement } from '../services/announcementService.js';
const router = Router();
// Get all announcements (public for students, authenticated for staff)
router.get('/', async (req, res) => {
    try {
        const announcements = await listAnnouncements();
        res.json({ announcements });
    }
    catch (error) {
        console.error('Failed to fetch announcements', error);
        res.status(500).json({ error: 'Unable to fetch announcements right now.' });
    }
});
// Create announcement (admin only)
const createAnnouncementSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    type: z.enum(['announcement', 'event']).default('announcement'),
    eventDate: z.string().optional().nullable()
});
router.post('/', requireStaff(['IT_ADMIN', 'STUDENT_ADMIN']), async (req, res) => {
    const parseResult = createAnnouncementSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid announcement data.', details: parseResult.error.flatten() });
    }
    try {
        const announcement = await createAnnouncement({
            ...parseResult.data,
            postedBy: req.staff.id
        });
        res.status(201).json({ announcement });
    }
    catch (error) {
        console.error('Failed to create announcement', error);
        const message = typeof error?.message === 'string' ? error.message : 'Unable to create announcement right now.';
        res.status(500).json({ error: message });
    }
});
// Delete announcement (admin only)
router.delete('/:id', requireStaff(['IT_ADMIN', 'STUDENT_ADMIN']), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'Invalid announcement ID.' });
    }
    try {
        await deleteAnnouncement(id);
        res.json({ message: 'Announcement deleted successfully.' });
    }
    catch (error) {
        console.error('Failed to delete announcement', error);
        const message = typeof error?.message === 'string' ? error.message : 'Unable to delete announcement right now.';
        res.status(500).json({ error: message });
    }
});
export default router;
//# sourceMappingURL=announcementRoutes.js.map